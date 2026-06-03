import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <span className="text-2xl font-black tracking-tighter text-white">
              Shop&Chil
            </span>
            <p className="text-sm max-w-sm">
              Discover a premium shopping experience featuring curated electronics, trendy apparel, cozy home decor, and inspiring stationery. Relax and shop at your own pace.
            </p>
            <div className="flex gap-4 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
                aria-label="GitHub link"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop?category_id=1" className="hover:text-white transition-colors">Electronics</Link></li>
              <li><Link to="/shop?category_id=2" className="hover:text-white transition-colors">Fashion</Link></li>
              <li><Link to="/shop?category_id=3" className="hover:text-white transition-colors">Home & Living</Link></li>
              <li><Link to="/shop?category_id=4" className="hover:text-white transition-colors">Books & Stationery</Link></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-violet-400" />
                <span>123 Chill Blvd, Suite 100, CA</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-violet-400" />
                <span>+1 (800) CHIL-SHOP</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-violet-400" />
                <span>support@shopandchil.com</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs gap-4">
          <p>© {new Date().getFullYear()} Shop&Chil Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
