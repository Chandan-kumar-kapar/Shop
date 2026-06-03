import os
import uuid
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, g, send_from_directory, current_app
from ..models import Product, ProductImage, Category, Review, Wishlist, BrowsingHistory, SearchHistory, User, CartItem, OrderItem
from ..database import db
from ..auth import jwt_required, role_required, decode_token

products_bp = Blueprint('products', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Serving uploaded images
@products_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@products_bp.route('', methods=['GET'])
def get_products():
    # Filter and search params
    query_str = request.args.get('search')
    category_id = request.args.get('category_id', type=int)
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    brand = request.args.get('brand')
    rating = request.args.get('rating', type=float)
    sort_by = request.args.get('sort_by', 'newest') # 'newest', 'price_asc', 'price_desc', 'popularity'
    
    # Trace search history for recommendations (extract user if token exists, or session_id)
    session_id = request.args.get('session_id')
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            if 'error' not in payload:
                user_id = payload['sub']
        except Exception:
            pass

    if query_str:
        sh = SearchHistory(user_id=user_id, session_id=session_id, query=query_str)
        db.session.add(sh)
        db.session.commit()

    # Query builder
    query = Product.query
    
    if query_str:
        search_filter = f"%{query_str}%"
        query = query.filter(Product.name.ilike(search_filter) | Product.title.ilike(search_filter) | Product.description.ilike(search_filter))
        
    if category_id:
        query = query.filter_by(category_id=category_id)
        
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
        
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
        
    if brand:
        query = query.filter(Product.brand.ilike(brand))
        
    if rating:
        query = query.filter(Product.rating >= rating)
        
    # Sorting
    if sort_by == 'newest':
        query = query.order_by(Product.created_at.desc())
    elif sort_by == 'price_asc':
        query = query.order_by(Product.price.asc())
    elif sort_by == 'price_desc':
        query = query.order_by(Product.price.desc())
    elif sort_by == 'popularity':
        query = query.order_by(Product.rating.desc())
        
    products = query.all()
    return jsonify([p.to_dict() for p in products]), 200

@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    # Log Browsing History for recommendation engine
    session_id = request.args.get('session_id')
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            if 'error' not in payload:
                user_id = payload['sub']
        except Exception:
            pass
            
    # Track browsing history
    bh = BrowsingHistory(user_id=user_id, session_id=session_id, product_id=product_id)
    db.session.add(bh)
    db.session.commit()
    
    return jsonify(product.to_dict()), 200

@products_bp.route('', methods=['POST'])
@jwt_required
@role_required(['seller', 'admin'])
def create_product():
    # We support form-data for product creation due to image files
    name = request.form.get('name')
    title = request.form.get('title')
    description = request.form.get('description')
    price = request.form.get('price', type=float)
    discount_price = request.form.get('discount_price', type=float)
    stock_count = request.form.get('stock_count', default=0, type=int)
    category_id = request.form.get('category_id', type=int)
    brand = request.form.get('brand')
    SKU = request.form.get('SKU')
    
    if not all([name, title, description, price, category_id]):
        return jsonify({'message': 'Missing required product parameters'}), 400
        
    if not SKU:
        SKU = f"SKU-{str(uuid.uuid4())[:8].upper()}"
        
    # Check category exists
    category = Category.query.get(category_id)
    if not category:
        return jsonify({'message': 'Invalid category ID'}), 400
        
    # Check SKU uniqueness
    if Product.query.filter_by(SKU=SKU).first():
        return jsonify({'message': 'Product with this SKU already exists'}), 409
        
    # Stock status
    status = 'in_stock'
    if stock_count == 0:
        status = 'out_of_stock'
    elif stock_count < 10:
        status = 'low_stock'
        
    product = Product(
        name=name,
        title=title,
        description=description,
        price=price,
        discount_price=discount_price,
        stock_count=stock_count,
        category_id=category_id,
        brand=brand,
        seller_id=g.current_user_id,
        SKU=SKU,
        availability_status=status
    )
    db.session.add(product)
    db.session.flush() # Flush to get product.id before adding images
    
    # Handle Image Uploads
    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            filename = f"prod_{product.id}_{secure_filename(file.filename)}"
            file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))
            img_url = f"/api/products/uploads/{filename}"
            
            p_img = ProductImage(product_id=product.id, image_url=img_url)
            db.session.add(p_img)
            
    # Handle manual image URLs if submitted (comma separated)
    image_urls = request.form.get('image_urls')
    if image_urls:
        urls = [u.strip() for u in image_urls.split(',') if u.strip()]
        for url in urls:
            p_img = ProductImage(product_id=product.id, image_url=url)
            db.session.add(p_img)
            
    # Default image if none uploaded
    if not ProductImage.query.filter_by(product_id=product.id).first():
        default_img = ProductImage(
            product_id=product.id, 
            image_url="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop"
        )
        db.session.add(default_img)
        
    db.session.commit()
    return jsonify({
        'message': 'Product created successfully',
        'product': product.to_dict()
    }), 201

@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required
@role_required(['seller', 'admin'])
def update_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    # Check ownership unless Admin
    if g.current_user_role != 'admin' and product.seller_id != g.current_user_id:
        return jsonify({'message': 'Access forbidden: You do not own this product'}), 403
        
    name = request.form.get('name')
    title = request.form.get('title')
    description = request.form.get('description')
    price = request.form.get('price', type=float)
    discount_price = request.form.get('discount_price') # could be none
    stock_count = request.form.get('stock_count', type=int)
    category_id = request.form.get('category_id', type=int)
    brand = request.form.get('brand')
    SKU = request.form.get('SKU')
    
    if name: product.name = name
    if title: product.title = title
    if description: product.description = description
    if price is not None: product.price = price
    
    if discount_price is not None:
        product.discount_price = float(discount_price) if discount_price != '' else None
        
    if stock_count is not None:
        product.stock_count = stock_count
        if stock_count == 0:
            product.availability_status = 'out_of_stock'
        elif stock_count < 10:
            product.availability_status = 'low_stock'
        else:
            product.availability_status = 'in_stock'
            
    if category_id:
        category = Category.query.get(category_id)
        if category:
            product.category_id = category_id
            
    if brand: product.brand = brand
    if SKU: product.SKU = SKU
    
    # Handle image upload if provided
    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            # Delete old images to keep it clean
            ProductImage.query.filter_by(product_id=product.id).delete()
            
            filename = f"prod_{product.id}_{secure_filename(file.filename)}"
            file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))
            img_url = f"/api/products/uploads/{filename}"
            
            p_img = ProductImage(product_id=product.id, image_url=img_url)
            db.session.add(p_img)
            
    db.session.commit()
    return jsonify({
        'message': 'Product updated successfully',
        'product': product.to_dict()
    }), 200

@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required
@role_required(['seller', 'admin'])
def delete_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    # Check ownership unless Admin
    if g.current_user_role != 'admin' and product.seller_id != g.current_user_id:
        return jsonify({'message': 'Access forbidden: You do not own this product'}), 403
        
    # 1. Delete associated images
    db.session.query(ProductImage).filter_by(product_id=product_id).delete()
    
    # 2. Delete associated cart items
    db.session.query(CartItem).filter_by(product_id=product_id).delete()
    
    # 3. Delete associated order items
    db.session.query(OrderItem).filter_by(product_id=product_id).delete()
    
    # 4. Delete associated reviews
    db.session.query(Review).filter_by(product_id=product_id).delete()
    
    # 5. Delete associated wishlist entries
    db.session.query(Wishlist).filter_by(product_id=product_id).delete()
    
    # 6. Delete associated browsing history
    db.session.query(BrowsingHistory).filter_by(product_id=product_id).delete()
    
    # Commit cascade deletions first
    db.session.commit()
    
    # Re-query and delete parent product
    product = Product.query.get(product_id)
    if product:
        db.session.delete(product)
        db.session.commit()
        
    return jsonify({'message': 'Product deleted successfully'}), 200

# Reviews API
@products_bp.route('/<int:product_id>/reviews', methods=['GET'])
def get_reviews(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
    reviews = Review.query.filter_by(product_id=product_id).order_by(Review.created_at.desc()).all()
    return jsonify([rev.to_dict() for rev in reviews]), 200

@products_bp.route('/<int:product_id>/reviews', methods=['POST'])
@jwt_required
@role_required(['customer'])
def create_review(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    data = request.get_json() or {}
    rating = data.get('rating')
    comment = data.get('comment')
    
    if rating is not None:
        try:
            rating = int(rating)
        except (ValueError, TypeError):
            return jsonify({'message': 'Rating must be an integer between 1 and 5'}), 400
            
    if not rating or not (1 <= rating <= 5):
        return jsonify({'message': 'Rating must be an integer between 1 and 5'}), 400
        
    # Check if customer already reviewed this product
    existing_review = Review.query.filter_by(user_id=g.current_user_id, product_id=product_id).first()
    if existing_review:
        existing_review.rating = rating
        existing_review.comment = comment
    else:
        review = Review(
            user_id=g.current_user_id,
            product_id=product_id,
            rating=rating,
            comment=comment
        )
        db.session.add(review)
        
    db.session.commit()
    
    # Re-calculate average rating for product
    all_reviews = Review.query.filter_by(product_id=product_id).all()
    avg_rating = sum(r.rating for r in all_reviews) / len(all_reviews) if all_reviews else 0.0
    product.rating = round(avg_rating, 1)
    db.session.commit()
    
    return jsonify({
        'message': 'Review added successfully',
        'product_rating': product.rating
    }), 201

# Wishlist API
@products_bp.route('/wishlist', methods=['GET'])
@jwt_required
@role_required(['customer'])
def get_wishlist():
    wishlists = Wishlist.query.filter_by(user_id=g.current_user_id).all()
    return jsonify([w.to_dict() for w in wishlists]), 200

@products_bp.route('/<int:product_id>/wishlist', methods=['POST'])
@jwt_required
@role_required(['customer'])
def toggle_wishlist(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    wish = Wishlist.query.filter_by(user_id=g.current_user_id, product_id=product_id).first()
    if wish:
        db.session.delete(wish)
        db.session.commit()
        return jsonify({'message': 'Removed from wishlist', 'is_liked': False}), 200
    else:
        new_wish = Wishlist(user_id=g.current_user_id, product_id=product_id)
        db.session.add(new_wish)
        db.session.commit()
        return jsonify({'message': 'Added to wishlist', 'is_liked': True}), 200
