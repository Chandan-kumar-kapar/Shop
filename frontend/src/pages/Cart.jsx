import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';

export default function Cart() {
  const { cart, updateCartItem, removeFromCart, loading } = useCart();
  const { confirm, showToast } = useUI();
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState(null);

  const handleQuantityChange = async (itemId, newQty) => {
    if (newQty <= 0) return;
    setUpdatingId(itemId);
    try {
      await updateCartItem(itemId, newQty);
    } catch (err) {
      showToast("Cannot increase quantity. Insufficient stock.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (itemId) => {
    const isConfirmed = await confirm("Remove this item from your cart?", {
      title: "Remove Item",
      type: "danger"
    });
    if (isConfirmed) {
      try {
        await removeFromCart(itemId);
        showToast("Item removed from cart.", "success");
      } catch (err) {
        showToast("Failed to remove item.", "error");
      }
    }
  };

  if (loading && cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4 mx-auto"></div>
        <div className="space-y-4">
          <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
          <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up space-y-8">
      
      {/* Title */}
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white margin-0">Shopping Cart</h1>
        <p className="text-sm text-slate-500">Manage your selected products before checkout</p>
      </div>

      {cart.items.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800/60 space-y-6">
          <ShoppingBag className="mx-auto h-16 w-16 text-slate-300" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Your cart is empty</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Looks like you haven't added any products to your cart yet. Let's find some amazing deals!
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md hover:scale-102 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const prod = item.product;
              if (!prod) return null;
              const hasDiscount = prod.discount_price !== null && prod.discount_price !== undefined;
              const itemPrice = hasDiscount ? prod.discount_price : prod.price;

              return (
                <div
                  key={item.id}
                  className="p-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 flex gap-4 items-center"
                >
                  {/* Image */}
                  <div className="w-20 aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 shrink-0 border border-slate-200/50 dark:border-slate-800/55">
                    <img src={prod.images && prod.images.length > 0 ? prod.images[0] : ''} alt={prod.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Title & Price info */}
                  <div className="flex-1 text-left min-w-0 space-y-1">
                    <span className="text-[9px] uppercase font-extrabold tracking-widest text-slate-400">{prod.brand}</span>
                    <Link to={`/product/${prod.id}`} className="block font-bold text-sm text-slate-800 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate">
                      {prod.name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">₹{itemPrice.toFixed(2)}</span>
                      {hasDiscount && (
                        <span className="text-slate-400 line-through">₹{prod.price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Actions */}
                  <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-full overflow-hidden bg-slate-50 dark:bg-slate-900/60">
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={updatingId === item.id || item.quantity <= 1}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="px-2 text-xs font-extrabold text-slate-800 dark:text-slate-200 min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      disabled={updatingId === item.id || item.quantity >= prod.stock_count}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shrink-0"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Cart Summary */}
          <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-left space-y-6">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Order Summary</h3>
            
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">₹{cart.total_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-emerald-500 font-bold uppercase text-xs">Free</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="font-bold text-slate-900 dark:text-white">Total</span>
              <span className="text-xl font-black text-violet-600 dark:text-violet-400">₹{cart.total_price.toFixed(2)}</span>
            </div>

            <Link
              to="/checkout"
              className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold text-sm shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 hover:scale-102 transition-all block text-center"
            >
              Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      )}

    </div>
  );
}
