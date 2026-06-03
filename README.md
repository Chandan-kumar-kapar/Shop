# Shop&Chil: Modern Curated E-Commerce Platform

Shop&Chil is a responsive, premium e-commerce web application featuring role-based dashboards (Admin, Seller, Customer, Guest), a product catalog, advanced filtering, saved shipping addresses, order histories, a live stepper order tracker, and a history-based personalized recommendation engine.

## Tech Stack
* **Frontend**: React (Vite, React Router, Tailwind CSS v4, Lucide Icons)
* **Backend**: Flask REST API (Python 3, JWT Authentication, Flask-SQLAlchemy, CORS)
* **Database**: PostgreSQL (Dockerized) with dynamic SQLite fallback for rapid offline development
* **Orchestration**: Docker Compose

---

## Getting Started

You can run Shop&Chil locally in two ways: using **Docker Compose** (recommended) or **running manually**.

### Method 1: Docker Compose (Recommended)
Make sure you have Docker installed and running, then execute the following command at the root of the repository:

```bash
docker-compose up --build
```

This will automatically configure and launch three containers:
1. **db**: PostgreSQL database running on port `5432`
2. **backend**: Flask API running on port `5001`
3. **frontend**: React client running on port `5173`

Once the containers are up, access the storefront in your browser at:
👉 **[http://localhost:5173](http://localhost:5173)**

### Method 2: Manual Local Running
If you do not have Docker running, the application will dynamically fall back to a local SQLite database (`shop.db` created in the backend folder).

#### 1. Setup Backend
Open a terminal in the project root:

```bash
# Navigate to backend
cd backend

# Create and activate python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed the database (creates mock users, categories, products, and reviews)
PYTHONPATH=. python3 seed.py

# Run the development server
flask run --host=0.0.0.0 --port=5001 --reload
```
The backend API will run on **[http://localhost:5001](http://localhost:5001)**.

#### 2. Setup Frontend
Open a new terminal window:

```bash
# Navigate to frontend
cd frontend

# Install package dependencies
npm install

# Run the Vite development server
npm run dev
```
The frontend website will run on **[http://localhost:5173](http://localhost:5173)** and proxy API requests automatically to port `5001`.

---

## Seeded Testing Accounts

The database seed script (`backend/seed.py`) populates the database with the following testing credentials:

### 1. Superuser / Admin
* **Email**: `admin@shop.com`
* **Password**: `admin123`
* *Capabilities*: Access Admin dashboard to view total revenue/analytics, approve pending sellers, moderate/delete any products, and manage categories or user accounts.

### 2. Seller
* **Email**: `seller@shop.com`
* **Password**: `seller123`
* *Capabilities*: Access Seller dashboard to add/edit products with image uploads, monitor stock count warnings, and track orders containing their products (update order status to processing, shipped, etc.).

### 3. Registered Customer / Shopper
* **Email**: `customer@shop.com`
* **Password**: `customer123`
* *Capabilities*: Browse products, add items to cart, select saved addresses, write reviews, add items to wishlist, and view order histories.

### 4. Guest Shopper
* *Capabilities*: Browse products, add items to cart, checkout by providing shipping details on the checkout page, and track order delivery status via the public tracking page using a tracking number (e.g. `SC-YYYYMMDD-XXXXXX`).

---

## File Structure

```
Shop/
├── backend/
│   ├── app/
│   │   ├── blueprints/
│   │   │   ├── auth.py          # Register, Login, Address CRUD
│   │   │   ├── cart.py          # Cart CRUD & guest merge utilities
│   │   │   ├── categories.py    # Public categories list
│   │   │   ├── dashboard.py     # Admin & Seller analytics
│   │   │   ├── orders.py        # Transactional checkout & public order tracking
│   │   │   └── products.py      # Product CRUD, reviews, image validation
│   │   ├── uploads/             # Stores locally uploaded product images
│   │   ├── __init__.py          # Flask factory & CORS configuration
│   │   ├── auth.py              # JWT decorators & helper middleware
│   │   ├── database.py          # SQLite/PostgreSQL connection routing
│   │   ├── models.py            # SQLAlchemy e-commerce schemas
│   │   └── recommendations.py   # History-based recommendation router
│   ├── tests/
│   │   └── test_api.py          # Pytest integration tests
│   ├── requirements.txt         # Backend Python packages
│   ├── seed.py                  # Seed script populating mock e-commerce database
│   └── Dockerfile               # Backend container configuration
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Header with toggles, badges & dropdowns
│   │   │   ├── Footer.jsx       # Custom footer component
│   │   │   ├── Sidebar.jsx      # Role-based dashboard side navigator
│   │   │   └── ProductCard.jsx  # Card with rating stars, price & add actions
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Handles JWT storage, logins, profile, address
│   │   │   └── CartContext.jsx  # Syncs cart & handles guest cart database merges
│   │   ├── pages/
│   │   │   ├── dashboards/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── SellerDashboard.jsx
│   │   │   │   └── CustomerDashboard.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── Contact.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── OrderTracking.jsx  # Interactive tracking stepper
│   │   │   └── Shop.jsx          # Catalog filterable grid
│   │   ├── App.jsx              # Application router shell
│   │   ├── index.css            # Stylesheets, custom scrollbars, animations
│   │   └── main.jsx             # Target binder
│   ├── index.html               # Main template configured for SEO and fonts
│   ├── package.json             # Frontend Node packages
│   ├── vite.config.js           # Vite dev configurations & proxy rules
│   └── Dockerfile               # Client container configuration
├── docker-compose.yml           # Multi-service container orchestrator
└── README.md                    # Platform documentation
```
