import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user, token } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  
  const [isLiked, setIsLiked] = useState(false); // Can query wishlist status dynamically
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    try {
      await addToCart(product.id, 1);
      showToast("Added to cart!", "success");
    } catch (err) {
      showToast("Could not add item to cart. Please check stock.", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!token) {
      navigate('/login');
      return;
    }
    
    if (user?.role !== 'customer') {
      showToast("Only shoppers can save products to their wishlist.", "warning");
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.id}/wishlist`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.is_liked);
        showToast(data.is_liked ? "Added to wishlist!" : "Removed from wishlist.", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating wishlist.", "error");
    }
  };

  // Check if discount exists
  const hasDiscount = product.discount_price !== null && product.discount_price !== undefined;

  return (
    <div className="group relative bg-white dark:bg-slate-900/60 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/60 hover:shadow-xl transition-all duration-300 flex flex-col h-full animate-fade-in-up">
      {/* Product Image */}
      <Link to={`/product/${product.id}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
        <img
          src={product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Availability Badge */}
        {product.availability_status === 'out_of_stock' && (
          <span className="absolute top-3 left-3 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
            Sold Out
          </span>
        )}
        {product.availability_status === 'low_stock' && (
          <span className="absolute top-3 left-3 bg-amber-500/90 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
            Only {product.stock_count} Left
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition-all duration-300 hover:scale-110 ${
            isLiked 
              ? 'bg-rose-500 text-white' 
              : 'bg-white/80 hover:bg-white text-slate-600 dark:bg-slate-900/80 dark:hover:bg-slate-900 dark:text-slate-400'
          }`}
          aria-label="Add to wishlist"
        >
          <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </Link>

      {/* Product Content */}
      <div className="p-4 flex flex-col flex-1 space-y-2">
        {/* Category & Brand */}
        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
          <span>{product.category_name}</span>
          <span>{product.brand}</span>
        </div>

        {/* Title */}
        <Link to={`/product/${product.id}`} className="block flex-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm line-clamp-2 min-h-[40px] text-left">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" />
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{product.rating || '4.5'}</span>
        </div>

        {/* Price & Actions */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex flex-col text-left">
            {hasDiscount ? (
              <>
                <span className="text-xs line-through text-slate-400">₹{product.price.toFixed(2)}</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-base">₹{product.discount_price.toFixed(2)}</span>
              </>
            ) : (
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-base">₹{product.price.toFixed(2)}</span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.availability_status === 'out_of_stock' || adding}
            className={`p-2.5 rounded-full flex items-center justify-center transition-all duration-300 ${
              product.availability_status === 'out_of_stock'
                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700 text-white hover:shadow-md hover:scale-105'
            }`}
            aria-label="Add to cart"
          >
            <ShoppingCart className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
