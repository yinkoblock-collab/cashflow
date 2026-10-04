import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { auth, db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import {
  UserProfile,
  Business,
  DailySession,
  Transaction,
  Expense,
  Debt,
  DebtPayment,
  TransactionTypeConfig,
} from '../types';
import { DEFAULT_TRANSACTION_TYPES } from '../utils/constants';

// Local storage keys for Demo/Offline mode fallback
const STORAGE_PREFIX = 'maureen_cashflow_';
const storageGet = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};
const storageSet = <T>(key: string, val: T): void => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.warn('Local storage write failed', e);
  }
};

// Check if a business ID is in local/demo mode
export const isDemoId = (id?: string) => id ? id.startsWith('demo_') : false;

// --- AUTHENTICATION SERVICES ---

export async function registerAttendant({
  email,
  password,
  fullName,
  phoneNumber,
  businessName,
}: {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  businessName: string;
}): Promise<{ user: UserProfile; business: Business; isFallback?: boolean }> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const businessId = `biz_${uid.slice(0, 16)}_${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Create Business
    const businessData: Business = {
      id: businessId,
      name: businessName || 'My POS Business',
      ownerId: uid,
      currency: 'NGN',
      cashInDrawer: 0,
      terminalBalance: 0,
      currentSessionId: null,
      phoneNumber: phoneNumber || '',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'businesses', businessId), businessData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `businesses/${businessId}`);
    }

    // 2. Create User Profile
    const userProfile: UserProfile = {
      uid,
      email,
      fullName,
      phoneNumber: phoneNumber || '',
      businessId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'users', uid), userProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
    }

    // 3. Seed default transaction types for business
    try {
      for (const dt of DEFAULT_TRANSACTION_TYPES) {
        const typeDocId = `${businessId}_${dt.id}`;
        const typeConfig: TransactionTypeConfig = {
          ...dt,
          id: typeDocId,
          businessId,
          createdAt: now,
        };
        await setDoc(doc(db, 'transactionTypes', typeDocId), typeConfig);
      }
    } catch (error) {
      console.warn('Non-fatal: could not seed default transaction types', error);
    }

    return { user: userProfile, business: businessData };
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
      console.warn('Firebase Email/Password is not enabled yet in console. Falling back to local attendant session.');
      const demoUid = `attendant_${Date.now()}`;
      const demoBizId = `demo_biz_${Date.now()}`;
      const now = new Date().toISOString();

      const userProfile: UserProfile = {
        uid: demoUid,
        email,
        fullName: fullName || 'Maureen Okafor',
        phoneNumber: phoneNumber || '',
        businessId: demoBizId,
        createdAt: now,
        updatedAt: now,
      };

      const businessData: Business = {
        id: demoBizId,
        name: businessName || 'Maureen Cash & POS Spot',
        ownerId: demoUid,
        currency: 'NGN',
        cashInDrawer: 100000,
        terminalBalance: 250000,
        currentSessionId: null,
        phoneNumber: phoneNumber || '',
        createdAt: now,
        updatedAt: now,
      };

      storageSet('user', userProfile);
      storageSet('business', businessData);
      localStorage.setItem('maureen_cashflow_active_demo', 'true');
      return { user: userProfile, business: businessData, isFallback: true };
    }
    throw err;
  }
}

export async function loginAttendant(email: string, password: string): Promise<{ isFallback?: boolean; user?: UserProfile; business?: Business }> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { isFallback: false };
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
      console.warn('Firebase Email/Password is not enabled yet in console. Logging in with local attendant session.');
      let user = storageGet<UserProfile | null>('user', null);
      let business = storageGet<Business | null>('business', null);

      if (!user || !business) {
        const demoUid = `attendant_${Date.now()}`;
        const demoBizId = `demo_biz_${Date.now()}`;
        const now = new Date().toISOString();

        user = {
          uid: demoUid,
          email,
          fullName: 'Maureen Okafor',
          phoneNumber: '08012345678',
          businessId: demoBizId,
          createdAt: now,
        };

        business = {
          id: demoBizId,
          name: 'Maureen Cash & POS Spot',
          ownerId: demoUid,
          currency: 'NGN',
          cashInDrawer: 100000,
          terminalBalance: 250000,
          currentSessionId: null,
          createdAt: now,
        };

        storageSet('user', user);
        storageSet('business', business);
      }

      localStorage.setItem('maureen_cashflow_active_demo', 'true');
      return { isFallback: true, user, business };
    }
    throw err;
  }
}

export async function logoutAttendant(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    // ignore
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
      console.warn('Simulated password reset for local mode.');
      return;
    }
    throw err;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  try {
    const snap = await getDoc(doc(db, 'businesses', businessId));
    if (snap.exists()) {
      return snap.data() as Business;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `businesses/${businessId}`);
  }
}

export async function updateBusinessDetails(
  businessId: string,
  updates: Partial<Business>
): Promise<void> {
  if (isDemoId(businessId)) {
    const current = storageGet<Business | null>('business', null);
    if (current) {
      const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
      storageSet('business', updated);
      window.dispatchEvent(new Event('maureen_demo_business_updated'));
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'businesses', businessId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `businesses/${businessId}`);
  }
}

// --- DAILY SESSION SERVICES ---

export async function getActiveSession(businessId: string): Promise<DailySession | null> {
  if (isDemoId(businessId)) {
    const sessions = storageGet<DailySession[]>('sessions', []);
    return sessions.find(s => s.status === 'open') || null;
  }

  try {
    const q = query(
      collection(db, 'dailySessions'),
      where('businessId', '==', businessId),
      where('status', '==', 'open'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as DailySession;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'dailySessions');
  }
}

export async function startDailySession({
  businessId,
  attendantId,
  attendantName,
  openingCash,
  openingTerminalBalance,
}: {
  businessId: string;
  attendantId: string;
  attendantName: string;
  openingCash: number;
  openingTerminalBalance: number;
}): Promise<DailySession> {
  const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const sessionData: DailySession = {
    id: sessionId,
    businessId,
    attendantId,
    attendantName,
    status: 'open',
    openedAt: now,
    openingCash,
    openingTerminalBalance,
    totalTransactionCount: 0,
    totalTransactionValue: 0,
    totalEarnings: 0,
    totalExpenses: 0,
    netEarnings: 0,
  };

  if (isDemoId(businessId)) {
    const sessions = storageGet<DailySession[]>('sessions', []);
    sessions.unshift(sessionData);
    storageSet('sessions', sessions);

    const biz = storageGet<Business | null>('business', null);
    if (biz) {
      storageSet('business', {
        ...biz,
        cashInDrawer: openingCash,
        terminalBalance: openingTerminalBalance,
        currentSessionId: sessionId,
        updatedAt: now,
      });
      window.dispatchEvent(new Event('maureen_demo_business_updated'));
    }
    return sessionData;
  }

  try {
    await setDoc(doc(db, 'dailySessions', sessionId), sessionData);
    await updateDoc(doc(db, 'businesses', businessId), {
      cashInDrawer: openingCash,
      terminalBalance: openingTerminalBalance,
      currentSessionId: sessionId,
      updatedAt: now,
    });
    return sessionData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `dailySessions/${sessionId}`);
  }
}

export async function closeDailySession(
  session: DailySession,
  closingData: {
    closingExpectedCash: number;
    closingActualCash: number;
    cashDifference: number;
    closingExpectedTerminal: number;
    closingActualTerminal: number;
    terminalDifference: number;
    overallDifference: number;
    differenceExplanation?: string;
    closingNotes?: string;
    totalTransactionCount: number;
    totalTransactionValue: number;
    totalEarnings: number;
    totalExpenses: number;
    netEarnings: number;
  }
): Promise<void> {
  const now = new Date().toISOString();

  if (isDemoId(session.businessId)) {
    const sessions = storageGet<DailySession[]>('sessions', []);
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = {
        ...sessions[idx],
        ...closingData,
        status: 'closed',
        closedAt: now,
      };
      storageSet('sessions', sessions);
    }

    const biz = storageGet<Business | null>('business', null);
    if (biz) {
      storageSet('business', {
        ...biz,
        cashInDrawer: closingData.closingActualCash,
        terminalBalance: closingData.closingActualTerminal,
        currentSessionId: null,
        updatedAt: now,
      });
      window.dispatchEvent(new Event('maureen_demo_business_updated'));
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'dailySessions', session.id), {
      ...closingData,
      status: 'closed',
      closedAt: now,
    });

    await updateDoc(doc(db, 'businesses', session.businessId), {
      cashInDrawer: closingData.closingActualCash,
      terminalBalance: closingData.closingActualTerminal,
      currentSessionId: null,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `dailySessions/${session.id}`);
  }
}

export async function getSessionHistory(businessId: string): Promise<DailySession[]> {
  if (isDemoId(businessId)) {
    return storageGet<DailySession[]>('sessions', []);
  }

  try {
    const q = query(
      collection(db, 'dailySessions'),
      where('businessId', '==', businessId),
      orderBy('openedAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DailySession);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'dailySessions');
  }
}

// --- TRANSACTION SERVICES ---

export async function recordTransaction({
  business,
  session,
  transaction,
}: {
  business: Business;
  session?: DailySession | null;
  transaction: Omit<Transaction, 'id' | 'businessId' | 'sessionId' | 'attendantId' | 'createdAt'>;
}): Promise<Transaction> {
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newTx: Transaction = {
    ...transaction,
    id: txId,
    businessId: business.id,
    sessionId: session ? session.id : 'no_active_session',
    attendantId: business.ownerId,
    createdAt: now,
  };

  const newCash = Number((business.cashInDrawer + transaction.cashDelta).toFixed(2));
  const newTerminal = Number((business.terminalBalance + transaction.terminalDelta).toFixed(2));

  if (isDemoId(business.id)) {
    const txs = storageGet<Transaction[]>('transactions', []);
    txs.unshift(newTx);
    storageSet('transactions', txs);

    storageSet('business', {
      ...business,
      cashInDrawer: newCash,
      terminalBalance: newTerminal,
      updatedAt: now,
    });
    window.dispatchEvent(new Event('maureen_demo_business_updated'));
    window.dispatchEvent(new Event('maureen_demo_transactions_updated'));

    if (session && session.id) {
      const sessions = storageGet<DailySession[]>('sessions', []);
      const idx = sessions.findIndex(s => s.id === session.id);
      if (idx !== -1) {
        sessions[idx].totalTransactionCount = (sessions[idx].totalTransactionCount || 0) + 1;
        sessions[idx].totalTransactionValue = (sessions[idx].totalTransactionValue || 0) + transaction.transactionAmount;
        sessions[idx].totalEarnings = (sessions[idx].totalEarnings || 0) + transaction.charge;
        sessions[idx].netEarnings = (sessions[idx].totalEarnings || 0) - (sessions[idx].totalExpenses || 0);
        storageSet('sessions', sessions);
      }
    }
    return newTx;
  }

  try {
    await setDoc(doc(db, 'transactions', txId), newTx);

    await updateDoc(doc(db, 'businesses', business.id), {
      cashInDrawer: newCash,
      terminalBalance: newTerminal,
      updatedAt: now,
    });

    if (session && session.id) {
      await updateDoc(doc(db, 'dailySessions', session.id), {
        totalTransactionCount: (session.totalTransactionCount || 0) + 1,
        totalTransactionValue: (session.totalTransactionValue || 0) + transaction.transactionAmount,
        totalEarnings: (session.totalEarnings || 0) + transaction.charge,
        netEarnings: ((session.totalEarnings || 0) + transaction.charge) - (session.totalExpenses || 0),
      });
    }

    return newTx;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `transactions/${txId}`);
  }
}

export function subscribeTransactions(
  businessId: string,
  onData: (txs: Transaction[]) => void,
  onError: (err: unknown) => void
) {
  if (isDemoId(businessId)) {
    const emit = () => {
      const list = storageGet<Transaction[]>('transactions', []);
      onData(list);
    };
    emit();
    window.addEventListener('maureen_demo_transactions_updated', emit);
    return () => window.removeEventListener('maureen_demo_transactions_updated', emit);
  }

  const q = query(
    collection(db, 'transactions'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(150)
  );

  return onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(doc => doc.data() as Transaction);
      onData(items);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      onError(error);
    }
  );
}

// --- EXPENSES SERVICES ---

export async function recordExpense({
  business,
  session,
  expense,
}: {
  business: Business;
  session?: DailySession | null;
  expense: Omit<Expense, 'id' | 'businessId' | 'sessionId' | 'attendantId' | 'createdAt'>;
}): Promise<Expense> {
  const expId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newExp: Expense = {
    ...expense,
    id: expId,
    businessId: business.id,
    sessionId: session ? session.id : 'no_active_session',
    attendantId: business.ownerId,
    createdAt: now,
  };

  const updates: Partial<Business> = { updatedAt: now };
  if (expense.paymentSource === 'cash') {
    updates.cashInDrawer = Number((business.cashInDrawer - expense.amount).toFixed(2));
  } else {
    updates.terminalBalance = Number((business.terminalBalance - expense.amount).toFixed(2));
  }

  if (isDemoId(business.id)) {
    const list = storageGet<Expense[]>('expenses', []);
    list.unshift(newExp);
    storageSet('expenses', list);

    storageSet('business', { ...business, ...updates });
    window.dispatchEvent(new Event('maureen_demo_business_updated'));
    window.dispatchEvent(new Event('maureen_demo_expenses_updated'));
    return newExp;
  }

  try {
    await setDoc(doc(db, 'expenses', expId), newExp);
    await updateDoc(doc(db, 'businesses', business.id), updates);

    if (session && session.id) {
      const newExpenses = (session.totalExpenses || 0) + expense.amount;
      await updateDoc(doc(db, 'dailySessions', session.id), {
        totalExpenses: newExpenses,
        netEarnings: (session.totalEarnings || 0) - newExpenses,
      });
    }

    return newExp;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `expenses/${expId}`);
  }
}

export function subscribeExpenses(
  businessId: string,
  onData: (expenses: Expense[]) => void,
  onError: (err: unknown) => void
) {
  if (isDemoId(businessId)) {
    const emit = () => {
      const list = storageGet<Expense[]>('expenses', []);
      onData(list);
    };
    emit();
    window.addEventListener('maureen_demo_expenses_updated', emit);
    return () => window.removeEventListener('maureen_demo_expenses_updated', emit);
  }

  const q = query(
    collection(db, 'expenses'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(doc => doc.data() as Expense);
      onData(items);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
      onError(error);
    }
  );
}

// --- DEBT SERVICES ---

export async function createDebtRecord({
  businessId,
  sessionId,
  debtorName,
  debtorPhone,
  initialAmount,
  reason,
  date,
}: {
  businessId: string;
  sessionId?: string;
  debtorName: string;
  debtorPhone?: string;
  initialAmount: number;
  reason: string;
  date: string;
}): Promise<Debt> {
  const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newDebt: Debt = {
    id: debtId,
    businessId,
    sessionId: sessionId || 'general',
    debtorName,
    debtorPhone: debtorPhone || '',
    initialAmount,
    amountPaid: 0,
    outstandingAmount: initialAmount,
    reason,
    status: 'unpaid',
    date,
    createdAt: now,
    updatedAt: now,
  };

  if (isDemoId(businessId)) {
    const list = storageGet<Debt[]>('debts', []);
    list.unshift(newDebt);
    storageSet('debts', list);
    window.dispatchEvent(new Event('maureen_demo_debts_updated'));
    return newDebt;
  }

  try {
    await setDoc(doc(db, 'debts', debtId), newDebt);
    return newDebt;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `debts/${debtId}`);
  }
}

export async function recordDebtPayment({
  business,
  debt,
  amount,
  paymentMethod,
  notes,
  date,
}: {
  business: Business;
  debt: Debt;
  amount: number;
  paymentMethod: 'cash' | 'terminal_bank';
  notes?: string;
  date: string;
}): Promise<DebtPayment> {
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const paymentRecord: DebtPayment = {
    id: paymentId,
    businessId: business.id,
    debtId: debt.id,
    debtorName: debt.debtorName,
    amount,
    paymentMethod,
    notes: notes || '',
    date,
    createdAt: now,
  };

  const newAmountPaid = debt.amountPaid + amount;
  const newOutstanding = Math.max(0, debt.initialAmount - newAmountPaid);
  const newStatus = newOutstanding <= 0 ? 'paid' : 'partially_paid';

  const updates: Partial<Business> = { updatedAt: now };
  if (paymentMethod === 'cash') {
    updates.cashInDrawer = Number((business.cashInDrawer + amount).toFixed(2));
  } else {
    updates.terminalBalance = Number((business.terminalBalance + amount).toFixed(2));
  }

  if (isDemoId(business.id)) {
    const payments = storageGet<DebtPayment[]>('debtPayments', []);
    payments.unshift(paymentRecord);
    storageSet('debtPayments', payments);

    const debts = storageGet<Debt[]>('debts', []);
    const idx = debts.findIndex(d => d.id === debt.id);
    if (idx !== -1) {
      debts[idx] = {
        ...debts[idx],
        amountPaid: newAmountPaid,
        outstandingAmount: newOutstanding,
        status: newStatus,
        updatedAt: now,
      };
      storageSet('debts', debts);
    }

    storageSet('business', { ...business, ...updates });
    window.dispatchEvent(new Event('maureen_demo_business_updated'));
    window.dispatchEvent(new Event('maureen_demo_debts_updated'));
    window.dispatchEvent(new Event('maureen_demo_payments_updated'));
    return paymentRecord;
  }

  try {
    await setDoc(doc(db, 'debtPayments', paymentId), paymentRecord);

    await updateDoc(doc(db, 'debts', debt.id), {
      amountPaid: newAmountPaid,
      outstandingAmount: newOutstanding,
      status: newStatus,
      updatedAt: now,
    });

    await updateDoc(doc(db, 'businesses', business.id), updates);
    return paymentRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `debtPayments/${paymentId}`);
  }
}

export function subscribeDebts(
  businessId: string,
  onData: (debts: Debt[]) => void,
  onError: (err: unknown) => void
) {
  if (isDemoId(businessId)) {
    const emit = () => {
      const list = storageGet<Debt[]>('debts', []);
      onData(list);
    };
    emit();
    window.addEventListener('maureen_demo_debts_updated', emit);
    return () => window.removeEventListener('maureen_demo_debts_updated', emit);
  }

  const q = query(
    collection(db, 'debts'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(doc => doc.data() as Debt);
      onData(items);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'debts');
      onError(error);
    }
  );
}

export function subscribeDebtPayments(
  businessId: string,
  onData: (payments: DebtPayment[]) => void,
  onError: (err: unknown) => void
) {
  if (isDemoId(businessId)) {
    const emit = () => {
      const list = storageGet<DebtPayment[]>('debtPayments', []);
      onData(list);
    };
    emit();
    window.addEventListener('maureen_demo_payments_updated', emit);
    return () => window.removeEventListener('maureen_demo_payments_updated', emit);
  }

  const q = query(
    collection(db, 'debtPayments'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(doc => doc.data() as DebtPayment);
      onData(items);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'debtPayments');
      onError(error);
    }
  );
}

// --- TRANSACTION TYPES CONFIGURATION ---

export function subscribeTransactionTypes(
  businessId: string,
  onData: (types: TransactionTypeConfig[]) => void,
  onError: (err: unknown) => void
) {
  if (isDemoId(businessId)) {
    const defaults = DEFAULT_TRANSACTION_TYPES.map(d => ({ ...d, businessId }));
    const custom = storageGet<TransactionTypeConfig[]>('custom_types', []);
    onData([...defaults, ...custom]);
    return () => {};
  }

  const q = query(
    collection(db, 'transactionTypes'),
    where('businessId', '==', businessId)
  );

  return onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(doc => doc.data() as TransactionTypeConfig);
      onData(items);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'transactionTypes');
      onError(error);
    }
  );
}

export async function addCustomTransactionType(
  businessId: string,
  name: string,
  category: 'withdrawal' | 'deposit' | 'utility' | 'other'
): Promise<TransactionTypeConfig> {
  const typeId = `${businessId}_custom_${Date.now()}`;
  const now = new Date().toISOString();
  const config: TransactionTypeConfig = {
    id: typeId,
    businessId,
    name,
    category,
    isCustom: true,
    isActive: true,
    createdAt: now,
  };

  if (isDemoId(businessId)) {
    const custom = storageGet<TransactionTypeConfig[]>('custom_types', []);
    custom.push(config);
    storageSet('custom_types', custom);
    return config;
  }

  try {
    await setDoc(doc(db, 'transactionTypes', typeId), config);
    return config;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `transactionTypes/${typeId}`);
  }
}

export async function toggleTransactionTypeActive(
  typeId: string,
  isActive: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'transactionTypes', typeId), { isActive });
  } catch (error) {
    // ignore
  }
}
