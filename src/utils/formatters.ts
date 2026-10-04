/**
 * Formats a number to Nigerian Naira currency display
 * Example: 50000 -> ₦50,000
 */
export function formatNaira(amount: number | undefined | null, includeDecimals = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₦0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(absAmount);

  return `${isNegative ? '-' : ''}₦${formatted}`;
}

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(isoString: string | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function formatDateOnly(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const today = getTodayString();
    if (dateStr === today) return 'Today';
    
    // Check yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yStr) return 'Yesterday';

    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export interface DifferenceResult {
  diff: number;
  status: 'match' | 'surplus' | 'shortage';
  message: string;
}

export function evaluateDifference(actual: number, expected: number): DifferenceResult {
  const diff = actual - expected;
  if (Math.abs(diff) < 0.01) {
    return {
      diff: 0,
      status: 'match',
      message: 'Your cash matches.',
    };
  }
  if (diff > 0) {
    return {
      diff,
      status: 'surplus',
      message: `You have ${formatNaira(diff)} more than expected.`,
    };
  }
  return {
    diff,
    status: 'shortage',
    message: `You have ${formatNaira(Math.abs(diff))} less than expected.`,
  };
}
