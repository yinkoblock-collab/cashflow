import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Receipt,
  Calendar,
  RotateCcw,
  Eye,
  User,
  CreditCard,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeTransactions } from '../../firebase/services';
import { Transaction } from '../../types';
import { formatNaira, formatDateTime, formatDateOnly } from '../../utils/formatters';
import { ReceiptModal } from './ReceiptModal';

interface TransactionHistoryViewProps {
  onOpenRecordModal: () => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  onOpenRecordModal,
}) => {
  const { business } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Receipt Modal State
  const [activeReceiptTx, setActiveReceiptTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!business?.id) return;

    setLoading(true);
    const unsub = subscribeTransactions(
      business.id,
      list => {
        setTransactions(list);
        setLoading(false);
      },
      err => {
        console.error('Failed to load transactions', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [business?.id]);

  // Filtered List
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search by customer name, phone, notes, or id
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesCustomer =
          tx.customerName?.toLowerCase().includes(query) ||
          tx.customerPhone?.toLowerCase().includes(query) ||
          tx.notes?.toLowerCase().includes(query) ||
          tx.id.toLowerCase().includes(query) ||
          tx.typeName.toLowerCase().includes(query);
        if (!matchesCustomer) return false;
      }

      // Filter by transaction type
      if (selectedType !== 'all' && tx.typeId !== selectedType) {
        return false;
      }

      // Filter by payment method
      if (selectedMethod !== 'all' && tx.paymentMethod !== selectedMethod) {
        return false;
      }

      // Filter by date
      if (dateFilter && tx.date !== dateFilter) {
        return false;
      }

      // Filter by min/max amount
      if (minAmount && tx.transactionAmount < parseFloat(minAmount)) {
        return false;
      }
      if (maxAmount && tx.transactionAmount > parseFloat(maxAmount)) {
        return false;
      }

      return true;
    });
  }, [transactions, searchTerm, selectedType, selectedMethod, dateFilter, minAmount, maxAmount]);

  // Aggregate stats of filtered transactions
  const totals = useMemo(() => {
    let totalVal = 0;
    let totalCharge = 0;
    filteredTransactions.forEach(t => {
      totalVal += t.transactionAmount;
      totalCharge += t.charge;
    });
    return {
      count: filteredTransactions.length,
      value: totalVal,
      charges: totalCharge,
    };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Date', 'Time', 'Type', 'Customer', 'Phone', 'Transaction Amount', 'Charge Earned', 'Total Amount', 'Payment Method', 'Notes', 'Ref ID'];
    const rows = filteredTransactions.map(t => [
      t.date,
      formatDateTime(t.createdAt),
      t.typeName,
      t.customerName || '',
      t.customerPhone || '',
      t.transactionAmount,
      t.charge,
      t.totalAmount,
      t.paymentMethod,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.id,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Maureen_Cashflow_Transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedMethod('all');
    setDateFilter('');
    setMinAmount('');
    setMaxAmount('');
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Transaction history
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Search, filter, and inspect customer transactions and earnings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer min-h-[42px] touch-manipulation shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenRecordModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer min-h-[42px] touch-manipulation"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by customer, phone, type..."
              className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors min-h-[44px] touch-manipulation ${
                showFilters || selectedType !== 'all' || selectedMethod !== 'all' || dateFilter || minAmount || maxAmount
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>

            {(selectedType !== 'all' || selectedMethod !== 'all' || dateFilter || minAmount || maxAmount || searchTerm) && (
              <button
                onClick={clearFilters}
                className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Reset filters"
                aria-label="Reset filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Expanded Filters */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Type Filter */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Transaction type
              </label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[42px]"
              >
                <option value="all">All transaction types</option>
                <option value="cash_withdrawal">Cash withdrawal</option>
                <option value="cash_deposit">Cash deposit</option>
                <option value="transfer">Transfer</option>
                <option value="airtime">Airtime</option>
                <option value="data">Data</option>
                <option value="electricity">Electricity</option>
                <option value="cable_tv">Cable TV</option>
                <option value="betting">Betting</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Payment method
              </label>
              <select
                value={selectedMethod}
                onChange={e => setSelectedMethod(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[42px]"
              >
                <option value="all">All payment methods</option>
                <option value="card_terminal">POS Terminal / Card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="pos_wallet">POS App Wallet</option>
              </select>
            </div>

            {/* Date filter */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Specific date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[42px]"
              />
            </div>

            {/* Amount range */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Amount range (₦)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Min"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[42px]"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[42px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Filter Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredTransactions.length}</strong> transactions
          </span>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span>
              Vol: <span className="text-slate-900">{formatNaira(totals.value)}</span>
            </span>
            <span>
              Earned: <span className="text-emerald-700">+{formatNaira(totals.charges)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Transactions Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              No transactions found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedType !== 'all' || dateFilter
                ? 'Try adjusting your filters.'
                : 'Transactions will appear here as soon as you record your first one.'}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE CARD LIST: Native Mobile App Presentation (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredTransactions.map(tx => (
                <div
                  key={tx.id}
                  className="p-3.5 space-y-2 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                      {tx.typeName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateOnly(tx.date)} • {formatDateTime(tx.createdAt).split(',')[1] || ''}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-base font-extrabold text-slate-900 block">
                        {formatNaira(tx.transactionAmount)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Total paid: <strong className="text-slate-800">{formatNaira(tx.totalAmount)}</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="inline-block font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        +{formatNaira(tx.charge)} earning
                      </span>
                    </div>
                  </div>

                  {/* Customer & Payment Method info footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2 truncate">
                      {tx.customerName ? (
                        <span className="truncate font-medium text-slate-700">
                          👤 {tx.customerName}
                        </span>
                      ) : (
                        <span className="text-slate-400 capitalize">
                          {tx.paymentMethod.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveReceiptTx(tx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 font-semibold text-[11px] transition-colors touch-manipulation min-h-[36px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW: Full detail view (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Transaction type</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-right">Transaction amount</th>
                    <th className="py-3 px-4 text-right">Charge (Profit)</th>
                    <th className="py-3 px-4 text-right">Total customer pays</th>
                    <th className="py-3 px-4 text-center">Method</th>
                    <th className="py-3 px-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {formatDateOnly(tx.date)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatDateTime(tx.createdAt)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {tx.typeName}
                        </span>
                        {tx.notes && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">
                            {tx.notes}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {tx.customerName ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {tx.customerName}
                            </div>
                            {tx.customerPhone && (
                              <div className="text-[11px] text-slate-400">
                                {tx.customerPhone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatNaira(tx.transactionAmount)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          +{formatNaira(tx.charge)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        {formatNaira(tx.totalAmount)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600 capitalize">
                          {tx.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setActiveReceiptTx(tx)}
                          className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="View receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Customer Receipt Modal */}
      <ReceiptModal
        transaction={activeReceiptTx}
        isOpen={!!activeReceiptTx}
        onClose={() => setActiveReceiptTx(null)}
      />
    </div>
  );
};
