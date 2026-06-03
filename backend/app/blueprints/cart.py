from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from ..models import User, Cart, CartItem, Product
from ..database import get_db
from ..auth import decode_token
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class AddToCartSchema(BaseModel):
    session_id: Optional[str] = None
    product_id: int
    quantity: Optional[int] = 1

class UpdateCartItemSchema(BaseModel):
    quantity: int

class MergeCartSchema(BaseModel):
    session_id: str

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

def get_or_create_cart(user_id: Optional[int], session_id: Optional[str], db: Session):
    if user_id:
        cart = db.query(Cart).filter_by(user_id=user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart
    elif session_id:
        cart = db.query(Cart).filter_by(session_id=session_id).first()
        if not cart:
            cart = Cart(session_id=session_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart
    return None

@router.get("")
def get_cart(
    session_id: Optional[str] = None,
    user_id: Optional[int] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    if not user_id and not session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Either user token or guest session_id is required'
        )
        
    cart = get_or_create_cart(user_id, session_id, db)
    if not cart:
        return {'items': [], 'total_price': 0.0}
        
    # Auto merge guest cart if both user_id and session_id are provided
    if user_id and session_id:
        guest_cart = db.query(Cart).filter_by(session_id=session_id).first()
        if guest_cart and guest_cart.id != cart.id:
            for item in guest_cart.items:
                existing_item = db.query(CartItem).filter_by(cart_id=cart.id, product_id=item.product_id).first()
                if existing_item:
                    existing_item.quantity += item.quantity
                else:
                    new_item = CartItem(cart_id=cart.id, product_id=item.product_id, quantity=item.quantity)
                    db.add(new_item)
            db.delete(guest_cart)
            db.commit()
            db.refresh(cart)
            
    items = db.query(CartItem).filter_by(cart_id=cart.id).all()
    
    # Calculate cart total
    total = 0.0
    serialized_items = []
    for item in items:
        prod = item.product
        if prod:
            price = prod.discount_price if prod.discount_price else prod.price
            total += price * item.quantity
            serialized_items.append(item.to_dict())
            
    return {
        'cart_id': cart.id,
        'items': serialized_items,
        'total_price': round(total, 2)
    }

@router.post("")
def add_to_cart(
    data: AddToCartSchema,
    user_id: Optional[int] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter_by(id=data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Product not found'
        )
        
    if product.stock_count <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Product is out of stock'
        )
        
    if not user_id and not data.session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Authentication or guest session_id required'
        )
        
    cart = get_or_create_cart(user_id, data.session_id, db)
    
    # Check if item already exists in cart
    cart_item = db.query(CartItem).filter_by(cart_id=cart.id, product_id=data.product_id).first()
    if cart_item:
        new_qty = cart_item.quantity + data.quantity
        if new_qty > product.stock_count:
            cart_item.quantity = product.stock_count
        else:
            cart_item.quantity = new_qty
    else:
        qty = data.quantity
        if qty > product.stock_count:
            qty = product.stock_count
        cart_item = CartItem(cart_id=cart.id, product_id=data.product_id, quantity=qty)
        db.add(cart_item)
        
    db.commit()
    db.refresh(cart_item)
    return {'message': 'Item added to cart', 'item': cart_item.to_dict()}

@router.put("/{item_id}")
def update_cart_item(
    item_id: int,
    data: UpdateCartItemSchema,
    session_id: Optional[str] = None,
    user_id: Optional[int] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    if data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Quantity must be a positive integer'
        )
        
    if not user_id and not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Authentication or session_id required'
        )
        
    cart = get_or_create_cart(user_id, session_id, db)
    cart_item = db.query(CartItem).filter_by(id=item_id, cart_id=cart.id).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Cart item not found'
        )
        
    product = db.query(Product).filter_by(id=cart_item.product_id).first()
    if data.quantity > product.stock_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Cannot exceed available stock of {product.stock_count}'
        )
        
    cart_item.quantity = data.quantity
    db.commit()
    db.refresh(cart_item)
    
    return {'message': 'Cart item updated', 'item': cart_item.to_dict()}

@router.delete("/{item_id}")
def remove_from_cart(
    item_id: int,
    session_id: Optional[str] = None,
    user_id: Optional[int] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    if not user_id and not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Authentication or session_id required'
        )
        
    cart = get_or_create_cart(user_id, session_id, db)
    cart_item = db.query(CartItem).filter_by(id=item_id, cart_id=cart.id).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Cart item not found'
        )
        
    db.delete(cart_item)
    db.commit()
    
    return {'message': 'Item removed from cart'}

@router.post("/merge")
def merge_cart(
    data: MergeCartSchema,
    user_id: Optional[int] = Depends(get_optional_user_id),
    db: Session = Depends(get_db)
):
    if not user_id or not data.session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Both authorization token and session_id are required for merging'
        )
        
    user_cart = get_or_create_cart(user_id, None, db)
    guest_cart = db.query(Cart).filter_by(session_id=data.session_id).first()
    
    if guest_cart:
        for item in guest_cart.items:
            existing_item = db.query(CartItem).filter_by(cart_id=user_cart.id, product_id=item.product_id).first()
            prod = db.query(Product).filter_by(id=item.product_id).first()
            if not prod:
                continue
                
            if existing_item:
                new_qty = existing_item.quantity + item.quantity
                existing_item.quantity = min(new_qty, prod.stock_count)
            else:
                new_qty = min(item.quantity, prod.stock_count)
                new_item = CartItem(cart_id=user_cart.id, product_id=item.product_id, quantity=new_qty)
                db.add(new_item)
                
        db.delete(guest_cart)
        db.commit()
        
    return {'message': 'Carts merged successfully'}
