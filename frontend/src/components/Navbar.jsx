import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Search, Sun, Moon, Bell, Menu, X, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout, notifications, markNotificationRead } = useAuth();
  const { getItemsCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Initialize and update theme class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Sync search input with URL search param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('search') || '');
  }, [location.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/shop');
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin-dashboard';
    if (user.role === 'seller') return '/seller-dashboard';
    return '/customer-dashboard';
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <nav className="glass sticky top-0 z-50 w-full transition-all duration-300 border-b border-slate-200/50 dark:border-slate-800/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
            <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Shop&Chil
            </span>
          </Link>

          {/* Search bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <input
              type="text"
              placeholder="Search products, brands, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 pl-10 pr-4 py-2 rounded-full border border-slate-200/80 dark:border-slate-800/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
            />
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          </form>

          {/* Controls - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900/80 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Shop Link */}
            <Link to="/shop" className="text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 font-medium text-sm transition-colors">
              Browse
            </Link>

            {/* Cart Icon */}
            <Link to="/cart" className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900/80 text-slate-600 dark:text-slate-300 transition-colors">
              <ShoppingCart className="h-5 w-5" />
              {getItemsCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white dark:border-slate-950 animate-bounce">
                  {getItemsCount()}
                </span>
              )}
            </Link>

            {/* Notifications Icon (Authenticated only) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifDropdownOpen(!notifDropdownOpen);
                    setDropdownOpen(false);
                  }}
                  className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900/80 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute top-1 right-1 bg-rose-500 rounded-full h-2.5 w-2.5 border border-white dark:border-slate-950"></span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 glass rounded-2xl shadow-xl py-3 border border-slate-200/60 dark:border-slate-800/40 text-left">
                    <div className="flex justify-between items-center px-4 pb-2 border-b border-slate-200/50 dark:border-slate-800/50">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Notifications</span>
                      {unreadNotifications.length > 0 && (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-rose-950 dark:text-rose-200">
                          {unreadNotifications.length} New
                        </span>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto mt-2">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-400 text-center">No notifications yet</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markNotificationRead(notif.id)}
                            className={`px-4 py-3 text-xs border-b border-slate-100 dark:border-slate-900/50 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-colors ${!notif.is_read ? 'bg-violet-50/40 dark:bg-violet-950/10 font-medium' : ''}`}
                          >
                            <p className="text-slate-800 dark:text-slate-200">{notif.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    setNotifDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 p-1 px-3 rounded-full border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors text-slate-700 dark:text-slate-300"
                >
                  <User className="h-4.5 w-4.5" />
                  <span className="text-sm font-semibold max-w-[100px] truncate">{user.name}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass rounded-2xl shadow-xl py-2 border border-slate-200/60 dark:border-slate-800/40 text-left">
                    <div className="px-4 py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user.email}</p>
                      <span className="inline-block bg-violet-100 text-violet-800 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-violet-950 dark:text-violet-200 mt-1 capitalize">
                        {user.role}
                      </span>
                    </div>

                    <Link
                      to={getDashboardPath()}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 p-1 px-4 rounded-full bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 hover:shadow-lg transition-all shadow-md"
              >
                Sign In
              </Link>
            )}

          </div>

          {/* Hamburger Menu - Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900/80 text-slate-600 dark:text-slate-300"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/cart" className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900/80 text-slate-600 dark:text-slate-300">
              <ShoppingCart className="h-5 w-5" />
              {getItemsCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-xs font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center border border-white dark:border-slate-950">
                  {getItemsCount()}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900/80 text-slate-600 dark:text-slate-300"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-slate-200/50 dark:border-slate-800/40 py-4 px-4 space-y-4">
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-10 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 focus:outline-none text-sm"
            />
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          </form>

          <div className="flex flex-col gap-2">
            <Link
              to="/shop"
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/40 rounded-xl"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Shop
            </Link>

            {user ? (
              <>
                <Link
                  to={getDashboardPath()}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/40 rounded-xl flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard ({user.role})
                </Link>
                
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-slate-200/50 dark:border-slate-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Notifications</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {notifications.slice(0, 3).map(notif => (
                        <div key={notif.id} className="text-xs text-slate-600 dark:text-slate-400">
                          • {notif.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50/40 dark:hover:bg-rose-950/10 rounded-xl flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="mx-4 text-center py-2.5 rounded-full bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 block"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
