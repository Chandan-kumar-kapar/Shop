import os
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    # Check if DATABASE_URL is set in the environment, fallback to sqlite for easy offline testing
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        # Construct path for local sqlite DB in the backend directory
        db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), '..', 'shop.db')
        database_url = f"sqlite:///{db_path}"
        print(f" * Database: No DATABASE_URL specified. Using SQLite fallback: {database_url}")
    else:
        print(f" * Database: Using PostgreSQL database connection.")

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Configure upload folder
    app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads'))
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
        
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
    
    db.init_app(app)
