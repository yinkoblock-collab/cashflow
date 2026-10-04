import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { Navbar } from './components/common/Navbar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { NotificationToast } from './components/common/NotificationToast';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionHistoryView } from './components/transactions/TransactionHistoryView';
import { BalancesView } from './components/balances/BalancesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { DebtsView } from './components/debts/DebtsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { RecordTransactionModal } from './components/transactions/RecordTransactionModal';
import { StartSessionModal } from './components/session/StartSessionModal';
import { CloseSessionModal } from './components/session/CloseSessionModal';
import { Banknote } from 'lucide-react';

const AppContent: React.FC = () => {
  const { firebaseUser, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isStartDayModalOpen, setIsStartDayModalOpen] = useState(false);
  const [isCloseDayModalOpen, setIsCloseDayModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center animate-pulse mb-3">
          <Banknote className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-800">
          Loading Maureen Cashflow...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Securing cash drawer & terminal accounts
        </p>
      </div>
    );
  }

  // Not authenticated -> show Email + Password Login / Register
  if (!firebaseUser) {
    return (
      <>
        <AuthScreen />
        <NotificationToast />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenRecordModal={() => setIsRecordModalOpen(true)}
        onOpenStartDayModal={() => setIsStartDayModalOpen(true)}
        onOpenCloseDayModal={() => setIsCloseDayModalOpen(true)}
      />

      {/* Main Layout: safe padding for mobile bottom bar and gesture navigation */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
        {/* Desktop Sidebar & Mobile Bottom Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenRecordModal={() => setIsRecordModalOpen(true)}
        />

        {/* Dynamic View Tab */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onOpenRecordModal={() => setIsRecordModalOpen(true)}
              onOpenStartDayModal={() => setIsStartDayModalOpen(true)}
              onOpenCloseDayModal={() => setIsCloseDayModalOpen(true)}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionHistoryView
              onOpenRecordModal={() => setIsRecordModalOpen(true)}
            />
          )}

          {currentTab === 'balances' && <BalancesView />}

          {currentTab === 'expenses' && <ExpensesView />}

          {currentTab === 'debts' && <DebtsView />}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'settings' && <SettingsView onNavigateTab={setCurrentTab} />}
        </main>
      </div>

      {/* Global Modals */}
      <RecordTransactionModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
      />

      <StartSessionModal
        isOpen={isStartDayModalOpen}
        onClose={() => setIsStartDayModalOpen(false)}
      />

      <CloseSessionModal
        isOpen={isCloseDayModalOpen}
        onClose={() => setIsCloseDayModalOpen(false)}
      />

      {/* Toast Feedback */}
      <NotificationToast />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
