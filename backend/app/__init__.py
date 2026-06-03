import os
from flask import Flask, jsonify
from flask_cors import CORS
from .database import db, init_db

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for frontend requests
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
    # Initialize DB configuration
    init_db(app)
    
    # Register blueprints
    from .blueprints.auth import auth_bp
    from .blueprints.products import products_bp
    from .blueprints.categories import categories_bp
    from .blueprints.cart import cart_bp
    from .blueprints.orders import orders_bp
    from .blueprints.dashboard import dashboard_bp
    from .recommendations import recommendations_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(recommendations_bp, url_prefix='/api/recommendations')
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'message': 'Resource not found'}), 404
        
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'message': 'Internal server error'}), 500
        
    # Health check route
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'healthy', 'database': app.config['SQLALCHEMY_DATABASE_URI'].split('://')[0]}), 200
        
    # API Documentation route
    @app.route('/docs', methods=['GET'])
    def swagger_ui():
        html = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=device-width, initial-scale=1" />
          <meta name="description" content="Shop&Chil API Documentation" />
          <title>Shop&Chil API Documentation</title>
          <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" charset="UTF-8"></script>
          <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
          <script>
            window.onload = () => {
              window.ui = SwaggerUIBundle({
                url: '/docs/swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout"
              });
            };
          </script>
        </body>
        </html>
        """
        return html

    @app.route('/docs/swagger.json', methods=['GET'])
    def swagger_json():
        import json
        try:
            with open(os.path.join(app.root_path, 'swagger.json'), 'r') as f:
                data = json.load(f)
            return jsonify(data)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
    # Auto-create tables (SQLite fallback makes this easy for immediate local development)
    with app.app_context():
        db.create_all()
        print(" * Database tables verified/created successfully.")
        
    return app
