import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useStaffHistory, useStaffMonthlySummary } from '../../hooks/useStaffAttendance';
import { useUserStore } from '../../store/userStore';
import {
  STAFF_STATUS_PILL,
  currentMonth,
  formatWorkedMinutes,
  todayISO,
} from '../../constants/staffAttendance';
import { monthsAgoYMD } from '../../utils/localDate';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '—';
  }
}

export default function OwnAttendancePanel() {
  const C = useColors();
  const { user } = useUserStore();
  const staffId = user?.staffId;

  const [from, setFrom] = useState(monthsAgoYMD(1));
  const [to, setTo] = useState(todayISO());
  const [month, setMonth] = useState(currentMonth());

  const history = useStaffHistory({ staffId, from, to, enabled: !!staffId });
  const summary = useStaffMonthlySummary({ staffId, month, enabled: !!staffId });

  const rows = useMemo(() => {
    const r = history.data?.data || [];
    return Array.isArray(r) ? r : [];
  }, [history.data]);

  if (!staffId) {
    return (
      <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border, margin: 14 }]}>
        <Feather name="user-x" size={28} color={C.mutedSoft} />
        <Text style={[styles.emptyText, { color: C.muted }]}>
          No staff profile linked to this account.
        </Text>
      </View>
    );
  }

  const s = summary.data?.data;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Monthly summary */}
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Monthly Summary</Text>
          <View style={[styles.fieldRow, { backgroundColor: C.bg, borderColor: C.border, flex: 1, maxWidth: 160 }]}>
            <Feather name="calendar" size={14} color={COLORS.brand} />
            <TextInput
              value={month}
              onChangeText={setMonth}
              placeholder="2026-06"
              placeholderTextColor={C.mutedSoft}
              style={[styles.fieldInput, { color: C.text }]}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {summary.isFetching && !s ? (
          <ActivityIndicator size="small" color={COLORS.brand} />
        ) : s ? (
          <>
            <View style={styles.statsRow}>
              <SummaryStat label="Working days" value={s.workingDays ?? 0} C={C} />
              <SummaryStat
                label="%"
                value={s.percentage != null ? `${Number(s.percentage).toFixed(1)}%` : '—'}
                C={C}
                tint={COLORS.brand}
              />
              <SummaryStat
                label="Worked"
                value={formatWorkedMinutes(s.totalWorkedMinutes)}
                C={C}
              />
            </View>
            <View style={styles.statsRow}>
              <CountChip label="Present" value={s.counts?.present} k="present" />
              <CountChip label="Late" value={s.counts?.late} k="late" />
              <CountChip label="Half" value={s.counts?.['half-day']} k="half-day" />
              <CountChip label="Absent" value={s.counts?.absent} k="absent" />
              <CountChip label="Leave" value={s.counts?.leave} k="leave" />
              <CountChip label="Holiday" value={s.counts?.holiday} k="holiday" />
            </View>
            <View style={[styles.payRow, { borderTopColor: C.border }]}>
              <View style={styles.payCell}>
                <Text style={[styles.payLabel, { color: C.mutedSoft }]}>PAID LEAVE</Text>
                <Text style={[styles.payValue, { color: '#166534' }]}>{s.paidLeaveDays ?? 0}</Text>
              </View>
              <View style={styles.payCell}>
                <Text style={[styles.payLabel, { color: C.mutedSoft }]}>UNPAID</Text>
                <Text style={[styles.payValue, { color: '#991b1b' }]}>{s.unpaidLeaveDays ?? 0}</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.emptyText, { color: C.muted }]}>No data for this month.</Text>
        )}
      </View>

      {/* History */}
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: C.text }]}>History</Text>
        </View>
        <View style={styles.rangeRow}>
          <View style={[styles.fieldRow, { backgroundColor: C.bg, borderColor: C.border, flex: 1 }]}>
            <Feather name="log-in" size={14} color={COLORS.brand} />
            <TextInput
              value={from}
              onChangeText={setFrom}
              placeholder="From"
              placeholderTextColor={C.mutedSoft}
              style={[styles.fieldInput, { color: C.text }]}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={[styles.fieldRow, { backgroundColor: C.bg, borderColor: C.border, flex: 1 }]}>
            <Feather name="log-out" size={14} color={COLORS.brand} />
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="To"
              placeholderTextColor={C.mutedSoft}
              style={[styles.fieldInput, { color: C.text }]}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {history.isFetching && rows.length === 0 ? (
          <ActivityIndicator size="small" color={COLORS.brand} />
        ) : rows.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No attendance records in this range.
          </Text>
        ) : (
          rows.map((r) => {
            const cfg = r.status ? STAFF_STATUS_PILL[r.status] : null;
            return (
              <View
                key={r._id}
                style={[styles.historyRow, { borderColor: C.border }]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.historyDate, { color: C.text }]}>
                    {fmtDate(r.date)}
                  </Text>
                  <Text style={[styles.historyMeta, { color: C.mutedSoft }]} numberOfLines={1}>
                    {r.arrivalTime || '—'} → {r.departureTime || '—'}
                    {r.workedMinutes != null
                      ? ` · ${formatWorkedMinutes(r.workedMinutes)}`
                      : ''}
                  </Text>
                  {!!r.reason && (
                    <Text style={[styles.historyReason, { color: C.muted }]} numberOfLines={2}>
                      {r.reason}
                    </Text>
                  )}
                </View>
                {cfg && (
                  <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                    <Feather name={cfg.icon} size={11} color={cfg.fg} />
                    <Text style={[styles.statusPillText, { color: cfg.fg }]}>
                      {cfg.label}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function SummaryStat({ label, value, C, tint }) {
  return (
    <View style={[styles.summaryStat, { backgroundColor: C.bg, borderColor: C.border }]}>
      <Text style={[styles.summaryStatValue, { color: tint || C.text }]}>{value}</Text>
      <Text style={[styles.summaryStatLabel, { color: C.mutedSoft }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function CountChip({ label, value, k }) {
  const cfg = STAFF_STATUS_PILL[k];
  return (
    <View style={[styles.countChip, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.countValue, { color: cfg.fg }]}>{value ?? 0}</Text>
      <Text style={[styles.countLabel, { color: cfg.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  fieldInput: { flex: 1, fontSize: 13, fontWeight: '600' },

  rangeRow: { flexDirection: 'row', gap: 8 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summaryStat: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryStatValue: { fontSize: 16, fontWeight: '800' },
  summaryStatLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: 2 },

  countChip: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  countValue: { fontSize: 14, fontWeight: '800' },
  countLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },

  payRow: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  payCell: { flex: 1 },
  payLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  payValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  historyDate: { fontSize: 13, fontWeight: '700' },
  historyMeta: { fontSize: 11, marginTop: 2 },
  historyReason: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: { fontSize: 10, fontWeight: '800' },
});
