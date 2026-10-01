import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import { useBranchPayslipSummary } from '../../hooks/useStaffSalary';
import {
  PAYSLIP_STATUS_PILL,
  currentMonth,
  formatMonth,
  formatMoney,
} from '../../constants/staffSalary';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

function KpiCard({ icon, label, value, sub, tone, C }) {
  const tones = {
    teal: { bg: '#ccfbf1', fg: '#0f766e' },
    blue: { bg: '#dbeafe', fg: '#1e40af' },
    green: { bg: '#dcfce7', fg: '#166534' },
    amber: { bg: '#fef3c7', fg: '#92400e' },
  };
  const t = tones[tone] || tones.teal;
  return (
    <View style={[styles.kpi, { backgroundColor: t.bg, borderColor: t.bg }]}>
      <View style={styles.kpiHeader}>
        <Text style={[styles.kpiLabel, { color: t.fg }]}>{label.toUpperCase()}</Text>
        <View style={[styles.kpiIcon, { backgroundColor: '#ffffffaa' }]}>
          <Feather name={icon} size={14} color={t.fg} />
        </View>
      </View>
      <Text style={[styles.kpiValue, { color: C.text }]} numberOfLines={1}>
        {value}
      </Text>
      {!!sub && <Text style={[styles.kpiSub, { color: t.fg }]}>{sub}</Text>}
    </View>
  );
}

function StatusTile({ status, count, icon }) {
  const cfg = PAYSLIP_STATUS_PILL[status];
  return (
    <View style={[styles.statusTile, { borderColor: cfg.bg }]}>
      <View style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
        <Feather name={icon} size={14} color={cfg.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.statusLabel, { color: cfg.fg }]}>{cfg.label}</Text>
        <Text style={styles.statusCount}>{count ?? 0}</Text>
      </View>
    </View>
  );
}

export default function DashboardPanel() {
  const C = useColors();
  const { user } = useUserStore();

  const actions = user?.role?.actions || [];
  const isAdmin = !!user?.role?.isPredefined;
  const isOrgLevel = isAdmin || actions.includes('view-all-branch-payslip');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [branchId, setBranchId] = useState(isOrgLevel ? '' : userBranchId);
  const [month, setMonth] = useState(currentMonth());

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data, isFetching } = useBranchPayslipSummary({
    branchId: effectiveBranchId,
    month,
    enabled: !!effectiveBranchId && !!month,
  });

  const summary = data?.data?.summary ?? data?.summary ?? null;
  const counts = {
    draft: summary?.draft || 0,
    finalized: summary?.finalized || 0,
    'partially-paid': summary?.['partially-paid'] || 0,
    paid: summary?.paid || 0,
    cancelled: summary?.cancelled || 0,
  };
  const total =
    summary?.totalCount ?? Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {isOrgLevel && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: C.muted }]}>BRANCH</Text>
            <View style={styles.chipRow}>
              {branches.map((b) => {
                const active = branchId === b._id;
                return (
                  <Pressable
                    key={b._id}
                    onPress={() => setBranchId(b._id)}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: C.bg, borderColor: C.border },
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: C.text },
                        active && styles.chipTextActive,
                      ]}
                    >
                      {b.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: C.muted }]}>MONTH (YYYY-MM)</Text>
          <View style={[styles.fieldRow, { backgroundColor: C.bg, borderColor: C.border }]}>
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
      </View>

      {!effectiveBranchId && (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="briefcase" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Pick a branch to load the dashboard.
          </Text>
        </View>
      )}

      {effectiveBranchId && isFetching && !summary && (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      )}

      {effectiveBranchId && !isFetching && !summary && (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="inbox" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No data for {formatMonth(month)}.
          </Text>
        </View>
      )}

      {effectiveBranchId && summary && (
        <>
          <View style={styles.kpiGrid}>
            <KpiCard icon="briefcase" label="Gross" value={formatMoney(summary.totalGross || 0)} tone="teal" C={C} />
            <KpiCard icon="trending-up" label="Net (sum)" value={formatMoney(summary.totalNet || 0)} tone="blue" C={C} />
            <KpiCard icon="check-circle" label="Total Paid" value={formatMoney(summary.totalPaid || 0)} tone="green" C={C} />
            <KpiCard icon="file-text" label="Payslips" value={total} sub={formatMonth(month)} tone="amber" C={C} />
          </View>

          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Status Breakdown</Text>
            <View style={styles.statusGrid}>
              <StatusTile status="draft" count={counts.draft} icon="clock" />
              <StatusTile status="finalized" count={counts.finalized} icon="file-text" />
              <StatusTile
                status="partially-paid"
                count={counts['partially-paid']}
                icon="dollar-sign"
              />
              <StatusTile status="paid" count={counts.paid} icon="check-circle" />
              <StatusTile status="cancelled" count={counts.cancelled} icon="x-circle" />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },

  label: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  fieldInput: { flex: 1, fontSize: 14, fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpiLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  kpiIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  kpiSub: { fontSize: 11, fontWeight: '700', opacity: 0.8 },

  sectionTitle: { fontSize: 14, fontWeight: '800' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusTile: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  statusCount: { fontSize: 20, fontWeight: '800' },
});
