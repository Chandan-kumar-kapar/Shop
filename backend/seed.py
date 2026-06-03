import time
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from app.database import SessionLocal, engine, Base
from app.models import User, Category, Product, ProductImage, Review

def seed_database():
    # Wait for database to be ready
    retries = 15
    while retries > 0:
        db_session = SessionLocal()
        try:
            db_session.execute(text('SELECT 1'))
            db_session.close()
            break
        except Exception as e:
            try:
                db_session.close()
            except Exception:
                pass
            retries -= 1
            print(f"Database not ready yet. Retrying in 2 seconds... ({retries} retries left). Error: {e}")
            time.sleep(2)
    else:
        print("Could not connect to database. Exiting.")
        return

    # Make sure tables are created in the database first
    Base.metadata.create_all(bind=engine)
    
    db_session = SessionLocal()

    print("Seeding database...")
    
    # 1. Create Users
    admin = db_session.query(User).filter_by(email='admin@shop.com').first()
    if not admin:
        admin = User(email='admin@shop.com', name='Shop Admin', role='admin', status='approved')
        admin.set_password('admin123')
        db_session.add(admin)
        db_session.commit()
        print("Seeded admin user (admin@shop.com / admin123)")
        
    seller = db_session.query(User).filter_by(email='seller@shop.com').first()
    if not seller:
        seller = User(email='seller@shop.com', name='Chill Electronics Ltd', role='seller', status='approved')
        seller.set_password('seller123')
        db_session.add(seller)
        db_session.commit()
        print("Seeded seller user (seller@shop.com / seller123)")
        
    customer = db_session.query(User).filter_by(email='customer@shop.com').first()
    if not customer:
        customer = User(email='customer@shop.com', name='John Doe', role='customer', status='approved')
        customer.set_password('customer123')
        db_session.add(customer)
        db_session.commit()
        print("Seeded customer user (customer@shop.com / customer123)")
        
    # 2. Create Categories
    categories_data = [
        {'name': 'Electronics', 'description': 'Gadgets, devices and modern electronic solutions', 'image_url': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop'},
        {'name': 'Fashion', 'description': 'Premium clothing, bags and accessories', 'image_url': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop'},
        {'name': 'Home & Living', 'description': 'Elegant furniture, kitchenware and home decor', 'image_url': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop'},
        {'name': 'Books & Stationery', 'description': 'Notebooks, pens and creative literature', 'image_url': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop'}
    ]
    
    for cat in categories_data:
        existing = db_session.query(Category).filter_by(name=cat['name']).first()
        if not existing:
            existing = Category(name=cat['name'], description=cat['description'], image_url=cat['image_url'])
            db_session.add(existing)
            db_session.commit()
            print(f"Seeded category: {cat['name']}")
            
    db_session.close()
    print("Database successfully seeded!")

if __name__ == '__main__':
    seed_database()
