import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import Contact from './pages/Contact';

// Dashboards
import CustomerDashboard from './pages/dashboards/CustomerDashboard';
import SellerDashboard from './pages/dashboards/SellerDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';

// State Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { UIProvider } from './context/UIContext';

export default function App() {
  return (
    <Router>
      <UIProvider>
        <AuthProvider>
          <CartProvider>
            <div className="flex flex-col min-h-screen">
            <Navbar />
            
            <main className="flex-grow">
              <Routes>
                {/* Public Pages */}
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation/:trackingNumber" element={<OrderTracking />} />
                <Route path="/track" element={<OrderTracking />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />

                {/* Dashboard Pages */}
                <Route path="/customer-dashboard" element={<CustomerDashboard />} />
                <Route path="/seller-dashboard" element={<SellerDashboard />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />

                {/* Catch-all Fallback */}
                <Route path="*" element={<Home />} />
              </Routes>
            </main>

            <Footer />
          </div>
        </CartProvider>
      </AuthProvider>
    </UIProvider>
  </Router>
  );
}
