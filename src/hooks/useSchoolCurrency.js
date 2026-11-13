import { useMemo } from 'react';
import { useSchoolSettingsData } from './useSchoolSettings';
import { schoolCurrencyFrom } from '../utils/money';

/**
 * The school's currency label: { code, symbol }. PKR / "Rs" while the
 * settings load, on error, and for platform admins (no school). Show school
 * money (fees, salaries, transport…) with `formatMoney(amount, symbol)`;
 * platform billing keeps PLATFORM_CURRENCY_SYMBOL (src/constants/billing.js).
 */
export function useSchoolCurrency() {
  const { data } = useSchoolSettingsData();
  const currency = data?.currency;
  const currencySymbol = data?.currencySymbol;
  return useMemo(
    () => schoolCurrencyFrom({ currency, currencySymbol }),
    [currency, currencySymbol],
  );
}
