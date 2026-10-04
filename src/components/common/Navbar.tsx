import React from 'react';
import {
  Banknote,
  PlayCircle,
  StopCircle,
  Plus,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  onOpenRecordModal: () => void;
  onOpenStartDayModal: () => void;
  onOpenCloseDayModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenRecordModal,
  onOpenStartDayModal,
  onOpenCloseDayModal,
}) => {
  const { business, activeSession, userProfile } = useAuth();
  const isSessionOpen = activeSession?.status === 'open';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand & Business Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-base font-bold tracking-tight text-slate-900 truncate">
                  MAUREEN CASHFLOW
                </span>
                <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  POS
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate flex items-center gap-1 font-normal">
                <Building2 className="w-3 h-3 shrink-0 text-slate-400 hidden xs:inline" />
                <span className="truncate">{business?.name || 'POS Attendant'}</span>
                {userProfile?.fullName && (
                  <span className="hidden md:inline text-slate-400">
                    • {userProfile.fullName}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right Actions: Session State & Quick Record */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Session Indicator & Action */}
            {isSessionOpen ? (
              <div className="flex items-center gap-1.5">
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Day active
                </span>
                <button
                  onClick={onOpenCloseDayModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 active:scale-95 touch-manipulation min-h-[38px] sm:min-h-[40px]"
                >
                  <StopCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="hidden sm:inline">Close day</span>
                  <span className="sm:hidden">Close</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenStartDayModal}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors active:scale-95 touch-manipulation min-h-[38px] sm:min-h-[40px]"
              >
                <PlayCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Start business day</span>
                <span className="sm:hidden">Start day</span>
              </button>
            )}

            {/* Quick Record Button */}
            <button
              onClick={onOpenRecordModal}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all active:scale-95 touch-manipulation min-h-[38px] sm:min-h-[40px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline">Record</span>
              <span className="hidden md:inline">transaction</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
