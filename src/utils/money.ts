export function normalizeArabicDigits(str: string): string {
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let result = str;
  for (let i = 0; i <= 9; i++) {
    result = result.replaceAll(arabic[i], String(i));
  }
  return result;
}

export function parseToCents(rawInput: string): { valid: boolean; cents?: number; error?: string } {
  const trimmed = normalizeArabicDigits(rawInput.trim().replace('$', '').replaceAll('،', ','));
  if (!trimmed) {
    return { valid: false, error: 'يرجى إدخال نتيجة الصفقة.' };
  }
  const normalized = trimmed.replace(',', '.');
  const match = normalized.match(/^([+-])?(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return { valid: false, error: 'يرجى إدخال رقم صحيح.' };
  }
  const sign = match[1] === '-' ? -1 : 1;
  const whole = parseInt(match[2], 10);
  if (isNaN(whole)) return { valid: false, error: 'قيمة غير صحيحة.' };
  const fractionStr = (match[3] || '').padEnd(2, '0').slice(0, 2);
  const fraction = parseInt(fractionStr, 10) || 0;
  const totalCents = sign * (whole * 100 + fraction);
  if (totalCents === 0) {
    return { valid: false, error: 'لا يمكن أن تكون نتيجة الصفقة صفراً.' };
  }
  return { valid: true, cents: totalCents };
}

export function parseCapitalToCents(rawInput: string): { valid: boolean; cents?: number; error?: string } {
  const trimmed = normalizeArabicDigits(rawInput.trim().replace('$', '').replaceAll('،', ','));
  if (!trimmed) {
    return { valid: false, error: 'يرجى إدخال قيمة صحيحة.' };
  }
  const normalized = trimmed.replace(',', '.');
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return { valid: false, error: 'يرجى إدخال رقم صحيح أكبر من صفر.' };
  }
  const whole = parseInt(match[1], 10);
  if (isNaN(whole)) return { valid: false, error: 'قيمة غير صحيحة.' };
  const fractionStr = (match[2] || '').padEnd(2, '0').slice(0, 2);
  const fraction = parseInt(fractionStr, 10) || 0;
  const totalCents = whole * 100 + fraction;
  if (totalCents <= 0) {
    return { valid: false, error: 'يجب أن تكون القيمة أكبر من صفر.' };
  }
  return { valid: true, cents: totalCents };
}

export function formatMoney(cents?: number | null, showSign: boolean = false): string {
  if (cents === null || cents === undefined) return '-';
  const isNegative = cents < 0;
  const isPositive = cents > 0;
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainder = absCents % 100;
  const formattedDollars = dollars.toLocaleString('en-US');
  const formattedNumber = `$${formattedDollars}.${String(remainder).padStart(2, '0')}`;
  if (isNegative) return `-${formattedNumber}`;
  if (isPositive && showSign) return `+${formattedNumber}`;
  return formattedNumber;
}

export function calculateProgress(currentBalanceCents: number, targetBalanceCents: number): number {
  if (targetBalanceCents <= 0 || currentBalanceCents <= 0) return 0;
  const pct = (currentBalanceCents / targetBalanceCents) * 100;
  return Math.max(0, Math.min(100, pct));
}
