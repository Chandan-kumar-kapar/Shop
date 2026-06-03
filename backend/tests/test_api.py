import pytest
import tempfile
import os
import json
from app import create_app
from app.database import db
from app.models import User, Category, Product, ProductImage

@pytest.fixture
def client():
    # Setup temporary database file path
    db_fd, db_path = tempfile.mkstemp()
    
    # Override environment variable so create_app uses the test DB from the start
    os.environ['DATABASE_URL'] = f"sqlite:///{db_path}"
    
    app = create_app()
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # Seed a default category
            cat = Category(name="Electronics", description="Electro devices")
            db.session.add(cat)
            db.session.commit()
        yield client
        
    os.close(db_fd)
    os.unlink(db_path)
    # Clean up environment variable
    if 'DATABASE_URL' in os.environ:
        del os.environ['DATABASE_URL']

def test_health_check(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'

def test_user_registration_and_login(client):
    # 1. Register customer
    response = client.post('/api/auth/register', json={
        'email': 'test@customer.com',
        'password': 'password123',
        'name': 'Test Customer',
        'role': 'customer'
    })
    assert response.status_code == 201
    
    # 2. Login
    response = client.post('/api/auth/login', json={
        'email': 'test@customer.com',
        'password': 'password123'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'token' in data
    assert data['user']['role'] == 'customer'

def test_get_products(client):
    response = client.get('/api/products')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
