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
