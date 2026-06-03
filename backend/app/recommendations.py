from flask import Blueprint, jsonify, request, g
from .models import Product, BrowsingHistory, SearchHistory, OrderItem
from .database import db
from .auth import decode_token

recommendations_bp = Blueprint('recommendations', __name__)

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

@recommendations_bp.route('', methods=['GET'])
def get_recommendations():
    user_id = get_user_from_token()
    session_id = request.args.get('session_id')
    limit = request.args.get('limit', 8, type=int)
    
    recommended_products = []
    
    # 1. User is Logged In - Personalized Recommendations
    if user_id:
        # Get recently viewed product categories
        recent_views = BrowsingHistory.query.filter_by(user_id=user_id)\
            .order_by(BrowsingHistory.created_at.desc()).limit(15).all()
            
        browsed_prod_ids = [rv.product_id for rv in recent_views]
        
        # Get categories of browsed products
        category_ids = set()
        if browsed_prod_ids:
            browsed_products = Product.query.filter(Product.id.in_(browsed_prod_ids)).all()
            category_ids = {p.category_id for p in browsed_products}
            
        # Get products in the same categories, excluding already viewed items
        if category_ids:
            rec_query = Product.query.filter(Product.category_id.in_(category_ids))
            if browsed_prod_ids:
                rec_query = rec_query.filter(Product.id.notin_(browsed_prod_ids))
            recommended_products = rec_query.order_by(Product.rating.desc()).limit(limit).all()
            
        # Add recently viewed products to recommendations list if we need more
        if len(recommended_products) < limit and browsed_prod_ids:
            remaining = limit - len(recommended_products)
            recent_prods = Product.query.filter(Product.id.in_(browsed_prod_ids)).limit(remaining).all()
            recommended_products.extend(recent_prods)

    # 2. Guest or Fallback (Not logged in, or no history yet) - Trending/Best Sellers
    if len(recommended_products) < limit:
        remaining_limit = limit - len(recommended_products)
        already_recommended_ids = [p.id for p in recommended_products]
        
        # Fetch trending (highest rating first, then newest)
        trending_query = Product.query
        if already_recommended_ids:
            trending_query = trending_query.filter(Product.id.notin_(already_recommended_ids))
            
        trending = trending_query.order_by(Product.rating.desc(), Product.created_at.desc()).limit(remaining_limit).all()
        recommended_products.extend(trending)
        
    return jsonify([p.to_dict() for p in recommended_products[:limit]]), 200

@recommendations_bp.route('/related/<int:product_id>', methods=['GET'])
def get_related_products(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    limit = request.args.get('limit', 4, type=int)
    
    # Related products in the same category, excluding current product
    related = Product.query.filter(Product.category_id == product.category_id, Product.id != product_id)\
        .order_by(Product.rating.desc())\
        .limit(limit).all()
        
    # If not enough related in category, pad with top-rated items
    if len(related) < limit:
        already_ids = [p.id for p in related] + [product_id]
        remaining = limit - len(related)
        padding = Product.query.filter(Product.id.notin_(already_ids))\
            .order_by(Product.rating.desc())\
            .limit(remaining).all()
        related.extend(padding)
        
    return jsonify([p.to_dict() for p in related[:limit]]), 200
