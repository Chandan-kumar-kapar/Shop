import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Resolve database URL
database_url = os.environ.get('DATABASE_URL')
if not database_url:
    # Construct path for local sqlite DB in the backend directory
    db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), '..', 'shop.db')
    database_url = f"sqlite:///{db_path}"
    print(f" * Database: No DATABASE_URL specified. Using SQLite fallback: {database_url}")
else:
    print(f" * Database: Using PostgreSQL database connection.")

# Create SQLAlchemy engine
if database_url.startswith("sqlite"):
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(database_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Configure upload folder
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads'))
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
