import React, { useState, useEffect, useMemo } from 'react';
import {
  Banknote,
  Wallet,
  CreditCard,
  TrendingUp,
  Receipt,
  ArrowDownCircle,
  Users,
  PlayCircle,
  StopCircle,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeTransactions,
  subscribeExpenses,
  subscribeDebts,
} from '../../firebase/services';
import { Transaction, Expense, Debt } from '../../types';
import { formatNaira, formatDateTime, getTodayString } from '../../utils/formatters';
import { StatCard } from '../common/StatCard';
import { ReceiptModal } from '../transactions/ReceiptModal';
import { NavTab } from '../common/Sidebar';

interface DashboardViewProps {
  onOpenRecordModal: () => void;
  onOpenStartDayModal: () => void;
  onOpenCloseDayModal: () => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenRecordModal,
  onOpenStartDayModal,
  onOpenCloseDayModal,
  onNavigateTab,
}) => {
  const { business, activeSession, userProfile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected transaction for receipt view
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);

  const todayStr = getTodayString();

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

    const unsubExp = subscribeExpenses(
      business.id,
      list => setExpenses(list),
      () => {}
    );

    const unsubDebts = subscribeDebts(
      business.id,
      list => setDebts(list),
      () => {}
    );

    return () => {
      unsubTx();
      unsubExp();
      unsubDebts();
    };
  }, [business?.id]);

  // Today's metrics calculations
  const todayTransactions = useMemo(() => {
    return transactions.filter(t => t.date === todayStr);
  }, [transactions, todayStr]);

  const todayExpensesList = useMemo(() => {
    return expenses.filter(e => e.date === todayStr);
  }, [expenses, todayStr]);

  const todayCount = todayTransactions.length;
  const todayValue = todayTransactions.reduce((acc, t) => acc + t.transactionAmount, 0);
  const todayEarnings = todayTransactions.reduce((acc, t) => acc + t.charge, 0);
  const todayExpenses = todayExpensesList.reduce((acc, e) => acc + e.amount, 0);
  const todayNetProfit = todayEarnings - todayExpenses;

  const cashInDrawer = business?.cashInDrawer || 0;
  const terminalBalance = business?.terminalBalance || 0;

  const totalOutstandingDebts = useMemo(() => {
    return debts
      .filter(d => d.status !== 'paid')
      .reduce((acc, d) => acc + d.outstandingAmount, 0);
  }, [debts]);

  const isSessionOpen = activeSession?.status === 'open';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Welcome & Session Alert Banner */}
      {!isSessionOpen ? (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <h2 className="text-xs sm:text-base font-bold text-slate-900">
                Business day not started
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 max-w-xl leading-relaxed">
              Count cash in your drawer and check your POS terminal before recording today's transactions.
            </p>
          </div>
          <button
            onClick={onOpenStartDayModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px]"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Start business day</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Business day is open
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Opened at {formatDateTime(activeSession.openedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <button
              onClick={onOpenCloseDayModal}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer min-h-[42px]"
            >
              <StopCircle className="w-4 h-4 text-slate-600 shrink-0" />
              <span>Close day</span>
            </button>
            <button
              onClick={onOpenRecordModal}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer min-h-[42px]"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>New transaction</span>
            </button>
          </div>
        </div>
      )}

      {/* Financial Clarity Banner */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-start sm:items-center gap-2 text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1 sm:mt-0" />
          <span className="leading-snug">
            <strong>Rule:</strong> Customer amount is not profit. Only the customer charge is your business earning.
          </span>
        </div>
        <button
          onClick={() => onNavigateTab('reports')}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0 self-end sm:self-auto touch-manipulation py-1"
        >
          <span>View reports</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Financial Cards Grid: Prioritizing the 4 key cards requested */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* PRIORITY 1: Today's Earnings / Charges */}
        <StatCard
          title="Today's earnings"
          amount={todayEarnings}
          subtitle="Commissions earned"
          icon={Banknote}
          variant="accent"
          onClick={() => onNavigateTab('reports')}
        />

        {/* PRIORITY 2: Cash in Drawer */}
        <StatCard
          title="Cash in drawer"
          amount={cashInDrawer}
          subtitle="Physical cash in box"
          icon={Wallet}
          onClick={() => onNavigateTab('balances')}
        />

        {/* PRIORITY 3: Terminal / Bank Balance */}
        <StatCard
          title="Terminal / bank"
          amount={terminalBalance}
          subtitle="Electronic balance"
          icon={CreditCard}
          onClick={() => onNavigateTab('balances')}
        />

        {/* PRIORITY 4: Outstanding Debts */}
        <StatCard
          title="Customer debts"
          amount={totalOutstandingDebts}
          subtitle="Total unpaid"
          icon={Users}
          variant={totalOutstandingDebts > 0 ? 'negative' : 'neutral'}
          onClick={() => onNavigateTab('debts')}
        />

        {/* 5. Today's Net Profit */}
        <StatCard
          title="Today's net profit"
          amount={todayNetProfit}
          subtitle="Earnings minus expenses"
          icon={TrendingUp}
          variant={todayNetProfit < 0 ? 'negative' : 'default'}
          onClick={() => onNavigateTab('reports')}
        />

        {/* 6. Today's Expenses */}
        <StatCard
          title="Today's expenses"
          amount={todayExpenses}
          subtitle={`${todayExpensesList.length} items recorded`}
          icon={ArrowDownCircle}
          variant={todayExpenses > 0 ? 'negative' : 'neutral'}
          onClick={() => onNavigateTab('expenses')}
        />

        {/* 7. Today's Transactions Count */}
        <StatCard
          title="Transactions"
          amount={todayCount}
          subtitle="Recorded today"
          icon={Receipt}
          isCount={true}
          onClick={() => onNavigateTab('transactions')}
        />

        {/* 8. Today's Total Transaction Value */}
        <StatCard
          title="Transaction volume"
          amount={todayValue}
          subtitle="Customer money moved"
          icon={TrendingUp}
          onClick={() => onNavigateTab('transactions')}
        />
      </div>

      {/* Quick Action Buttons: Large touch targets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <button
          onClick={onOpenRecordModal}
          className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition-all active:scale-[0.98] group cursor-pointer shadow-2xs touch-manipulation min-h-[58px]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
              Record transaction
            </span>
            <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <p className="text-[11px] text-slate-500">Withdrawal, transfer, bills</p>
        </button>

        <button
          onClick={() => onNavigateTab('expenses')}
          className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-left transition-all active:scale-[0.98] group cursor-pointer shadow-2xs touch-manipulation min-h-[58px]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-800">
              Record expense
            </span>
            <ArrowDownCircle className="w-4 h-4 text-slate-600 shrink-0" />
          </div>
          <p className="text-[11px] text-slate-500">Fuel, paper rolls, food</p>
        </button>

        <button
          onClick={() => onNavigateTab('debts')}
          className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-left transition-all active:scale-[0.98] group cursor-pointer shadow-2xs touch-manipulation min-h-[58px]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-800">
              Customer debts
            </span>
            <Users className="w-4 h-4 text-slate-600 shrink-0" />
          </div>
          <p className="text-[11px] text-slate-500">Track pending credits</p>
        </button>

        <button
          onClick={() => onNavigateTab('balances')}
          className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-left transition-all active:scale-[0.98] group cursor-pointer shadow-2xs touch-manipulation min-h-[58px]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-800">
              Balances
            </span>
            <Wallet className="w-4 h-4 text-slate-600 shrink-0" />
          </div>
          <p className="text-[11px] text-slate-500">Drawer vs terminal funds</p>
        </button>
      </div>

      {/* Activity Overview: Recent Transactions Stream */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Recent activity
            </h3>
            <p className="text-[11px] text-slate-500">
              Latest transactions recorded today
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer touch-manipulation py-1"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 sm:p-10 text-center">
            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <Receipt className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-semibold text-slate-800">
              No transactions recorded yet
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              Tap the button below to record your first transaction.
            </p>
            <button
              onClick={onOpenRecordModal}
              className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer min-h-[40px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record now</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 6).map(tx => (
              <div
                key={tx.id}
                className="p-3 sm:p-4 hover:bg-slate-50/80 flex items-center justify-between gap-2.5 transition-colors touch-manipulation"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.typeId === 'cash_withdrawal'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {tx.typeId === 'cash_withdrawal' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {tx.typeName}
                      </span>
                      {tx.customerName && (
                        <span className="text-[11px] text-slate-500 truncate hidden xs:inline">
                          • {tx.customerName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                      {formatDateTime(tx.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                      {formatNaira(tx.transactionAmount)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 block">
                      +{formatNaira(tx.charge)}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedTxForReceipt(tx)}
                    className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer touch-manipulation"
                    title="View receipt"
                    aria-label="View receipt"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Digital Receipt Modal */}
      <ReceiptModal
        transaction={selectedTxForReceipt}
        isOpen={!!selectedTxForReceipt}
        onClose={() => setSelectedTxForReceipt(null)}
      />
    </div>
  );
};
