from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..models import Product, BrowsingHistory, SearchHistory, OrderItem
from ..database import get_db
from ..auth import get_optional_user_id
from typing import Optional

router = APIRouter()

@router.get("")
def get_recommendations(
    session_id: Optional[str] = None,
    user_id: Optional[int] = Depends(get_optional_user_id),
    limit: int = Query(8),
    db: Session = Depends(get_db)
):
    recommended_products = []
    
    # 1. User is Logged In - Personalized Recommendations
    if user_id:
        # Get recently viewed product categories
        recent_views = db.query(BrowsingHistory).filter_by(user_id=user_id)\
            .order_by(BrowsingHistory.created_at.desc()).limit(15).all()
            
        browsed_prod_ids = [rv.product_id for rv in recent_views]
        
        # Get categories of browsed products
        category_ids = set()
        if browsed_prod_ids:
            browsed_products = db.query(Product).filter(Product.id.in_(browsed_prod_ids)).all()
            category_ids = {p.category_id for p in browsed_products}
            
        # Get products in the same categories, excluding already viewed items
        if category_ids:
            rec_query = db.query(Product).filter(Product.category_id.in_(category_ids))
            if browsed_prod_ids:
                rec_query = rec_query.filter(Product.id.notin_(browsed_prod_ids))
            recommended_products = rec_query.order_by(Product.rating.desc()).limit(limit).all()
            
        # Add recently viewed products to recommendations list if we need more
        if len(recommended_products) < limit and browsed_prod_ids:
            remaining = limit - len(recommended_products)
            recent_prods = db.query(Product).filter(Product.id.in_(browsed_prod_ids)).limit(remaining).all()
            recommended_products.extend(recent_prods)

    # 2. Guest or Fallback (Not logged in, or no history yet) - Trending/Best Sellers
    if len(recommended_products) < limit:
        remaining_limit = limit - len(recommended_products)
        already_recommended_ids = [p.id for p in recommended_products]
        
        # Fetch trending (highest rating first, then newest)
        trending_query = db.query(Product)
        if already_recommended_ids:
            trending_query = trending_query.filter(Product.id.notin_(already_recommended_ids))
            
        trending = trending_query.order_by(Product.rating.desc(), Product.created_at.desc()).limit(remaining_limit).all()
        recommended_products.extend(trending)
        
    return [p.to_dict() for p in recommended_products[:limit]]

@router.get("/related/{product_id}")
def get_related_products(
    product_id: int,
    limit: int = Query(4),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')
        
    # Related products in the same category, excluding current product
    related = db.query(Product).filter(Product.category_id == product.category_id, Product.id != product_id)\
        .order_by(Product.rating.desc())\
        .limit(limit).all()
        
    # If not enough related in category, pad with top-rated items
    if len(related) < limit:
        already_ids = [p.id for p in related] + [product_id]
        remaining = limit - len(related)
        padding = db.query(Product).filter(Product.id.notin_(already_ids))\
            .order_by(Product.rating.desc())\
            .limit(remaining).all()
        related.extend(padding)
        
    return [p.to_dict() for p in related[:limit]]
