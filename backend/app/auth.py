import os
import datetime
from functools import wraps
import jwt
from flask import request, jsonify, g
from .models import User

# Load secret key from environment or fallback
JWT_SECRET = os.environ.get('JWT_SECRET', 'shop_and_chil_super_secret_key_123!')

def generate_token(user_id, role):
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
        'iat': datetime.datetime.utcnow(),
        'sub': user_id,
        'role': role
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def decode_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return {'error': 'Token has expired'}
    except jwt.InvalidTokenError:
        return {'error': 'Invalid token'}

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                # Bearer <token>
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Bearer token format invalid'}), 401
                
        if not token:
            return jsonify({'message': 'Authorization token is missing'}), 401
            
        payload = decode_token(token)
        if 'error' in payload:
            return jsonify({'message': payload['error']}), 401
            
        g.current_user_id = payload['sub']
        g.current_user_role = payload['role']
        g.current_user = User.query.get(g.current_user_id)
        
        if not g.current_user:
            return jsonify({'message': 'User associated with this token not found'}), 401
            
        if g.current_user.status == 'blocked':
            return jsonify({'message': 'Your account has been blocked by the admin'}), 403
            
        return f(*args, **kwargs)
    return decorated

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Ensure jwt_required ran first (g.current_user_role must be set)
            if not hasattr(g, 'current_user_role'):
                return jsonify({'message': 'Authentication required before checking roles'}), 401
                
            if g.current_user_role not in allowed_roles:
                return jsonify({'message': 'Access forbidden: Insufficient permissions'}), 403
                
            return f(*args, **kwargs)
        return decorated
    return decorator
