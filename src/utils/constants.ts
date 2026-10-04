import { TransactionTypeConfig, PaymentMethod } from '../types';

export const DEFAULT_TRANSACTION_TYPES: Array<Omit<TransactionTypeConfig, 'businessId'>> = [
  {
    id: 'cash_withdrawal',
    name: 'Cash withdrawal',
    category: 'withdrawal',
    defaultPaymentMethod: 'card_terminal',
    isActive: true,
  },
  {
    id: 'cash_deposit',
    name: 'Cash deposit',
    category: 'deposit',
    defaultPaymentMethod: 'cash',
    isActive: true,
  },
  {
    id: 'transfer',
    name: 'Transfer',
    category: 'deposit',
    defaultPaymentMethod: 'cash',
    isActive: true,
  },
  {
    id: 'airtime',
    name: 'Airtime',
    category: 'utility',
    defaultPaymentMethod: 'cash',
    isActive: true,
  },
  {
    id: 'data',
    name: 'Data',
    category: 'utility',
    defaultPaymentMethod: 'cash',
    isActive: true,
  },
  {
    id: 'electricity',
    name: 'Electricity',
    category: 'utility',
    defaultPaymentMethod: 'cash',
    isActive: true,
  },
  {
    id: 'cable_tv',
    name: 'Cable TV',
    category: 'utility',
    defaultPaymentMethod: 'cash',
    isActive: true,
  },
  {
    id: 'betting',
    name: 'Betting',
    category: 'utility',
    defaultPaymentMethod: 'cash',
    isActive: true,
  },
  {
    id: 'other',
    name: 'Other',
    category: 'other',
    defaultPaymentMethod: 'cash',
    isActive: true,
  },
];

export const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'card_terminal', label: 'POS Terminal / Card' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'pos_wallet', label: 'POS App Wallet' },
];

export interface BalanceDeltas {
  cashDelta: number;
  terminalDelta: number;
}

/**
 * Calculates exact impact on Cash in Drawer and Terminal/Bank Balance
 * adhering strictly to the financial separation of customer money vs business earning.
 */
export function calculateBalanceImpact(
  typeId: string,
  amount: number,
  charge: number,
  feePaidVia: 'terminal' | 'cash' = 'terminal'
): BalanceDeltas {
  const cleanAmount = Number(amount) || 0;
  const cleanCharge = Number(charge) || 0;

  switch (typeId) {
    case 'cash_withdrawal':
      // Attendant gives physical cash (amount) to customer
      // Customer pays (amount + charge) to terminal
      if (feePaidVia === 'cash') {
        // Customer takes amount, but hands back charge in cash -> net cash out: amount - charge
        return {
          cashDelta: -(cleanAmount - cleanCharge),
          terminalDelta: cleanAmount,
        };
      }
      return {
        cashDelta: -cleanAmount,
        terminalDelta: cleanAmount + cleanCharge,
      };

    case 'cash_deposit':
    case 'transfer':
      // Customer gives cash (amount + charge) to attendant drawer
      // Attendant transfers amount electronically out of terminal/bank
      return {
        cashDelta: cleanAmount + cleanCharge,
        terminalDelta: -cleanAmount,
      };

    case 'airtime':
    case 'data':
    case 'electricity':
    case 'cable_tv':
    case 'betting':
      // Attendant dispenses electronic utility from terminal/wallet (-amount)
      // Customer pays total (amount + charge) in cash to drawer
      return {
        cashDelta: cleanAmount + cleanCharge,
        terminalDelta: -cleanAmount,
      };

    default:
      // Generic other: default to cash received with electronic out
      return {
        cashDelta: cleanAmount + cleanCharge,
        terminalDelta: -cleanAmount,
      };
  }
}
