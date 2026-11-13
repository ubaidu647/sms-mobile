import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCashBankAccounts } from '../hooks/useCashBankAccounts';
import {
  accountPickerState,
  accountsForMethod,
  keptAccountId,
  methodToCashOrBank,
} from '../utils/cashBankAccounts';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';

/**
 * Which cash or bank head the money moves through, shown only when more than
 * one matches the payment method. Web's equivalents are PaymentAccountSelect
 * and CashBankAccountSelect.
 *
 * Never blocks a submit: with auto-post off the server needs no account, and
 * the app can't tell. If one is needed, the server says so in the error.
 *
 * `value` is the chosen id ('' for none); send it as `ledgerAccountId` if set.
 */
export default function PaymentAccountPicker({ branchId, method, value, onChange, disabled }) {
  const C = useColors();
  const { data: accounts, isLoading, isError, error, refetch } = useCashBankAccounts({ branchId });

  const kept = keptAccountId(accounts, method, value);
  useEffect(() => {
    if (kept !== (value || '')) onChange(kept);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kept, value]);

  const state = accountPickerState({
    accounts,
    method,
    isLoading,
    isError,
    errorStatus: error?.response?.status,
  });
  if (state === 'hidden') return null;

  const kind = methodToCashOrBank(method);

  if (state === 'loading') {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator size="small" color={COLORS.brand} />
        <Text style={[styles.hint, { color: C.muted }]}>Checking {kind} accounts…</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.statusRow}>
        <Text style={[styles.hint, { color: C.muted, flex: 1 }]}>
          Couldn’t load {kind} accounts. You can still record this payment.
        </Text>
        <Pressable onPress={() => refetch()} hitSlop={10}>
          <Text style={styles.retry}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const matching = accountsForMethod(accounts, method);
  return (
    <View>
      <Text style={[styles.label, { color: C.muted }]}>{kind.toUpperCase()} ACCOUNT</Text>
      <View style={styles.chipRow}>
        {matching.map((a) => {
          const active = value === a._id;
          return (
            <Pressable
              key={a._id}
              disabled={disabled}
              onPress={() => onChange(active ? '' : a._id)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: C.bg, borderColor: C.border },
                active && styles.chipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.chipText, { color: C.text }, active && styles.chipTextActive]}>
                {a.code} · {a.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, styles.hintBelow, { color: C.muted }]}>
        This branch has {matching.length} {kind} accounts — choose where the amount goes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { fontSize: 12 },
  hintBelow: { marginTop: 6 },
  retry: { fontSize: 12, fontWeight: '700', color: COLORS.brand },
});
