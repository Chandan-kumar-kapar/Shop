import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Truck, CheckCircle2, AlertCircle, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OrderTracking() {
  const { trackingNumber: routeTracking } = useParams();
  const { token } = useAuth();
  
  const [searchInput, setSearchInput] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrderDetails = async (code) => {
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/track/${code}`);
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
      } else {
        setOrder(null);
        setError(data.message || "Order not found");
      }
    } catch (err) {
      console.error(err);
      setError("Network error fetching tracking info.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeTracking) {
      fetchOrderDetails(routeTracking);
      setSearchInput(routeTracking);
    }
  }, [routeTracking]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchOrderDetails(searchInput.trim());
    }
  };

  const getStepStatus = (stepName) => {
    if (!order) return 'inactive';
    const status = order.status;
    
    if (status === 'cancelled') return 'cancelled';
    
    const sequence = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIdx = sequence.indexOf(status);
    const stepIdx = sequence.indexOf(stepName);
    
    if (currentIdx >= stepIdx) {
      return 'completed';
    } else if (currentIdx + 1 === stepIdx) {
      return 'active';
    }
    return 'inactive';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up space-y-8">
      
      {/* Tracking lookup form */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white margin-0">Track Your Order</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Enter your order tracking code (e.g. SC-YYYYMMDD-XXXXXX) to view real-time delivery status
        </p>

        <form onSubmit={handleSearchSubmit} className="flex max-w-lg mx-auto gap-2 relative">
          <input
            type="text"
            placeholder="SC-XXXXXXXX-XXXXXX"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white rounded-xl font-bold text-sm hover:shadow-md transition-all shrink-0 hover:scale-102"
          >
            Track
          </button>
        </form>
      </div>

      {loading && (
        <div className="animate-pulse py-12 text-center text-slate-400 font-bold">Checking status...</div>
      )}

      {error && (
        <div className="p-4 bg-rose-100 text-rose-800 text-xs font-bold rounded-2xl dark:bg-rose-950/20 dark:text-rose-300 max-w-md mx-auto flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {order && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start text-left">
          
          {/* Stepper and Items */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Delivery Stepper */}
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-8">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Status Tracking</span>
                <span className="text-xs font-extrabold uppercase bg-violet-100 text-violet-800 px-2.5 py-0.5 rounded-md dark:bg-violet-950 dark:text-violet-200 capitalize">
                  {order.status}
                </span>
              </div>

              {/* Progress Bar steps */}
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-0 pl-6 sm:pl-0">
                {/* Vertical Line on mobile, horizontal on desktop */}
                <div className="absolute left-[30px] sm:left-0 top-0 bottom-0 sm:top-1/2 sm:bottom-auto w-[2px] sm:w-full h-full sm:h-[2px] bg-slate-200 dark:bg-slate-800 -z-10"></div>
                
                {/* Step 1: Placed */}
                <div className="flex sm:flex-col items-center gap-4 sm:gap-2 z-10 relative">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                    getStepStatus('pending') === 'completed'
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                  }`}>
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="text-left sm:text-center">
                    <p className="font-bold text-xs">Order Placed</p>
                    <p className="text-[10px] text-slate-400">Order successfully created</p>
                  </div>
                </div>

                {/* Step 2: Processing */}
                <div className="flex sm:flex-col items-center gap-4 sm:gap-2 z-10 relative">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                    getStepStatus('processing') === 'completed'
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : getStepStatus('processing') === 'active'
                      ? 'border-violet-600 text-violet-600 bg-white dark:bg-slate-900'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                  }`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="text-left sm:text-center">
                    <p className="font-bold text-xs">Processing</p>
                    <p className="text-[10px] text-slate-400">Inventory check & packing</p>
                  </div>
                </div>

                {/* Step 3: Shipped */}
                <div className="flex sm:flex-col items-center gap-4 sm:gap-2 z-10 relative">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                    getStepStatus('shipped') === 'completed'
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : getStepStatus('shipped') === 'active'
                      ? 'border-violet-600 text-violet-600 bg-white dark:bg-slate-900 animate-pulse'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                  }`}>
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="text-left sm:text-center">
                    <p className="font-bold text-xs">Shipped</p>
                    <p className="text-[10px] text-slate-400">Order handed to carrier</p>
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className="flex sm:flex-col items-center gap-4 sm:gap-2 z-10 relative">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                    getStepStatus('delivered') === 'completed'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                  }`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="text-left sm:text-center">
                    <p className="font-bold text-xs">Delivered</p>
                    <p className="text-[10px] text-slate-400">Order arrived at destination</p>
                  </div>
                </div>
              </div>

              {/* Show Cancelled message if cancelled */}
              {order.status === 'cancelled' && (
                <div className="p-4 bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300 rounded-2xl flex items-center gap-2 border border-rose-100/50">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                  <p className="text-xs font-semibold">This order has been cancelled.</p>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-4">
              <h3 className="font-extrabold text-base">Items in Order</h3>
              <div className="space-y-4">
                {order.items && order.items.map((item) => {
                  const prod = item.product;
                  if (!prod) return null;
                  const itemPrice = item.discount_price ? item.discount_price : item.price;
                  return (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="w-12 aspect-square bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden shrink-0">
                        <img src={prod.images && prod.images.length > 0 ? prod.images[0] : ''} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{prod.name}</p>
                        <p className="text-xs text-slate-400 font-medium">Quantity: {item.quantity}</p>
                      </div>
                      <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300">₹{(itemPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Delivery Details side panel */}
          <div className="space-y-6">
            
            {/* Delivery address & Summary */}
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-4">
              <h3 className="font-extrabold text-base">Delivery Details</h3>
              {order.shipping_address && (
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                  <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                  <p>{order.shipping_address.country}</p>
                  <p className="pt-2 font-medium text-slate-400">Phone: {order.shipping_address.phone}</p>
                </div>
              )}

              <hr className="border-slate-200 dark:border-slate-800" />
              
              <div className="flex justify-between items-center text-xs pt-2">
                <span className="font-bold text-slate-400 uppercase">Total Paid</span>
                <span className="text-base font-black text-violet-600 dark:text-violet-400">₹{order.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Guest Upsell Box */}
            {!token && (
              <div className="glass p-6 rounded-3xl border border-violet-100 dark:border-violet-950/20 bg-violet-50/20 dark:bg-violet-950/5 space-y-4 text-center">
                <Sparkles className="h-8 w-8 text-violet-500 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Create account to track easily</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Save addresses, view history, and unlock personalized recommendations by signing up.
                  </p>
                </div>
                <Link
                  to="/register?role=customer"
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold text-xs hover:shadow-md transition-all block"
                >
                  Create Account
                </Link>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
