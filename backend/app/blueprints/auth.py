from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..models import User, Address
from ..database import get_db
from ..auth import generate_token, get_current_user, check_role
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List

router = APIRouter()

class UserRegisterSchema(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = 'customer'

class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str

class UserUpdateSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class AddressCreateSchema(BaseModel):
    full_name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: Optional[str] = 'USA'
    phone: str
    is_default: Optional[bool] = False

class AddressUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    is_default: Optional[bool] = None

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: UserRegisterSchema, db: Session = Depends(get_db)):
    if data.role not in ['customer', 'seller']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid role. Must be customer or seller'
        )
        
    if db.query(User).filter_by(email=data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='A user with this email already exists'
        )
        
    user = User(email=data.email, name=data.name, role=data.role)
    user.set_password(data.password)
    
    if data.role == 'seller':
        user.status = 'pending'
    else:
        user.status = 'approved'
        
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        'message': 'Registration successful',
        'user': user.to_dict()
    }

@router.post("/login")
def login(data: UserLoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=data.email).first()
    
    if not user or not user.check_password(data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid email or password'
        )
        
    if user.status == 'pending':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Your account is pending approval by the admin'
        )
    elif user.status == 'blocked':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Your account has been blocked by the admin'
        )
        
    token = generate_token(user.id, user.role)
    
    return {
        'token': token,
        'user': user.to_dict()
    }

@router.get("/me")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Addresses relationship is lazy loaded, let's load it
    addresses = db.query(Address).filter_by(user_id=user.id).all()
    user_data = user.to_dict()
    user_data['addresses'] = [addr.to_dict() for addr in addresses]
    return user_data

@router.put("/me")
def update_profile(data: UserUpdateSchema, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.name:
        user.name = data.name
    if data.email:
        existing_user = db.query(User).filter_by(email=data.email).first()
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='Email already in use'
            )
        user.email = data.email
    if data.password:
        user.set_password(data.password)
        
    db.commit()
    db.refresh(user)
    return {
        'message': 'Profile updated successfully',
        'user': user.to_dict()
    }

@router.get("/addresses")
def get_addresses(user: User = Depends(check_role(['customer', 'admin'])), db: Session = Depends(get_db)):
    addresses = db.query(Address).filter_by(user_id=user.id).order_by(Address.is_default.desc()).all()
    return [addr.to_dict() for addr in addresses]

@router.post("/addresses", status_code=status.HTTP_201_CREATED)
def add_address(data: AddressCreateSchema, user: User = Depends(check_role(['customer'])), db: Session = Depends(get_db)):
    # If set as default, remove default status from all other addresses of this user
    if data.is_default:
        db.query(Address).filter_by(user_id=user.id).update({Address.is_default: False})
        
    # If this is the user's first address, make it default anyway
    first_addr = db.query(Address).filter_by(user_id=user.id).first()
    is_default = data.is_default
    if not first_addr:
        is_default = True
        
    address = Address(
        user_id=user.id,
        full_name=data.full_name,
        address_line1=data.address_line1,
        address_line2=data.address_line2,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        country=data.country,
        phone=data.phone,
        is_default=is_default
    )
    
    db.add(address)
    db.commit()
    db.refresh(address)
    
    return {
        'message': 'Address added successfully',
        'address': address.to_dict()
    }

@router.put("/addresses/{address_id}")
def update_address(address_id: int, data: AddressUpdateSchema, user: User = Depends(check_role(['customer'])), db: Session = Depends(get_db)):
    address = db.query(Address).filter_by(id=address_id, user_id=user.id).first()
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Address not found'
        )
        
    if data.full_name is not None: address.full_name = data.full_name
    if data.address_line1 is not None: address.address_line1 = data.address_line1
    if data.address_line2 is not None: address.address_line2 = data.address_line2
    if data.city is not None: address.city = data.city
    if data.state is not None: address.state = data.state
    if data.postal_code is not None: address.postal_code = data.postal_code
    if data.country is not None: address.country = data.country
    if data.phone is not None: address.phone = data.phone
    
    if data.is_default is not None:
        if data.is_default and not address.is_default:
            db.query(Address).filter_by(user_id=user.id).update({Address.is_default: False})
            address.is_default = True
        elif not data.is_default:
            address.is_default = False
            
    db.commit()
    db.refresh(address)
    return {
        'message': 'Address updated successfully',
        'address': address.to_dict()
    }

@router.delete("/addresses/{address_id}")
def delete_address(address_id: int, user: User = Depends(check_role(['customer'])), db: Session = Depends(get_db)):
    address = db.query(Address).filter_by(id=address_id, user_id=user.id).first()
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Address not found'
        )
        
    db.delete(address)
    
    # If the deleted address was default, make another one default if possible
    if address.is_default:
        next_addr = db.query(Address).filter_by(user_id=user.id).first()
        if next_addr:
            next_addr.is_default = True
            
    db.commit()
    return {
        'message': 'Address deleted successfully'
    }
