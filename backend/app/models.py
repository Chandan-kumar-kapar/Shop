import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash
from .database import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default='customer') # 'admin', 'seller', 'customer'
    status = Column(String(20), nullable=False, default='approved') # 'pending' (for sellers), 'approved', 'blocked'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    addresses = relationship('Address', back_populates='user', cascade="all, delete-orphan")
    products = relationship('Product', back_populates='seller')
    wishlists = relationship('Wishlist', back_populates='user', cascade="all, delete-orphan")
    reviews = relationship('Review', back_populates='user')
    orders = relationship('Order', back_populates='user')
    notifications = relationship('Notification', back_populates='user', cascade="all, delete-orphan")
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

class Category(Base):
    __tablename__ = 'categories'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    
    products = relationship('Product', back_populates='category')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'image_url': self.image_url
        }

class Product(Base):
    __tablename__ = 'products'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    discount_price = Column(Float, nullable=True)
    stock_count = Column(Integer, nullable=False, default=0)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=False)
    brand = Column(String(100), nullable=False)
    seller_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    SKU = Column(String(100), unique=True, nullable=False)
    availability_status = Column(String(50), nullable=False, default='in_stock') # 'in_stock', 'low_stock', 'out_of_stock'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    images = relationship('ProductImage', back_populates='product', cascade="all, delete-orphan")
    category = relationship('Category', back_populates='products')
    seller = relationship('User', back_populates='products')
    
    @property
    def rating(self):
        # Calculate dynamic average rating from DB Reviews
        # Since this is a property, it's convenient for to_dict()
        # We will use raw python query inside property
        from .database import SessionLocal
        session = SessionLocal()
        try:
            reviews = session.query(Review).filter_by(product_id=self.id).all()
            if not reviews:
                return 0.0
            return round(sum(r.rating for r in reviews) / len(reviews), 1)
        finally:
            session.close()

    def to_dict(self, include_seller=False):
        return {
            'id': self.id,
            'name': self.name,
            'title': self.title,
            'description': self.description,
            'price': self.price,
            'discount_price': self.discount_price,
            'stock_count': self.stock_count,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'brand': self.brand,
            'rating': self.rating,
            'seller_id': self.seller_id,
            'seller_name': self.seller.name if self.seller else None,
            'SKU': self.SKU,
            'availability_status': self.availability_status,
            'images': [img.image_url for img in self.images],
            'created_at': self.created_at.isoformat()
        }

class ProductImage(Base):
    __tablename__ = 'product_images'
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    image_url = Column(String(255), nullable=False)
    
    product = relationship('Product', back_populates='images')

class Cart(Base):
    __tablename__ = 'carts'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    session_id = Column(String(100), nullable=True) # for guest users
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    items = relationship('CartItem', back_populates='cart', lazy='subquery', cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = 'cart_items'
    
    id = Column(Integer, primary_key=True)
    cart_id = Column(Integer, ForeignKey('carts.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationship to get product info quickly
    product = relationship('Product', lazy='subquery')
    cart = relationship('Cart', back_populates='items')
    
    def to_dict(self):
        return {
            'id': self.id,
            'cart_id': self.cart_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'product': self.product.to_dict() if self.product else None
        }

class Order(Base):
    __tablename__ = 'orders'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    session_id = Column(String(100), nullable=True) # for guests
    status = Column(String(20), nullable=False, default='pending') # 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    total_amount = Column(Float, nullable=False)
    shipping_address_id = Column(Integer, ForeignKey('addresses.id'), nullable=False)
    tracking_number = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    items = relationship('OrderItem', back_populates='order', cascade="all, delete-orphan")
    shipping_address = relationship('Address', foreign_keys=[shipping_address_id])
    payment = relationship('Payment', back_populates='order', uselist=False, cascade="all, delete-orphan")
    user = relationship('User', back_populates='orders')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'status': self.status,
            'total_amount': self.total_amount,
            'shipping_address': self.shipping_address.to_dict() if self.shipping_address else None,
            'tracking_number': self.tracking_number,
            'created_at': self.created_at.isoformat(),
            'items': [item.to_dict() for item in self.items],
            'payment': self.payment.to_dict() if self.payment else None
        }

class OrderItem(Base):
    __tablename__ = 'order_items'
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    price = Column(Float, nullable=False)
    discount_price = Column(Float, nullable=True)
    seller_id = Column(Integer, ForeignKey('users.id'), nullable=False) # tracking which seller gets paid
    
    product = relationship('Product', lazy='subquery')
    order = relationship('Order', back_populates='items')
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'price': self.price,
            'discount_price': self.discount_price,
            'seller_id': self.seller_id,
            'product': self.product.to_dict() if self.product else None
        }

class Address(Base):
    __tablename__ = 'addresses'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    session_id = Column(String(100), nullable=True) # for guests
    full_name = Column(String(100), nullable=False)
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False, default='USA')
    phone = Column(String(20), nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship('User', back_populates='addresses')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'full_name': self.full_name,
            'address_line1': self.address_line1,
            'address_line2': self.address_line2,
            'city': self.city,
            'state': self.state,
            'postal_code': self.postal_code,
            'country': self.country,
            'phone': self.phone,
            'is_default': self.is_default
        }

class Wishlist(Base):
    __tablename__ = 'wishlists'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    product = relationship('Product', lazy='subquery')
    user = relationship('User', back_populates='wishlists')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'product': self.product.to_dict() if self.product else None
        }

class Review(Base):
    __tablename__ = 'reviews'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    rating = Column(Integer, nullable=False) # 1 to 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship('User', back_populates='reviews')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'Anonymous',
            'product_id': self.product_id,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat()
        }

class SearchHistory(Base):
    __tablename__ = 'search_history'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    session_id = Column(String(100), nullable=True)
    query = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class BrowsingHistory(Base):
    __tablename__ = 'browsing_history'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    session_id = Column(String(100), nullable=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Payment(Base):
    __tablename__ = 'payments'
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    payment_method = Column(String(50), nullable=False) # 'card', 'paypal', etc.
    transaction_id = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default='completed') # 'completed', 'pending', 'failed'
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    order = relationship('Order', back_populates='payment')
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'payment_method': self.payment_method,
            'transaction_id': self.transaction_id,
            'status': self.status,
            'amount': self.amount,
            'created_at': self.created_at.isoformat()
        }

class Notification(Base):
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship('User', back_populates='notifications')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }
