// Salary maths mirrored from the API (staff-salary.payroll.ts) so previews and
// payslip line items show the same 2-decimal figures the server stores.

/** Round to 2 decimals (paisa), half away from zero for positives like the API. */
export function round2(n) {
  const num = Number(n) || 0;
  return Math.round(num * 100) / 100;
}

/** One allowance/deduction's amount: a percent of basic, or a fixed amount. */
export function componentAmount(basic, component) {
  const amt = Number(component?.amount) || 0;
  const raw = component?.type === 'percent' ? ((Number(basic) || 0) * amt) / 100 : amt;
  return round2(raw);
}

/** Sum of components; negative entries are ignored, as on the server. */
export function componentTotal(basic, list) {
  const total = (list || []).reduce((sum, c) => {
    const amt = Number(c?.amount) || 0;
    const raw = c?.type === 'percent' ? ((Number(basic) || 0) * amt) / 100 : amt;
    return sum + (raw > 0 ? raw : 0);
  }, 0);
  return round2(total);
}

// The school's currency is a display label set by the school admin
// (GET/PATCH /schools/settings). Changing it converts no stored amount.
// Mirrors the API's allowed list.
export const SCHOOL_CURRENCIES = [
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal' },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial' },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

/** Used while the school's settings load, on error, and with no school. */
export const DEFAULT_SCHOOL_CURRENCY = { code: 'PKR', symbol: 'Rs' };

/**
 * { code, symbol } from the settings payload; an unknown or missing code falls
 * back to PKR, and a missing symbol to the one listed for the code.
 */
export function schoolCurrencyFrom(settings) {
  const code = typeof settings?.currency === 'string' ? settings.currency.toUpperCase() : '';
  const known = SCHOOL_CURRENCIES.find((c) => c.code === code);
  if (!known) return DEFAULT_SCHOOL_CURRENCY;
  const symbol =
    typeof settings?.currencySymbol === 'string' && settings.currencySymbol.trim()
      ? settings.currencySymbol.trim()
      : known.symbol;
  return { code: known.code, symbol };
}

/** "Rs 1,500" / "$ 12.5": the amount rounded to 2 decimals after the symbol. */
export function formatMoney(amount, symbol = DEFAULT_SCHOOL_CURRENCY.symbol) {
  const num = round2(amount);
  const sym = typeof symbol === 'string' && symbol.trim() ? symbol.trim() : DEFAULT_SCHOOL_CURRENCY.symbol;
  return `${sym} ${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
