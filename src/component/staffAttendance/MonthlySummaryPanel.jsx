import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import StaffAttendancePickers from './StaffAttendancePickers';
import { useStaffBranchSummary } from '../../hooks/useStaffAttendance';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import { useUserStore } from '../../store/userStore';
import {
  currentMonth,
  formatWorkedMinutes,
  titleCase,
} from '../../constants/staffAttendance';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';
import { formatMoney } from '../../utils/money';

function pctColor(pct) {
  if (pct == null) return { bg: '#f3f4f6', fg: '#374151' };
  if (pct >= 90) return { bg: '#dcfce7', fg: '#166534' };
  if (pct >= 75) return { bg: '#ccfbf1', fg: '#0f766e' };
  if (pct >= 60) return { bg: '#fef3c7', fg: '#92400e' };
  return { bg: '#fee2e2', fg: '#991b1b' };
}

function StatChip({ label, value, color, bg }) {
  return (
    <View style={[styles.statChip, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value ?? 0}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function MonthlySummaryPanel() {
  const { symbol: currencySymbol } = useSchoolCurrency();
  const C = useColors();
  const { user } = useUserStore();

  const actions = user?.role?.actions || [];
  const isAdmin = !!user?.role?.isPredefined;
  const isOrgLevel = isAdmin || actions.includes('view-all-branch-staff-attendance');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [branchId, setBranchId] = useState(isOrgLevel ? '' : userBranchId);
  const [month, setMonth] = useState(currentMonth());
  const [staffType, setStaffType] = useState('');

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data, isFetching } = useStaffBranchSummary({
    branchId: effectiveBranchId,
    month,
    staffType,
    enabled: !!effectiveBranchId && !!month,
  });

  const staff = data?.data?.staff || [];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <StaffAttendancePickers
          isOrgLevel={isOrgLevel}
          branches={branches}
          branchId={branchId}
          onBranchId={setBranchId}
          staffType={staffType}
          onStaffType={setStaffType}
          month={month}
          onMonth={setMonth}
          mode="month"
        />
      </View>

      {!effectiveBranchId && (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="bar-chart-2" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Pick a branch and month to load the summary.
          </Text>
        </View>
      )}

      {effectiveBranchId && isFetching && (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      )}

      {effectiveBranchId && !isFetching && staff.length === 0 && (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="inbox" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No data for this month.
          </Text>
        </View>
      )}

      {effectiveBranchId &&
        !isFetching &&
        staff.map((s) => {
          const c = pctColor(s.percentage);
          return (
            <View
              key={s.staffId}
              style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}
            >
              <View style={styles.rowHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
                    {s.serialNumber}
                    {s.staffType ? ` · ${titleCase(s.staffType)}` : ''}
                    {s.designation ? ` · ${s.designation}` : ''}
                  </Text>
                </View>
                <View style={[styles.pctBadge, { backgroundColor: c.bg }]}>
                  <Text style={[styles.pctText, { color: c.fg }]}>
                    {s.percentage != null ? `${Number(s.percentage).toFixed(1)}%` : '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <StatChip label="Present" value={s.present} color="#166534" bg="#dcfce7" />
                <StatChip label="Late" value={s.late} color="#92400e" bg="#fef3c7" />
                <StatChip label="Half" value={s.halfDay} color="#9a3412" bg="#ffedd5" />
                <StatChip label="Absent" value={s.absent} color="#991b1b" bg="#fee2e2" />
                <StatChip label="Leave" value={s.leave} color="#1e40af" bg="#dbeafe" />
                <StatChip label="Holiday" value={s.holiday} color="#374151" bg="#e5e7eb" />
              </View>

              <View style={[styles.payRow, { borderTopColor: C.border }]}>
                <View style={styles.payCell}>
                  <Text style={[styles.payLabel, { color: C.mutedSoft }]}>PAID / UNPAID</Text>
                  <Text style={[styles.payValue, { color: C.text }]}>
                    <Text style={{ color: '#166534' }}>{s.paidLeave ?? 0}</Text>
                    <Text style={{ color: C.mutedSoft }}> / </Text>
                    <Text style={{ color: '#991b1b' }}>{s.unpaidLeave ?? 0}</Text>
                  </Text>
                </View>
                <View style={styles.payCell}>
                  <Text style={[styles.payLabel, { color: C.mutedSoft }]}>WORKED</Text>
                  <Text style={[styles.payValue, { color: C.text }]}>
                    {formatWorkedMinutes(s.totalWorkedMinutes)}
                  </Text>
                </View>
                {s.salary != null && (
                  <View style={styles.payCell}>
                    <Text style={[styles.payLabel, { color: C.mutedSoft }]}>SALARY</Text>
                    <Text style={[styles.payValue, { color: C.text }]} numberOfLines={1}>
                      {formatMoney(s.salary, currencySymbol)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 32, gap: 10 },
  card: { borderRadius: 14, padding: 12, borderWidth: 1 },
  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },

  row: { borderRadius: 14, padding: 12, gap: 10, borderWidth: 1 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },

  pctBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pctText: { fontSize: 12, fontWeight: '800' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statChip: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 14, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },

  payRow: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  payCell: { flex: 1 },
  payLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  payValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
