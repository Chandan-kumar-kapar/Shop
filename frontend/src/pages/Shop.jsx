import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Filter, SlidersHorizontal, Grid, Search, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function Shop() {
  const location = useLocation();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [selectedRating, setSelectedRating] = useState('');
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync initial query params from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('search') || '');
    setSelectedCategory(params.get('category_id') || '');
    
    // Fetch categories on mount
    fetch('/api/categories')
      .then(res => res.ok ? res.json() : [])
      .then(data => setCategories(data))
      .catch(err => console.error(err));
  }, [location.search]);

  // Refetch products whenever filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.append('search', searchQuery);
        if (selectedCategory) queryParams.append('category_id', selectedCategory);
        if (minPrice) queryParams.append('min_price', minPrice);
        if (maxPrice) queryParams.append('max_price', maxPrice);
        if (selectedSort) queryParams.append('sort_by', selectedSort);
        if (selectedRating) queryParams.append('rating', selectedRating);
        
        // Include guest session ID for search tracking
        const sessId = localStorage.getItem('sessionId');
        if (sessId) queryParams.append('session_id', sessId);

        const res = await fetch(`/api/products?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (err) {
        console.error("Shop product fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce product fetches slightly for text inputs
    const delayDebounce = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedCategory, minPrice, maxPrice, selectedSort, selectedRating]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setMinPrice('');
    maxPrice !== '' && setMaxPrice('');
    setSelectedSort('newest');
    setSelectedRating('');
  };

  const FilterSidebar = () => (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-extrabold text-base flex items-center gap-2">
          <Filter className="h-4.5 w-4.5 text-violet-500" />
          Filters
        </h3>
        <button
          onClick={clearFilters}
          className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
        >
          Clear All
        </button>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Categories</h4>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Price Range</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-1/2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <span className="text-slate-400 text-sm">-</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-1/2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Minimum Rating</h4>
        <select
          value={selectedRating}
          onChange={(e) => setSelectedRating(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">Any Rating</option>
          <option value="4.5">4.5★ & Up</option>
          <option value="4.0">4.0★ & Up</option>
          <option value="3.5">3.5★ & Up</option>
          <option value="3.0">3.0★ & Up</option>
        </select>
      </div>

      {/* Sorting */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sort By</h4>
        <select
          value={selectedSort}
          onChange={(e) => setSelectedSort(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="newest">Newest Additions</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="popularity">Popularity / Rating</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
      
      {/* Title & Mobile Filter togglers */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-left space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white margin-0">Catalog</h1>
          <p className="text-sm text-slate-500">Showing {products.length} products</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="md:hidden flex items-center gap-2 p-2.5 px-4 rounded-full border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 shrink-0 glass p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/30 sticky top-20">
          <FilterSidebar />
        </aside>

        {/* Product Grid Area */}
        <main className="flex-1">
          {/* Local Search input */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Filter these results by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded-2xl aspect-[3/4]"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/60">
              <Grid className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No products match your filter options.</p>
              <button
                onClick={clearFilters}
                className="mt-4 px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Drawer filter sheet */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-950/40 backdrop-blur-xs flex justify-end">
          <div className="w-80 h-full bg-white dark:bg-slate-950 p-6 flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
            <div className="overflow-y-auto pr-1">
              <div className="flex justify-between items-center mb-6">
                <span className="font-extrabold text-lg">Filters</span>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <FilterSidebar />
            </div>
            
            <button
              onClick={() => setShowMobileFilters(false)}
              className="mt-6 w-full py-3 rounded-full bg-violet-600 text-white font-bold text-sm hover:bg-violet-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
