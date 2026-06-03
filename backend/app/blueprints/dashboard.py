from flask import Blueprint, jsonify, request, g
from ..models import User, Product, Order, OrderItem, Payment, Notification, Category, Cart, CartItem, Wishlist, Review, SearchHistory, BrowsingHistory
from ..database import db
from ..auth import jwt_required, role_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/admin', methods=['GET'])
@jwt_required
@role_required(['admin'])
def get_admin_analytics():
    # Gather counts
    total_users = User.query.count()
    total_sellers = User.query.filter_by(role='seller').count()
    total_customers = User.query.filter_by(role='customer').count()
    total_products = Product.query.count()
    total_orders = Order.query.count()
    
    # Revenue (total amount of completed payments)
    revenue_query = db.session.query(db.func.sum(Payment.amount)).filter_by(status='completed').scalar()
    total_revenue = round(revenue_query, 2) if revenue_query else 0.0
    
    # Low stock alerts
    low_stock = Product.query.filter(Product.stock_count < 10).all()
    
    # Pending sellers
    pending_sellers = User.query.filter_by(role='seller', status='pending').all()
    
    return jsonify({
        'total_users': total_users,
        'total_sellers': total_sellers,
        'total_customers': total_customers,
        'total_products': total_products,
        'total_orders': total_orders,
        'total_revenue': total_revenue,
        'low_stock_products': [p.to_dict() for p in low_stock],
        'pending_sellers': [s.to_dict() for s in pending_sellers]
    }), 200

@dashboard_bp.route('/admin/users', methods=['GET'])
@jwt_required
@role_required(['admin'])
def get_all_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200

@dashboard_bp.route('/admin/users/<int:user_id>/status', methods=['PUT'])
@jwt_required
@role_required(['admin'])
def update_user_status(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if new_status not in ['pending', 'approved', 'blocked']:
        return jsonify({'message': 'Invalid status. Must be pending, approved, or blocked'}), 400
        
    user.status = new_status
    db.session.commit()
    
    # Generate notification for approved user
    if new_status == 'approved':
        notif = Notification(
            user_id=user.id,
            message="Your account has been approved by the Administrator."
        )
        db.session.add(notif)
        db.session.commit()
        
    return jsonify({'message': f'User status updated to {new_status}', 'user': user.to_dict()}), 200

@dashboard_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required
@role_required(['admin'])
def delete_user(user_id):
    # Verify user exists first
    exists = db.session.query(User.id).filter_by(id=user_id).scalar() is not None
    if not exists:
        return jsonify({'message': 'User not found'}), 404
        
    # 1. Delete notifications
    db.session.query(Notification).filter_by(user_id=user_id).delete()

    # 2. Delete wishlists
    db.session.query(Wishlist).filter_by(user_id=user_id).delete()

    # 3. Delete reviews
    db.session.query(Review).filter_by(user_id=user_id).delete()

    # 4. Delete browsing and search history
    db.session.query(BrowsingHistory).filter_by(user_id=user_id).delete()
    db.session.query(SearchHistory).filter_by(user_id=user_id).delete()

    # 5. Delete cart items and carts
    user_carts = db.session.query(Cart).filter_by(user_id=user_id).all()
    for cart in user_carts:
        db.session.query(CartItem).filter_by(cart_id=cart.id).delete()
        db.session.delete(cart)

    # 6. Delete reviews, cart items, wishlists, and histories of the user's products (if they are a seller)
    seller_products = db.session.query(Product).filter_by(seller_id=user_id).all()
    seller_product_ids = [p.id for p in seller_products]
    if seller_product_ids:
        db.session.query(Review).filter(Review.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
        db.session.query(CartItem).filter(CartItem.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
        db.session.query(Wishlist).filter(Wishlist.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
        db.session.query(BrowsingHistory).filter(BrowsingHistory.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
        db.session.query(OrderItem).filter(OrderItem.product_id.in_(seller_product_ids)).delete(synchronize_session=False)
        for p in seller_products:
            db.session.delete(p)

    # 7. Delete orders where this user is the customer
    user_orders = db.session.query(Order).filter_by(user_id=user_id).all()
    for order in user_orders:
        db.session.query(Payment).filter_by(order_id=order.id).delete()
        db.session.query(OrderItem).filter_by(order_id=order.id).delete()
        db.session.delete(order)

    # 8. Delete order items where this user is the seller
    db.session.query(OrderItem).filter_by(seller_id=user_id).delete()
    
    # 9. Clean up any empty orders
    empty_orders = db.session.query(Order).filter(~Order.items.any()).all()
    for order in empty_orders:
        db.session.query(Payment).filter_by(order_id=order.id).delete()
        db.session.delete(order)

    # Commit all cleanup operations first
    db.session.commit()

    # Now load and delete the user
    user = db.session.query(User).get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()

    return jsonify({'message': 'User deleted successfully'}), 200

@dashboard_bp.route('/seller', methods=['GET'])
@jwt_required
@role_required(['seller'])
def get_seller_analytics():
    # Seller's products
    my_products = Product.query.filter_by(seller_id=g.current_user_id).all()
    prod_ids = [p.id for p in my_products]
    
    total_listings = len(my_products)
    out_of_stock_count = sum(1 for p in my_products if p.stock_count == 0)
    low_stock_count = sum(1 for p in my_products if 0 < p.stock_count < 10)
    
    # Revenue and sales count from order items
    seller_items = OrderItem.query.filter_by(seller_id=g.current_user_id).all()
    total_units_sold = sum(item.quantity for item in seller_items)
    
    # Calculate total revenue for this seller's products
    total_revenue = 0.0
    for item in seller_items:
        # Check if the associated order is completed or processing
        if item.order and item.order.status in ['processing', 'shipped', 'delivered']:
            price = item.discount_price if item.discount_price else item.price
            total_revenue += price * item.quantity
            
    # Seller products list
    low_stock_list = [p.to_dict() for p in my_products if p.stock_count < 10]
    
    return jsonify({
        'total_listings': total_listings,
        'total_units_sold': total_units_sold,
        'total_revenue': round(total_revenue, 2),
        'stock_summary': {
            'out_of_stock': out_of_stock_count,
            'low_stock': low_stock_count,
            'in_stock': total_listings - out_of_stock_count - low_stock_count
        },
        'low_stock_products': low_stock_list
    }), 200

@dashboard_bp.route('/notifications', methods=['GET'])
@jwt_required
def get_notifications():
    notifications = Notification.query.filter_by(user_id=g.current_user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notifications]), 200

@dashboard_bp.route('/notifications/<int:notif_id>/read', methods=['PUT'])
@jwt_required
def mark_notification_read(notif_id):
    notif = Notification.query.filter_by(id=notif_id, user_id=g.current_user_id).first()
    if not notif:
        return jsonify({'message': 'Notification not found'}), 404
        
    notif.is_read = True
    db.session.commit()
    return jsonify({'message': 'Notification marked as read'}), 200
