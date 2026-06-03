import datetime
import random
import string
from flask import Blueprint, request, jsonify, g
from ..models import Order, OrderItem, Address, Cart, CartItem, Product, Payment, Notification, User
from ..database import db
from ..auth import jwt_required, role_required, decode_token

orders_bp = Blueprint('orders', __name__)

def generate_tracking_number():
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SC-{date_str}-{random_str}"

@orders_bp.route('', methods=['POST'])
def place_order():
    # Detect authentication if available
    auth_header = request.headers.get('Authorization')
    user_id = None
    if auth_header:
        try:
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            if 'error' not in payload:
                user_id = payload['sub']
        except Exception:
            pass

    data = request.get_json() or {}
    session_id = data.get('session_id')
    payment_method = data.get('payment_method', 'card')
    
    # 1. Fetch Cart
    if user_id:
        cart = Cart.query.filter_by(user_id=user_id).first()
    elif session_id:
        cart = Cart.query.filter_by(session_id=session_id).first()
    else:
        return jsonify({'message': 'Either authorization or session_id is required'}), 400
        
    if not cart or not cart.items:
        return jsonify({'message': 'Your shopping cart is empty'}), 400
        
    # 2. Resolve Shipping Address
    address_id = data.get('shipping_address_id')
    address_data = data.get('shipping_address')
    
    address = None
    if address_id:
        # User specified an existing address
        address = Address.query.filter_by(id=address_id).first()
        if not address or (user_id and address.user_id != user_id):
            return jsonify({'message': 'Invalid shipping address ID'}), 400
    elif address_data:
        # Create a new address
        full_name = address_data.get('full_name')
        address_line1 = address_data.get('address_line1')
        address_line2 = address_data.get('address_line2')
        city = address_data.get('city')
        state = address_data.get('state')
        postal_code = address_data.get('postal_code')
        country = address_data.get('country', 'USA')
        phone = address_data.get('phone')
        
        if not all([full_name, address_line1, city, state, postal_code, phone]):
            return jsonify({'message': 'Missing fields in shipping address'}), 400
            
        address = Address(
            user_id=None,
            session_id=session_id,
            full_name=full_name,
            address_line1=address_line1,
            address_line2=address_line2,
            city=city,
            state=state,
            postal_code=postal_code,
            country=country,
            phone=phone
        )
        db.session.add(address)
        db.session.flush() # Flush to get address.id
    else:
        return jsonify({'message': 'Shipping address details are required'}), 400
        
    # 3. Create Order, Order Items and verify stock
    total_amount = 0.0
    order_items = []
    
    for item in cart.items:
        prod = item.product
        if not prod:
            continue
            
        if prod.stock_count < item.quantity:
            return jsonify({'message': f'Insufficient stock for product: {prod.name}. Available: {prod.stock_count}'}), 400
            
        price = prod.discount_price if prod.discount_price else prod.price
        total_amount += price * item.quantity
        
        # Decrement stock and update status
        prod.stock_count -= item.quantity
        if prod.stock_count == 0:
            prod.availability_status = 'out_of_stock'
        elif prod.stock_count < 10:
            prod.availability_status = 'low_stock'
            
        order_item = OrderItem(
            product_id=prod.id,
            quantity=item.quantity,
            price=prod.price,
            discount_price=prod.discount_price,
            seller_id=prod.seller_id
        )
        order_items.append(order_item)
        
    tracking_number = generate_tracking_number()
    
    order = Order(
        user_id=user_id,
        session_id=None if user_id else session_id,
        status='processing',
        total_amount=round(total_amount, 2),
        shipping_address_id=address.id,
        tracking_number=tracking_number
    )
    db.session.add(order)
    db.session.flush() # Flush to get order.id
    
    # Save order items with their corresponding order_id
    for item in order_items:
        item.order_id = order.id
        db.session.add(item)
        
    # 4. Generate Mock Payment
    transaction_id = f"TXN-{str(uuid.uuid4())[:12].upper()}" if 'uuid' in globals() else f"TXN-MOCK-{random.randint(100000, 999999)}"
    payment = Payment(
        order_id=order.id,
        payment_method=payment_method,
        transaction_id=transaction_id,
        status='completed',
        amount=round(total_amount, 2)
    )
    db.session.add(payment)
    
    # 5. Empty Cart
    CartItem.query.filter_by(cart_id=cart.id).delete()
    
    # 6. Generate Notifications
    if user_id:
        notification = Notification(
            user_id=user_id,
            message=f"Order placed successfully! Your tracking number is {tracking_number}."
        )
        db.session.add(notification)
        
    # Notify product sellers
    unique_sellers = set(item.seller_id for item in order_items)
    for seller_id in unique_sellers:
        seller_notif = Notification(
            user_id=seller_id,
            message=f"New order received: {tracking_number} contains your products."
        )
        db.session.add(seller_notif)
        
    db.session.commit()
    
    return jsonify({
        'message': 'Order placed successfully',
        'order_id': order.id,
        'tracking_number': tracking_number,
        'total_amount': order.total_amount
    }), 201

@orders_bp.route('', methods=['GET'])
@jwt_required
def get_orders():
    # Roles filtering
    if g.current_user_role == 'admin':
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return jsonify([o.to_dict() for o in orders]), 200
        
    elif g.current_user_role == 'seller':
        # Seller only views orders containing their products
        # Get order items belonging to this seller
        items = OrderItem.query.filter_by(seller_id=g.current_user_id).all()
        order_ids = set(item.order_id for item in items)
        orders = Order.query.filter(Order.id.in_(order_ids)).order_by(Order.created_at.desc()).all()
        
        # Modify to only show order details and specific products that belong to this seller
        seller_orders_list = []
        for order in orders:
            dict_rep = order.to_dict()
            # filter items in dict representation
            dict_rep['items'] = [it for it in dict_rep['items'] if it['seller_id'] == g.current_user_id]
            seller_orders_list.append(dict_rep)
            
        return jsonify(seller_orders_list), 200
        
    elif g.current_user_role == 'customer':
        orders = Order.query.filter_by(user_id=g.current_user_id).order_by(Order.created_at.desc()).all()
        return jsonify([o.to_dict() for o in orders]), 200
        
    return jsonify({'message': 'Access forbidden'}), 403

@orders_bp.route('/track/<string:tracking_number>', methods=['GET'])
def track_order(tracking_number):
    order = Order.query.filter_by(tracking_number=tracking_number).first()
    if not order:
        return jsonify({'message': 'Order not found with the provided tracking number'}), 404
        
    return jsonify(order.to_dict()), 200

# Update order status (Seller/Admin only)
@orders_bp.route('/<int:order_id>/status', methods=['PUT'])
@jwt_required
@role_required(['seller', 'admin'])
def update_order_status(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'message': 'Order not found'}), 404
        
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if new_status not in ['pending', 'processing', 'shipped', 'delivered', 'cancelled']:
        return jsonify({'message': 'Invalid status'}), 400
        
    # Check if seller is allowed to modify (must own at least one item in the order)
    if g.current_user_role == 'seller':
        owns_item = OrderItem.query.filter_by(order_id=order.id, seller_id=g.current_user_id).first()
        if not owns_item:
            return jsonify({'message': 'Access forbidden: You do not own any products in this order'}), 403
            
    order.status = new_status
    
    # Notify customer
    if order.user_id:
        notif = Notification(
            user_id=order.user_id,
            message=f"Order {order.tracking_number} status has been updated to '{new_status}'."
        )
        db.session.add(notif)
        
    db.session.commit()
    return jsonify({'message': 'Order status updated successfully', 'status': order.status}), 200
