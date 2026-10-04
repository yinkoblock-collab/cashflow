import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Receipt,
  Users,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeTransactions,
  subscribeExpenses,
  subscribeDebts,
  subscribeDebtPayments,
  getSessionHistory,
} from '../../firebase/services';
import { Transaction, Expense, Debt, DebtPayment, DailySession } from '../../types';
import { formatNaira, formatDateOnly } from '../../utils/formatters';

type TimeRange = 'daily' | 'weekly' | 'monthly';

export const ReportsView: React.FC = () => {
  const { business } = useAuth();
  const [range, setRange] = useState<TimeRange>('daily');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [sessions, setSessions] = useState<DailySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;

    const unsubTx = subscribeTransactions(
      business.id,
      list => {
        setTransactions(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    const unsubExp = subscribeExpenses(business.id, list => setExpenses(list), () => {});
    const unsubDebts = subscribeDebts(business.id, list => setDebts(list), () => {});
    const unsubPay = subscribeDebtPayments(business.id, list => setPayments(list), () => {});

    getSessionHistory(business.id).then(res => setSessions(res || [])).catch(() => {});

    return () => {
      unsubTx();
      unsubExp();
      unsubDebts();
      unsubPay();
    };
  }, [business?.id]);

  // Filter items by range
  const filterDate = (itemDateStr: string) => {
    const today = new Date();
    const itemDate = new Date(itemDateStr + 'T00:00:00');

    if (range === 'daily') {
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return itemDateStr === todayStr;
    }
    if (range === 'weekly') {
      const diffTime = today.getTime() - itemDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays <= 7 && diffDays >= 0;
    }
    if (range === 'monthly') {
      return (
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getFullYear() === today.getFullYear()
      );
    }
    return true;
  };

  const periodTxs = useMemo(() => transactions.filter(t => filterDate(t.date)), [transactions, range]);
  const periodExpenses = useMemo(() => expenses.filter(e => filterDate(e.date)), [expenses, range]);
  const periodPayments = useMemo(() => payments.filter(p => filterDate(p.date)), [payments, range]);

  // Aggregate stats
  const totalValue = periodTxs.reduce((sum, t) => sum + t.transactionAmount, 0);
  const totalEarnings = periodTxs.reduce((sum, t) => sum + t.charge, 0);
  const totalExp = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarnings = totalEarnings - totalExp;

  const cashMovement = periodTxs.reduce((sum, t) => sum + t.cashDelta, 0);
  const terminalMovement = periodTxs.reduce((sum, t) => sum + t.terminalDelta, 0);
  const debtCollected = periodPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingDebt = debts.filter(d => d.status !== 'paid').reduce((sum, d) => sum + d.outstandingAmount, 0);

  // Shortages and Surpluses from recorded closed sessions
  const sessionDiscrepancies = useMemo(() => {
    let shortages = 0;
    let surpluses = 0;
    sessions.forEach(s => {
      const diff = s.overallDifference || 0;
      if (diff < 0) shortages += Math.abs(diff);
      if (diff > 0) surpluses += diff;
    });
    return { shortages, surpluses };
  }, [sessions]);

  // Transaction Category Breakdown
  const categorySplit = useMemo(() => {
    const counts: Record<string, { count: number; volume: number; charges: number }> = {};
    periodTxs.forEach(t => {
      const cat = t.typeName || 'Other';
      if (!counts[cat]) {
        counts[cat] = { count: 0, volume: 0, charges: 0 };
      }
      counts[cat].count += 1;
      counts[cat].volume += t.transactionAmount;
      counts[cat].charges += t.charge;
    });
    return Object.entries(counts).sort((a, b) => b[1].charges - a[1].charges);
  }, [periodTxs]);

  return (
    <div className="space-y-5">
      {/* Header and Period Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Financial reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real earnings, expenses, movements, and session outcomes
          </p>
        </div>

        {/* Time Filter Pills: Touch friendly and full width on mobile */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {(['daily', 'weekly', 'monthly'] as TimeRange[]).map(t => (
            <button
              key={t}
              onClick={() => setRange(t)}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-semibold capitalize transition-all text-center touch-manipulation min-h-[38px] ${
                range === t
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'daily' ? 'Today' : t === 'weekly' ? 'This week' : 'This month'}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Transaction Value */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">
            Total transaction value
          </span>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {formatNaira(totalValue)}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Customer money moved ({periodTxs.length} txs)
          </span>
        </div>

        {/* Total Earnings / Commissions */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-xs">
          <span className="text-xs text-emerald-800 font-medium">
            Total charges / earnings
          </span>
          <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-1">
            {formatNaira(totalEarnings)}
          </p>
          <span className="text-[10px] text-emerald-600 block mt-0.5">
            Actual business commissions
          </span>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">
            Total expenses
          </span>
          <p className="text-lg sm:text-xl font-bold text-rose-600 mt-1">
            {formatNaira(totalExp)}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Operating costs
          </span>
        </div>

        {/* Net Profit / Earnings */}
        <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-xs">
          <span className="text-xs text-emerald-100 font-medium">
            Net profit / earnings
          </span>
          <p className="text-lg sm:text-xl font-bold text-white mt-1">
            {formatNaira(netEarnings)}
          </p>
          <span className="text-[10px] text-emerald-100 block mt-0.5">
            Earnings minus expenses
          </span>
        </div>
      </div>

      {/* Cash Movement & Terminal Movement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cash in Drawer Movement */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Cash in drawer movement
                </h3>
                <p className="text-[11px] text-slate-500">Net physical cash flow</p>
              </div>
            </div>
            <span
              className={`text-sm font-bold ${
                cashMovement < 0 ? 'text-slate-800' : 'text-emerald-700'
              }`}
            >
              {cashMovement > 0 ? '+' : ''}
              {formatNaira(cashMovement)}
            </span>
          </div>

          <div className="mt-3 text-xs text-slate-600 space-y-1.5">
            <p>
              Current live cash in drawer:{' '}
              <strong className="text-slate-900">
                {formatNaira(business?.cashInDrawer)}
              </strong>
            </p>
            <p className="text-[11px] text-slate-500">
              When withdrawals occur, drawer cash reduces while your terminal balance grows.
            </p>
          </div>
        </div>

        {/* Terminal/Bank Movement */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Terminal & bank movement
                </h3>
                <p className="text-[11px] text-slate-500">Net electronic flow</p>
              </div>
            </div>
            <span
              className={`text-sm font-bold ${
                terminalMovement < 0 ? 'text-slate-800' : 'text-emerald-700'
              }`}
            >
              {terminalMovement > 0 ? '+' : ''}
              {formatNaira(terminalMovement)}
            </span>
          </div>

          <div className="mt-3 text-xs text-slate-600 space-y-1.5">
            <p>
              Current live terminal/bank balance:{' '}
              <strong className="text-slate-900">
                {formatNaira(business?.terminalBalance)}
              </strong>
            </p>
            <p className="text-[11px] text-slate-500">
              Funds collected electronically minus electronic transfers sent out.
            </p>
          </div>
        </div>
      </div>

      {/* Debts & Session Discrepancy Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
          <span className="text-slate-500 block">Debt collected</span>
          <span className="text-base font-bold text-emerald-700 block mt-0.5">
            {formatNaira(debtCollected)}
          </span>
          <span className="text-[10px] text-slate-400">Repayments in this period</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
          <span className="text-slate-500 block">Outstanding debt</span>
          <span className="text-base font-bold text-rose-600 block mt-0.5">
            {formatNaira(outstandingDebt)}
          </span>
          <span className="text-[10px] text-slate-400">Still owed by customers</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
          <span className="text-slate-500 block">Total shortages recorded</span>
          <span className="text-base font-bold text-rose-600 block mt-0.5">
            {formatNaira(sessionDiscrepancies.shortages)}
          </span>
          <span className="text-[10px] text-slate-400">From closed day sessions</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
          <span className="text-slate-500 block">Total surpluses recorded</span>
          <span className="text-base font-bold text-emerald-700 block mt-0.5">
            {formatNaira(sessionDiscrepancies.surpluses)}
          </span>
          <span className="text-[10px] text-slate-400">From closed day sessions</span>
        </div>
      </div>

      {/* Transaction Category Breakdown List with Visual Progress Bars */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          Earnings breakdown by transaction type
        </h3>

        {categorySplit.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No transactions in this period.
          </p>
        ) : (
          <div className="space-y-3">
            {categorySplit.map(([name, data]) => {
              const percentage = totalEarnings > 0 ? (data.charges / totalEarnings) * 100 : 0;
              return (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-800">
                      {name}{' '}
                      <span className="text-slate-400 font-normal">
                        ({data.count} txs • Vol: {formatNaira(data.volume)})
                      </span>
                    </span>
                    <span className="font-bold text-emerald-700">
                      {formatNaira(data.charges)} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
