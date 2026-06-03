from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile, Query
from sqlalchemy.orm import Session
from ..models import Product, ProductImage, Category, Review, Wishlist, BrowsingHistory, User, CartItem, OrderItem
from ..database import get_db, UPLOAD_FOLDER
from ..auth import get_current_user, check_role, get_optional_user_id
from pydantic import BaseModel, Field
import os
import uuid
from typing import Optional, List
from werkzeug.utils import secure_filename

router = APIRouter()

class ReviewCreateSchema(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

@router.get("")
def get_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_filter)) | 
            (Product.title.ilike(search_filter)) | 
            (Product.description.ilike(search_filter)) | 
            (Product.brand.ilike(search_filter))
        )
        
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
        
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
        
    # Execution
    products = query.all()
    
    # Sorting in-memory because average rating is a dynamic python property
    if sort_by == 'price_asc':
        products.sort(key=lambda p: p.discount_price if p.discount_price else p.price)
    elif sort_by == 'price_desc':
        products.sort(key=lambda p: p.discount_price if p.discount_price else p.price, reverse=True)
    elif sort_by == 'rating':
        products.sort(key=lambda p: p.rating, reverse=True)
    elif sort_by == 'newest':
        products.sort(key=lambda p: p.created_at, reverse=True)
        
    return [p.to_dict() for p in products]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    name: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    discount_price: Optional[float] = Form(None),
    stock_count: int = Form(0),
    category_id: int = Form(...),
    brand: str = Form(...),
    SKU: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    image_urls: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(check_role(['seller', 'admin']))
):
    if not SKU:
        SKU = f"SKU-{str(uuid.uuid4())[:8].upper()}"
        
    category = db.query(Category).filter_by(id=category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid category ID'
        )
        
    if db.query(Product).filter_by(SKU=SKU).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Product with this SKU already exists'
        )
        
    status_str = 'in_stock'
    if stock_count == 0:
        status_str = 'out_of_stock'
    elif stock_count < 10:
        status_str = 'low_stock'
        
    product = Product(
        name=name,
        title=title,
        description=description,
        price=price,
        discount_price=discount_price,
        stock_count=stock_count,
        category_id=category_id,
        brand=brand,
        seller_id=user.id,
        SKU=SKU,
        availability_status=status_str
    )
    db.add(product)
    db.flush()
    
    if image and image.filename:
        filename = f"prod_{product.id}_{secure_filename(image.filename)}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        with open(filepath, "wb") as f:
            f.write(image.file.read())
        img_url = f"/api/products/uploads/{filename}"
        p_img = ProductImage(product_id=product.id, image_url=img_url)
        db.add(p_img)
        
    if image_urls:
        urls = [u.strip() for u in image_urls.split(',') if u.strip()]
        for url in urls:
            p_img = ProductImage(product_id=product.id, image_url=url)
            db.add(p_img)
            
    # Default image if none uploaded
    db.flush()
    if not db.query(ProductImage).filter_by(product_id=product.id).first():
        default_img = ProductImage(
            product_id=product.id,
            image_url="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop"
        )
        db.add(default_img)
        
    db.commit()
    db.refresh(product)
    return {
        'message': 'Product created successfully',
        'product': product.to_dict()
    }

@router.get("/{product_id}")
def get_product(
    product_id: int,
    session_id: Optional[str] = None,
    user_id: Optional[int] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Product not found'
        )
        
    # Track browsing history
    bh = BrowsingHistory(user_id=user_id, session_id=session_id, product_id=product_id)
    db.add(bh)
    db.commit()
    
    return product.to_dict()

@router.put("/{product_id}")
def update_product(
    product_id: int,
    name: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    discount_price: Optional[str] = Form(None), # string to handle optional empty value
    stock_count: Optional[int] = Form(None),
    category_id: Optional[int] = Form(None),
    brand: Optional[str] = Form(None),
    SKU: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(check_role(['seller', 'admin']))
):
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Product not found'
        )
        
    if user.role != 'admin' and product.seller_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Access forbidden: You do not own this product'
        )
        
    if name is not None: product.name = name
    if title is not None: product.title = title
    if description is not None: product.description = description
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
        category = db.query(Category).filter_by(id=category_id).first()
        if category:
            product.category_id = category_id
            
    if brand is not None: product.brand = brand
    if SKU is not None: product.SKU = SKU
    
    if image and image.filename:
        # Delete old images to keep it clean
        db.query(ProductImage).filter_by(product_id=product.id).delete()
        filename = f"prod_{product.id}_{secure_filename(image.filename)}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        with open(filepath, "wb") as f:
            f.write(image.file.read())
        img_url = f"/api/products/uploads/{filename}"
        p_img = ProductImage(product_id=product.id, image_url=img_url)
        db.add(p_img)
        
    db.commit()
    db.refresh(product)
    return {
        'message': 'Product updated successfully',
        'product': product.to_dict()
    }

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(check_role(['seller', 'admin']))
):
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Product not found'
        )
        
    if user.role != 'admin' and product.seller_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Access forbidden: You do not own this product'
        )
        
    # Cascade cleanups
    db.query(ProductImage).filter_by(product_id=product_id).delete()
    db.query(CartItem).filter_by(product_id=product_id).delete()
    db.query(OrderItem).filter_by(product_id=product_id).delete()
    db.query(Review).filter_by(product_id=product_id).delete()
    db.query(Wishlist).filter_by(product_id=product_id).delete()
    db.query(BrowsingHistory).filter_by(product_id=product_id).delete()
    db.commit()
    
    product = db.query(Product).filter_by(id=product_id).first()
    if product:
        db.delete(product)
        db.commit()
        
    return {'message': 'Product deleted successfully'}

# Reviews API
@router.get("/{product_id}/reviews")
def get_reviews(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Product not found'
        )
        
    reviews = db.query(Review).filter_by(product_id=product_id).order_by(Review.created_at.desc()).all()
    return [rev.to_dict() for rev in reviews]

@router.post("/{product_id}/reviews", status_code=status.HTTP_201_CREATED)
def create_review(
    product_id: int,
    data: ReviewCreateSchema,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Product not found'
        )
        
    # Check if user already reviewed
    existing = db.query(Review).filter_by(user_id=user.id, product_id=product_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='You have already reviewed this product'
        )
        
    review = Review(
        user_id=user.id,
        product_id=product_id,
        rating=data.rating,
        comment=data.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    
    return {
        'message': 'Review added successfully',
        'review': review.to_dict()
    }
