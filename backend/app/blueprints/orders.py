from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from ..models import Order, OrderItem, Address, Cart, CartItem, Product, Payment, Notification, User
from ..database import get_db
from ..auth import decode_token, check_role, get_current_user
from pydantic import BaseModel
import datetime
import random
import string
import uuid
from typing import Optional, List

router = APIRouter()

class ShippingAddressInputSchema(BaseModel):
    full_name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: Optional[str] = 'USA'
    phone: str

class PlaceOrderSchema(BaseModel):
    session_id: Optional[str] = None
    shipping_address_id: Optional[int] = None
    shipping_address: Optional[ShippingAddressInputSchema] = None
    payment_method: Optional[str] = 'card'

class UpdateOrderStatusSchema(BaseModel):
    status: str

def generate_tracking_number():
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SC-{date_str}-{random_str}"

def get_optional_user_id(authorization: Optional[str] = Header(None)):
    if authorization:
        try:
            token = authorization.split(" ")[1]
            payload = decode_token(token)
            if 'error' not in payload:
                return payload['sub']
        except Exception:
            pass
    return None

@router.post("", status_code=status.HTTP_201_CREATED)
def place_order(
    data: PlaceOrderSchema,
    user_id: Optional[int] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    # 1. Fetch Cart
    if user_id:
        cart = db.query(Cart).filter_by(user_id=user_id).first()
    elif data.session_id:
        cart = db.query(Cart).filter_by(session_id=data.session_id).first()
    else:
        raise HTTPException(status_code=400, detail='Either authorization or session_id is required')
        
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail='Your shopping cart is empty')
        
    # 2. Resolve Shipping Address
    address = None
    if data.shipping_address_id:
        address = db.query(Address).filter_by(id=data.shipping_address_id).first()
        if not address or (user_id and address.user_id != user_id):
            raise HTTPException(status_code=400, detail='Invalid shipping address ID')
    elif data.shipping_address:
        address = Address(
            user_id=None,
            session_id=data.session_id,
            full_name=data.shipping_address.full_name,
            address_line1=data.shipping_address.address_line1,
            address_line2=data.shipping_address.address_line2,
            city=data.shipping_address.city,
            state=data.shipping_address.state,
            postal_code=data.shipping_address.postal_code,
            country=data.shipping_address.country,
            phone=data.shipping_address.phone
        )
        db.add(address)
        db.flush() # Flush to get address.id
    else:
        raise HTTPException(status_code=400, detail='Shipping address details are required')
        
    # 3. Create Order, Order Items and verify stock
    total_amount = 0.0
    order_items = []
    
    for item in cart.items:
        prod = item.product
        if not prod:
            continue
            
        if prod.stock_count < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f'Insufficient stock for product: {prod.name}. Available: {prod.stock_count}'
            )
            
        price = prod.discount_price if prod.discount_price else prod.price
        total_amount += price * item.quantity
        
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
        session_id=None if user_id else data.session_id,
        status='processing',
        total_amount=round(total_amount, 2),
        shipping_address_id=address.id,
        tracking_number=tracking_number
    )
    db.add(order)
    db.flush()
    
    for item in order_items:
        item.order_id = order.id
        db.add(item)
        
    # 4. Generate Mock Payment
    transaction_id = f"TXN-{str(uuid.uuid4())[:12].upper()}"
    payment = Payment(
        order_id=order.id,
        payment_method=data.payment_method,
        transaction_id=transaction_id,
        status='completed',
        amount=round(total_amount, 2)
    )
    db.add(payment)
    
    # 5. Empty Cart
    db.query(CartItem).filter_by(cart_id=cart.id).delete()
    
    # 6. Generate Notifications
    if user_id:
        notification = Notification(
            user_id=user_id,
            message=f"Order placed successfully! Your tracking number is {tracking_number}."
        )
        db.add(notification)
        
    unique_sellers = set(item.seller_id for item in order_items)
    for s_id in unique_sellers:
        seller_notif = Notification(
            user_id=s_id,
            message=f"New order received: {tracking_number} contains your products."
        )
        db.add(seller_notif)
        
    db.commit()
    
    return {
        'message': 'Order placed successfully',
        'order_id': order.id,
        'tracking_number': tracking_number,
        'total_amount': order.total_amount
    }

@router.get("")
def get_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == 'admin':
        orders = db.query(Order).order_by(Order.created_at.desc()).all()
        return [o.to_dict() for o in orders]
        
    elif user.role == 'seller':
        items = db.query(OrderItem).filter_by(seller_id=user.id).all()
        order_ids = set(item.order_id for item in items)
        orders = db.query(Order).filter(Order.id.in_(order_ids)).order_by(Order.created_at.desc()).all()
        
        seller_orders_list = []
        for order in orders:
            dict_rep = order.to_dict()
            dict_rep['items'] = [it for it in dict_rep['items'] if it['seller_id'] == user.id]
            seller_orders_list.append(dict_rep)
            
        return seller_orders_list
        
    elif user.role == 'customer':
        orders = db.query(Order).filter_by(user_id=user.id).order_by(Order.created_at.desc()).all()
        return [o.to_dict() for o in orders]
        
    raise HTTPException(status_code=403, detail='Access forbidden')

@router.get("/track/{tracking_number}")
def track_order(tracking_number: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter_by(tracking_number=tracking_number).first()
    if not order:
        raise HTTPException(status_code=404, detail='Order not found with the provided tracking number')
    return order.to_dict()

@router.put("/{order_id}/status")
def update_order_status(
    order_id: int,
    data: UpdateOrderStatusSchema,
    db: Session = Depends(get_db),
    user: User = Depends(check_role(['seller', 'admin']))
):
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
        
    if data.status not in ['pending', 'processing', 'shipped', 'delivered', 'cancelled']:
        raise HTTPException(status_code=400, detail='Invalid status')
        
    if user.role == 'seller':
        owns_item = db.query(OrderItem).filter_by(order_id=order.id, seller_id=user.id).first()
        if not owns_item:
            raise HTTPException(status_code=403, detail='Access forbidden: You do not own any products in this order')
            
    order.status = data.status
    
    if order.user_id:
        notif = Notification(
            user_id=order.user_id,
            message=f"Order {order.tracking_number} status has been updated to '{data.status}'."
        )
        db.add(notif)
        
    db.commit()
    return {'message': 'Order status updated successfully', 'status': order.status}
