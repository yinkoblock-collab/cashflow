import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeTransactions, subscribeExpenses, updateBusinessDetails } from '../../firebase/services';
import { Transaction, Expense } from '../../types';
import { formatNaira, formatDateTime } from '../../utils/formatters';

export const BalancesView: React.FC = () => {
  const { business, activeSession, showNotification } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState<'cash_to_bank' | 'bank_to_cash'>('cash_to_bank');
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    const unsubTx = subscribeTransactions(
      business.id,
      list => setTransactions(list.slice(0, 50)),
      () => {}
    );
    const unsubExp = subscribeExpenses(
      business.id,
      list => setExpenses(list.slice(0, 50)),
      () => {}
    );
    return () => {
      unsubTx();
      unsubExp();
    };
  }, [business?.id]);

  const cashInDrawer = business?.cashInDrawer || 0;
  const terminalBalance = business?.terminalBalance || 0;
  const totalCombined = cashInDrawer + terminalBalance;

  // Handle manual internal cash-to-bank or bank-to-cash balancing (e.g. attendant went to ATM or bank branch to re-stock physical cash)
  const handleInternalTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      showNotification('Please enter a valid amount.', 'error');
      return;
    }

    setTransferLoading(true);
    try {
      let newCash = business.cashInDrawer;
      let newTerminal = business.terminalBalance;

      if (transferDirection === 'cash_to_bank') {
        // Deposited physical cash into terminal bank account
        if (amount > business.cashInDrawer) {
          showNotification('Transfer amount exceeds current cash in drawer.', 'error');
          setTransferLoading(false);
          return;
        }
        newCash -= amount;
        newTerminal += amount;
      } else {
        // Withdrew cash from bank to put into physical drawer
        if (amount > business.terminalBalance) {
          showNotification('Transfer amount exceeds available terminal/bank balance.', 'error');
          setTransferLoading(false);
          return;
        }
        newTerminal -= amount;
        newCash += amount;
      }

      await updateBusinessDetails(business.id, {
        cashInDrawer: Number(newCash.toFixed(2)),
        terminalBalance: Number(newTerminal.toFixed(2)),
      });

      showNotification(
        `Transferred ${formatNaira(amount)} from ${
          transferDirection === 'cash_to_bank' ? 'Cash to Terminal' : 'Terminal to Cash'
        }`
      );
      setTransferAmount('');
      setShowTransferModal(false);
    } catch (err) {
      console.error(err);
      showNotification('Failed to update balances.', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Cash & terminal balances
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Physical cash and electronic bank funds are tracked strictly separately
          </p>
        </div>

        <button
          onClick={() => setShowTransferModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
          <span>Move funds between cash & bank</span>
        </button>
      </div>

      {/* Main Balances Showcase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Physical Cash In Drawer */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. PHYSICAL CASH IN DRAWER
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatNaira(cashInDrawer)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Exact notes and coins currently sitting in your drawer box
            </p>
          </div>

          {activeSession && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Opened today with:</span>
              <span className="font-semibold text-slate-900">
                {formatNaira(activeSession.openingCash)}
              </span>
            </div>
          )}
        </div>

        {/* Card 2: Terminal / Bank Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. TERMINAL / BANK BALANCE
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatNaira(terminalBalance)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Electronic balance in your POS machine wallet or settlement bank
            </p>
          </div>

          {activeSession && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Opened today with:</span>
              <span className="font-semibold text-slate-900">
                {formatNaira(activeSession.openingTerminalBalance)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Information Banner */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 leading-relaxed">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Why Maureen Cashflow separates these:</strong>
          <p className="mt-0.5 text-emerald-800">
            When a customer withdraws cash, physical cash leaves your drawer while the terminal balance increases. By keeping them separate, you will always know if someone took cash without recording it or if a POS transaction failed to credit your bank.
          </p>
        </div>
      </div>

      {/* Recent Movements Split: Cash vs Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cash Drawer Movements */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Recent cash drawer movements
            </h3>
            <span className="text-[11px] text-slate-400">Latest activity</span>
          </div>

          {transactions.filter(t => t.cashDelta !== 0).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No cash drawer movements yet.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions
                .filter(t => t.cashDelta !== 0)
                .slice(0, 7)
                .map(t => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">
                        {t.typeName}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {formatDateTime(t.createdAt)}
                      </span>
                    </div>
                    <span
                      className={`font-bold ${
                        t.cashDelta < 0 ? 'text-slate-800' : 'text-emerald-700'
                      }`}
                    >
                      {t.cashDelta > 0 ? '+' : ''}
                      {formatNaira(t.cashDelta)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Terminal/Bank Movements */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-slate-700" />
              Recent terminal & bank movements
            </h3>
            <span className="text-[11px] text-slate-400">Latest activity</span>
          </div>

          {transactions.filter(t => t.terminalDelta !== 0).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No terminal movements yet.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions
                .filter(t => t.terminalDelta !== 0)
                .slice(0, 7)
                .map(t => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">
                        {t.typeName}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {formatDateTime(t.createdAt)}
                      </span>
                    </div>
                    <span
                      className={`font-bold ${
                        t.terminalDelta < 0 ? 'text-slate-800' : 'text-emerald-700'
                      }`}
                    >
                      {t.terminalDelta > 0 ? '+' : ''}
                      {formatNaira(t.terminalDelta)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Internal Move Modal: Mobile Bottom Sheet */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border-t sm:border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
            {/* Mobile Pull Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Move funds between cash & terminal
              </h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 touch-manipulation"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInternalTransfer} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-500 leading-relaxed">
                Use this when you take cash from the drawer to deposit in the bank, or when you withdraw cash from bank/ATM to restock your drawer.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Movement direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferDirection('cash_to_bank')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all min-h-[46px] touch-manipulation ${
                      transferDirection === 'cash_to_bank'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cash → Terminal / Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferDirection('bank_to_cash')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all min-h-[46px] touch-manipulation ${
                      transferDirection === 'bank_to_cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Terminal / Bank → Cash
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Amount to transfer (₦)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min="1"
                  step="any"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="e.g. 100,000"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[46px]"
                />
              </div>

              <div className="pt-2 flex gap-3 pb-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-3 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[46px] touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="flex-1 py-3 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 min-h-[46px] touch-manipulation"
                >
                  {transferLoading ? 'Moving...' : 'Confirm transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
