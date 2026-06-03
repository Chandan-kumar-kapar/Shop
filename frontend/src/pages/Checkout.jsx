import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Truck, ArrowLeft, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export default function Checkout() {
  const { cart, sessionId, fetchCart } = useCart();
  const { user, token, addresses, fetchAddresses, addAddress } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();

  // Address variables
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [newAddress, setNewAddress] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    phone: ''
  });

  // Payment mock variables
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    // Redirect if cart is empty
    if (cart.items.length === 0 && !placingOrder) {
      navigate('/cart');
    }
    
    // Load customer addresses if logged in
    if (token && user?.role === 'customer') {
      fetchAddresses();
    }
  }, [token]);

  // Set default address if user has one
  useEffect(() => {
    if (addresses.length > 0) {
      const defaultAddr = addresses.find(a => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else {
        setSelectedAddressId(addresses[0].id);
      }
    } else if (token && user?.role === 'customer') {
      setUseNewAddress(true);
    }
  }, [addresses]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAddress(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    if (placingOrder) return;
    
    // Validate inputs
    if (token && user?.role === 'customer' && !useNewAddress && !selectedAddressId) {
      showToast("Please select a shipping address.", "warning");
      return;
    }
    
    if ((!token || useNewAddress) && (!newAddress.full_name || !newAddress.address_line1 || !newAddress.city || !newAddress.state || !newAddress.postal_code || !newAddress.phone)) {
      showToast("Please fill out all required shipping fields.", "warning");
      return;
    }
 
    if (!cardNumber || !cardExpiry || !cardCvv) {
      showToast("Please fill out your card payment details.", "warning");
      return;
    }

    setPlacingOrder(true);
    try {
      const body = {
        session_id: sessionId,
        payment_method: 'card'
      };

      if (token && user?.role === 'customer') {
        if (!useNewAddress && selectedAddressId) {
          body.shipping_address_id = selectedAddressId;
        } else {
          if (saveAddressToProfile) {
            try {
              const savedAddress = await addAddress(newAddress);
              body.shipping_address_id = savedAddress.id;
            } catch (err) {
              console.error(err);
              showToast(err.message || "Failed to save address to profile.", "error");
              setPlacingOrder(false);
              return;
            }
          } else {
            body.shipping_address = newAddress;
          }
        }
      } else {
        body.shipping_address = newAddress;
      }

      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        // Refresh cart state to clear badge
        await fetchCart();
        showToast("Order placed successfully!", "success");
        navigate(`/order-confirmation/${data.tracking_number}`);
      } else {
        showToast(data.message || "Failed to place order. Please review stock quantities.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error placing order.", "error");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up space-y-8">
      
      {/* Title */}
      <div className="text-left flex items-center gap-4">
        <Link to="/cart" className="p-2 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white margin-0">Checkout</h1>
          <p className="text-sm text-slate-500">Provide shipping address and mock payment information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Checkout Form */}
        <form onSubmit={handlePlaceOrder} className="lg:col-span-2 space-y-6 text-left">
          
          {/* Shipping Address Container */}
          <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-4">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Truck className="h-4.5 w-4.5 text-violet-500" />
              Shipping Address
            </h3>

            {/* Saved Addresses for Customers */}
            {token && user?.role === 'customer' && addresses.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Saved Addresses</span>
                  <button
                    type="button"
                    onClick={() => setUseNewAddress(!useNewAddress)}
                    className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-0.5 hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    {useNewAddress ? 'Select Saved Address' : 'Use Another Address'}
                  </button>
                </div>

                {!useNewAddress && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`p-4 rounded-2xl border-2 cursor-pointer flex flex-col text-left transition-all ${
                          selectedAddressId === addr.id 
                            ? 'border-violet-600 bg-violet-50/20 dark:bg-violet-950/10' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping_addr"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="sr-only"
                        />
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{addr.full_name}</span>
                        <span className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {addr.address_line1}, {addr.address_line2 && `${addr.address_line2}, `}{addr.city}, {addr.state} {addr.postal_code}
                        </span>
                        <span className="text-xs text-slate-400 mt-2 font-medium">{addr.phone}</span>
                        {addr.is_default && (
                          <span className="mt-2 text-[9px] font-extrabold uppercase bg-violet-100 text-violet-800 px-2 py-0.5 rounded-md dark:bg-violet-950 dark:text-violet-200 w-max">
                            Default
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notice if logged in customer has no saved addresses */}
            {token && user?.role === 'customer' && addresses.length === 0 && (
              <div className="p-4 bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100/50 dark:border-violet-950/20 rounded-2xl">
                <p className="text-xs font-semibold text-violet-800 dark:text-violet-300">
                  No saved addresses found. Please enter your shipping address below.
                </p>
              </div>
            )}

            {/* Custom address fields for guest or new customer address */}
            {(!token || useNewAddress) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={newAddress.full_name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Address Line 1</label>
                  <input
                    type="text"
                    name="address_line1"
                    value={newAddress.address_line1}
                    onChange={handleInputChange}
                    placeholder="123 Main St"
                    required
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    name="address_line2"
                    value={newAddress.address_line2}
                    onChange={handleInputChange}
                    placeholder="Apt, Suite, Unit"
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">City</label>
                  <input
                    type="text"
                    name="city"
                    value={newAddress.city}
                    onChange={handleInputChange}
                    placeholder="San Francisco"
                    required
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">State / Province</label>
                  <input
                    type="text"
                    name="state"
                    value={newAddress.state}
                    onChange={handleInputChange}
                    placeholder="CA"
                    required
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Postal Code</label>
                  <input
                    type="text"
                    name="postal_code"
                    value={newAddress.postal_code}
                    onChange={handleInputChange}
                    placeholder="94103"
                    required
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={newAddress.phone}
                    onChange={handleInputChange}
                    placeholder="(123) 456-7890"
                    required
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="sm:col-span-2 pt-2">
                  {token ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAddressToProfile}
                        onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Save this address to my profile for future purchases
                      </span>
                    </label>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic font-medium">
                      * Guest checkout: This address will be used for this order only.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Card Container */}
          <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-4">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5 text-violet-500" />
              Payment Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                  className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Card Number</label>
                <input
                  type="text"
                  placeholder="4111 2222 3333 4444"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                  maxLength="19"
                  required
                  className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Expiration</label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  maxLength="5"
                  required
                  className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">CVV</label>
                <input
                  type="password"
                  placeholder="•••"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  maxLength="3"
                  required
                  className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>
          
          {/* Action Trigger */}
          <button
            type="submit"
            disabled={placingOrder}
            className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold text-sm shadow-lg shadow-violet-500/10 hover:scale-101 transition-all flex items-center justify-center gap-2"
          >
            {placingOrder ? 'Processing...' : 'Place Order and Pay'}
          </button>
        </form>

        {/* Order review summary panel */}
        <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-left space-y-6">
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Order Review</h3>
          
          <div className="max-h-64 overflow-y-auto space-y-4 pr-1">
            {cart.items.map((item) => {
              const prod = item.product;
              if (!prod) return null;
              const hasDiscount = prod.discount_price !== null && prod.discount_price !== undefined;
              const itemPrice = hasDiscount ? prod.discount_price : prod.price;

              return (
                <div key={item.id} className="flex gap-3 items-center text-xs">
                  <div className="w-12 aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0">
                    <img src={prod.images && prod.images.length > 0 ? prod.images[0] : ''} alt={prod.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{prod.name}</p>
                    <p className="text-slate-400 font-medium">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">₹{(itemPrice * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">₹{cart.total_price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Shipping</span>
              <span className="text-emerald-500 font-bold uppercase text-xs">Free</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-900">
              <span>Total</span>
              <span>₹{cart.total_price.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
