from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from .database import engine, Base, UPLOAD_FOLDER
from .blueprints.auth import router as auth_router
from .blueprints.products import router as products_router
from .blueprints.categories import router as categories_router
from .blueprints.cart import router as cart_router
from .blueprints.orders import router as orders_router
from .blueprints.dashboard import router as dashboard_router
from .blueprints.recommendations import router as recommendations_router
import os

# Auto-create tables
Base.metadata.create_all(bind=engine)
print(" * Database tables verified/created successfully.")

app = FastAPI(
    title="Shop&Chil API",
    description="API documentation for the Shop&Chil e-commerce application backend.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serving uploaded images
app.mount("/api/products/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

# Include Routers
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(products_router, prefix="/api/products", tags=["products"])
app.include_router(categories_router, prefix="/api/categories", tags=["categories"])
app.include_router(cart_router, prefix="/api/cart", tags=["cart"])
app.include_router(orders_router, prefix="/api/orders", tags=["orders"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(recommendations_router, prefix="/api/recommendations", tags=["recommendations"])

# General health check
@app.get("/api/health")
def health():
    db_type = engine.url.drivername
    return {"status": "healthy", "database": db_type}

# Global HTTP Exceptions handler
@app.exception_handler(HTTPException)
def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail}
    )

@app.exception_handler(Exception)
def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"}
    )
