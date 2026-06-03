from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..models import Category, User
from ..database import get_db
from ..auth import get_current_user, check_role
from pydantic import BaseModel, Field

router = APIRouter()

class CategoryCreateSchema(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = None
    image_url: str = None

@router.get("")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return [cat.to_dict() for cat in categories]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreateSchema,
    db: Session = Depends(get_db),
    admin: User = Depends(check_role(['admin']))
):
    if db.query(Category).filter_by(name=data.name).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Category with this name already exists'
        )
        
    cat = Category(name=data.name, description=data.description, image_url=data.image_url)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    
    return {
        'message': 'Category created successfully',
        'category': cat.to_dict()
    }
