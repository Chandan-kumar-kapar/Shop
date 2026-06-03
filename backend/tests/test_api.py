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
