import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const UIContext = createContext(null);

export const useUI = () => useContext(UIContext);

// Toast Component
const Toast = ({ id, message, type, duration, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClose(id);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 animate-bounce" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 animate-shake" />,
    info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
  };

  const borderColors = {
    success: 'border-emerald-500/30',
    error: 'border-rose-500/30',
    info: 'border-sky-500/30',
    warning: 'border-amber-500/30'
  };

  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
    warning: 'bg-amber-500'
  };

  return (
    <div
      className={`relative flex items-center gap-3 p-4 mb-3 rounded-xl border shadow-xl backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 text-zinc-800 dark:text-zinc-100 ${borderColors[type]} max-w-md animate-slide-in overflow-hidden transition-all duration-300 hover:scale-[1.02]`}
      style={{
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
      }}
    >
      {icons[type]}
      <p className="text-sm font-medium pr-6">{message}</p>
      
      <button
        onClick={() => onClose(id)}
        className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-zinc-200/50 dark:bg-zinc-700/50">
        <div
          className={`h-full ${progressColors[type]} transition-all ease-linear`}
          style={{ width: `${progress}` }}
        />
      </div>
    </div>
  );
};

// Custom Confirm Modal Component
const ConfirmModal = ({ isOpen, title, message, type, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const confirmColors = {
    danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-white',
    info: 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20 text-white'
  };

  const icons = {
    danger: <AlertTriangle className="w-12 h-12 text-rose-500 mb-2 animate-pulse" />,
    info: <Info className="w-12 h-12 text-violet-500 mb-2" />
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <div 
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onCancel}
      />

      {/* Modal Content */}
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-2xl p-6 flex flex-col items-center text-center animate-scale-up backdrop-blur-md"
        style={{
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
        }}
      >
        {icons[type || 'danger']}
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{title}</h3>
        <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-95 ${confirmColors[type || 'danger']}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export const UIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    resolve: null
  });

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const confirm = (message, options = {}) => {
    const { title = 'Confirm Action', type = 'danger' } = options;
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        type,
        resolve
      });
    });
  };

  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState({ isOpen: false, title: '', message: '', type: 'danger', resolve: null });
  };

  const handleCancel = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState({ isOpen: false, title: '', message: '', type: 'danger', resolve: null });
  };

  return (
    <UIContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Floating Toasts Stack */}
      <div className="fixed top-24 right-6 z-[9999] flex flex-col pointer-events-none select-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>

      {/* Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </UIContext.Provider>
  );
};
