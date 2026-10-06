import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { hasAnyAction } from '../../utils/permissions';
import ReportPager from '../ReportPager';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import { useDefaultersReport } from '../../hooks/useFees';
import { useClassesForFee, useSectionsForFee } from '../../hooks/useFees';
import { formatDate, formatMoney, formatMonth, todayYMD } from '../../constants/fee';

const REPORT_PAGE_SIZE = 100;

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function DefaultersReportPanel() {
  const C = useColors();
  const router = useRouter();
  const { user } = useUserStore();
  const role = user?.role;
  const canRun =
    role?.isPredefined ||
    hasAnyAction(role, ['student-defaults-list-view', 'student-defaults-list-view-all-branch']);
  const canPickBranches =
    role?.isPredefined || hasAnyAction(role, ['student-defaults-list-view-all-branch']);

  const [draftFrom, setDraftFrom] = useState(firstOfMonth());
  const [draftTo, setDraftTo] = useState(todayYMD());
  const [draftBranchIds, setDraftBranchIds] = useState([]);
  const [draftClassId, setDraftClassId] = useState('');
  const [draftSectionId, setDraftSectionId] = useState('');
  const [draftMinOutstanding, setDraftMinOutstanding] = useState('');
  const [draftIncludeDetails, setDraftIncludeDetails] = useState(false);

  const [applied, setApplied] = useState(null);
  const [filterError, setFilterError] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: branchData } = useBranchesDropdown({ enabled: canPickBranches });
  const branches = branchData?.data || [];

  const classBranchFilter =
    canPickBranches && draftBranchIds.length === 1 ? draftBranchIds[0] : undefined;
  const { data: classesData } = useClassesForFee({ branchId: classBranchFilter });
  const classes = classesData?.data || [];
  const { data: sectionsData } = useSectionsForFee({ classId: draftClassId });
  const sections = sectionsData?.data || [];

  const {
    data: reportEnvelope,
    isFetching,
    refetch,
  } = useDefaultersReport({
    branchIds: applied?.branchIds,
    classId: applied?.classId,
    sectionId: applied?.sectionId,
    from: applied?.from,
    to: applied?.to,
    minOutstanding: applied?.minOutstanding,
    includeDetails: applied?.includeDetails,
    page,
    limit: REPORT_PAGE_SIZE,
    enabled: !!applied,
  });

  const report = reportEnvelope?.data;
  const rows = report?.rows || [];
  const byBranch = report?.byBranch || [];
  const totals = report?.totals;

  // A page past the end (e.g. the last defaulters just paid) steps back.
  useEffect(() => {
    if (!isFetching && report && rows.length === 0 && page > 1) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [isFetching, report, rows.length, page]);

  const generate = () => {
    setFilterError('');
    if (!draftFrom || !draftTo) {
      setFilterError('Both From and To dates are required');
      return;
    }
    if (draftFrom > draftTo) {
      setFilterError('From date must be before To date');
      return;
    }
    const minNum = draftMinOutstanding ? Number(draftMinOutstanding) : 0;
    if (draftMinOutstanding && (Number.isNaN(minNum) || minNum < 0)) {
      setFilterError('Minimum outstanding must be a non-negative number');
      return;
    }
    setExpanded(new Set());
    setPage(1);
    setApplied({
      from: draftFrom,
      to: draftTo,
      branchIds: canPickBranches ? draftBranchIds : [],
      classId: draftClassId,
      sectionId: draftSectionId,
      minOutstanding: minNum,
      includeDetails: draftIncludeDetails,
    });
    setFiltersOpen(false);
  };

  const clearAll = () => {
    setDraftFrom(firstOfMonth());
    setDraftTo(todayYMD());
    setDraftBranchIds([]);
    setDraftClassId('');
    setDraftSectionId('');
    setDraftMinOutstanding('');
    setDraftIncludeDetails(false);
    setApplied(null);
    setPage(1);
    setExpanded(new Set());
    setFilterError('');
  };

  const toggleBranch = (id) =>
    setDraftBranchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleExpand = (studentId) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

  const fileBase = useMemo(() => {
    if (!report) return 'Fee-Defaulters';
    return `Fee-Defaulters-${report.period?.from?.slice(0, 10)}_to_${report.period?.to?.slice(0, 10)}`;
  }, [report]);

  const handleShareCsv = async () => {
    if (!report) return;
    const lines = [];
    lines.push(['Student Fee Defaulters Statement']);
    lines.push([`Period: ${formatDate(report.period.from)} to ${formatDate(report.period.to)}`]);
    lines.push([`Branches: ${(totals?.branchesCovered || []).join(', ') || 'All'}`]);
    if (report.truncated || (report.page || 1) > 1) {
      const start = ((report.page || 1) - 1) * (report.limit || rows.length) + 1;
      lines.push([
        `Rows ${start}-${start + rows.length - 1} of ${totals?.studentCount ?? rows.length} (one page; totals cover all)`,
      ]);
    }
    lines.push([]);
    lines.push([
      'S/N',
      'Adm #',
      'Roll #',
      'Student',
      'Father',
      'Father Phone',
      'Class',
      'Section',
      'Branch',
      'Opening Months',
      'Opening',
      'Current Months',
      'Current',
      'Total Months',
      'Closing',
      'Oldest Due',
    ]);
    rows.forEach((r) => {
      lines.push([
        r.serialNumber,
        r.admissionNumber,
        r.rollNumber,
        r.studentName,
        r.fatherName || '',
        r.fatherPhone || '',
        r.className,
        r.sectionName,
        r.branchName,
        r.openingMonthsCount,
        r.openingBalance,
        r.currentPeriodMonthsCount,
        r.currentPeriodOutstanding,
        r.totalMonthsUnpaid,
        r.closingBalance,
        formatDate(r.oldestDueDate),
      ]);
    });
    if (totals) {
      lines.push([]);
      lines.push([
        '',
        '',
        '',
        'GRAND TOTAL',
        '',
        '',
        '',
        '',
        '',
        '',
        totals.openingTotal,
        '',
        totals.currentPeriodTotal,
        '',
        totals.closingTotal,
        '',
      ]);
    }
    if (byBranch.length > 1) {
      lines.push([]);
      lines.push(['Branch Totals']);
      lines.push(['Branch', 'Students', 'Opening', 'Current', 'Closing']);
      byBranch.forEach((b) => {
        lines.push([
          b.branchName,
          b.studentCount,
          b.openingTotal,
          b.currentPeriodTotal,
          b.closingTotal,
        ]);
      });
    }
    const csv = lines
      .map((row) =>
        row
          .map((cell) => {
            const v = cell == null ? '' : String(cell);
            return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(','),
      )
      .join('\n');
    try {
      await Share.share({ message: csv, title: fileBase });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Share failed', text2: e?.message || '' });
    }
  };

  const activeFiltersSummary = useMemo(() => {
    const parts = [];
    if (applied?.from && applied?.to) parts.push(`${applied.from} → ${applied.to}`);
    if (applied?.branchIds?.length === 1) {
      const b = branches.find((br) => br._id === applied.branchIds[0]);
      parts.push(b?.name || '1 branch');
    } else if (applied?.branchIds?.length) {
      parts.push(`${applied.branchIds.length} branches`);
    }
    if (applied?.classId) {
      const c = classes.find((cc) => cc._id === applied.classId);
      if (c) parts.push(c.name);
    }
    if (applied?.minOutstanding) parts.push(`≥ ${applied.minOutstanding}`);
    if (applied?.includeDetails) parts.push('w/ details');
    return parts.join(' · ');
  }, [applied, branches, classes]);

  if (!canRun) {
    return (
      <View style={styles.center}>
        <Feather name="lock" size={36} color={COLORS.red || '#dc2626'} />
        <Text style={[styles.lockTitle, { color: C.text }]}>No access</Text>
        <Text style={[styles.lockSub, { color: C.muted, textAlign: 'center' }]}>
          You don't have permission to view this report.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.toolbar, { borderBottomColor: C.border }]}>
        <Pressable
          onPress={() => setFiltersOpen(true)}
          style={({ pressed }) => [
            styles.toolbarBtn,
            { backgroundColor: C.card, borderColor: C.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="filter" size={14} color={C.text} />
          <Text style={[styles.toolbarText, { color: C.text }]}>Filters</Text>
        </Pressable>
        {applied && (
          <Text style={[styles.appliedText, { color: C.mutedSoft }]} numberOfLines={1}>
            {activeFiltersSummary}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        {report && rows.length > 0 && (
          <Pressable
            onPress={handleShareCsv}
            style={({ pressed }) => [
              styles.shareBtn,
              { backgroundColor: C.card, borderColor: '#34d399' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="share-2" size={13} color="#059669" />
            <Text style={[styles.shareText, { color: '#059669' }]}>CSV</Text>
          </Pressable>
        )}
      </View>

      {!applied ? (
        <View style={styles.empty}>
          <Feather name="trending-down" size={36} color="#ef4444" />
          <Text style={[styles.emptyTitle, { color: C.text }]}>Defaulters Statement</Text>
          <Text style={[styles.emptySub, { color: C.muted, textAlign: 'center' }]}>
            Pick a date range and tap Generate to view the defaulters statement.
          </Text>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [styles.primaryCta, pressed && { opacity: 0.85 }]}
          >
            <Feather name="filter" size={14} color="#fff" />
            <Text style={styles.primaryCtaText}>Configure & Generate</Text>
          </Pressable>
        </View>
      ) : isFetching && !report ? (
        <View style={styles.empty}>
          <ActivityIndicator color={COLORS.brand} />
        </View>
      ) : report && rows.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="check-circle" size={36} color="#10b981" />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No outstanding fees</Text>
          <Text style={[styles.emptySub, { color: C.muted, textAlign: 'center' }]}>
            Nothing to recover in this window. Try widening the date range.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.studentId}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              <Header report={report} totals={totals} byBranch={byBranch} rows={rows} C={C} />
              <ReportPager
                page={report?.page || page}
                limit={report?.limit || REPORT_PAGE_SIZE}
                shown={rows.length}
                total={totals?.studentCount}
                truncated={report?.truncated}
                onPage={(p) => {
                  setExpanded(new Set());
                  setPage(p);
                }}
                noun="students"
                C={C}
              />
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={COLORS.brand} />
          }
          renderItem={({ item: r }) => (
            <DefaulterCard
              r={r}
              isOpen={expanded.has(r.studentId)}
              showDetails={applied?.includeDetails}
              onToggle={() => toggleExpand(r.studentId)}
              onOpenSlip={() => router.push(`/(app)/fees/consolidated/${r.studentId}`)}
              C={C}
            />
          )}
        />
      )}

      <FiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        canPickBranches={canPickBranches}
        branches={branches}
        classes={classes}
        sections={sections}
        draftFrom={draftFrom}
        setDraftFrom={setDraftFrom}
        draftTo={draftTo}
        setDraftTo={setDraftTo}
        draftBranchIds={draftBranchIds}
        toggleBranch={toggleBranch}
        clearBranches={() => setDraftBranchIds([])}
        draftClassId={draftClassId}
        setDraftClassId={(v) => {
          setDraftClassId(v);
          setDraftSectionId('');
        }}
        draftSectionId={draftSectionId}
        setDraftSectionId={setDraftSectionId}
        draftMinOutstanding={draftMinOutstanding}
        setDraftMinOutstanding={setDraftMinOutstanding}
        draftIncludeDetails={draftIncludeDetails}
        setDraftIncludeDetails={setDraftIncludeDetails}
        filterError={filterError}
        onGenerate={generate}
        onClear={clearAll}
        loading={isFetching}
        C={C}
      />
    </View>
  );
}

function Header({ report, totals, byBranch, rows, C }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: C.mutedSoft }]}>STATEMENT</Text>
            <Text style={[styles.cardTitle, { color: C.text }]}>Student Fee Defaulters</Text>
            <Text style={[styles.period, { color: C.muted }]}>
              {formatDate(report.period.from)} → {formatDate(report.period.to)}
            </Text>
            {totals?.branchesCovered?.length > 0 && (
              <Text style={[styles.branchList, { color: C.mutedSoft }]} numberOfLines={2}>
                Branches: {totals.branchesCovered.join(', ')}
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.eyebrow, { color: C.mutedSoft }]}>STUDENTS</Text>
            <Text style={[styles.bigCount, { color: C.text }]}>
              {totals?.studentCount ?? rows.length}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Opening" value={totals?.openingTotal} tone="amber" />
          <SummaryCard label="Current" value={totals?.currentPeriodTotal} tone="blue" />
          <SummaryCard label="Closing" value={totals?.closingTotal} tone="red" />
        </View>
      </View>

      {byBranch.length > 1 && (
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.muted }]}>BRANCH SUMMARY</Text>
          {byBranch.map((b) => (
            <View key={b.branchId} style={[styles.branchRow, { borderBottomColor: C.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.branchName, { color: C.text }]} numberOfLines={1}>
                  {b.branchName}
                </Text>
                <Text style={[styles.branchMeta, { color: C.mutedSoft }]}>
                  {b.studentCount} student{b.studentCount === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.branchClosing, { color: '#dc2626' }]}>
                  {formatMoney(b.closingTotal)}
                </Text>
                <Text style={[styles.branchBreakdown, { color: C.mutedSoft }]}>
                  open {formatMoney(b.openingTotal)} · cur {formatMoney(b.currentPeriodTotal)}
                </Text>
              </View>
            </View>
          ))}
          <View style={[styles.branchTotalRow, { backgroundColor: C.bg }]}>
            <Text style={[styles.branchTotalLabel, { color: C.text }]}>TOTAL</Text>
            <Text style={[styles.branchClosing, { color: '#dc2626' }]}>
              {formatMoney(totals?.closingTotal)}
            </Text>
          </View>
        </View>
      )}

      <Text style={[styles.listLabel, { color: C.muted }]}>
        DEFAULTER LIST · {rows.length}
        {totals?.studentCount > rows.length ? ` of ${totals.studentCount}` : ''}
      </Text>
    </View>
  );
}

function SummaryCard({ label, value, tone }) {
  const tones = {
    amber: ['#f59e0b', '#d97706'],
    blue: ['#3b82f6', '#2563eb'],
    red: ['#ef4444', '#dc2626'],
  };
  const [bg, bg2] = tones[tone] || tones.amber;
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg2 }]}>
      <Text style={styles.summaryLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.summaryValue}>{formatMoney(value)}</Text>
    </View>
  );
}

function DefaulterCard({ r, isOpen, showDetails, onToggle, onOpenSlip, C }) {
  return (
    <View style={[styles.studentCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.studentTop}>
        <View style={[styles.avatar, { backgroundColor: C.bg }]}>
          <Text style={[styles.avatarText, { color: C.muted }]}>
            {(r.studentName?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.studentName, { color: C.text }]} numberOfLines={1}>
            {r.studentName}
          </Text>
          <Text style={[styles.studentMeta, { color: C.mutedSoft }]} numberOfLines={1}>
            {r.admissionNumber}
            {r.rollNumber ? `  ·  Roll ${r.rollNumber}` : ''}
          </Text>
          <Text style={[styles.studentMeta, { color: C.mutedSoft }]} numberOfLines={1}>
            {r.className}
            {r.sectionName ? ` · ${r.sectionName}` : ''}
            {r.branchName ? `  ·  ${r.branchName}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={onOpenSlip}
          hitSlop={6}
          style={({ pressed }) => [
            styles.slipBtn,
            { backgroundColor: COLORS.brand + '18', borderColor: COLORS.brand + '33' },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="eye" size={13} color={COLORS.brand} />
          <Text style={[styles.slipText, { color: COLORS.brand }]}>Slip</Text>
        </Pressable>
      </View>

      {!!r.fatherName && (
        <View style={[styles.fatherRow, { borderTopColor: C.border }]}>
          <Feather name="user" size={11} color={C.mutedSoft} />
          <Text style={[styles.fatherText, { color: C.muted }]} numberOfLines={1}>
            {r.fatherName}
            {r.fatherPhone ? `  ·  ${r.fatherPhone}` : ''}
          </Text>
        </View>
      )}

      <View style={[styles.balanceGrid, { borderTopColor: C.border }]}>
        <Bal
          label="Opening"
          amount={r.openingBalance}
          months={r.openingMonthsCount}
          tone="#d97706"
          C={C}
        />
        <Bal
          label="Current"
          amount={r.currentPeriodOutstanding}
          months={r.currentPeriodMonthsCount}
          tone="#2563eb"
          C={C}
        />
        <Bal
          label="Closing"
          amount={r.closingBalance}
          months={r.totalMonthsUnpaid}
          tone="#dc2626"
          C={C}
          big
        />
      </View>

      <View style={[styles.dueRow, { borderTopColor: C.border }]}>
        <Feather name="calendar" size={11} color={C.mutedSoft} />
        <Text style={[styles.dueText, { color: C.muted }]}>
          Oldest due: {formatDate(r.oldestDueDate)}
        </Text>
      </View>

      {showDetails && (
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.detailsToggle,
            { borderTopColor: C.border },
            pressed && { backgroundColor: C.bg },
          ]}
        >
          <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={C.muted} />
          <Text style={[styles.detailsToggleText, { color: C.muted }]}>
            {isOpen ? 'Hide voucher details' : 'Show voucher details'}
          </Text>
        </Pressable>
      )}

      {showDetails && isOpen && (
        <View style={[styles.vouchersBlock, { backgroundColor: C.bg, borderTopColor: C.border }]}>
          {(r.vouchers || []).length === 0 ? (
            <Text style={[styles.emptyVouchers, { color: C.mutedSoft }]}>
              No voucher details available.
            </Text>
          ) : (
            r.vouchers.map((v) => (
              <View
                key={v._id}
                style={[styles.voucherRow, { backgroundColor: C.card, borderColor: C.border }]}
              >
                <View style={styles.voucherTopRow}>
                  <View
                    style={[
                      styles.bucketPill,
                      {
                        backgroundColor: v.bucket === 'opening' ? '#fef3c7' : '#dbeafe',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bucketPillText,
                        { color: v.bucket === 'opening' ? '#92400e' : '#1e40af' },
                      ]}
                    >
                      {(v.bucket || '').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.voucherNo, { color: C.text }]} numberOfLines={1}>
                    {v.voucherNumber}
                  </Text>
                </View>
                <View style={styles.voucherDetail}>
                  <Text style={[styles.voucherSmall, { color: C.muted }]}>
                    {formatMonth(v.month)} · Due {formatDate(v.dueDate)}
                  </Text>
                </View>
                <View style={styles.voucherAmounts}>
                  <Text style={[styles.voucherAmt, { color: C.muted }]}>
                    Total {formatMoney(v.totalAmount)}
                  </Text>
                  <Text style={[styles.voucherAmt, { color: '#059669' }]}>
                    Paid {formatMoney(v.paidAmount)}
                  </Text>
                  <Text style={[styles.voucherAmt, { color: '#dc2626', fontWeight: '800' }]}>
                    {formatMoney(v.balanceAmount)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

function Bal({ label, amount, months, tone, big, C }) {
  return (
    <View
      style={[styles.balCell, big && { borderLeftWidth: 3, borderLeftColor: tone, paddingLeft: 8 }]}
    >
      <Text style={[styles.balLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.balValue, { color: tone, fontSize: big ? 15 : 13 }]}>
        {formatMoney(amount)}
      </Text>
      {months != null && (
        <Text style={[styles.balMonths, { color: C.mutedSoft }]}>{months} mo</Text>
      )}
    </View>
  );
}

function FiltersModal({
  open,
  onClose,
  canPickBranches,
  branches,
  classes,
  sections,
  draftFrom,
  setDraftFrom,
  draftTo,
  setDraftTo,
  draftBranchIds,
  toggleBranch,
  clearBranches,
  draftClassId,
  setDraftClassId,
  draftSectionId,
  setDraftSectionId,
  draftMinOutstanding,
  setDraftMinOutstanding,
  draftIncludeDetails,
  setDraftIncludeDetails,
  filterError,
  onGenerate,
  onClear,
  loading,
  C,
}) {
  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalSafe, { backgroundColor: C.bg }]}>
        <View
          style={[styles.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}
        >
          <Text style={[styles.modalTitle, { color: C.text }]}>Defaulters Filters</Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.modalClose,
              { backgroundColor: C.bg },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="x" size={18} color={C.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {!!filterError && (
            <View style={styles.errorBox}>
              <Feather name="alert-triangle" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{filterError}</Text>
            </View>
          )}

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fLabel, { color: C.muted }]}>FROM *</Text>
              <TextInput
                value={draftFrom}
                onChangeText={setDraftFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.card },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fLabel, { color: C.muted }]}>TO *</Text>
              <TextInput
                value={draftTo}
                onChangeText={setDraftTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.card },
                ]}
              />
            </View>
          </View>

          {canPickBranches && (
            <View>
              <View style={styles.branchHeader}>
                <Text style={[styles.fLabel, { color: C.muted }]}>BRANCHES</Text>
                {draftBranchIds.length > 0 && (
                  <Pressable onPress={clearBranches} hitSlop={6}>
                    <Text style={[styles.clearLink, { color: C.muted }]}>Clear</Text>
                  </Pressable>
                )}
              </View>
              {branches.length === 0 ? (
                <Text style={[styles.helper, { color: C.mutedSoft }]}>No branches available.</Text>
              ) : (
                <View style={styles.chipRow}>
                  {branches.map((b) => {
                    const active = draftBranchIds.includes(b._id);
                    return (
                      <Pressable
                        key={b._id}
                        onPress={() => toggleBranch(b._id)}
                        style={({ pressed }) => [
                          styles.fchip,
                          { backgroundColor: C.card, borderColor: C.border },
                          active && styles.fchipActive,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Feather
                          name={active ? 'check' : 'circle'}
                          size={10}
                          color={active ? '#fff' : C.mutedSoft}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.fchipText,
                            { color: C.text },
                            active && styles.fchipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {b.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <ChipGroup
            label="CLASS"
            options={[
              { value: '', label: 'All Classes' },
              ...classes.map((c) => ({
                value: c._id,
                label: c.grade ? `${c.name} (Gr ${c.grade})` : c.name,
              })),
            ]}
            value={draftClassId}
            onChange={setDraftClassId}
            C={C}
          />

          <ChipGroup
            label="SECTION"
            options={[
              { value: '', label: draftClassId ? 'All Sections' : 'Pick class first' },
              ...sections.map((s) => ({ value: s._id, label: s.name })),
            ]}
            value={draftSectionId}
            onChange={setDraftSectionId}
            C={C}
          />

          <View>
            <Text style={[styles.fLabel, { color: C.muted }]}>MIN OUTSTANDING (₨)</Text>
            <TextInput
              value={draftMinOutstanding}
              onChangeText={setDraftMinOutstanding}
              placeholder="0"
              placeholderTextColor={C.mutedSoft}
              keyboardType="number-pad"
              style={[
                styles.input,
                { color: C.text, borderColor: C.border, backgroundColor: C.card },
              ]}
            />
          </View>

          <View style={[styles.toggleRow, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: C.text }]}>Show per-voucher details</Text>
              <Text style={[styles.toggleSub, { color: C.mutedSoft }]}>
                Heavier query — fetches each opening/current voucher.
              </Text>
            </View>
            <Switch
              value={draftIncludeDetails}
              onValueChange={setDraftIncludeDetails}
              trackColor={{ true: COLORS.brand, false: '#cbd5e1' }}
              thumbColor="#fff"
            />
          </View>
        </ScrollView>

        <View style={[styles.modalFooter, { backgroundColor: C.card, borderTopColor: C.border }]}>
          <Pressable
            onPress={onClear}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: C.bg, borderColor: C.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.secondaryText, { color: C.text }]}>Reset</Text>
          </Pressable>
          <Pressable
            onPress={onGenerate}
            disabled={loading}
            style={({ pressed }) => [styles.primaryBtn, (loading || pressed) && { opacity: 0.85 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="search" size={15} color="#fff" />
                <Text style={styles.primaryText}>Generate</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ChipGroup({ label, options, value, onChange, C }) {
  return (
    <View>
      <Text style={[styles.fLabel, { color: C.muted }]}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value || '__all__'}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => [
                styles.fchip,
                { backgroundColor: C.card, borderColor: C.border },
                active && styles.fchipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[styles.fchipText, { color: C.text }, active && styles.fchipTextActive]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  toolbarText: { fontSize: 12, fontWeight: '700' },
  appliedText: { fontSize: 11, fontWeight: '600', flex: 1 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  shareText: { fontSize: 11, fontWeight: '800' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  emptySub: { fontSize: 13 },
  primaryCta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.brand,
    borderRadius: 999,
  },
  primaryCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  lockTitle: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  lockSub: { fontSize: 13 },

  listContent: { padding: 12, gap: 10, paddingBottom: 32 },

  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  eyebrow: { fontSize: 9, letterSpacing: 1.5, fontWeight: '800' },
  cardTitle: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  period: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  branchList: { fontSize: 11, marginTop: 4 },
  bigCount: { fontSize: 30, fontWeight: '800', marginTop: 2 },

  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  summaryCard: { flex: 1, padding: 10, borderRadius: 10 },
  summaryLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  summaryValue: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 4 },

  sectionTitle: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginBottom: 8 },
  branchRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  branchName: { fontSize: 13, fontWeight: '700' },
  branchMeta: { fontSize: 11, marginTop: 2 },
  branchClosing: { fontSize: 14, fontWeight: '800' },
  branchBreakdown: { fontSize: 10, marginTop: 2 },
  branchTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  branchTotalLabel: { fontSize: 12, fontWeight: '800' },

  listLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginTop: 4, marginBottom: 2 },

  studentCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  studentTop: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800' },
  studentName: { fontSize: 14, fontWeight: '800' },
  studentMeta: { fontSize: 11, marginTop: 2 },
  slipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  slipText: { fontSize: 11, fontWeight: '800' },

  fatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fatherText: { fontSize: 11, fontWeight: '600' },

  balanceGrid: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  balCell: { flex: 1 },
  balLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  balValue: { fontWeight: '800', marginTop: 3 },
  balMonths: { fontSize: 10, marginTop: 2 },

  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dueText: { fontSize: 11 },

  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailsToggleText: { fontSize: 12, fontWeight: '700' },

  vouchersBlock: { padding: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  voucherRow: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  voucherTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bucketPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  bucketPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  voucherNo: { fontSize: 11, fontWeight: '700', flex: 1 },
  voucherDetail: { marginTop: 6 },
  voucherSmall: { fontSize: 11 },
  voucherAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  voucherAmt: { fontSize: 11, fontWeight: '600' },
  emptyVouchers: { fontSize: 12, padding: 8 },

  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', flex: 1 },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    alignItems: 'center',
  },
  errorText: { color: '#991b1b', fontSize: 12, fontWeight: '700', flex: 1 },

  fLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginBottom: 6 },
  helper: { fontSize: 12 },

  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row2: { flexDirection: 'row', gap: 10 },

  branchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearLink: { fontSize: 11, fontWeight: '700' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fchip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 260,
  },
  fchipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  fchipText: { fontSize: 12, fontWeight: '600' },
  fchipTextActive: { color: '#fff' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 13, fontWeight: '700' },
  toggleSub: { fontSize: 11, marginTop: 2 },

  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.brand,
    height: 44,
    borderRadius: 10,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryText: { fontWeight: '700', fontSize: 13 },
});
