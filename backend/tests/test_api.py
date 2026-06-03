import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models import User, Category, Product, ProductImage, Review, Wishlist, BrowsingHistory, Cart, CartItem, Order, OrderItem, Address, Payment, Notification

# Setup SQLite test DB
SQLALCHEMY_DATABASE_URL = "sqlite:////tmp/test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        if os.path.exists("/tmp/test.db"):
            try:
                os.remove("/tmp/test.db")
            except Exception:
                pass

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Seed default category for tests
    cat = Category(name="Electronics", description="Electro devices")
    db_session.add(cat)
    db_session.commit()
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

def test_health_check(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.json()
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
    data = response.json()
    assert 'token' in data
    assert data['user']['role'] == 'customer'

def test_get_products(client):
    response = client.get('/api/products')
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_create_product_success(client, db_session):
    # 1. Register seller
    client.post('/api/auth/register', json={
        'email': 'seller_test@shop.com',
        'password': 'password123',
        'name': 'Test Seller',
        'role': 'seller'
    })
    
    # Approve seller in database
    seller = db_session.query(User).filter_by(email='seller_test@shop.com').first()
    seller.status = 'approved'
    db_session.commit()
    
    # 2. Login
    login_res = client.post('/api/auth/login', json={
        'email': 'seller_test@shop.com',
        'password': 'password123'
    })
    token = login_res.json()['token']
    
    # 3. Create product with empty values (mimicking React state before dropdown selection/typing)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "Test Product",
        "title": "Sub Test Product",
        "description": "This is a test description",
        "price": "12.99",
        "discount_price": "",
        "stock_count": "",
        "category_id": "",
        "brand": "",
        "SKU": ""
    }
    # Form data request
    res = client.post("/api/products", data=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["product"]["name"] == "Test Product"
    assert data["product"]["discount_price"] is None
    assert data["product"]["stock_count"] == 0
    assert data["product"]["category_id"] is not None
    assert data["product"]["brand"] == ""
