import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  ArrowDownCircle,
  Users,
  BarChart3,
  Settings,
  LogOut,
  PlusCircle,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'transactions'
  | 'balances'
  | 'expenses'
  | 'debts'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenRecordModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenRecordModal,
}) => {
  const { userProfile, signOutApp } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out of Maureen Cashflow?')) {
      await signOutApp();
    }
  };

  // Desktop navigation items (all 7 sections)
  const desktopNavItems: Array<{ id: NavTab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'balances', label: 'Cash & terminal', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: ArrowDownCircle },
    { id: 'debts', label: 'Customer debts', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Mobile navigation items (5 core sections requested: Home, Transactions, Debts, Reports, More)
  const mobileNavItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ElementType;
    activeMatch: (tab: NavTab) => boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      activeMatch: tab => tab === 'dashboard',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Receipt,
      activeMatch: tab => tab === 'transactions',
    },
    {
      id: 'debts',
      label: 'Debts',
      icon: Users,
      activeMatch: tab => tab === 'debts',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      activeMatch: tab => tab === 'reports',
    },
    {
      id: 'settings',
      label: 'More',
      icon: MoreHorizontal,
      activeMatch: tab => tab === 'settings' || tab === 'balances' || tab === 'expenses',
    },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR: Preserved exactly for desktop displays */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 justify-between shrink-0">
        <div className="space-y-6">
          {/* Quick Record Callout Button */}
          <button
            onClick={onOpenRecordModal}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>New transaction</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Desktop navigation">
            {desktopNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-slate-200">
          <div className="px-3 py-2 bg-slate-50 rounded-xl mb-3">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {userProfile?.fullName || 'Attendant'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {userProfile?.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR: Native Mobile UX */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg select-none"
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))',
          paddingTop: '0.35rem',
        }}
        aria-label="Mobile bottom navigation"
      >
        <div className="max-w-lg mx-auto px-1.5 flex items-center justify-around">
          {mobileNavItems.map(item => {
            const Icon = item.icon;
            const isActive = item.activeMatch(currentTab);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl min-h-[50px] touch-manipulation transition-all duration-150 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-emerald-800 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {/* Active Indicator Backdrop */}
                {isActive && (
                  <span className="absolute inset-x-1 top-0.5 bottom-0.5 rounded-xl bg-emerald-50/90 border border-emerald-200/50 -z-10 transition-all duration-150 animate-in fade-in" />
                )}

                {/* Icon with subtle scale effect on active */}
                <div
                  className={`transition-all duration-150 ${
                    isActive ? 'scale-105 text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.3 : 1.75} />
                </div>

                {/* Label */}
                <span
                  className={`text-[10.5px] tracking-tight mt-0.5 transition-colors duration-150 ${
                    isActive ? 'text-emerald-800 font-semibold' : 'text-slate-500 font-normal'
                  }`}
                >
                  {item.label}
                </span>

                {/* Active Mini Indicator Dot */}
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5 transition-all duration-150" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
