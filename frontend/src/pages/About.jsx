import React from 'react';
import { Sparkles, Heart, ShieldCheck } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up space-y-12 text-left">
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white margin-0">About Shop&Chil</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Making e-commerce relaxing, transparent, and personalized for shoppers and sellers around the world.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Our Retail Philosophy</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            At Shop&Chil, we believe that purchasing items online should not feel hectic. There shouldn't be constant pressure timers or flashing ads. We offer a curated, elegant feed of products suited for your home, devices, lifestyle, and work.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Whether you are here as a shopper browsing electronics, a seller uploading custom goods, or an administrator reviewing catalog health, our goal is to keep things simple, smooth, and modern.
          </p>
        </div>
        <div className="aspect-video rounded-3xl overflow-hidden shadow-lg">
          <img src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop" alt="Office Desk" className="w-full h-full object-cover" />
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div className="space-y-3 p-6 glass rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
          <Sparkles className="h-8 w-8 text-violet-500 mx-auto" />
          <h3 className="font-bold text-sm">Curated Picks</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Only high quality, beautiful items are approved for our store shelves.</p>
        </div>
        <div className="space-y-3 p-6 glass rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
          <Heart className="h-8 w-8 text-violet-500 mx-auto" />
          <h3 className="font-bold text-sm">Shopper Focus</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Personalized lists based on history ensure you find what you need quickly.</p>
        </div>
        <div className="space-y-3 p-6 glass rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
          <ShieldCheck className="h-8 w-8 text-violet-500 mx-auto" />
          <h3 className="font-bold text-sm">Safe & Secure</h3>
          <p className="text-xs text-slate-500 leading-relaxed">JWT verification and encryption safeguard all account data fields.</p>
        </div>
      </div>
    </div>
  );
}
