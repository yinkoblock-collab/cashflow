import React from 'react';
import { X, Printer, Share2, CheckCircle2, Banknote } from 'lucide-react';
import { Transaction } from '../../types';
import { formatNaira, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

interface ReceiptModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { business, showNotification } = useAuth();

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `*${business?.name || 'MAUREEN CASHFLOW'}*\n` +
      `Transaction: ${transaction.typeName}\n` +
      `Amount: ${formatNaira(transaction.transactionAmount)}\n` +
      `Charge: ${formatNaira(transaction.charge)}\n` +
      `Total: ${formatNaira(transaction.totalAmount)}\n` +
      `Date: ${formatDateTime(transaction.createdAt)}\n` +
      `Ref: ${transaction.id}\n` +
      `Status: Successful\n` +
      `Thank you for your patronage!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${business?.name || 'MAUREEN CASHFLOW'} Receipt`,
          text,
        });
      } catch {
        // Fallback
      }
    } else {
      await navigator.clipboard.writeText(text);
      showNotification('Receipt details copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full shadow-2xl border-t sm:border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Receipt Header Actions */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <span className="text-xs font-semibold text-slate-500">
            Transaction receipt
          </span>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Receipt Simulation */}
        <div className="p-6 font-mono text-xs text-slate-800 space-y-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm tracking-tight text-slate-900 uppercase">
              {business?.name || 'MAUREEN CASHFLOW'}
            </h3>
            {business?.phoneNumber && (
              <p className="text-[11px] text-slate-500">Tel: {business.phoneNumber}</p>
            )}
            <p className="text-[11px] text-slate-500">
              {formatDateTime(transaction.createdAt)}
            </p>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Type:</span>
              <span className="font-semibold text-slate-900">{transaction.typeName}</span>
            </div>
            {transaction.customerName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900">{transaction.customerName}</span>
              </div>
            )}
            {transaction.customerPhone && (
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span>{transaction.customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Method:</span>
              <span className="capitalize">{transaction.paymentMethod.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ref ID:</span>
              <span className="text-[10px]">{transaction.id.slice(-8).toUpperCase()}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-semibold">{formatNaira(transaction.transactionAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Customer charge:</span>
              <span>{formatNaira(transaction.charge)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
              <span>TOTAL PAID:</span>
              <span className="text-emerald-700">{formatNaira(transaction.totalAmount)}</span>
            </div>
          </div>

          <div className="text-center pt-2 text-[11px] text-slate-400">
            Thank you for your patronage!
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
