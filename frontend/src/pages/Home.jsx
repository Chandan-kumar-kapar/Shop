import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, Compass, ShoppingBag } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { token, user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Categories
        const catRes = await fetch('/api/categories');
        if (catRes.ok) {
          const cats = await catRes.json();
          setCategories(cats);
        }

        // Fetch Recommendations
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const recRes = await fetch('/api/recommendations?limit=8', { headers });
        if (recRes.ok) {
          const recs = await recRes.json();
          setRecommendations(recs);
        }
      } catch (err) {
        console.error("Home page fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user]);

  return (
    <div className="space-y-16 pb-16 animate-fade-in-up">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl mx-4 sm:mx-6 lg:mx-8 mt-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent)]"></div>
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          
          <div className="text-left space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              The Premium Experience
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-white margin-0">
              Shop Smart. <br />
              <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                Chil Out.
              </span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg max-w-md">
              Welcome to Shop&Chil. We make shopping relaxing with high-quality curated items, instant tracking, and personalized recommendations.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                to="/shop"
                className="px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-lg shadow-violet-500/20 flex items-center gap-2 hover:scale-105 transition-all"
              >
                Browse Shop
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="w-full max-w-sm md:max-w-md relative select-none">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 blur opacity-30 animate-pulse"></div>
            <div className="relative glass rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4 text-slate-800 dark:text-white">
              <img
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop"
                alt="Featured Hero"
                className="w-full aspect-[4/3] object-cover rounded-2xl shadow-md"
              />
              <div className="flex justify-between items-center text-left">
                <div>
                  <p className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">Editor's Pick</p>
                  <h3 className="font-extrabold text-lg text-slate-100 mt-0.5">Studio Wireless Pro</h3>
                </div>
                <span className="text-xl font-black text-slate-100">₹149.99</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex justify-between items-end">
          <div className="text-left space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="h-6 w-6 text-violet-500" />
              Explore Categories
            </h2>
            <p className="text-sm text-slate-500">Pick a category to filter your shopping experience</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category_id=${cat.id}`}
              className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200/50 dark:border-slate-800/30"
            >
              <img
                src={cat.image_url || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop'}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4 text-left">
                <h3 className="text-white font-extrabold text-base md:text-lg">{cat.name}</h3>
                <p className="text-slate-300 text-[10px] md:text-xs truncate">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommendations / Trending Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex justify-between items-end">
          <div className="text-left space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              {user ? (
                <>
                  <Sparkles className="h-6 w-6 text-violet-500" />
                  Recommended For You
                </>
              ) : (
                <>
                  <TrendingUp className="h-6 w-6 text-violet-500" />
                  Trending Products
                </>
              )}
            </h2>
            <p className="text-sm text-slate-500">
              {user ? 'Personalized suggestions based on your interests' : 'Check out what our shoppers are buying right now'}
            </p>
          </div>
          <Link
            to="/shop"
            className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 flex items-center gap-1 hover:underline"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 4, 8].map((i) => (
              <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded-2xl aspect-[3/4]"></div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12 glass rounded-2xl border border-slate-200/50 dark:border-slate-800/30">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-400 text-sm">No products found. Please run the seed script to populate data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recommendations.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}
      </section>

      {/* Promo Banner Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass rounded-3xl p-8 md:p-12 border border-violet-100 dark:border-slate-800/60 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 text-left">
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl"></div>
          <div className="space-y-3 max-w-xl z-10">
            <h3 className="text-xl md:text-3xl font-black text-slate-800 dark:text-white">Become a Seller today!</h3>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
              Launch your online store in Shop&Chil. Upload your products, customize descriptions, and let our recommendation system get you orders effortlessly.
            </p>
          </div>
          <Link
            to="/register?role=seller"
            className="px-6 py-3 rounded-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold text-sm hover:shadow-lg transition-all shrink-0 z-10 hover:scale-105"
          >
            Create Seller Account
          </Link>
        </div>
      </section>
    </div>
  );
}
