from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..models import User, Product, Category, Order, OrderItem, Review, Wishlist, BrowsingHistory, SearchHistory, Payment, Notification, Cart, CartItem, ProductImage
from ..database import get_db
from ..auth import get_current_user, check_role
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class UserStatusUpdateSchema(BaseModel):
    status: str

@router.get("/admin")
def get_admin_dashboard(db: Session = Depends(get_db), admin: User = Depends(check_role(['admin']))):
    payments = db.query(Payment).all()
    total_revenue = sum(p.amount for p in payments)
    
    total_users = db.query(User).count()
    total_customers = db.query(User).filter_by(role='customer').count()
    total_sellers = db.query(User).filter_by(role='seller').count()
    total_products = db.query(Product).count()
    total_orders = db.query(Order).count()
    
    # Low stock alerts
    low_stock = db.query(Product).filter(Product.stock_count < 10).all()
    
    # Pending sellers
    pending_sellers = db.query(User).filter_by(role='seller', status='pending').all()
    
    return {
        'total_users': total_users,
        'total_sellers': total_sellers,
        'total_customers': total_customers,
        'total_products': total_products,
        'total_orders': total_orders,
        'total_revenue': round(total_revenue, 2),
        'low_stock_products': [p.to_dict() for p in low_stock],
        'pending_sellers': [s.to_dict() for s in pending_sellers]
    }

@router.get("/admin/users")
def get_admin_users(db: Session = Depends(get_db), admin: User = Depends(check_role(['admin']))):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [u.to_dict() for u in users]

@router.put("/admin/users/{user_id}/status")
def update_user_status(
    user_id: int,
    data: UserStatusUpdateSchema,
    db: Session = Depends(get_db),
    admin: User = Depends(check_role(['admin']))
):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
        
    if data.status not in ['pending', 'approved', 'blocked']:
        raise HTTPException(status_code=400, detail='Invalid status')
        
    user.status = data.status
    db.commit()
    return {'message': 'User status updated successfully', 'status': user.status}

@router.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(check_role(['admin']))
):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
        
    # Cascade deletions
    db.query(Notification).filter_by(user_id=user_id).delete()
    db.query(Wishlist).filter_by(user_id=user_id).delete()
    db.query(Review).filter_by(user_id=user_id).delete()
    db.query(BrowsingHistory).filter_by(user_id=user_id).delete()
    db.query(SearchHistory).filter_by(user_id=user_id).delete()
    
    cart = db.query(Cart).filter_by(user_id=user_id).first()
    if cart:
        db.query(CartItem).filter_by(cart_id=cart.id).delete()
        db.delete(cart)
        
    if user.role == 'seller':
        seller_products = db.query(Product).filter_by(seller_id=user_id).all()
        seller_product_ids = [p.id for p in seller_products]
        if seller_product_ids:
            db.query(Review).filter(Review.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
            db.query(CartItem).filter(CartItem.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
            db.query(Wishlist).filter(Wishlist.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
            db.query(BrowsingHistory).filter(BrowsingHistory.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
            db.query(OrderItem).filter(OrderItem.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
            
            for p in seller_products:
                db.query(ProductImage).filter_by(product_id=p.id).delete()
                db.delete(p)
                
    customer_orders = db.query(Order).filter_by(user_id=user_id).all()
    for order in customer_orders:
        db.query(Payment).filter_by(order_id=order.id).delete()
        db.query(OrderItem).filter_by(order_id=order.id).delete()
        db.delete(order)
        
    db.query(OrderItem).filter_by(seller_id=user_id).delete()
    
    seller_orders = db.query(Order).filter(
        ~Order.items.any()
    ).all()
    for order in seller_orders:
        db.query(Payment).filter_by(order_id=order.id).delete()
        db.delete(order)
        
    db.commit()
    
    user = db.query(User).filter_by(id=user_id).first()
    if user:
        db.delete(user)
        db.commit()
        
    return {'message': 'User deleted successfully'}

@router.get("/seller")
def get_seller_dashboard(db: Session = Depends(get_db), seller: User = Depends(check_role(['seller']))):
    items = db.query(OrderItem).filter_by(seller_id=seller.id).all()
    
    # Calculate total revenue for this seller's products (matching order status processing/shipped/delivered)
    total_revenue = 0.0
    for item in items:
        if item.order and item.order.status in ['processing', 'shipped', 'delivered']:
            price = item.discount_price if item.discount_price else item.price
            total_revenue += price * item.quantity
            
    total_units_sold = sum(item.quantity for item in items)
    
    products = db.query(Product).filter_by(seller_id=seller.id).all()
    total_listings = len(products)
    out_of_stock = sum(1 for p in products if p.stock_count == 0)
    low_stock = sum(1 for p in products if 0 < p.stock_count < 10)
    in_stock = total_listings - out_of_stock - low_stock
    
    low_stock_list = [p.to_dict() for p in products if p.stock_count < 10]
    
    return {
        'total_listings': total_listings,
        'total_units_sold': total_units_sold,
        'total_revenue': round(total_revenue, 2),
        'stock_summary': {
            'out_of_stock': out_of_stock,
            'low_stock': low_stock,
            'in_stock': in_stock
        },
        'low_stock_products': low_stock_list
    }

@router.get("/notifications")
def get_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter_by(user_id=user.id).order_by(Notification.created_at.desc()).all()
    return [n.to_dict() for n in notifications]

@router.put("/notifications/{notification_id}/read")
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter_by(id=notification_id, user_id=user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail='Notification not found')
        
    notif.is_read = True
    db.commit()
    return {'message': 'Notification marked as read'}
