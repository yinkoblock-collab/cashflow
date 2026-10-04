import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Calculator, StopCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { closeDailySession } from '../../firebase/services';
import { formatNaira, evaluateDifference } from '../../utils/formatters';

interface CloseSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloseSessionModal: React.FC<CloseSessionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { business, activeSession, refreshActiveSession, showNotification } = useAuth();

  const expectedCash = business?.cashInDrawer || 0;
  const expectedTerminal = business?.terminalBalance || 0;

  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [actualTerminalInput, setActualTerminalInput] = useState<string>('');
  const [differenceExplanation, setDifferenceExplanation] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Parse actuals
  const actualCash = actualCashInput === '' ? expectedCash : parseFloat(actualCashInput) || 0;
  const actualTerminal = actualTerminalInput === '' ? expectedTerminal : parseFloat(actualTerminalInput) || 0;

  // Differences
  const cashDiffResult = useMemo(
    () => evaluateDifference(actualCash, expectedCash),
    [actualCash, expectedCash]
  );

  const termDiffResult = useMemo(
    () => evaluateDifference(actualTerminal, expectedTerminal),
    [actualTerminal, expectedTerminal]
  );

  const overallDiff = cashDiffResult.diff + termDiffResult.diff;
  const hasShortageOrSurplus = Math.abs(cashDiffResult.diff) > 0.01 || Math.abs(termDiffResult.diff) > 0.01;

  if (!isOpen || !activeSession || !business) return null;

  const handleCloseDay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasShortageOrSurplus && !differenceExplanation.trim()) {
      showNotification('Please enter a short explanation for the difference before closing today.', 'error');
      return;
    }

    setLoading(true);
    try {
      await closeDailySession(activeSession, {
        closingExpectedCash: expectedCash,
        closingActualCash: actualCash,
        cashDifference: cashDiffResult.diff,
        closingExpectedTerminal: expectedTerminal,
        closingActualTerminal: actualTerminal,
        terminalDifference: termDiffResult.diff,
        overallDifference: overallDiff,
        differenceExplanation: differenceExplanation.trim() || undefined,
        closingNotes: closingNotes.trim() || undefined,
        totalTransactionCount: activeSession.totalTransactionCount || 0,
        totalTransactionValue: activeSession.totalTransactionValue || 0,
        totalEarnings: activeSession.totalEarnings || 0,
        totalExpenses: activeSession.totalExpenses || 0,
        netEarnings: (activeSession.totalEarnings || 0) - (activeSession.totalExpenses || 0),
      });

      await refreshActiveSession();
      showNotification('Business day closed successfully. Great work today!');
      onClose();
    } catch (err) {
      console.error(err);
      showNotification('Failed to close business day. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border-t sm:border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Close business day</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Check what you have before you close today.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleCloseDay} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* SECTION 1: CASH IN DRAWER */}
          <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
            <h3 className="text-[11px] sm:text-xs font-bold tracking-wider text-slate-500 uppercase">
              CASH IN DRAWER
            </h3>
            
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs text-slate-600">Expected cash:</span>
              <span className="text-sm font-bold text-slate-900">
                {formatNaira(expectedCash)}
              </span>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                How much cash do you have?
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500 font-semibold text-sm">
                  ₦
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  value={actualCashInput}
                  onChange={e => setActualCashInput(e.target.value)}
                  placeholder={String(expectedCash)}
                  className="w-full pl-8 pr-3.5 py-2.5 text-base font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[48px]"
                />
              </div>

              {/* Status Message */}
              <div className="mt-2">
                {cashDiffResult.status === 'match' && (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Your cash matches.</span>
                  </div>
                )}
                {cashDiffResult.status === 'surplus' && (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{cashDiffResult.message}</span>
                  </div>
                )}
                {cashDiffResult.status === 'shortage' && (
                  <div className="flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 py-2 px-3 rounded-xl border border-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{cashDiffResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: TERMINAL / BANK */}
          <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
            <h3 className="text-[11px] sm:text-xs font-bold tracking-wider text-slate-500 uppercase">
              TERMINAL / BANK
            </h3>
            
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs text-slate-600">Expected balance:</span>
              <span className="text-sm font-bold text-slate-900">
                {formatNaira(expectedTerminal)}
              </span>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                How much do you have now?
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500 font-semibold text-sm">
                  ₦
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  value={actualTerminalInput}
                  onChange={e => setActualTerminalInput(e.target.value)}
                  placeholder={String(expectedTerminal)}
                  className="w-full pl-8 pr-3.5 py-2.5 text-base font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[48px]"
                />
              </div>

              {/* Status Message */}
              <div className="mt-2">
                {termDiffResult.status === 'match' && (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Your terminal balance matches.</span>
                  </div>
                )}
                {termDiffResult.status === 'surplus' && (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>You have {formatNaira(termDiffResult.diff)} more than expected in terminal.</span>
                  </div>
                )}
                {termDiffResult.status === 'shortage' && (
                  <div className="flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 py-2 px-3 rounded-xl border border-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>You have {formatNaira(Math.abs(termDiffResult.diff))} less than expected in terminal.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: TODAY'S RESULT */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <h3 className="text-xs font-bold tracking-wider text-slate-900 uppercase flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-emerald-600" />
              TODAY'S RESULT
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-600">Cash difference:</span>
                <span
                  className={`font-semibold ${
                    cashDiffResult.diff < 0
                      ? 'text-rose-600'
                      : cashDiffResult.diff > 0
                      ? 'text-emerald-700'
                      : 'text-slate-900'
                  }`}
                >
                  {formatNaira(cashDiffResult.diff)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-600">Terminal difference:</span>
                <span
                  className={`font-semibold ${
                    termDiffResult.diff < 0
                      ? 'text-rose-600'
                      : termDiffResult.diff > 0
                      ? 'text-emerald-700'
                      : 'text-slate-900'
                  }`}
                >
                  {formatNaira(termDiffResult.diff)}
                </span>
              </div>
              <div className="py-2 flex justify-between text-sm font-bold">
                <span className="text-slate-900">Overall difference:</span>
                <span
                  className={`${
                    overallDiff < 0
                      ? 'text-rose-600'
                      : overallDiff > 0
                      ? 'text-emerald-700'
                      : 'text-slate-900'
                  }`}
                >
                  {formatNaira(overallDiff)}
                </span>
              </div>
            </div>
          </div>

          {/* If there is a difference, ask why */}
          {hasShortageOrSurplus && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Why is there a difference?
              </label>
              <textarea
                required
                rows={2}
                value={differenceExplanation}
                onChange={e => setDifferenceExplanation(e.target.value)}
                placeholder="Enter a short explanation..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Optional Closing Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Closing notes (optional)
            </label>
            <textarea
              rows={2}
              value={closingNotes}
              onChange={e => setClosingNotes(e.target.value)}
              placeholder="Anything else about today?"
              className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Sticky/Comfortable Action Bar */}
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
              {loading ? 'Closing day...' : 'Confirm & close day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
