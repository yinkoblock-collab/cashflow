import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  Gamepad2,
  MoreHorizontal,
  User,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { recordTransaction, subscribeTransactionTypes } from '../../firebase/services';
import { TransactionTypeConfig, PaymentMethod } from '../../types';
import { DEFAULT_TRANSACTION_TYPES, PAYMENT_METHODS, calculateBalanceImpact } from '../../utils/constants';
import { formatNaira, getTodayString } from '../../utils/formatters';

interface RecordTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { business, activeSession, showNotification } = useAuth();

  const [types, setTypes] = useState<TransactionTypeConfig[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('cash_withdrawal');
  const [amountStr, setAmountStr] = useState<string>('');
  const [chargeStr, setChargeStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card_terminal');
  const [feePaidVia, setFeePaidVia] = useState<'terminal' | 'cash'>('terminal');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(getTodayString());
  const [loading, setLoading] = useState(false);

  // Subscribe to custom transaction types for this business
  useEffect(() => {
    if (!business?.id) return;
    const unsub = subscribeTransactionTypes(
      business.id,
      list => {
        if (list && list.length > 0) {
          setTypes(list.filter(t => t.isActive !== false));
        } else {
          setTypes(
            DEFAULT_TRANSACTION_TYPES.map(d => ({
              ...d,
              businessId: business.id,
            }))
          );
        }
      },
      () => {
        setTypes(
          DEFAULT_TRANSACTION_TYPES.map(d => ({
            ...d,
            businessId: business.id,
          }))
        );
      }
    );
    return () => unsub();
  }, [business?.id]);

  // Adjust default payment method and fee arrangement when type changes
  useEffect(() => {
    if (selectedTypeId === 'cash_withdrawal') {
      setPaymentMethod('card_terminal');
      setFeePaidVia('terminal');
    } else {
      setPaymentMethod('cash');
      setFeePaidVia('cash');
    }
  }, [selectedTypeId]);

  const selectedType = useMemo(() => {
    return types.find(t => t.id === selectedTypeId) ||
      DEFAULT_TRANSACTION_TYPES.find(t => t.id === selectedTypeId) || {
        id: selectedTypeId,
        name: selectedTypeId,
        category: 'other',
      };
  }, [types, selectedTypeId]);

  // Calculations
  const transactionAmount = parseFloat(amountStr) || 0;
  const charge = parseFloat(chargeStr) || 0;
  const totalAmount = transactionAmount + charge;

  const balanceImpact = useMemo(() => {
    return calculateBalanceImpact(selectedTypeId, transactionAmount, charge, feePaidVia);
  }, [selectedTypeId, transactionAmount, charge, feePaidVia]);

  if (!isOpen || !business) return null;

  const handleChargePreset = (preset: number) => {
    setChargeStr(String(preset));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (transactionAmount <= 0) {
      showNotification('Please enter a valid transaction amount.', 'error');
      return;
    }

    setLoading(true);
    try {
      await recordTransaction({
        business,
        session: activeSession,
        transaction: {
          typeId: selectedTypeId,
          typeName: selectedType.name,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          transactionAmount,
          charge,
          totalAmount,
          paymentMethod,
          cashDelta: balanceImpact.cashDelta,
          terminalDelta: balanceImpact.terminalDelta,
          notes: notes.trim() || undefined,
          date: txDate,
        },
      });

      showNotification(
        `Recorded ${selectedType.name}: ${formatNaira(transactionAmount)} (Fee: ${formatNaira(charge)})`
      );

      // Reset form
      setAmountStr('');
      setChargeStr('');
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      showNotification('Failed to record transaction. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (id: string) => {
    switch (id) {
      case 'cash_withdrawal':
        return ArrowDownLeft;
      case 'cash_deposit':
      case 'transfer':
        return ArrowUpRight;
      case 'airtime':
        return Smartphone;
      case 'data':
        return Wifi;
      case 'electricity':
        return Zap;
      case 'cable_tv':
        return Tv;
      case 'betting':
        return Gamepad2;
      default:
        return MoreHorizontal;
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
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Record transaction
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Customer money is separated from your earned commission
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

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. Transaction Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select transaction type
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
              {(types.length > 0 ? types : DEFAULT_TRANSACTION_TYPES).map(t => {
                const Icon = getTypeIcon(t.id);
                const isSelected = selectedTypeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTypeId(t.id)}
                    className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-xs font-medium transition-all text-center touch-manipulation min-h-[52px] ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mb-1 shrink-0 ${
                        isSelected ? 'text-emerald-600' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate w-full text-[10px] sm:text-[11px] leading-tight">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Transaction Amount & Customer Charge Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Transaction Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction amount
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
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  placeholder="50,000"
                  className="w-full pl-8 pr-3.5 py-2.5 text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[48px]"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Customer money to move
              </p>
            </div>

            {/* Customer Charge / Commission (Manual Entry) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer charge (Your earning)
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
                  value={chargeStr}
                  onChange={e => setChargeStr(e.target.value)}
                  placeholder="500"
                  className="w-full pl-8 pr-3.5 py-2.5 text-base font-bold text-emerald-700 bg-emerald-50/50 border border-emerald-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[48px]"
                />
              </div>
              {/* Quick Charge Buttons: Touch Friendly */}
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
                {[100, 200, 300, 500, 1000].map(fee => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => handleChargePreset(fee)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 transition-colors shrink-0 touch-manipulation min-h-[34px]"
                  >
                    +₦{fee}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Total Customer Pays Auto-Calculation */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">Total customer pays:</span>
              <p className="text-[11px] text-slate-400">
                Amount + Charge
              </p>
            </div>
            <span className="text-lg font-bold text-slate-900">
              {formatNaira(totalAmount)}
            </span>
          </div>

          {/* Withdrawal fee arrangement toggle if cash withdrawal */}
          {selectedTypeId === 'cash_withdrawal' && (
            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                How did customer pay the charge?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFeePaidVia('terminal')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all min-h-[42px] touch-manipulation ${
                    feePaidVia === 'terminal'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Added to terminal
                </button>
                <button
                  type="button"
                  onClick={() => setFeePaidVia('cash')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all min-h-[42px] touch-manipulation ${
                    feePaidVia === 'cash'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Paid in physical cash
                </button>
              </div>
            </div>
          )}

          {/* Balance Impact Live Preview */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs space-y-1">
            <span className="font-semibold text-emerald-900 block text-[11px] uppercase tracking-wide">
              Balance effect preview:
            </span>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1 text-center">
              <div className="p-1.5 bg-white rounded-lg border border-emerald-100">
                <span className="text-[10px] text-slate-500 block truncate">Drawer Cash</span>
                <span
                  className={`font-bold text-xs truncate block ${
                    balanceImpact.cashDelta < 0
                      ? 'text-slate-800'
                      : balanceImpact.cashDelta > 0
                      ? 'text-emerald-700'
                      : 'text-slate-600'
                  }`}
                >
                  {balanceImpact.cashDelta > 0 ? '+' : ''}
                  {formatNaira(balanceImpact.cashDelta)}
                </span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-emerald-100">
                <span className="text-[10px] text-slate-500 block truncate">Terminal</span>
                <span
                  className={`font-bold text-xs truncate block ${
                    balanceImpact.terminalDelta < 0
                      ? 'text-slate-800'
                      : balanceImpact.terminalDelta > 0
                      ? 'text-emerald-700'
                      : 'text-slate-600'
                  }`}
                >
                  {balanceImpact.terminalDelta > 0 ? '+' : ''}
                  {formatNaira(balanceImpact.terminalDelta)}
                </span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-emerald-100">
                <span className="text-[10px] text-slate-500 block truncate">Profit</span>
                <span className="font-bold text-emerald-700 text-xs truncate block">
                  +{formatNaira(charge)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment method
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[44px]"
            >
              {PAYMENT_METHODS.map(pm => (
                <option key={pm.id} value={pm.id}>
                  {pm.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Customer Details (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer name (optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Bro Emeka"
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone number (optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="080..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* 5. Notes & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction date
              </label>
              <input
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes / Reference (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Moniepoint RRN"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Action Buttons: Touch-friendly */}
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
              disabled={loading || transactionAmount <= 0}
              className="flex-2 py-3 px-4 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer min-h-[48px] touch-manipulation"
            >
              {loading ? 'Recording...' : 'Save transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
