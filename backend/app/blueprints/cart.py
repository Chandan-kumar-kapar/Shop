from flask import Blueprint, request, jsonify, g
from ..models import Cart, CartItem, Product
from ..database import db
from ..auth import decode_token

cart_bp = Blueprint('cart', __name__)

def get_user_from_token():
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            if 'error' not in payload:
                return payload['sub']
        except Exception:
            pass
    return None

def get_or_create_cart(user_id, session_id):
    if user_id:
        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.session.add(cart)
            db.session.commit()
        return cart
    elif session_id:
        cart = Cart.query.filter_by(session_id=session_id).first()
        if not cart:
            cart = Cart(session_id=session_id)
            db.session.add(cart)
            db.session.commit()
        return cart
    return None

@cart_bp.route('', methods=['GET'])
def get_cart():
    user_id = get_user_from_token()
    session_id = request.args.get('session_id')
    
    if not user_id and not session_id:
        return jsonify({'message': 'Either user token or guest session_id is required'}), 400
        
    cart = get_or_create_cart(user_id, session_id)
    if not cart:
        return jsonify({'items': [], 'total_price': 0.0}), 200
        
    # Auto merge guest cart if both user_id and session_id are provided
    if user_id and session_id:
        guest_cart = Cart.query.filter_by(session_id=session_id).first()
        if guest_cart and guest_cart.id != cart.id:
            for item in guest_cart.items:
                existing_item = CartItem.query.filter_by(cart_id=cart.id, product_id=item.product_id).first()
                if existing_item:
                    existing_item.quantity += item.quantity
                else:
                    new_item = CartItem(cart_id=cart.id, product_id=item.product_id, quantity=item.quantity)
                    db.session.add(new_item)
            db.session.delete(guest_cart)
            db.session.commit()
            # Refresh cart query
            cart = Cart.query.filter_by(user_id=user_id).first()
            
    items = CartItem.query.filter_by(cart_id=cart.id).all()
    
    # Calculate cart total
    total = 0.0
    serialized_items = []
    for item in items:
        prod = item.product
        if prod:
            price = prod.discount_price if prod.discount_price else prod.price
            total += price * item.quantity
            serialized_items.append(item.to_dict())
            
    return jsonify({
        'cart_id': cart.id,
        'items': serialized_items,
        'total_price': round(total, 2)
    }), 200

@cart_bp.route('', methods=['POST'])
def add_to_cart():
    user_id = get_user_from_token()
    data = request.get_json() or {}
    session_id = data.get('session_id')
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    
    if product_id is not None:
        try:
            product_id = int(product_id)
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid product ID'}), 400
            
    if quantity is not None:
        try:
            quantity = int(quantity)
        except (ValueError, TypeError):
            quantity = 1
            
    if not product_id:
        return jsonify({'message': 'Product ID is required'}), 400
        
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    if product.stock_count <= 0:
        return jsonify({'message': 'Product is out of stock'}), 400
        
    if not user_id and not session_id:
        return jsonify({'message': 'Authentication or guest session_id required'}), 400
        
    cart = get_or_create_cart(user_id, session_id)
    
    # Check if item already exists in cart
    cart_item = CartItem.query.filter_by(cart_id=cart.id, product_id=product_id).first()
    if cart_item:
        new_qty = cart_item.quantity + quantity
        if new_qty > product.stock_count:
            cart_item.quantity = product.stock_count
        else:
            cart_item.quantity = new_qty
    else:
        if quantity > product.stock_count:
            quantity = product.stock_count
        cart_item = CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity)
        db.session.add(cart_item)
        
    db.session.commit()
    return jsonify({'message': 'Item added to cart', 'item': cart_item.to_dict()}), 200

@cart_bp.route('/<int:item_id>', methods=['PUT'])
def update_cart_item(item_id):
    data = request.get_json() or {}
    quantity = data.get('quantity')
    
    if quantity is not None:
        try:
            quantity = int(quantity)
        except (ValueError, TypeError):
            return jsonify({'message': 'Quantity must be a positive integer'}), 400
            
    if quantity is None or quantity <= 0:
        return jsonify({'message': 'Quantity must be a positive integer'}), 400
        
    user_id = get_user_from_token()
    session_id = request.args.get('session_id')
    
    if not user_id and not session_id:
        return jsonify({'message': 'Authentication or session_id required'}), 401
        
    cart = get_or_create_cart(user_id, session_id)
    cart_item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    
    if not cart_item:
        return jsonify({'message': 'Cart item not found'}), 404
        
    product = Product.query.get(cart_item.product_id)
    if quantity > product.stock_count:
        return jsonify({'message': f'Cannot exceed available stock of {product.stock_count}'}), 400
        
    cart_item.quantity = quantity
    db.session.commit()
    
    return jsonify({'message': 'Cart item updated', 'item': cart_item.to_dict()}), 200

@cart_bp.route('/<int:item_id>', methods=['DELETE'])
def remove_from_cart(item_id):
    user_id = get_user_from_token()
    session_id = request.args.get('session_id')
    
    if not user_id and not session_id:
        return jsonify({'message': 'Authentication or session_id required'}), 401
        
    cart = get_or_create_cart(user_id, session_id)
    cart_item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    
    if not cart_item:
        return jsonify({'message': 'Cart item not found'}), 404
        
    db.session.delete(cart_item)
    db.session.commit()
    
    return jsonify({'message': 'Item removed from cart'}), 200

@cart_bp.route('/merge', methods=['POST'])
def merge_cart():
    user_id = get_user_from_token()
    data = request.get_json() or {}
    session_id = data.get('session_id')
    
    if not user_id or not session_id:
        return jsonify({'message': 'Both authorization token and session_id are required for merging'}), 400
        
    user_cart = get_or_create_cart(user_id, None)
    guest_cart = Cart.query.filter_by(session_id=session_id).first()
    
    if guest_cart:
        for item in guest_cart.items:
            existing_item = CartItem.query.filter_by(cart_id=user_cart.id, product_id=item.product_id).first()
            prod = Product.query.get(item.product_id)
            if not prod:
                continue
                
            if existing_item:
                new_qty = existing_item.quantity + item.quantity
                existing_item.quantity = min(new_qty, prod.stock_count)
            else:
                new_qty = min(item.quantity, prod.stock_count)
                new_item = CartItem(cart_id=user_cart.id, product_id=item.product_id, quantity=new_qty)
                db.session.add(new_item)
                
        db.session.delete(guest_cart)
        db.session.commit()
        
    return jsonify({'message': 'Carts merged successfully'}), 200
