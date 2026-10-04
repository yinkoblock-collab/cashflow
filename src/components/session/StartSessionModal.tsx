import React, { useState } from 'react';
import { X, PlayCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { startDailySession } from '../../firebase/services';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { business, userProfile, refreshActiveSession, showNotification } = useAuth();
  const [openingCash, setOpeningCash] = useState<string>(
    business?.cashInDrawer ? String(business.cashInDrawer) : '0'
  );
  const [openingTerminal, setOpeningTerminal] = useState<string>(
    business?.terminalBalance ? String(business.terminalBalance) : '0'
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen || !business || !userProfile) return null;

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashVal = parseFloat(openingCash) || 0;
    const termVal = parseFloat(openingTerminal) || 0;

    if (cashVal < 0 || termVal < 0) {
      showNotification('Opening balances cannot be negative.', 'error');
      return;
    }

    setLoading(true);
    try {
      await startDailySession({
        businessId: business.id,
        attendantId: userProfile.uid,
        attendantName: userProfile.fullName,
        openingCash: cashVal,
        openingTerminalBalance: termVal,
      });
      await refreshActiveSession();
      showNotification('Business day started successfully! You can now record transactions.');
      onClose();
    } catch (err) {
      console.error(err);
      showNotification('Could not start business day. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border-t sm:border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Start business day</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Record your starting balances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleStart} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 leading-relaxed">
            Count the physical cash in your drawer and check your POS terminal or bank app balance before starting today's transactions.
          </div>

          {/* Opening Cash Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Opening cash in drawer
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500 font-semibold text-sm">
                ₦
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                required
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-3.5 py-2.5 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[48px]"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Physical cash currently in your cash box or drawer
            </p>
          </div>

          {/* Opening Terminal Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Opening terminal / bank balance
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500 font-semibold text-sm">
                ₦
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                required
                value={openingTerminal}
                onChange={e => setOpeningTerminal(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-3.5 py-2.5 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[48px]"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Available funds in your POS machine wallet or bank account
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer min-h-[48px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-3 px-4 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer min-h-[48px] touch-manipulation"
            >
              {loading ? 'Starting day...' : 'Confirm & start day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
