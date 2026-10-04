import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const NotificationToast: React.FC = () => {
  const { notification, clearNotification } = useAuth();

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isError = notification.type === 'error';

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm font-medium ${
          isSuccess
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : isError
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-slate-800 border-slate-700 text-white'
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
          {!isSuccess && !isError && <Info className="w-5 h-5 text-slate-300" />}
        </div>
        <div className="flex-1 text-sm leading-snug">{notification.message}</div>
        <button
          onClick={clearNotification}
          className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded-md"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
