from flask import Blueprint, request, jsonify, g
from ..models import User, Address
from ..database import db
from ..auth import generate_token, jwt_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    role = data.get('role', 'customer') # 'customer' or 'seller'
    
    if not email or not password or not name:
        return jsonify({'message': 'Email, password, and name are required'}), 400
        
    if role not in ['customer', 'seller']:
        return jsonify({'message': 'Invalid role. Must be customer or seller'}), 400
        
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'A user with this email already exists'}), 409
        
    user = User(email=email, name=name, role=role)
    user.set_password(password)
    
    # If seller registers, their account must be approved by admin
    if role == 'seller':
        user.status = 'pending'
    else:
        user.status = 'approved'
        
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'Registration successful',
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400
        
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password'}), 401
        
    if user.status == 'pending':
        return jsonify({'message': 'Your account is pending approval by the admin'}), 403
    elif user.status == 'blocked':
        return jsonify({'message': 'Your account has been blocked by the admin'}), 403
        
    token = generate_token(user.id, user.role)
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required
def get_profile():
    addresses = Address.query.filter_by(user_id=g.current_user_id).all()
    user_data = g.current_user.to_dict()
    user_data['addresses'] = [addr.to_dict() for addr in addresses]
    return jsonify(user_data), 200

@auth_bp.route('/me', methods=['PUT'])
@jwt_required
def update_profile():
    data = request.get_json() or {}
    
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if name:
        g.current_user.name = name
    if email:
        # Check if email is already taken by someone else
        existing_user = User.query.filter_by(email=email).first()
        if existing_user and existing_user.id != g.current_user_id:
            return jsonify({'message': 'Email already in use'}), 409
        g.current_user.email = email
    if password:
        g.current_user.set_password(password)
        
    db.session.commit()
    return jsonify({
        'message': 'Profile updated successfully',
        'user': g.current_user.to_dict()
    }), 200

@auth_bp.route('/addresses', methods=['GET'])
@jwt_required
def get_addresses():
    addresses = Address.query.filter_by(user_id=g.current_user_id).order_by(Address.is_default.desc()).all()
    return jsonify([addr.to_dict() for addr in addresses]), 200

@auth_bp.route('/addresses', methods=['POST'])
@jwt_required
def add_address():
    data = request.get_json() or {}
    
    full_name = data.get('full_name')
    address_line1 = data.get('address_line1')
    address_line2 = data.get('address_line2')
    city = data.get('city')
    state = data.get('state')
    postal_code = data.get('postal_code')
    country = data.get('country', 'USA')
    phone = data.get('phone')
    is_default = data.get('is_default', False)
    
    if not all([full_name, address_line1, city, state, postal_code, phone]):
        return jsonify({'message': 'Missing required address fields'}), 400
        
    # If set as default, remove default status from all other addresses of this user
    if is_default:
        Address.query.filter_by(user_id=g.current_user_id).update({Address.is_default: False})
        
    # If this is the user's first address, make it default anyway
    first_addr = Address.query.filter_by(user_id=g.current_user_id).first()
    if not first_addr:
        is_default = True
        
    address = Address(
        user_id=g.current_user_id,
        full_name=full_name,
        address_line1=address_line1,
        address_line2=address_line2,
        city=city,
        state=state,
        postal_code=postal_code,
        country=country,
        phone=phone,
        is_default=is_default
    )
    
    db.session.add(address)
    db.session.commit()
    
    return jsonify({
        'message': 'Address added successfully',
        'address': address.to_dict()
    }), 201

@auth_bp.route('/addresses/<int:address_id>', methods=['PUT'])
@jwt_required
def update_address(address_id):
    address = Address.query.filter_by(id=address_id, user_id=g.current_user_id).first()
    if not address:
        return jsonify({'message': 'Address not found'}), 404
        
    data = request.get_json() or {}
    
    address.full_name = data.get('full_name', address.full_name)
    address.address_line1 = data.get('address_line1', address.address_line1)
    address.address_line2 = data.get('address_line2', address.address_line2)
    address.city = data.get('city', address.city)
    address.state = data.get('state', address.state)
    address.postal_code = data.get('postal_code', address.postal_code)
    address.country = data.get('country', address.country)
    address.phone = data.get('phone', address.phone)
    
    is_default = data.get('is_default', address.is_default)
    if is_default and not address.is_default:
        Address.query.filter_by(user_id=g.current_user_id).update({Address.is_default: False})
        address.is_default = True
        
    db.session.commit()
    return jsonify({
        'message': 'Address updated successfully',
        'address': address.to_dict()
    }), 200

@auth_bp.route('/addresses/<int:address_id>', methods=['DELETE'])
@jwt_required
def delete_address(address_id):
    address = Address.query.filter_by(id=address_id, user_id=g.current_user_id).first()
    if not address:
        return jsonify({'message': 'Address not found'}), 404
        
    db.session.delete(address)
    
    # If the deleted address was default, make another one default if possible
    if address.is_default:
        next_addr = Address.query.filter_by(user_id=g.current_user_id).first()
        if next_addr:
            next_addr.is_default = True
            
    db.session.commit()
    return jsonify({'message': 'Address deleted successfully'}), 200
