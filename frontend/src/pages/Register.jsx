import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer'); // 'customer' or 'seller'
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await register(name, email, password, role);
      
      if (role === 'seller') {
        setSuccess("Seller registration successful! Your account is pending administrator approval before you can log in.");
        setName('');
        setEmail('');
        setPassword('');
      } else {
        setSuccess("Shopper registration successful! Redirecting you to login...");
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || "Registration failed. Email might already be in use.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 animate-fade-in-up space-y-6">
      <div className="glass p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 text-center space-y-6">
        
        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white margin-0">Create Account</h1>
          <p className="text-sm text-slate-400">Join Shop&Chil to browse or list products</p>
        </div>

        {error && (
          <div className="bg-rose-100 text-rose-800 text-xs font-bold p-3 rounded-xl dark:bg-rose-950/20 dark:text-rose-300">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-100 text-emerald-800 text-xs font-bold p-3 rounded-xl dark:bg-emerald-950/20 dark:text-emerald-300 text-left leading-relaxed">
            {success}
          </div>
        )}

        {/* Role Toggle Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/60 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-full transition-all ${
              role === 'customer' 
                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Register as Shopper
          </button>
          <button
            type="button"
            onClick={() => setRole('seller')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-full transition-all ${
              role === 'seller' 
                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Register as Seller
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
            <div className="relative">
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
              />
              <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
            </div>
          </div>

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
            <UserPlus className="h-4.5 w-4.5" />
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </form>

        <hr className="border-slate-200 dark:border-slate-800" />

        <p className="text-xs text-slate-400 leading-relaxed">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-600 font-bold hover:underline">
            Login here
          </Link>
        </p>

      </div>
    </div>
  );
}
