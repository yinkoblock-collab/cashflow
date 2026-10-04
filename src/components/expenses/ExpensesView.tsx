import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  ArrowDownCircle,
  Calendar,
  Wallet,
  CreditCard,
  Trash2,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeExpenses, recordExpense } from '../../firebase/services';
import { Expense, ExpenseSource } from '../../types';
import { formatNaira, formatDateOnly, formatDateTime, getTodayString } from '../../utils/formatters';

export const ExpensesView: React.FC = () => {
  const { business, activeSession, showNotification } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // New expense form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paymentSource, setPaymentSource] = useState<ExpenseSource>('cash');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [saving, setSaving] = useState(false);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'cash' | 'terminal_bank'>('all');

  useEffect(() => {
    if (!business?.id) return;
    const unsub = subscribeExpenses(
      business.id,
      list => {
        setExpenses(list);
        setLoading(false);
      },
      err => {
        console.error('Failed to load expenses', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [business?.id]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          exp.name.toLowerCase().includes(query) ||
          (exp.notes && exp.notes.toLowerCase().includes(query));
        if (!matches) return false;
      }
      if (sourceFilter !== 'all' && exp.paymentSource !== sourceFilter) {
        return false;
      }
      return true;
    });
  }, [expenses, searchTerm, sourceFilter]);

  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredExpenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      showNotification('Please enter a valid amount.', 'error');
      return;
    }
    if (!name.trim()) {
      showNotification('Please enter expense name.', 'error');
      return;
    }

    setSaving(true);
    try {
      await recordExpense({
        business,
        session: activeSession,
        expense: {
          name: name.trim(),
          amount,
          paymentSource,
          notes: notes.trim() || undefined,
          date,
        },
      });

      showNotification(`Expense recorded: ${formatNaira(amount)} for "${name.trim()}"`);
      setName('');
      setAmountStr('');
      setNotes('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      showNotification('Failed to record expense. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track daily operating costs paid from cash drawer or terminal/bank
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record expense</span>
        </button>
      </div>

      {/* Filter and Overview */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                sourceFilter === 'all'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSourceFilter('cash')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                sourceFilter === 'cash'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              Paid from Cash
            </button>
            <button
              onClick={() => setSourceFilter('terminal_bank')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                sourceFilter === 'terminal_bank'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              Paid from Terminal
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Total expenses:{' '}
            <strong className="text-slate-900">{filteredExpenses.length}</strong> items
          </span>
          <span className="font-bold text-rose-600 text-sm">
            {formatNaira(totalExpenseAmount)}
          </span>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading expenses...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              No expenses recorded
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add operational costs like fuel, thermal paper rolls, food, or data.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map(exp => (
              <div
                key={exp.id}
                className="p-4 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {exp.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        exp.paymentSource === 'cash'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {exp.paymentSource === 'cash' ? (
                        <>
                          <Wallet className="w-3 h-3" />
                          <span>Cash in drawer</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3 h-3" />
                          <span>Terminal / Bank</span>
                        </>
                      )}
                    </span>
                  </div>
                  {exp.notes && (
                    <p className="text-xs text-slate-500">{exp.notes}</p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    {formatDateOnly(exp.date)} • {formatDateTime(exp.createdAt)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-base font-bold text-rose-600 block">
                    -{formatNaira(exp.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Expense Modal: Mobile Bottom Sheet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border-t sm:border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
            {/* Mobile Pull Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Record business expense
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 touch-manipulation"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Expense name / purpose
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. POS Thermal paper rolls, Generator fuel, Lunch"
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min="1"
                  step="any"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  placeholder="2,000"
                  className="w-full p-2.5 text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[46px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Paid from which balance?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentSource('cash')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition-all min-h-[46px] touch-manipulation ${
                      paymentSource === 'cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cash in drawer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentSource('terminal_bank')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition-all min-h-[46px] touch-manipulation ${
                      paymentSource === 'terminal_bank'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Terminal / Bank
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. 5 rolls bought"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[46px]"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3 pb-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[46px] touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 min-h-[46px] touch-manipulation"
                >
                  {saving ? 'Saving...' : 'Save expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
