import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatNaira } from '../../utils/formatters';

interface StatCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'accent' | 'negative' | 'neutral';
  isCount?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  subtitle,
  icon: Icon,
  variant = 'default',
  isCount = false,
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return {
          wrapper: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-700/10',
          iconBox: 'bg-emerald-500/30 text-white',
          title: 'text-emerald-100',
          value: 'text-white',
          sub: 'text-emerald-100',
        };
      case 'negative':
        return {
          wrapper: 'bg-white border-rose-200 text-slate-800',
          iconBox: 'bg-rose-50 text-rose-600',
          title: 'text-slate-500',
          value: 'text-rose-600',
          sub: 'text-rose-600',
        };
      case 'neutral':
        return {
          wrapper: 'bg-white border-slate-200/80 text-slate-800',
          iconBox: 'bg-slate-100 text-slate-700',
          title: 'text-slate-500',
          value: 'text-slate-800',
          sub: 'text-slate-500',
        };
      default:
        return {
          wrapper: 'bg-white border-slate-200/80 text-slate-800 shadow-xs hover:border-emerald-300',
          iconBox: 'bg-emerald-50 text-emerald-700',
          title: 'text-slate-500',
          value: 'text-slate-900',
          sub: 'text-emerald-700',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-3 sm:p-5 border transition-all duration-150 ${styles.wrapper} ${
        onClick ? 'cursor-pointer active:scale-[0.98] touch-manipulation' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        <span className={`text-[11px] sm:text-xs md:text-sm font-medium tracking-tight truncate ${styles.title}`}>
          {title}
        </span>
        <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${styles.iconBox}`}>
          <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="mt-1.5 sm:mt-2.5">
        <p className={`text-base sm:text-xl md:text-2xl font-bold tracking-tight truncate ${styles.value}`}>
          {isCount ? amount.toLocaleString() : formatNaira(amount)}
        </p>
        {subtitle && (
          <p className={`text-[10px] sm:text-xs font-normal mt-0.5 sm:mt-1 truncate ${styles.sub}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
