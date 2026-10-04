import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  DollarSign,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  History,
  AlertCircle,
  Search,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeDebts,
  subscribeDebtPayments,
  createDebtRecord,
  recordDebtPayment,
} from '../../firebase/services';
import { Debt, DebtPayment } from '../../types';
import { formatNaira, formatDateOnly, formatDateTime, getTodayString } from '../../utils/formatters';

export const DebtsView: React.FC = () => {
  const { business, activeSession, showNotification } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [activeDebtForPayment, setActiveDebtForPayment] = useState<Debt | null>(null);

  // Tab: Active Debts vs Payment History
  const [viewTab, setViewTab] = useState<'debts' | 'history'>('debts');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  // Add Debt Form State
  const [debtorName, setDebtorName] = useState('');
  const [debtorPhone, setDebtorPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [debtDate, setDebtDate] = useState(getTodayString());
  const [savingDebt, setSavingDebt] = useState(false);

  // Record Payment Form State
  const [payAmountStr, setPayAmountStr] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'terminal_bank'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(getTodayString());
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    if (!business?.id) return;

    const unsubDebts = subscribeDebts(
      business.id,
      list => {
        setDebts(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubPayments = subscribeDebtPayments(
      business.id,
      list => setPayments(list),
      () => {}
    );

    return () => {
      unsubDebts();
      unsubPayments();
    };
  }, [business?.id]);

  // Aggregate stats
  const totalOutstanding = useMemo(() => {
    return debts
      .filter(d => d.status !== 'paid')
      .reduce((sum, d) => sum + d.outstandingAmount, 0);
  }, [debts]);

  const totalCollected = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          d.debtorName.toLowerCase().includes(q) ||
          d.reason.toLowerCase().includes(q) ||
          (d.debtorPhone && d.debtorPhone.includes(q));
        if (!matches) return false;
      }
      if (statusFilter === 'unpaid' && d.status === 'paid') return false;
      if (statusFilter === 'paid' && d.status !== 'paid') return false;
      return true;
    });
  }, [debts, searchTerm, statusFilter]);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      showNotification('Please enter a valid amount.', 'error');
      return;
    }
    if (!debtorName.trim()) {
      showNotification('Please enter the customer name.', 'error');
      return;
    }

    setSavingDebt(true);
    try {
      await createDebtRecord({
        businessId: business.id,
        sessionId: activeSession?.id,
        debtorName: debtorName.trim(),
        debtorPhone: debtorPhone.trim() || undefined,
        initialAmount: amount,
        reason: reason.trim() || 'POS transaction credit',
        date: debtDate,
      });

      showNotification(`Added debt of ${formatNaira(amount)} for ${debtorName.trim()}`);
      setDebtorName('');
      setDebtorPhone('');
      setAmountStr('');
      setReason('');
      setShowAddDebtModal(false);
    } catch (err) {
      console.error(err);
      showNotification('Failed to add debt record.', 'error');
    } finally {
      setSavingDebt(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !activeDebtForPayment) return;

    const amount = parseFloat(payAmountStr);
    if (!amount || amount <= 0) {
      showNotification('Please enter a valid payment amount.', 'error');
      return;
    }
    if (amount > activeDebtForPayment.outstandingAmount) {
      showNotification(`Amount cannot exceed outstanding balance of ${formatNaira(activeDebtForPayment.outstandingAmount)}.`, 'error');
      return;
    }

    setSavingPayment(true);
    try {
      await recordDebtPayment({
        business,
        debt: activeDebtForPayment,
        amount,
        paymentMethod: payMethod,
        notes: payNotes.trim() || undefined,
        date: payDate,
      });

      showNotification(`Recorded payment of ${formatNaira(amount)} from ${activeDebtForPayment.debtorName}`);
      setPayAmountStr('');
      setPayNotes('');
      setActiveDebtForPayment(null);
    } catch (err) {
      console.error(err);
      showNotification('Failed to record debt payment.', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Customer debts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track customer credits, partial repayments, and settled balances
          </p>
        </div>

        <button
          onClick={() => setShowAddDebtModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add debtor</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Total outstanding debt
          </span>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {formatNaira(totalOutstanding)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Money owed by customers
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Total debt collected
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {formatNaira(totalCollected)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Repayments received so far
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Total debtors
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {debts.filter(d => d.status !== 'paid').length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Customers with pending balance
          </p>
        </div>
      </div>

      {/* Tabs: Debts vs Payment History */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewTab('debts')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            viewTab === 'debts'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Customer debts ({debts.length})
        </button>
        <button
          onClick={() => setViewTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            viewTab === 'history'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Payment history ({payments.length})
        </button>
      </div>

      {/* DEBTS TAB */}
      {viewTab === 'debts' && (
        <div className="space-y-3">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search debtors by name, phone or reason..."
                className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  statusFilter === 'all'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('unpaid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  statusFilter === 'unpaid'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Unpaid
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Fully Paid
              </button>
            </div>
          </div>

          {/* Debtors List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Loading debtors...
              </div>
            ) : filteredDebts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  No debt records found
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Keep your business protected by recording any customer credit immediately.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDebts.map(debt => (
                  <div
                    key={debt.id}
                    className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {debt.debtorName}
                        </span>
                        {debt.debtorPhone && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {debt.debtorPhone}
                          </span>
                        )}
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            debt.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : debt.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {debt.status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        Reason: <span className="text-slate-700">{debt.reason}</span>
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Date: {formatDateOnly(debt.date)}</span>
                        <span>• Initial: {formatNaira(debt.initialAmount)}</span>
                        {debt.amountPaid > 0 && (
                          <span className="text-emerald-700">
                            • Paid: {formatNaira(debt.amountPaid)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Outstanding
                        </span>
                        <span
                          className={`text-base font-extrabold ${
                            debt.outstandingAmount > 0
                              ? 'text-rose-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatNaira(debt.outstandingAmount)}
                        </span>
                      </div>

                      {debt.outstandingAmount > 0 ? (
                        <button
                          onClick={() => {
                            setActiveDebtForPayment(debt);
                            setPayAmountStr(String(debt.outstandingAmount));
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
                        >
                          Record payment
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Settled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYMENT HISTORY TAB */}
      {viewTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {payments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No debt payments recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {payments.map(pay => (
                <div
                  key={pay.id}
                  className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {pay.debtorName}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Paid on {formatDateOnly(pay.date)} via{' '}
                      <span className="capitalize font-medium text-slate-600">
                        {pay.paymentMethod.replace('_', ' ')}
                      </span>
                    </p>
                    {pay.notes && (
                      <p className="text-xs text-slate-500">{pay.notes}</p>
                    )}
                  </div>

                  <span className="font-bold text-emerald-700 text-sm">
                    +{formatNaira(pay.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Debtor Modal: Mobile Bottom Sheet */}
      {showAddDebtModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border-t sm:border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
            {/* Mobile Pull Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Add customer debt</h2>
              <button
                onClick={() => setShowAddDebtModal(false)}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 touch-manipulation"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Customer name
                </label>
                <input
                  type="text"
                  required
                  value={debtorName}
                  onChange={e => setDebtorName(e.target.value)}
                  placeholder="e.g. Mama Chidi"
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone number (optional)
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={debtorPhone}
                  onChange={e => setDebtorPhone(e.target.value)}
                  placeholder="080..."
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Amount owed (₦)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min="1"
                  step="any"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  placeholder="5,000"
                  className="w-full p-2.5 text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason / Description
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Took ₦5,000 cash withdrawal, transfer pending"
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={debtDate}
                  onChange={e => setDebtDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                />
              </div>

              <div className="pt-2 flex gap-3 pb-2">
                <button
                  type="button"
                  onClick={() => setShowAddDebtModal(false)}
                  className="flex-1 py-3 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[46px] touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDebt}
                  className="flex-1 py-3 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 min-h-[46px] touch-manipulation"
                >
                  {savingDebt ? 'Saving...' : 'Save debt record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Debt Payment Modal: Mobile Bottom Sheet */}
      {activeDebtForPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border-t sm:border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
            {/* Mobile Pull Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Record debt payment
                </h2>
                <p className="text-xs text-slate-500">
                  Debtor: {activeDebtForPayment.debtorName}
                </p>
              </div>
              <button
                onClick={() => setActiveDebtForPayment(null)}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 touch-manipulation"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs">
                <span className="text-slate-500">Outstanding balance:</span>
                <span className="font-bold text-rose-600">
                  {formatNaira(activeDebtForPayment.outstandingAmount)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment amount (₦)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min="1"
                  max={activeDebtForPayment.outstandingAmount}
                  step="any"
                  value={payAmountStr}
                  onChange={e => setPayAmountStr(e.target.value)}
                  placeholder="Amount paid"
                  className="w-full p-2.5 text-base font-bold text-emerald-700 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  How was the debt paid?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition-all min-h-[46px] touch-manipulation ${
                      payMethod === 'cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cash (goes to drawer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('terminal_bank')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition-all min-h-[46px] touch-manipulation ${
                      payMethod === 'terminal_bank'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Bank transfer / POS
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid in cash at the counter"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                />
              </div>

              <div className="pt-2 flex gap-3 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveDebtForPayment(null)}
                  className="flex-1 py-3 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[46px] touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="flex-1 py-3 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 min-h-[46px] touch-manipulation"
                >
                  {savingPayment ? 'Saving...' : 'Confirm payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
