import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { sortBalanceRows, titleCase } from '../../utils/leave';
import { COLORS } from '../../theme/colors';

/**
 * Balance from GET /leave/my/balance or /leave/balance:
 * `{ leaveYear, staffType, rows: [{ leaveType, quota, used, pending, remaining }] }`.
 */
export default function LeaveBalanceCards({ balance, loading, error, C }) {
  if (loading) {
    return (
      <View style={[styles.box, { backgroundColor: C.card, borderColor: C.border }]}>
        <ActivityIndicator size="small" color={COLORS.brand} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.box, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[styles.muted, { color: C.muted }]}>
          {error?.response?.data?.message || 'Could not load the leave balance.'}
        </Text>
      </View>
    );
  }
  const rows = sortBalanceRows(balance?.rows);
  if (!rows.length) return null;

  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.heading, { color: C.muted }]}>
        BALANCE {balance?.leaveYear ? `· ${balance.leaveYear}` : ''}
        {balance?.staffType ? ` · ${titleCase(balance.staffType)}` : ''}
      </Text>
      <View style={styles.grid}>
        {rows.map((r) => {
          const unpaid = r.leaveType === 'unpaid';
          const remaining = Number(r.remaining) || 0;
          const low = !unpaid && remaining <= 0;
          return (
            <View
              key={r.leaveType}
              style={[styles.tile, { backgroundColor: C.card, borderColor: C.border }]}
            >
              <Text style={[styles.tileLabel, { color: C.muted }]}>{titleCase(r.leaveType)}</Text>
              {unpaid ? (
                <Text style={[styles.tileValue, { color: C.text }]}>{Number(r.used) || 0}</Text>
              ) : (
                <Text style={[styles.tileValue, { color: low ? COLORS.red : COLORS.brand }]}>
                  {remaining}
                  <Text style={[styles.tileOf, { color: C.muted }]}> / {Number(r.quota) || 0}</Text>
                </Text>
              )}
              <Text style={[styles.tileSub, { color: C.mutedSoft }]}>
                {unpaid ? 'days taken' : `${Number(r.used) || 0} used`}
                {Number(r.pending) > 0 ? ` · ${r.pending} pending` : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  muted: { fontSize: 12, textAlign: 'center' },
  heading: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 2,
  },
  tileLabel: { fontSize: 11, fontWeight: '700' },
  tileValue: { fontSize: 20, fontWeight: '800' },
  tileOf: { fontSize: 12, fontWeight: '600' },
  tileSub: { fontSize: 10 },
});
