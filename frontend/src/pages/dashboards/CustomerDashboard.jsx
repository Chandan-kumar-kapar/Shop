import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, ClipboardList, Heart, Plus, Edit2, Trash2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import ProductCard from '../../components/ProductCard';

export default function CustomerDashboard() {
  const { user, token, addresses, addAddress, updateAddress, deleteAddress, updateProfile } = useAuth();
  const { confirm, showToast } = useUI();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile Update Form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  
  // Order History List
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Wishlist list
  const [wishlist, setWishlist] = useState([]);
  const [loadingWish, setLoadingWish] = useState(false);
  
  // Address form modal states
  const [showAddrModal, setShowAddrModal] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);
  const [addrForm, setAddrForm] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    phone: '',
    is_default: false
  });

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (user && user.role !== 'customer') {
      navigate('/');
    }
  }, [user, token]);

  // Tab change side-effects
  useEffect(() => {
    if (activeTab === 'orders' && token) {
      setLoadingOrders(true);
      fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : [])
        .then(data => setOrders(data))
        .catch(err => console.error(err))
        .finally(() => setLoadingOrders(false));
    } else if (activeTab === 'wishlist' && token) {
      fetchWishlist();
    }
  }, [activeTab, token]);

  const fetchWishlist = () => {
    setLoadingWish(true);
    fetch('/api/products/wishlist', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setWishlist(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingWish(false));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { name, email };
      if (password) data.password = password;
      await updateProfile(data);
      showToast("Profile updated successfully!", "success");
      setPassword('');
    } catch (err) {
      showToast(err.message || "Failed to update profile.", "error");
    }
  };

  const openAddAddr = () => {
    setEditingAddr(null);
    setAddrForm({
      full_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA',
      phone: '',
      is_default: false
    });
    setShowAddrModal(true);
  };

  const openEditAddr = (addr) => {
    setEditingAddr(addr);
    setAddrForm({ ...addr });
    setShowAddrModal(true);
  };

  const handleAddrSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddr) {
        await updateAddress(editingAddr.id, addrForm);
        showToast("Address updated successfully!", "success");
      } else {
        await addAddress(addrForm);
        showToast("Address added successfully!", "success");
      }
      setShowAddrModal(false);
    } catch (err) {
      showToast("Error saving address details.", "error");
    }
  };

  const handleAddrDelete = async (id) => {
    const isConfirmed = await confirm("Delete this saved address?", {
      title: "Delete Address",
      type: "danger"
    });
    if (isConfirmed) {
      try {
        await deleteAddress(id);
        showToast("Address deleted successfully.", "success");
      } catch (err) {
        showToast("Failed to delete address.", "error");
      }
    }
  };

  const removeWish = async (prodId) => {
    try {
      await fetch(`/api/products/${prodId}/wishlist`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchWishlist();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Panel */}
        <Sidebar role="customer" activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Content Panel */}
        <main className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-left space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">My Profile</h2>
                <p className="text-xs text-slate-500">Update your account information details</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md"
                >
                  Save Changes
                </button>
              </form>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-left space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">Saved Addresses</h2>
                  <p className="text-xs text-slate-500">Manage your shipping destinations</p>
                </div>
                <button
                  onClick={openAddAddr}
                  className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full flex items-center gap-1.5 font-bold text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Add Address
                </button>
              </div>

              {addresses.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No saved addresses found. Click Add Address to add one.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 flex flex-col justify-between text-left hover:shadow-md transition-all relative"
                    >
                      <div>
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{addr.full_name}</span>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {addr.address_line1}, {addr.address_line2 && `${addr.address_line2}, `}{addr.city}, {addr.state} {addr.postal_code}
                        </p>
                        <p className="text-xs text-slate-400 mt-2 font-medium">{addr.phone}</p>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-900">
                        {addr.is_default ? (
                          <span className="text-[9px] font-extrabold uppercase bg-violet-100 text-violet-800 px-2 py-0.5 rounded-md dark:bg-violet-950 dark:text-violet-200">
                            Default
                          </span>
                        ) : (
                          <span></span>
                        )}
                        <div className="flex gap-2 text-slate-400">
                          <button onClick={() => openEditAddr(addr)} className="p-1.5 hover:text-violet-600 transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleAddrDelete(addr.id)} className="p-1.5 hover:text-rose-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-left space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">Order History</h2>
                <p className="text-xs text-slate-500">Track and review your past purchases</p>
              </div>

              {loadingOrders ? (
                <div className="text-center py-12 text-slate-400">Loading orders...</div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-slate-400 italic">You haven't placed any orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Tracking Code</th>
                        <th className="py-3 px-4">Total Paid</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60">
                      {orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="py-3 px-4">{new Date(ord.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-bold text-violet-600 dark:text-violet-400">
                            <Link to={`/order-confirmation/${ord.tracking_number}`} className="hover:underline">
                              {ord.tracking_number}
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-extrabold">₹{ord.total_amount.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md font-bold capitalize text-[10px] ${
                              ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300' :
                              ord.status === 'cancelled' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300'
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-left space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">My Wishlist</h2>
                <p className="text-xs text-slate-500">Products you have saved for later</p>
              </div>

              {loadingWish ? (
                <div className="text-center py-12 text-slate-400">Loading wishlist...</div>
              ) : wishlist.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Your wishlist is empty.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wishlist.map((item) => (
                    <div key={item.id} className="relative group">
                      <ProductCard product={item.product} />
                      <button
                        onClick={() => removeWish(item.product.id)}
                        className="absolute bottom-16 right-16 p-2 rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-all z-20"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Address Edit/Add Modal */}
      {showAddrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddrSubmit} className="glass p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full text-left space-y-4">
            <h3 className="font-extrabold text-lg">{editingAddr ? 'Edit Address' : 'Add New Address'}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-400 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={addrForm.full_name}
                  onChange={(e) => setAddrForm({ ...addrForm, full_name: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-400 uppercase">Address Line 1</label>
                <input
                  type="text"
                  required
                  value={addrForm.address_line1}
                  onChange={(e) => setAddrForm({ ...addrForm, address_line1: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-400 uppercase">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={addrForm.address_line2 || ''}
                  onChange={(e) => setAddrForm({ ...addrForm, address_line2: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">City</label>
                <input
                  type="text"
                  required
                  value={addrForm.city}
                  onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">State</label>
                <input
                  type="text"
                  required
                  value={addrForm.state}
                  onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Postal Code</label>
                <input
                  type="text"
                  required
                  value={addrForm.postal_code}
                  onChange={(e) => setAddrForm({ ...addrForm, postal_code: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Phone</label>
                <input
                  type="text"
                  required
                  value={addrForm.phone}
                  onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 mt-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={addrForm.is_default}
                  onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })}
                  className="rounded border-slate-300 text-violet-600"
                />
                Set as Default shipping address
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => setShowAddrModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-full font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold"
              >
                Save Address
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
