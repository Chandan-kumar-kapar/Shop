from flask import Blueprint, request, jsonify, g
from ..models import Category
from ..database import db
from ..auth import jwt_required, role_required

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([cat.to_dict() for cat in categories]), 200

@categories_bp.route('', methods=['POST'])
@jwt_required
@role_required(['admin'])
def create_category():
    data = request.get_json() or {}
    name = data.get('name')
    description = data.get('description')
    image_url = data.get('image_url')
    
    if not name:
        return jsonify({'message': 'Category name is required'}), 400
        
    if Category.query.filter_by(name=name).first():
        return jsonify({'message': 'Category with this name already exists'}), 409
        
    cat = Category(name=name, description=description, image_url=image_url)
    db.session.add(cat)
    db.session.commit()
    
    return jsonify({
        'message': 'Category created successfully',
        'category': cat.to_dict()
    }), 201
