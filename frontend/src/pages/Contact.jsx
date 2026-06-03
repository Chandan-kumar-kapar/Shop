import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && email && message) {
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up space-y-12 text-left">
      
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white margin-0">Contact Support</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Need help tracking an order, returning an item, or listing a product? Drop us a message below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Info Column */}
        <div className="md:col-span-1 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Get in Touch</h2>
          
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex gap-3 items-center">
              <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300">Headquarters</p>
                <p>123 Chill Blvd, Suite 100, CA</p>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300">Call Us</p>
                <p>+1 (800) CHIL-SHOP</p>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300">Support Email</p>
                <p>support@shopandchil.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-2 glass p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Send Message</h2>
          
          {submitted ? (
            <div className="p-4 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl dark:bg-emerald-950/20 dark:text-emerald-300 text-center">
              Thank you! Your message has been sent successfully. We will get back to you shortly.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase">Message</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows="4"
                  placeholder="How can we help you today?"
                  className="w-full bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-violet-600 text-white font-bold hover:bg-violet-700 flex items-center gap-1.5 shadow-md"
              >
                <Send className="h-4 w-4" /> Send Message
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
