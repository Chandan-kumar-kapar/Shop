import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      // Redirect based on role
      if (loggedUser.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (loggedUser.role === 'seller') {
        navigate('/seller-dashboard');
      } else {
        // If customer was checking out, bring them back to checkout page
        const queryParams = new URLSearchParams(location.search);
        const redirect = queryParams.get('redirect');
        if (redirect) {
          navigate(redirect);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 animate-fade-in-up space-y-6">
      <div className="glass p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-center space-y-6">
        
        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white margin-0">Welcome Back</h1>
          <p className="text-sm text-slate-400">Sign in to continue to your Shop&Chil experience</p>
        </div>

        {error && (
          <div className="bg-rose-100 text-rose-800 text-xs font-bold p-3 rounded-xl dark:bg-rose-950/20 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
            <div className="relative">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
              />
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
              />
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold text-sm shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 hover:scale-101 transition-all mt-6"
          >
            <LogIn className="h-4.5 w-4.5" />
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <hr className="border-slate-200 dark:border-slate-800" />

        <p className="text-xs text-slate-400 leading-relaxed">
          Don't have an account?{' '}
          <Link to="/register" className="text-violet-600 font-bold hover:underline">
            Register here
          </Link>
        </p>

      </div>
    </div>
  );
}
