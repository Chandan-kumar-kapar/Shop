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
        
    # Get user references
    seller_user = db_session.query(User).filter_by(email='seller@shop.com').first()
    customer_user = db_session.query(User).filter_by(email='customer@shop.com').first()
    admin_user = db_session.query(User).filter_by(email='admin@shop.com').first()
    
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
            
    # Refresh categories from DB
    electronics = db_session.query(Category).filter_by(name='Electronics').first()
    fashion = db_session.query(Category).filter_by(name='Fashion').first()
    home = db_session.query(Category).filter_by(name='Home & Living').first()
    books = db_session.query(Category).filter_by(name='Books & Stationery').first()

    # 3. Create Products
    products_data = [
        {
            'name': 'Wireless Noise-Cancelling Headphones',
            'title': 'Shop&Chil Premium Wireless ANC Headphones Over-Ear',
            'description': 'Immerse yourself in rich, high-fidelity sound. Features active noise cancellation (ANC), 40-hour battery life, fast charging, and memory foam earcups for ultimate comfort.',
            'price': 199.99,
            'discount_price': 149.99,
            'stock_count': 25,
            'category_id': electronics.id,
            'brand': 'AudioChil',
            'SKU': 'AUDIO-ANC-01',
            'image': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop'
        },
        {
            'name': 'Minimalist Mechanical Keyboard',
            'title': 'Compact Mechanical Keyboard (Hot-swappable, Backlit)',
            'description': 'A premium 75% mechanical keyboard with tactile brown switches, double-shot PBT keycaps, hot-swappable sockets, and customizable RGB backlighting. Fits perfectly on any desk setup.',
            'price': 89.99,
            'discount_price': None,
            'stock_count': 15,
            'category_id': electronics.id,
            'brand': 'KeyChil',
            'SKU': 'KEY-MECH-75',
            'image': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop'
        },
        {
            'name': 'Leather Travel Backpack',
            'title': 'Handcrafted Full-Grain Leather Travel & Laptop Backpack',
            'description': 'Made from premium water-resistant full-grain leather. Built with a padded 15-inch laptop compartment, robust metal zippers, and breathable mesh back straps for travel or daily commute.',
            'price': 145.00,
            'discount_price': 120.00,
            'stock_count': 8,
            'category_id': fashion.id,
            'brand': 'ChilGoods',
            'SKU': 'BAG-LTHR-TRV',
            'image': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop'
        },
        {
            'name': 'Sleek Smart Watch v2',
            'title': 'ChilFit Smart Watch v2 with Heart Rate & GPS',
            'description': 'Keep track of your health metrics and workout routines in style. Features an AMOLED display, 7-day battery, sleep monitoring, heart rate analysis, and oxygen tracking.',
            'price': 249.99,
            'discount_price': 199.99,
            'stock_count': 30,
            'category_id': electronics.id,
            'brand': 'ChilFit',
            'SKU': 'WTCH-SMART-V2',
            'image': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop'
        },
        {
            'name': 'Premium Matte Coffee Mug',
            'title': 'ChilHome Double-Wall Ceramic Matte Mug 400ml',
            'description': 'Keep your morning coffee hot for hours. Double-wall insulated ceramic mug with a wood-accented lid. Feels premium in your hands.',
            'price': 24.99,
            'discount_price': None,
            'stock_count': 50,
            'category_id': home.id,
            'brand': 'ChilHome',
            'SKU': 'MUG-CER-MATTE',
            'image': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop'
        },
        {
            'name': 'Ergonomic Mesh Desk Office Chair',
            'title': 'High-Back Ergonomic Office Chair with Adjustable Lumbar Support',
            'description': 'Designed for long working sessions. High-density breathable mesh back, fully adjustable lumbar support, 3D armrests, and 135-degree tilt control to relieve spine strain.',
            'price': 320.00,
            'discount_price': 269.00,
            'stock_count': 4,
            'category_id': home.id,
            'brand': 'ChilHome',
            'SKU': 'CHR-ERG-MESH',
            'image': 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=800&auto=format&fit=crop'
        },
        {
            'name': 'Dotted Grid Leather Notebook',
            'title': 'A5 Bullet Dotted Grid Notebook - Hardcover PU Leather',
            'description': 'Unleash your creativity. Thick ink-proof 120gsm paper, dotted grids, lay-flat binding, expandible inner pocket, and twin bookmarks. Perfect for sketching or journaling.',
            'price': 18.50,
            'discount_price': 14.99,
            'stock_count': 100,
            'category_id': books.id,
            'brand': 'ChilStationery',
            'SKU': 'NOTE-A5-GRID',
            'image': 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop'
        }
    ]
    
    for prod in products_data:
        existing = db_session.query(Product).filter_by(SKU=prod['SKU']).first()
        if not existing:
            status = 'in_stock'
            if prod['stock_count'] == 0:
                status = 'out_of_stock'
            elif prod['stock_count'] < 10:
                status = 'low_stock'
                
            new_p = Product(
                name=prod['name'],
                title=prod['title'],
                description=prod['description'],
                price=prod['price'],
                discount_price=prod['discount_price'],
                stock_count=prod['stock_count'],
                category_id=prod['category_id'],
                brand=prod['brand'],
                seller_id=seller_user.id,
                SKU=prod['SKU'],
                availability_status=status
            )
            db_session.add(new_p)
            db_session.commit()
            
            p_img = ProductImage(product_id=new_p.id, image_url=prod['image'])
            db_session.add(p_img)
            
            r1 = Review(user_id=customer_user.id, product_id=new_p.id, rating=5, comment='Absolutely love this product! Fits my needs perfectly and feels very premium.')
            r2 = Review(user_id=admin_user.id, product_id=new_p.id, rating=4, comment='Very high quality build. Shipping was fast and packaging was secure.')
            db_session.add(r1)
            db_session.add(r2)
            db_session.commit()
            print(f"Seeded product: {prod['name']}")
            
    db_session.close()
    print("Database successfully seeded!")

if __name__ == '__main__':
    seed_database()
