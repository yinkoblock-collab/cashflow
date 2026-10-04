export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  businessId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  currency: string;
  cashInDrawer: number;
  terminalBalance: number;
  currentSessionId?: string | null;
  phoneNumber?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SessionStatus = 'open' | 'closed';

export interface DailySession {
  id: string;
  businessId: string;
  attendantId: string;
  attendantName: string;
  status: SessionStatus;
  openedAt: string;
  closedAt?: string | null;
  openingCash: number;
  openingTerminalBalance: number;
  closingExpectedCash?: number;
  closingActualCash?: number;
  cashDifference?: number;
  closingExpectedTerminal?: number;
  closingActualTerminal?: number;
  terminalDifference?: number;
  overallDifference?: number;
  differenceExplanation?: string;
  closingNotes?: string;
  totalTransactionCount?: number;
  totalTransactionValue?: number;
  totalEarnings?: number;
  totalExpenses?: number;
  netEarnings?: number;
}

export type DefaultTransactionType =
  | 'cash_withdrawal'
  | 'cash_deposit'
  | 'transfer'
  | 'airtime'
  | 'data'
  | 'electricity'
  | 'cable_tv'
  | 'betting'
  | 'other';

export interface TransactionTypeConfig {
  id: string;
  businessId: string;
  name: string;
  category: 'withdrawal' | 'deposit' | 'utility' | 'other';
  defaultPaymentMethod?: string;
  isCustom?: boolean;
  isActive: boolean;
  createdAt?: string;
}

export type PaymentMethod = 'card_terminal' | 'cash' | 'bank_transfer' | 'pos_wallet';

export interface Transaction {
  id: string;
  businessId: string;
  sessionId: string;
  attendantId: string;
  attendantName?: string;
  typeId: string;
  typeName: string;
  customerName?: string;
  customerPhone?: string;
  transactionAmount: number; // e.g. 50,000 NGN
  charge: number;            // e.g. 500 NGN (business earning)
  totalAmount: number;       // e.g. 50,500 NGN
  paymentMethod: PaymentMethod;
  cashDelta: number;         // physical cash change in drawer
  terminalDelta: number;     // electronic bank/terminal balance change
  notes?: string;
  date: string;              // YYYY-MM-DD
  createdAt: string;
}

export type ExpenseSource = 'cash' | 'terminal_bank';

export interface Expense {
  id: string;
  businessId: string;
  sessionId: string;
  attendantId: string;
  name: string;
  amount: number;
  paymentSource: ExpenseSource;
  notes?: string;
  date: string;
  createdAt: string;
}

export type DebtStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface Debt {
  id: string;
  businessId: string;
  sessionId: string;
  debtorName: string;
  debtorPhone?: string;
  initialAmount: number;
  amountPaid: number;
  outstandingAmount: number;
  reason: string;
  status: DebtStatus;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  businessId: string;
  debtId: string;
  debtorName: string;
  amount: number;
  paymentMethod: 'cash' | 'terminal_bank';
  notes?: string;
  date: string;
  createdAt: string;
}

export interface DashboardSummary {
  todayTransactionsCount: number;
  todayTransactionValue: number;
  todayEarnings: number;
  cashInDrawer: number;
  terminalBalance: number;
  todayExpenses: number;
  totalOutstandingDebts: number;
  todayNetProfit: number;
}
