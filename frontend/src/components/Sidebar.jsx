import React from 'react';
import { 
  User, MapPin, ClipboardList, Heart, 
  Store, ShoppingBag, PlusCircle, AlertTriangle, BarChart3, 
  Users, CheckSquare, Layers, Settings, History 
} from 'lucide-react';

export default function Sidebar({ role, activeTab, setActiveTab }) {
  
  // Tabs for Customer
  const customerTabs = [
    { id: 'profile', name: 'My Profile', icon: User },
    { id: 'addresses', name: 'Saved Addresses', icon: MapPin },
    { id: 'orders', name: 'Order History', icon: ClipboardList },
    { id: 'wishlist', name: 'My Wishlist', icon: Heart }
  ];

  // Tabs for Seller
  const sellerTabs = [
    { id: 'overview', name: 'Sales Overview', icon: BarChart3 },
    { id: 'products', name: 'My Products', icon: Store },
    { id: 'add-product', name: 'Add Product', icon: PlusCircle },
    { id: 'orders', name: 'Seller Orders', icon: ShoppingBag },
    { id: 'stock-alerts', name: 'Stock Alerts', icon: AlertTriangle }
  ];

  // Tabs for Admin
  const adminTabs = [
    { id: 'overview', name: 'Admin Overview', icon: BarChart3 },
    { id: 'users', name: 'Manage Users', icon: Users },
    { id: 'moderation', name: 'Product Moderation', icon: CheckSquare },
    { id: 'categories', name: 'Categories Manager', icon: Layers },
    { id: 'orders', name: 'All Orders', icon: ClipboardList },
    { id: 'settings', name: 'Site Settings', icon: Settings }
  ];

  const getTabs = () => {
    if (role === 'admin') return adminTabs;
    if (role === 'seller') return sellerTabs;
    return customerTabs;
  };

  const tabs = getTabs();

  return (
    <div className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900/40 border-r border-slate-200/60 dark:border-slate-800/40 p-4 flex flex-col md:min-h-[calc(100vh-4rem)]">
      <div className="mb-6 hidden md:block">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Dashboard</h2>
        <p className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300 mt-1">{role} Panel</p>
      </div>

      {/* Navigation tabs */}
      <ul className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar pb-2 md:pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <li key={tab.id} className="shrink-0 md:shrink">
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-left ${
                  isActive 
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{tab.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
