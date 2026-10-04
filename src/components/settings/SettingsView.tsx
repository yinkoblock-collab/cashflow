import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Tags,
  CreditCard,
  Percent,
  Shield,
  LogOut,
  Plus,
  Save,
  Wallet,
  ArrowDownCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  updateBusinessDetails,
  subscribeTransactionTypes,
  addCustomTransactionType,
  toggleTransactionTypeActive,
  sendPasswordReset,
} from '../../firebase/services';
import { TransactionTypeConfig } from '../../types';
import { DEFAULT_TRANSACTION_TYPES, PAYMENT_METHODS } from '../../utils/constants';
import { NavTab } from '../common/Sidebar';

interface SettingsViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigateTab }) => {
  const { business, userProfile, showNotification, signOutApp } = useAuth();

  // Business info form
  const [bizName, setBizName] = useState(business?.name || '');
  const [bizPhone, setBizPhone] = useState(business?.phoneNumber || '');
  const [bizAddress, setBizAddress] = useState(business?.address || '');
  const [savingBiz, setSavingBiz] = useState(false);

  // Custom Transaction Types
  const [types, setTypes] = useState<TransactionTypeConfig[]>([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState<'withdrawal' | 'deposit' | 'utility' | 'other'>('utility');
  const [savingType, setSavingType] = useState(false);

  useEffect(() => {
    if (business) {
      setBizName(business.name || '');
      setBizPhone(business.phoneNumber || '');
      setBizAddress(business.address || '');
    }
  }, [business]);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = subscribeTransactionTypes(
      business.id,
      list => {
        if (list && list.length > 0) {
          setTypes(list);
        } else {
          setTypes(DEFAULT_TRANSACTION_TYPES.map(d => ({ ...d, businessId: business.id })));
        }
      },
      () => {}
    );
    return () => unsub();
  }, [business?.id]);

  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setSavingBiz(true);
    try {
      await updateBusinessDetails(business.id, {
        name: bizName.trim(),
        phoneNumber: bizPhone.trim() || undefined,
        address: bizAddress.trim() || undefined,
      });
      showNotification('Business profile updated successfully!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to update business profile.', 'error');
    } finally {
      setSavingBiz(false);
    }
  };

  const handleAddCustomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !newTypeName.trim()) return;

    setSavingType(true);
    try {
      await addCustomTransactionType(business.id, newTypeName.trim(), newTypeCategory);
      showNotification(`Added custom service "${newTypeName.trim()}"`);
      setNewTypeName('');
      setShowAddTypeModal(false);
    } catch (err) {
      console.error(err);
      showNotification('Could not add custom type.', 'error');
    } finally {
      setSavingType(false);
    }
  };

  const handleToggleType = async (type: TransactionTypeConfig) => {
    try {
      const nextState = !type.isActive;
      await toggleTransactionTypeActive(type.id, nextState);
      showNotification(`Updated ${type.name} visibility.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePasswordReset = async () => {
    if (!userProfile?.email) return;
    try {
      await sendPasswordReset(userProfile.email);
      showNotification(`Password reset email sent to ${userProfile.email}`);
    } catch (err) {
      console.error(err);
      showNotification('Failed to send reset link.', 'error');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOutApp();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Settings & more
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage your business information, services, and operations
        </p>
      </div>

      {/* MOBILE QUICK ACCESS CARDS: Jump to Balances and Expenses */}
      {onNavigateTab && (
        <div className="lg:hidden space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
            Quick operations
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => onNavigateTab('balances')}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between hover:bg-slate-50 transition-colors touch-manipulation min-h-[56px] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Cash & terminal balances
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    View cash in box vs POS funds
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigateTab('expenses')}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between hover:bg-slate-50 transition-colors touch-manipulation min-h-[56px] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <ArrowDownCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Business expenses
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Track operating costs
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Business Profile */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Business information
          </h2>
        </div>

        <form onSubmit={handleSaveBusinessInfo} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business name
              </label>
              <input
                type="text"
                required
                value={bizName}
                onChange={e => setBizName(e.target.value)}
                className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business contact phone
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={bizPhone}
                onChange={e => setBizPhone(e.target.value)}
                placeholder="080..."
                className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shop / Kiosk address (optional)
            </label>
            <input
              type="text"
              value={bizAddress}
              onChange={e => setBizAddress(e.target.value)}
              placeholder="e.g. Shop 4, Junction Plaza"
              className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            />
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={savingBiz}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer min-h-[44px] touch-manipulation"
            >
              <Save className="w-4 h-4" />
              <span>{savingBiz ? 'Saving...' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Attendant Profile */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <User className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Attendant profile
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">Attendant name</span>
            <span className="font-semibold text-slate-900 block mt-0.5">
              {userProfile?.fullName || 'Attendant'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Email address</span>
            <span className="font-semibold text-slate-900 block mt-0.5 truncate">
              {userProfile?.email}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Transaction Types Customization */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Transaction types
              </h2>
              <p className="text-[11px] text-slate-500">
                Enable, disable, or add specialized services
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddTypeModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer min-h-[38px] touch-manipulation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add service</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {types.map(t => (
            <div
              key={t.id}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <span className="font-semibold text-slate-800 block truncate">
                  {t.name}
                </span>
                <span className="text-[10px] text-slate-400 capitalize block">
                  {t.category} {t.isCustom && '• Custom'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleToggleType(t)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors shrink-0 touch-manipulation min-h-[32px] ${
                  t.isActive !== false
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {t.isActive !== false ? 'Active' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Commission / Charge Policy Notice */}
      <div className="p-3.5 sm:p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 leading-relaxed">
        <Percent className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Flexible manual charges:</strong>
          <p className="mt-0.5 text-emerald-800">
            Charges are entered manually for every transaction to accurately match cash-in-hand rates and market dynamics.
          </p>
        </div>
      </div>

      {/* 5. Payment Methods Reference */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <CreditCard className="w-5 h-5 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">
            Payment methods
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {PAYMENT_METHODS.map(pm => (
            <div key={pm.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-medium text-slate-700 truncate">
              {pm.label}
            </div>
          ))}
        </div>
      </div>

      {/* 6. Security & Sign Out */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Shield className="w-5 h-5 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">
            Security & session
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div>
            <span className="font-semibold text-slate-800 block">Password management</span>
            <span className="text-slate-500">Need to update your login password?</span>
          </div>
          <button
            onClick={handlePasswordReset}
            className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer min-h-[42px] touch-manipulation"
          >
            Send password reset email
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-rose-600 block">Sign out</span>
            <span className="text-slate-500">End attendant session</span>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer min-h-[42px] touch-manipulation"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Add Custom Type Modal: Mobile Bottom Sheet */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full shadow-2xl border-t sm:border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
            <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Add service type</h2>
              <button
                onClick={() => setShowAddTypeModal(false)}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomType} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service name
                </label>
                <input
                  type="text"
                  required
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  placeholder="e.g. NIN Registration, JAMB E-Pin"
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newTypeCategory}
                  onChange={e => setNewTypeCategory(e.target.value as any)}
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl min-h-[44px]"
                >
                  <option value="utility">Utility / Service</option>
                  <option value="deposit">Deposit / Collection</option>
                  <option value="withdrawal">Cash Dispense</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => setShowAddTypeModal(false)}
                  className="flex-1 py-3 px-3 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl min-h-[46px] touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingType}
                  className="flex-2 py-3 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl min-h-[46px] touch-manipulation"
                >
                  {savingType ? 'Adding...' : 'Add service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
