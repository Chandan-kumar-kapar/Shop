import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, Package, AlertTriangle, Plus, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

export default function SellerDashboard() {
  const { user, token } = useAuth();
  const { confirm, showToast } = useUI();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  // Modals / forms
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [productForm, setProductForm] = useState({
    name: '',
    title: '',
    description: '',
    price: '',
    discount_price: '',
    stock_count: '',
    category_id: '',
    brand: '',
    SKU: ''
  });
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (user && user.role !== 'seller') {
      navigate('/');
    }
  }, [user, token]);

  // Load analytics & product details
  const loadSellerData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch Analytics
      const analRes = await fetch('/api/dashboard/seller', { headers });
      if (analRes.ok) {
        const analData = await analRes.json();
        setAnalytics(analData);
      }

      // Fetch Categories
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }

      // Fetch Seller Products (from list, filter by seller_id)
      const prodRes = await fetch(`/api/products`);
      if (prodRes.ok) {
        const allProds = await prodRes.json();
        const sellerProds = allProds.filter(p => p.seller_id === user?.id);
        setProducts(sellerProds);
      }

      // Fetch Orders containing seller products
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
      loadSellerData();
    }
  }, [token, user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    // Construct FormData to support image uploads
    const formData = new FormData();
    Object.keys(productForm).forEach(key => {
      formData.append(key, productForm[key]);
    });
    
    if (uploadedImage) {
      formData.append('image', uploadedImage);
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setShowProductModal(false);
        setUploadedImage(null);
        setImagePreview(null);
        setProductForm({
          name: '',
          title: '',
          description: '',
          price: '',
          discount_price: '',
          stock_count: '',
          category_id: categories[0]?.id || '',
          brand: '',
          SKU: ''
        });
        showToast("Product saved successfully!", "success");
        loadSellerData();
        if (activeTab === 'add-product') {
          setActiveTab('products');
        }
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to save product.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error saving product.", "error");
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      title: '',
      description: '',
      price: '',
      discount_price: '',
      stock_count: '',
      category_id: categories[0]?.id || '',
      brand: '',
      SKU: ''
    });
    setUploadedImage(null);
    setImagePreview(null);
    setShowProductModal(true);
  };

  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      title: prod.title,
      description: prod.description,
      price: prod.price,
      discount_price: prod.discount_price || '',
      stock_count: prod.stock_count,
      category_id: prod.category_id,
      brand: prod.brand || '',
      SKU: prod.SKU
    });
    setUploadedImage(null);
    setImagePreview(prod.images && prod.images.length > 0 ? prod.images[0] : null);
    setShowProductModal(true);
  };

  const handleProductDelete = async (prodId) => {
    const isConfirmed = await confirm("Delete this product listing? This action is permanent.", {
      title: "Delete Product",
      type: "danger"
    });
    if (isConfirmed) {
      try {
        const res = await fetch(`/api/products/${prodId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          showToast("Product deleted successfully.", "success");
          loadSellerData();
        } else {
          showToast("Failed to delete product.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("An error occurred while deleting the product.", "error");
      }
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast("Order status updated successfully.", "success");
        loadSellerData();
      } else {
        showToast("Failed to update order status.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating order status.", "error");
    }
  };

  if (loading && !analytics) {
    return <div className="py-20 text-center text-slate-400 animate-pulse">Loading Seller Analytics Panel...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <Sidebar role="seller" activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Content */}
        <main className="flex-1 min-w-0 text-left space-y-6">
          
          {/* Dashboard Summary cards */}
          {activeTab === 'overview' && analytics && (
            <div className="space-y-8">
              {/* Analytics Header Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">My Earnings</span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{analytics.total_revenue.toFixed(2)}</h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                    <IndianRupee className="h-6 w-6" />
                  </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Units Sold</span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{analytics.total_units_sold} Units</h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">
                    <Package className="h-6 w-6" />
                  </div>
                </div>

                <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Stock Health</span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {analytics.stock_summary.out_of_stock} Out
                    </h3>
                  </div>
                  <div className={`p-3 rounded-2xl ${analytics.stock_summary.out_of_stock > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Earnings Table */}
              <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-4">
                <h3 className="font-extrabold text-base">Low Stock alerts</h3>
                {analytics.low_stock_products.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">All items are sufficiently stocked.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.low_stock_products.map(p => (
                      <div key={p.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{p.name}</p>
                          <p className="text-slate-400 mt-1">SKU: {p.SKU} | Category: {p.category_name}</p>
                        </div>
                        <span className="font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded dark:bg-amber-950 dark:text-amber-300">
                          {p.stock_count} Left
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage Products list */}
          {(activeTab === 'products' || activeTab === 'stock-alerts') && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">
                    {activeTab === 'stock-alerts' ? 'Stock Warning Alerts' : 'Product Listings'}
                  </h2>
                  <p className="text-xs text-slate-500">Manage and edit your online catalogue details</p>
                </div>
                {activeTab === 'products' && (
                  <button
                    onClick={openAddProduct}
                    className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full flex items-center gap-1 font-bold text-xs"
                  >
                    <Plus className="h-4 w-4" />
                    New Listing
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No products found. Start by listing your first product!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products
                    .filter(p => activeTab !== 'stock-alerts' || p.stock_count < 10)
                    .map((prod) => (
                      <div
                        key={prod.id}
                        className="p-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950">
                            <img src={prod.images && prod.images.length > 0 ? prod.images[0] : ''} alt={prod.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400">{prod.brand}</span>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">{prod.name}</h4>
                            <p className="text-xs text-slate-500 mt-1">Price: <span className="font-extrabold text-slate-700 dark:text-slate-200">₹{prod.price.toFixed(2)}</span></p>
                            <p className="text-xs text-slate-500">Stock: <span className={`font-extrabold ${prod.stock_count < 10 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{prod.stock_count} units</span></p>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-100 dark:border-slate-900">
                          <button
                            onClick={() => openEditProduct(prod)}
                            className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:text-violet-600 transition-colors text-slate-400"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleProductDelete(prod.id)}
                            className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:text-rose-600 transition-colors text-slate-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Add Product Directly from tabs trigger */}
          {activeTab === 'add-product' && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-left space-y-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">New Listing Details</h2>
              <form onSubmit={handleProductSubmit} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Product Name</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="e.g. Noise-Cancelling Headphones"
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Meta Title / Subtitle</label>
                    <input
                      type="text"
                      required
                      value={productForm.title}
                      onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                      placeholder="e.g. Wireless Over-Ear Headset"
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                    <textarea
                      required
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      rows="4"
                      placeholder="Detail features, specs, and materials..."
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    ></textarea>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      placeholder="199.99"
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Discount Price (₹ - Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.discount_price}
                      onChange={(e) => setProductForm({ ...productForm, discount_price: e.target.value })}
                      placeholder="149.99"
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Initial Stock</label>
                    <input
                      type="number"
                      required
                      value={productForm.stock_count}
                      onChange={(e) => setProductForm({ ...productForm, stock_count: e.target.value })}
                      placeholder="25"
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                    <select
                      value={productForm.category_id}
                      onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Brand</label>
                    <input
                      type="text"
                      value={productForm.brand}
                      onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                      placeholder="e.g. Sony"
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">SKU / Product Code (Optional)</label>
                    <input
                      type="text"
                      value={productForm.SKU}
                      onChange={(e) => setProductForm({ ...productForm, SKU: e.target.value })}
                      placeholder="AUTO-GEN"
                      className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Image upload */}
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Product Cover Image</label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                      />
                      {imagePreview && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border">
                          <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md mt-6"
                >
                  Save Product Listing
                </button>
              </form>
            </div>
          )}

          {/* Seller Order Tracking tab */}
          {activeTab === 'orders' && (
            <div className="glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white margin-0">My Seller Orders</h2>
                <p className="text-xs text-slate-500">View and update orders containing your products</p>
              </div>

              {orders.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No orders containing your products found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">Tracking ID</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4">Earnings</th>
                        <th className="py-3 px-4">Ship Destination</th>
                        <th className="py-3 px-4">Change Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60">
                      {orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-100">{ord.tracking_number}</td>
                          <td className="py-4 px-4 space-y-1">
                            {ord.items.map((it) => (
                              <p key={it.id} className="truncate max-w-[160px]">
                                {it.product.name} (x{it.quantity})
                              </p>
                            ))}
                          </td>
                          <td className="py-4 px-4 font-extrabold text-emerald-600">
                            ₹{ord.items.reduce((acc, it) => {
                              const itPrice = it.discount_price ? it.discount_price : it.price;
                              return acc + (itPrice * it.quantity);
                            }, 0).toFixed(2)}
                          </td>
                          <td className="py-4 px-4 truncate max-w-[120px]">
                            {ord.shipping_address?.city}, {ord.shipping_address?.state}
                          </td>
                          <td className="py-4 px-4">
                            <select
                              value={ord.status}
                              onChange={(e) => updateOrderStatus(ord.id, e.target.value)}
                              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-violet-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Product Add/Edit Modal (used in listings tab) */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleProductSubmit} className="glass p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full text-left space-y-4 overflow-y-auto max-h-[90vh]">
            <h3 className="font-extrabold text-lg">{editingProduct ? 'Edit Product Listing' : 'Create Product Listing'}</h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-400 uppercase">Product Name</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-400 uppercase">Subtitle / Brief Spec</label>
                <input
                  type="text"
                  required
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-400 uppercase">Description</label>
                <textarea
                  required
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows="3"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                ></textarea>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Discount Price (₹ - Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.discount_price}
                  onChange={(e) => setProductForm({ ...productForm, discount_price: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Stock Count</label>
                <input
                  type="number"
                  required
                  value={productForm.stock_count}
                  onChange={(e) => setProductForm({ ...productForm, stock_count: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Category</label>
                <select
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Brand</label>
                <input
                  type="text"
                  value={productForm.brand}
                  onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">SKU Code</label>
                <input
                  type="text"
                  value={productForm.SKU}
                  onChange={(e) => setProductForm({ ...productForm, SKU: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-400 uppercase">Cover Image</label>
                <div className="flex gap-4 items-center">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
                  {imagePreview && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border">
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-900">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-full font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
