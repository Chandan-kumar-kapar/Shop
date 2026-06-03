import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Store, ClipboardList, IndianRupee, Package, 
  CheckCircle, Ban, Trash2, Plus, Layers 
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const { confirm, showToast } = useUI();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  // Category form states
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImage, setNewCatImage] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, token]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Analytics
      const analRes = await fetch('/api/dashboard/admin', { headers });
      if (analRes.ok) {
        const analData = await analRes.json();
        setAnalytics(analData);
      }

      // Fetch Users List
      const usersRes = await fetch('/api/dashboard/admin/users', { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData);
      }

      // Fetch Products
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // Fetch Categories
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }

      // Fetch All Orders
      const ordRes = await fetch('/api/orders', { headers });
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      loadAdminData();
    }
  }, [token, user]);

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const res = await fetch(`/api/dashboard/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`User status updated to ${newStatus}.`, 'success');
        loadAdminData();
      } else {
        showToast("Failed to update user status.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred updating user status.", "error");
    }
  };

  const handleUserDelete = async (userId) => {
    const isConfirmed = await confirm("Are you sure you want to delete this user? This cannot be undone.", {
      title: "Delete User",
      type: "danger"
    });
    if (isConfirmed) {
      try {
        const res = await fetch(`/api/dashboard/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast("User deleted successfully.", "success");
          loadAdminData();
        } else {
          showToast("Failed to delete user.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("An error occurred while deleting the user.", "error");
      }
    }
  };

  const handleProductDelete = async (prodId) => {
    const isConfirmed = await confirm("Delete this product listing? This action overrides seller settings.", {
      title: "Remove Product Listing",
      type: "danger"
    });
    if (isConfirmed) {
      try {
        const res = await fetch(`/api/products/${prodId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast("Product listing removed.", "success");
          loadAdminData();
        } else {
          showToast("Failed to delete product.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("An error occurred removing the product.", "error");
      }
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCatName,
          description: newCatDesc,
          image_url: newCatImage
        })
      });
      if (res.ok) {
        setNewCatName('');
        setNewCatDesc('');
        setNewCatImage('');
        loadAdminData();
        showToast("Category created successfully!", "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to create category.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred creating the category.", "error");
    }
  };

  if (loading && !analytics) {
    return <div className="py-20 text-center text-slate-400 animate-pulse">Loading Admin Panel...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <Sidebar role="admin" activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Content */}
        <main className="flex-1 min-w-0 text-left space-y-6">
          
          {/* Overview analytics cards */}
          {activeTab === 'overview' && analytics && (
            <div className="space-y-8">
              
              {/* Counts grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Revenue</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{analytics.total_revenue.toFixed(2)}</h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                </div>

                <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Shoppers</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{analytics.total_customers} Users</h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Listings</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{analytics.total_products} Products</h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400">
                    <Package className="h-5 w-5" />
                  </div>
                </div>

                <div className="glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Orders</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{analytics.total_orders} Orders</h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Pending Approvals Table */}
              <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-4">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Store className="h-4.5 w-4.5 text-violet-500" />
                  Pending Seller Approvals
                </h3>
                {analytics.pending_sellers.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No sellers pending approval at this time.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.pending_sellers.map(s => (
                      <div key={s.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs bg-white dark:bg-slate-900/40">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                          <p className="text-slate-400 mt-1">Email: {s.email} | Registered: {new Date(s.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusChange(s.id, 'approved')}
                            className="p-1.5 px-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(s.id, 'blocked')}
                            className="p-1.5 px-3 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold flex items-center gap-1"
                          >
                            <Ban className="h-3 w-3" /> Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage Users panel */}
          {activeTab === 'users' && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">Manage Users</h2>
                <p className="text-xs text-slate-500">Edit seller approvals or block/unblock accounts</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-100">{u.name}</td>
                        <td className="py-4 px-4">{u.email}</td>
                        <td className="py-4 px-4 capitalize font-semibold">{u.role}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            u.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300' :
                            u.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 flex gap-2">
                          {u.status === 'blocked' ? (
                            <button
                              onClick={() => handleStatusChange(u.id, 'approved')}
                              className="p-1 px-2.5 rounded bg-violet-600 text-white font-bold text-[10px]"
                            >
                              Unblock
                            </button>
                          ) : (
                            u.role !== 'admin' && (
                              <button
                                onClick={() => handleStatusChange(u.id, 'blocked')}
                                className="p-1 px-2.5 rounded border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white font-bold text-[10px]"
                              >
                                Block
                              </button>
                            )
                          )}
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleUserDelete(u.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Delete Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Product moderation listings */}
          {activeTab === 'moderation' && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">Product Moderation</h2>
                <p className="text-xs text-slate-500">Edit or delete listings created by sellers</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((prod) => (
                  <div key={prod.id} className="p-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 flex flex-col justify-between">
                    <div className="space-y-3 text-xs">
                      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950">
                        <img src={prod.images && prod.images.length > 0 ? prod.images[0] : ''} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Seller: {prod.seller_name}</span>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1 mt-0.5">{prod.name}</h4>
                        <p className="text-slate-500 mt-1">Price: <span className="font-extrabold text-slate-700 dark:text-slate-200">₹{prod.price.toFixed(2)}</span></p>
                        <p className="text-slate-500">Stock: <span className="font-extrabold">{prod.stock_count} units</span></p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 pt-3 border-t border-slate-100 dark:border-slate-900">
                      <button
                        onClick={() => handleProductDelete(prod.id)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:text-rose-600 transition-colors text-slate-400 flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove Product
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories creator panel */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Form creation */}
              <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-left space-y-4">
                <h3 className="font-extrabold text-base flex items-center gap-1.5">
                  <Layers className="h-4.5 w-4.5 text-violet-500" />
                  Add Category
                </h3>
                <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase">Category Name</label>
                    <input
                      type="text"
                      required
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="e.g. Toys"
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase">Description</label>
                    <textarea
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="Brief details..."
                      rows="3"
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    ></textarea>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase">Cover Image URL</label>
                    <input
                      type="text"
                      value={newCatImage}
                      onChange={(e) => setNewCatImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-full bg-violet-600 text-white font-bold hover:bg-violet-700"
                  >
                    Save Category
                  </button>
                </form>
              </div>

              {/* Grid listings */}
              <div className="lg:col-span-2 glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-4">
                <h3 className="font-extrabold text-base">Existing Categories</h3>
                <div className="space-y-3">
                  {categories.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/65 flex gap-4 items-center">
                      <div className="w-12 aspect-square rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-left text-xs">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{c.name}</p>
                        <p className="text-slate-400 mt-0.5 leading-normal">{c.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Simple Settings panel */}
          {activeTab === 'settings' && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">Site Settings</h2>
                <p className="text-xs text-slate-500">Configure global configurations for the Shop&Chil platform</p>
              </div>
              <div className="space-y-4 max-w-md text-xs">
                <div className="p-4 bg-violet-50/20 dark:bg-violet-950/5 border border-violet-100 dark:border-violet-950/20 rounded-2xl">
                  <p className="font-bold text-slate-800 dark:text-slate-100">Automatic approvals</p>
                  <p className="text-slate-400 mt-1">Sellers require manual approval by default to prevent spam.</p>
                </div>
                <div className="p-4 bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="font-bold text-slate-800 dark:text-slate-100">Global discount campaign</p>
                  <p className="text-slate-400 mt-1">No active global campaign override. Sellers configure discount overrides individually.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
