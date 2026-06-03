from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile, Query
from sqlalchemy.orm import Session
from ..models import Product, ProductImage, Category, Review, Wishlist, BrowsingHistory, User, CartItem, OrderItem
from ..database import get_db, UPLOAD_FOLDER
from ..auth import get_current_user, check_role, get_optional_user_id
from pydantic import BaseModel, Field
import os
import uuid
import httpx
from typing import Optional, List
from werkzeug.utils import secure_filename

router = APIRouter()

def upload_image(image: UploadFile, product_id: int) -> str:
    # Read image data
    image_bytes = image.file.read()
    image.file.seek(0)  # Reset file pointer
    
    github_token = os.environ.get("GITHUB_TOKEN")
    github_repo = os.environ.get("GITHUB_REPO", "shop_product_Images")
    github_username = os.environ.get("GITHUB_USERNAME")
    
    owner = github_username
    repo = github_repo
    if github_repo and "/" in github_repo:
        parts = github_repo.split("/", 1)
        owner = parts[0]
        repo = parts[1]
        
    if github_token and owner and repo:
        import base64
        print(f" * Uploading image to GitHub repository {owner}/{repo}...")
        clean_name = secure_filename(image.filename) if image.filename else "image.jpg"
        unique_id = str(uuid.uuid4())[:8]
        filename = f"prod_{product_id}_{unique_id}_{clean_name}"
        path = f"images/{filename}"
        
        url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        headers = {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        
        content_b64 = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "message": f"Upload product {product_id} image {filename}",
            "content": content_b64
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.put(url, headers=headers, json=payload)
                if response.status_code in (200, 201):
                    res_data = response.json()
                    img_url = res_data["content"]["download_url"]
                    print(f" * Successfully uploaded to GitHub: {img_url}")
                    return img_url
                else:
                    print(f" * GitHub upload failed ({response.status_code}): {response.text}")
        except Exception as e:
            print(f" * Error uploading to GitHub: {e}")
            
    # Fallback to local file upload if GitHub failed or credentials are missing
    print(" * Falling back to local upload folder.")
    filename = f"prod_{product_id}_{secure_filename(image.filename)}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)
    return f"/api/products/uploads/{filename}"

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
    price: str = Form(...),
    discount_price: Optional[str] = Form(None),
    stock_count: str = Form("0"),
    category_id: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    SKU: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    image_urls: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(check_role(['seller', 'admin']))
):
    if not SKU or not SKU.strip():
        SKU = f"SKU-{str(uuid.uuid4())[:8].upper()}"
        
    try:
        price_val = float(price)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid price value'
        )

    try:
        stock_count_val = int(stock_count) if stock_count and stock_count.strip() != "" else 0
    except ValueError:
        stock_count_val = 0

    category_id_val = None
    if category_id and category_id.strip() != "":
        try:
            category_id_val = int(category_id)
        except ValueError:
            pass

    if category_id_val is None:
        # Fallback to the first category in the database
        first_cat = db.query(Category).order_by(Category.id.asc()).first()
        if first_cat:
            category_id_val = first_cat.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='No categories exist in the database'
            )

    category = db.query(Category).filter_by(id=category_id_val).first()
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
    if stock_count_val == 0:
        status_str = 'out_of_stock'
    elif stock_count_val < 10:
        status_str = 'low_stock'
        
    discount_price_val = float(discount_price) if discount_price and discount_price.strip() != "" else None
    brand_val = brand.strip() if brand else ""
        
    product = Product(
        name=name,
        title=title,
        description=description,
        price=price_val,
        discount_price=discount_price_val,
        stock_count=stock_count_val,
        category_id=category_id_val,
        brand=brand_val,
        seller_id=user.id,
        SKU=SKU,
        availability_status=status_str
    )
    db.add(product)
    db.flush()
    
    if image and image.filename:
        img_url = upload_image(image, product.id)
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
    price: Optional[str] = Form(None),
    discount_price: Optional[str] = Form(None),
    stock_count: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
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
    
    if price is not None and price.strip() != "":
        try:
            product.price = float(price)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invalid price value'
            )
    
    if discount_price is not None:
        product.discount_price = float(discount_price) if discount_price.strip() != "" else None
        
    if stock_count is not None:
        try:
            stock_count_val = int(stock_count) if stock_count.strip() != "" else 0
            product.stock_count = stock_count_val
            if stock_count_val == 0:
                product.availability_status = 'out_of_stock'
            elif stock_count_val < 10:
                product.availability_status = 'low_stock'
            else:
                product.availability_status = 'in_stock'
        except ValueError:
            pass
            
    if category_id is not None and category_id.strip() != "":
        try:
            cat_id_int = int(category_id)
            category = db.query(Category).filter_by(id=cat_id_int).first()
            if category:
                product.category_id = cat_id_int
        except ValueError:
            pass
            
    if brand is not None: product.brand = brand.strip()
    if SKU is not None: product.SKU = SKU
    
    if image and image.filename:
        # Delete old images to keep it clean
        db.query(ProductImage).filter_by(product_id=product.id).delete()
        img_url = upload_image(image, product.id)
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
