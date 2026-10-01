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
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useClassesForFee,
  useCollectionReport,
  useDefaultersReport,
  useOutstandingReport,
  useSectionsForFee,
} from '../../hooks/useFees';
import {
  PAYMENT_METHOD_PILL,
  currentAcademicYear,
  formatDate,
  formatMoney,
  todayYMD,
  titleCase,
} from '../../constants/fee';
import { hasAnyAction } from '../../utils/permissions';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import ReportPager from '../ReportPager';

const REPORT_PAGE_SIZE = 100;

function CollectionReport({ C }) {
  const { user } = useUserStore();
  const isAdmin = !!user?.role?.isPredefined;
  const isOrgLevel = isAdmin || !!user?.role?.actions?.includes('view-all-branch-payment');

  const [from, setFrom] = useState(todayYMD());
  const [to, setTo] = useState(todayYMD());
  const [branchId, setBranchId] = useState('');

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];

  const { data, isFetching } = useCollectionReport({
    branchId: isOrgLevel ? branchId || undefined : undefined,
    from,
    to,
  });
  const report = data?.data;

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.filterCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.muted }]}>FROM</Text>
            <TextInput
              value={from}
              onChangeText={setFrom}
              placeholder="2026-06-01"
              placeholderTextColor={C.mutedSoft}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              style={[
                styles.input,
                { color: C.text, borderColor: C.border, backgroundColor: C.bg },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.muted }]}>TO</Text>
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="2026-06-30"
              placeholderTextColor={C.mutedSoft}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              style={[
                styles.input,
                { color: C.text, borderColor: C.border, backgroundColor: C.bg },
              ]}
            />
          </View>
        </View>
        {isOrgLevel && branches.length > 0 && (
          <View>
            <Text style={[styles.label, { color: C.muted }]}>BRANCH</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setBranchId('')}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !branchId && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: C.text }, !branchId && styles.chipTextActive]}
                >
                  All
                </Text>
              </Pressable>
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
                      style={[styles.chipText, { color: C.text }, active && styles.chipTextActive]}
                    >
                      {b.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {isFetching && !report ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : !report ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="trending-up" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Pick a date range to see collection totals.
          </Text>
        </View>
      ) : (
        <>
          <View
            style={[
              styles.kpi,
              { backgroundColor: COLORS.brand + '10', borderColor: COLORS.brand + '40' },
            ]}
          >
            <View>
              <Text style={[styles.kpiLabel, { color: COLORS.brand }]}>GRAND TOTAL</Text>
              <Text style={[styles.kpiValue, { color: COLORS.brand }]}>
                {formatMoney(report.grandTotal)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.kpiLabel, { color: C.muted }]}>RECEIPTS</Text>
              <Text style={[styles.kpiValue, { color: C.text }]}>{report.totalCount ?? 0}</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.section, { color: C.muted }]}>BY METHOD</Text>
            {(report.byMethod || []).length === 0 ? (
              <Text style={[styles.emptyInline, { color: C.mutedSoft }]}>
                No payments in this range.
              </Text>
            ) : (
              (report.byMethod || []).map((m) => {
                const cfg = PAYMENT_METHOD_PILL[m._id] || PAYMENT_METHOD_PILL.other;
                return (
                  <View key={m._id} style={styles.methodRow}>
                    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.pillText, { color: cfg.fg }]}>
                        {PAYMENT_METHOD_PILL[m._id]?.label || titleCase(m._id)}
                      </Text>
                    </View>
                    <Text style={[styles.methodCount, { color: C.mutedSoft }]}>
                      {m.count} receipt{m.count === 1 ? '' : 's'}
                    </Text>
                    <Text style={[styles.methodAmount, { color: C.text }]}>
                      {formatMoney(m.total)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}
    </View>
  );
}

function OutstandingReport({ C }) {
  const router = useRouter();
  const { user } = useUserStore();
  const isAdmin = !!user?.role?.isPredefined;
  const isOrgLevel = isAdmin || !!user?.role?.actions?.includes('view-all-branch-fee');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [branchId, setBranchId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [page, setPage] = useState(1);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data: classData } = useClassesForFee({
    branchId: effectiveBranchId || undefined,
    academicYear,
    enabled: !!academicYear,
  });
  const classes = classData?.data || [];

  const { data: sectionData } = useSectionsForFee({
    classId,
    enabled: !!classId,
  });
  const sections = sectionData?.data || [];

  const { data, isFetching } = useOutstandingReport({
    branchId: effectiveBranchId || undefined,
    classId,
    sectionId,
    page,
    limit: REPORT_PAGE_SIZE,
  });
  // { grandTotal, studentCount, page, limit, truncated, students: [flat rows] }
  const report = data?.data;
  const rows = report?.students || [];

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.filterCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View>
          <Text style={[styles.label, { color: C.muted }]}>ACADEMIC YEAR</Text>
          <TextInput
            value={academicYear}
            onChangeText={setAcademicYear}
            placeholder="2025-2026"
            placeholderTextColor={C.mutedSoft}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
          />
        </View>
        {isOrgLevel && branches.length > 0 && (
          <View>
            <Text style={[styles.label, { color: C.muted }]}>BRANCH</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => {
                  setBranchId('');
                  setPage(1);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !branchId && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: C.text }, !branchId && styles.chipTextActive]}
                >
                  All
                </Text>
              </Pressable>
              {branches.map((b) => (
                <Pressable
                  key={b._id}
                  onPress={() => {
                    setBranchId(b._id);
                    setPage(1);
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    branchId === b._id && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      branchId === b._id && styles.chipTextActive,
                    ]}
                  >
                    {b.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {classes.length > 0 && (
          <View>
            <Text style={[styles.label, { color: C.muted }]}>CLASS</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => {
                  setClassId('');
                  setSectionId('');
                  setPage(1);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !classId && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: C.text }, !classId && styles.chipTextActive]}
                >
                  All
                </Text>
              </Pressable>
              {classes.map((c) => (
                <Pressable
                  key={c._id}
                  onPress={() => {
                    setClassId(c._id);
                    setSectionId('');
                    setPage(1);
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    classId === c._id && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      classId === c._id && styles.chipTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {!!classId && sections.length > 0 && (
          <View>
            <Text style={[styles.label, { color: C.muted }]}>SECTION</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => {
                  setSectionId('');
                  setPage(1);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !sectionId && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: C.text }, !sectionId && styles.chipTextActive]}
                >
                  All
                </Text>
              </Pressable>
              {sections.map((s) => (
                <Pressable
                  key={s._id}
                  onPress={() => {
                    setSectionId(s._id);
                    setPage(1);
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    sectionId === s._id && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      sectionId === s._id && styles.chipTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {isFetching && rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="check-circle" size={28} color="#16a34a" />
          <Text style={[styles.emptyText, { color: C.muted }]}>No outstanding vouchers.</Text>
        </View>
      ) : (
        <>
          <View style={[styles.kpi, { backgroundColor: '#991b1b10', borderColor: '#991b1b40' }]}>
            <View>
              <Text style={[styles.kpiLabel, { color: '#991b1b' }]}>OUTSTANDING</Text>
              <Text style={[styles.kpiValue, { color: '#991b1b' }]}>
                {formatMoney(report?.grandTotal)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.kpiLabel, { color: C.muted }]}>STUDENTS</Text>
              <Text style={[styles.kpiValue, { color: C.text }]}>
                {report?.studentCount ?? rows.length}
              </Text>
            </View>
          </View>
          <ReportPager
            page={report?.page || page}
            limit={report?.limit || REPORT_PAGE_SIZE}
            shown={rows.length}
            total={report?.studentCount}
            truncated={report?.truncated}
            onPage={setPage}
            noun="students"
            C={C}
          />
          {rows.map((r) => (
            <Pressable
              key={r.studentId}
              onPress={() => router.push(`/(app)/fees/consolidated/${r.studentId}`)}
              style={({ pressed }) => [
                styles.outRow,
                { backgroundColor: C.card, borderColor: C.border },
                pressed && { opacity: 0.92 },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.outName, { color: C.text }]} numberOfLines={1}>
                  {r.name || '—'}
                </Text>
                <Text style={[styles.outMeta, { color: C.muted }]} numberOfLines={1}>
                  {r.admissionNumber || '—'}
                  {r.rollNumber ? ` · Roll ${r.rollNumber}` : ''}
                </Text>
                <Text style={[styles.outMeta, { color: C.mutedSoft }]}>
                  {r.voucherCount} voucher{r.voucherCount === 1 ? '' : 's'}
                  {r.oldestDueDate ? `  ·  oldest due ${formatDate(r.oldestDueDate)}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.outAmount, { color: '#991b1b' }]}>
                  {formatMoney(r.outstandingTotal)}
                </Text>
                <Feather name="chevron-right" size={16} color={C.mutedSoft} />
              </View>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

function DefaultersReport({ C }) {
  const router = useRouter();
  const { user } = useUserStore();
  const canView = hasAnyAction(user?.role, [
    'student-defaults-list-view',
    'student-defaults-list-view-all-branch',
  ]);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayYMD());
  const [minOutstanding, setMinOutstanding] = useState('');
  const [page, setPage] = useState(1);

  const { data, isFetching } = useDefaultersReport({
    from,
    to,
    minOutstanding: minOutstanding || undefined,
    page,
    limit: REPORT_PAGE_SIZE,
    enabled: canView,
  });
  // { period, filters, totals, byBranch, page, limit, truncated, rows: [flat rows] }
  const report = data?.data;
  const rows = report?.rows || [];

  if (!canView) {
    return (
      <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border, margin: 14 }]}>
        <Feather name="lock" size={28} color={COLORS.red} />
        <Text style={[styles.emptyText, { color: C.muted }]}>
          You don't have permission to view the defaulters report.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.filterCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.muted }]}>FROM *</Text>
            <TextInput
              value={from}
              onChangeText={(v) => {
                setFrom(v);
                setPage(1);
              }}
              placeholder="2026-04-01"
              placeholderTextColor={C.mutedSoft}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              style={[
                styles.input,
                { color: C.text, borderColor: C.border, backgroundColor: C.bg },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.muted }]}>TO *</Text>
            <TextInput
              value={to}
              onChangeText={(v) => {
                setTo(v);
                setPage(1);
              }}
              placeholder="2026-06-30"
              placeholderTextColor={C.mutedSoft}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              style={[
                styles.input,
                { color: C.text, borderColor: C.border, backgroundColor: C.bg },
              ]}
            />
          </View>
        </View>
        <View>
          <Text style={[styles.label, { color: C.muted }]}>MIN OUTSTANDING</Text>
          <TextInput
            value={minOutstanding}
            onChangeText={(v) => {
              setMinOutstanding(v.replace(/[^0-9.]/g, ''));
              setPage(1);
            }}
            keyboardType="decimal-pad"
            placeholder="e.g. 5000"
            placeholderTextColor={C.mutedSoft}
            style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
          />
        </View>
      </View>

      {isFetching && rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="check-circle" size={28} color="#16a34a" />
          <Text style={[styles.emptyText, { color: C.muted }]}>No defaulters in this range.</Text>
        </View>
      ) : (
        <>
          <ReportPager
            page={report?.page || page}
            limit={report?.limit || REPORT_PAGE_SIZE}
            shown={rows.length}
            total={report?.totals?.studentCount}
            truncated={report?.truncated}
            onPage={setPage}
            noun="students"
            C={C}
          />
          {rows.map((r) => (
            <Pressable
              key={r.studentId}
              onPress={() => router.push(`/(app)/fees/consolidated/${r.studentId}`)}
              style={({ pressed }) => [
                styles.outRow,
                { backgroundColor: C.card, borderColor: C.border },
                pressed && { opacity: 0.92 },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.outName, { color: C.text }]} numberOfLines={1}>
                  {r.studentName || '—'}
                </Text>
                <Text style={[styles.outMeta, { color: C.muted }]} numberOfLines={1}>
                  {r.admissionNumber || '—'}
                  {r.className ? ` · ${r.className}` : ''}
                  {r.sectionName ? ` ${r.sectionName}` : ''}
                </Text>
                {r.totalMonthsUnpaid ? (
                  <Text style={[styles.outMeta, { color: C.mutedSoft }]}>
                    {r.totalMonthsUnpaid} month{r.totalMonthsUnpaid === 1 ? '' : 's'} unpaid
                    {r.oldestDueDate ? `  ·  oldest due ${formatDate(r.oldestDueDate)}` : ''}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.outAmount, { color: '#991b1b' }]}>
                  {formatMoney(r.closingBalance)}
                </Text>
                <Feather name="chevron-right" size={16} color={C.mutedSoft} />
              </View>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

export default function ReportsPanel() {
  const C = useColors();
  const [tab, setTab] = useState('collection');

  const TABS = [
    { key: 'collection', label: 'Collection', icon: 'trending-up' },
    { key: 'outstanding', label: 'Outstanding', icon: 'trending-down' },
    { key: 'defaulters', label: 'Defaulters', icon: 'user-x' },
  ];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.subTabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={({ pressed }) => [
                styles.subTab,
                { backgroundColor: C.card, borderColor: C.border },
                active && styles.subTabActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name={t.icon} size={14} color={active ? '#fff' : C.muted} />
              <Text style={[styles.subTabLabel, { color: active ? '#fff' : C.text }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'collection' && <CollectionReport C={C} />}
      {tab === 'outstanding' && <OutstandingReport C={C} />}
      {tab === 'defaulters' && <DefaultersReport C={C} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  subTabs: { flexDirection: 'row', gap: 6 },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
  },
  subTabActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  subTabLabel: { fontSize: 12, fontWeight: '700' },

  filterCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 4 },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row2: { flexDirection: 'row', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },
  emptyInline: { fontSize: 12, textAlign: 'center', paddingVertical: 8 },

  kpi: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  kpiValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 8 },
  section: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },

  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },
  methodCount: { flex: 1, fontSize: 11 },
  methodAmount: { fontSize: 14, fontWeight: '800' },

  outRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  outName: { fontSize: 14, fontWeight: '700' },
  outMeta: { fontSize: 11, marginTop: 2 },
  outAmount: { fontSize: 14, fontWeight: '800' },
});
