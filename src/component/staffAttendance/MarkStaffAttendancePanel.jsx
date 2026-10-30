import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import StaffAttendancePickers from './StaffAttendancePickers';
import {
  useStaffBranchDaily,
  useMarkStaffAttendance,
} from '../../hooks/useStaffAttendance';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import { useUserStore } from '../../store/userStore';
import {
  ALLOWS_TIMES,
  NEEDS_REASON,
  STAFF_ATTENDANCE_STATUSES,
  STAFF_LEAVE_TYPES,
  STAFF_STATUS_PILL,
  todayISO,
  titleCase,
} from '../../constants/staffAttendance';
import { isOnLeave } from '../../utils/leave';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

function StatusButton({ statusKey, active, onPress, disabled }) {
  const cfg = STAFF_STATUS_PILL[statusKey];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.statusBtn,
        active
          ? { backgroundColor: cfg.solid, borderColor: cfg.solid }
          : { backgroundColor: cfg.bg, borderColor: cfg.bg },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Feather name={cfg.icon} size={12} color={active ? '#fff' : cfg.fg} />
      <Text
        style={[
          styles.statusBtnText,
          { color: active ? '#fff' : cfg.fg },
        ]}
      >
        {cfg.label}
      </Text>
    </Pressable>
  );
}

function SummaryStrip({ summary, total, C, counts }) {
  // Prefer live `counts` derived from local entries, fall back to server `summary`.
  const items = [
    { key: 'present', count: counts?.present ?? summary?.present ?? 0 },
    { key: 'absent', count: counts?.absent ?? summary?.absent ?? 0 },
    { key: 'late', count: counts?.late ?? summary?.late ?? 0 },
    { key: 'half-day', count: counts?.['half-day'] ?? summary?.halfDay ?? 0 },
    { key: 'leave', count: counts?.leave ?? summary?.leave ?? 0 },
    { key: 'holiday', count: counts?.holiday ?? summary?.holiday ?? 0 },
  ];
  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: C.card, borderColor: C.border },
      ]}
    >
      <View style={styles.summaryHeader}>
        <Text style={[styles.summaryTitle, { color: C.text }]}>Today's snapshot</Text>
        {summary?.unmarked === 0 ? (
          <View style={[styles.allMarkedBadge, { backgroundColor: '#dcfce7' }]}>
            <Feather name="check-circle" size={11} color="#166534" />
            <Text style={styles.allMarkedText}>All marked</Text>
          </View>
        ) : (
          <View style={[styles.unmarkedBadge, { backgroundColor: '#fef3c7' }]}>
            <Feather name="alert-circle" size={11} color="#92400e" />
            <Text style={styles.unmarkedText}>
              {summary?.unmarked ?? 0} unmarked
            </Text>
          </View>
        )}
      </View>
      <View style={styles.summaryGrid}>
        {items.map((i) => {
          const cfg = STAFF_STATUS_PILL[i.key];
          return (
            <View key={i.key} style={[styles.summaryTile, { backgroundColor: cfg.bg }]}>
              <View style={[styles.summaryIcon, { backgroundColor: cfg.solid }]}>
                <Feather name={cfg.icon} size={11} color="#fff" />
              </View>
              <Text style={[styles.summaryValue, { color: cfg.fg }]}>{i.count}</Text>
              <Text style={[styles.summaryLabel, { color: cfg.fg }]}>{cfg.short}</Text>
            </View>
          );
        })}
        <View
          style={[
            styles.summaryTile,
            { backgroundColor: C.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
          ]}
        >
          <View style={[styles.summaryIcon, { backgroundColor: C.muted }]}>
            <Feather name="users" size={11} color="#fff" />
          </View>
          <Text style={[styles.summaryValue, { color: C.text }]}>{total ?? 0}</Text>
          <Text style={[styles.summaryLabel, { color: C.muted }]}>Total</Text>
        </View>
      </View>
    </View>
  );
}

export default function MarkStaffAttendancePanel() {
  const C = useColors();
  const { user } = useUserStore();

  const actions = user?.role?.actions || [];
  const isAdmin = !!user?.role?.isPredefined;
  const canMark =
    isAdmin ||
    actions.includes('mark-staff-attendance') ||
    actions.includes('mark-all-branch-staff-attendance');
  const isOrgLevel =
    isAdmin ||
    actions.includes('view-all-branch-staff-attendance') ||
    actions.includes('mark-all-branch-staff-attendance');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [draftDate, setDraftDate] = useState(todayISO());
  const [draftBranchId, setDraftBranchId] = useState(isOrgLevel ? '' : userBranchId);
  const [draftStaffType, setDraftStaffType] = useState('');

  const [date, setDate] = useState(todayISO());
  const [branchId, setBranchId] = useState(isOrgLevel ? '' : userBranchId);
  const [staffType, setStaffType] = useState('');

  const applyFilters = () => {
    setDate(draftDate);
    setBranchId(draftBranchId);
    setStaffType(draftStaffType);
  };

  const clearFilters = () => {
    const t = todayISO();
    const bId = isOrgLevel ? '' : userBranchId;
    setDraftDate(t);
    setDraftBranchId(bId);
    setDraftStaffType('');
    setDate(t);
    setBranchId(bId);
    setStaffType('');
  };

  const [entries, setEntries] = useState({});

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];

  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data: dailyData, isFetching: dailyLoading, refetch } = useStaffBranchDaily({
    branchId: effectiveBranchId,
    date,
    staffType,
    enabled: !!effectiveBranchId && !!date,
  });

  const roster = useMemo(() => dailyData?.data?.roster || [], [dailyData]);
  const summary = dailyData?.data?.summary;

  useEffect(() => {
    if (!roster.length) {
      setEntries({});
      return;
    }
    const initial = {};
    roster.forEach((s) => {
      initial[s.staffId] = {
        status: s.attendance?.status || 'present',
        reason: s.attendance?.reason || '',
        leaveType: s.attendance?.leaveType || '',
        isPaid: s.attendance?.isPaid !== false,
        arrivalTime: s.attendance?.arrivalTime || '',
        departureTime: s.attendance?.departureTime || '',
        notes: s.attendance?.notes || '',
        markedId: s.attendance?._id || null,
      };
    });
    setEntries(initial);
  }, [roster]);

  const updateEntry = (staffId, patch) => {
    setEntries((prev) => {
      const cur = prev[staffId] || { status: 'present' };
      const next = { ...cur, ...patch };
      if (patch.status && patch.status !== 'leave') next.leaveType = '';
      if (patch.status && !ALLOWS_TIMES.includes(patch.status)) {
        next.arrivalTime = '';
        next.departureTime = '';
      }
      return { ...prev, [staffId]: next };
    });
  };

  const setAllStatuses = (status) => {
    setEntries((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = {
          ...next[id],
          status,
          ...(status !== 'leave' ? { leaveType: '' } : {}),
          ...(ALLOWS_TIMES.includes(status) ? {} : { arrivalTime: '', departureTime: '' }),
        };
      });
      return next;
    });
  };

  const setUnmarkedTo = (status) => {
    setEntries((prev) => {
      const next = { ...prev };
      roster.forEach((s) => {
        if (!s.attendance) {
          next[s.staffId] = {
            ...next[s.staffId],
            status,
            ...(status !== 'leave' ? { leaveType: '' } : {}),
            ...(ALLOWS_TIMES.includes(status) ? {} : { arrivalTime: '', departureTime: '' }),
          };
        }
      });
      return next;
    });
  };

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, 'half-day': 0, leave: 0, holiday: 0 };
    Object.values(entries).forEach((e) => {
      if (c[e.status] != null) c[e.status] += 1;
    });
    return c;
  }, [entries]);

  const mark = useMarkStaffAttendance();

  const handleSubmit = () => {
    if (!effectiveBranchId || !date) {
      Toast.show({ type: 'error', text1: 'Please pick a branch and date' });
      return;
    }
    if (!roster.length) {
      Toast.show({ type: 'error', text1: 'No staff in roster' });
      return;
    }
    const payloadEntries = [];
    for (const s of roster) {
      const e = entries[s.staffId] || { status: 'present' };
      const entry = { staffId: s.staffId, status: e.status };

      if (e.status === 'leave') {
        if (!e.leaveType) {
          Toast.show({
            type: 'error',
            text1: 'Leave type required',
            text2: `for ${s.name}`,
          });
          return;
        }
        entry.leaveType = e.leaveType;
        entry.isPaid = !!e.isPaid;
      }
      if (ALLOWS_TIMES.includes(e.status)) {
        if (e.arrivalTime) entry.arrivalTime = e.arrivalTime;
        if (e.departureTime) entry.departureTime = e.departureTime;
        if (
          entry.arrivalTime &&
          entry.departureTime &&
          entry.departureTime <= entry.arrivalTime
        ) {
          Toast.show({
            type: 'error',
            text1: 'Invalid times',
            text2: `Departure must be after arrival for ${s.name}`,
          });
          return;
        }
      }
      if (e.reason?.trim()) entry.reason = e.reason.trim();
      if (e.notes?.trim()) entry.notes = e.notes.trim();
      payloadEntries.push(entry);
    }

    mark.mutate({ branchId: effectiveBranchId, date, entries: payloadEntries, roster });
  };

  const allHoliday =
    summary && summary.holiday === summary.totalStaff && summary.totalStaff > 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Pickers */}
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <StaffAttendancePickers
          isOrgLevel={isOrgLevel}
          branches={branches}
          branchId={draftBranchId}
          onBranchId={setDraftBranchId}
          staffType={draftStaffType}
          onStaffType={setDraftStaffType}
          date={draftDate}
          onDate={setDraftDate}
          mode="date"
        />
        <View style={styles.filterBtnRow}>
          <Pressable onPress={applyFilters} style={[styles.filterBtn, styles.filterBtnPrimary]}>
            <Feather name="search" size={14} color="#fff" />
            <Text style={styles.filterBtnPrimaryText}>Apply</Text>
          </Pressable>
          <Pressable
            onPress={clearFilters}
            style={[
              styles.filterBtn,
              styles.filterBtnGhost,
              { backgroundColor: C.bg, borderColor: C.border },
            ]}
          >
            <Feather name="x" size={14} color={C.text} />
            <Text style={[styles.filterBtnGhostText, { color: C.text }]}>Reset</Text>
          </Pressable>
        </View>
      </View>

      {!effectiveBranchId && (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="calendar" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Select a branch to load the staff roster.
          </Text>
        </View>
      )}

      {effectiveBranchId && dailyLoading && (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      )}

      {effectiveBranchId && !dailyLoading && roster.length > 0 && (
        <>
          {allHoliday && (
            <View
              style={[
                styles.notice,
                { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
              ]}
            >
              <Feather name="flag" size={14} color="#374151" />
              <Text style={[styles.noticeText, { color: '#374151' }]}>
                All staff marked <Text style={{ fontWeight: '800' }}>holiday</Text> for {date}.
              </Text>
            </View>
          )}

          <SummaryStrip summary={summary} total={roster.length} C={C} counts={counts} />

          {canMark && (
            <View style={styles.quickRow}>
              <Text style={[styles.quickLabel, { color: C.mutedSoft }]}>
                Quick actions
              </Text>
              <View style={styles.quickBtnRow}>
                <Pressable
                  onPress={() => setAllStatuses('present')}
                  style={[styles.quickBtn, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}
                >
                  <Text style={[styles.quickBtnText, { color: '#166534' }]}>All Present</Text>
                </Pressable>
                <Pressable
                  onPress={() => setUnmarkedTo('present')}
                  style={[styles.quickBtn, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}
                >
                  <Text style={[styles.quickBtnText, { color: '#065f46' }]}>Unmarked → P</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAllStatuses('holiday')}
                  style={[styles.quickBtn, { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' }]}
                >
                  <Text style={[styles.quickBtnText, { color: '#374151' }]}>Holiday Today</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAllStatuses('absent')}
                  style={[styles.quickBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
                >
                  <Text style={[styles.quickBtnText, { color: '#991b1b' }]}>All Absent</Text>
                </Pressable>
              </View>
            </View>
          )}

          {roster.map((s) => {
            const e = entries[s.staffId] || { status: 'present' };
            const allowsTimes = ALLOWS_TIMES.includes(e.status);
            const needsReason = NEEDS_REASON.includes(e.status);
            const isLeave = e.status === 'leave';
            const initial = (s.name?.[0] || '?').toUpperCase();
            return (
              <View
                key={s.staffId}
                style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}
              >
                <View style={styles.rowHeader}>
                  {s.photo ? (
                    <Image source={{ uri: s.photo }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                  )}
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
                  {isOnLeave(s.attendance) && (
                    <View style={styles.onLeaveBadge}>
                      <Feather name="calendar" size={11} color="#1e40af" />
                      <Text style={styles.onLeaveText}>On leave</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statusRow}>
                  {STAFF_ATTENDANCE_STATUSES.map((k) => (
                    <StatusButton
                      key={k}
                      statusKey={k}
                      active={e.status === k}
                      disabled={!canMark}
                      onPress={() => canMark && updateEntry(s.staffId, { status: k })}
                    />
                  ))}
                </View>

                {(allowsTimes || isLeave || needsReason) && (
                  <View style={[styles.detailsBlock, { borderTopColor: C.border }]}>
                    {allowsTimes && (
                      <View style={styles.timeRow}>
                        <View style={[styles.timeBox, { borderColor: C.border, backgroundColor: C.bg }]}>
                          <Feather name="log-in" size={12} color={COLORS.brand} />
                          <TextInput
                            value={e.arrivalTime || ''}
                            onChangeText={(v) => updateEntry(s.staffId, { arrivalTime: v })}
                            placeholder="08:30"
                            placeholderTextColor={C.mutedSoft}
                            editable={canMark}
                            keyboardType="numbers-and-punctuation"
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={[styles.timeInput, { color: C.text }]}
                          />
                        </View>
                        <View style={[styles.timeBox, { borderColor: C.border, backgroundColor: C.bg }]}>
                          <Feather name="log-out" size={12} color={COLORS.brand} />
                          <TextInput
                            value={e.departureTime || ''}
                            onChangeText={(v) => updateEntry(s.staffId, { departureTime: v })}
                            placeholder="16:30"
                            placeholderTextColor={C.mutedSoft}
                            editable={canMark}
                            keyboardType="numbers-and-punctuation"
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={[styles.timeInput, { color: C.text }]}
                          />
                        </View>
                      </View>
                    )}

                    {isLeave && (
                      <View style={styles.leaveBlock}>
                        <Text style={[styles.miniLabel, { color: C.mutedSoft }]}>LEAVE TYPE</Text>
                        <View style={styles.chipRow}>
                          {STAFF_LEAVE_TYPES.map((lt) => {
                            const active = e.leaveType === lt;
                            return (
                              <Pressable
                                key={lt}
                                onPress={() =>
                                  canMark && updateEntry(s.staffId, { leaveType: lt })
                                }
                                disabled={!canMark}
                                style={[
                                  styles.miniChip,
                                  { backgroundColor: C.bg, borderColor: C.border },
                                  active && {
                                    backgroundColor: COLORS.brand,
                                    borderColor: COLORS.brand,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.miniChipText,
                                    { color: active ? '#fff' : C.text },
                                  ]}
                                >
                                  {titleCase(lt)}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <Pressable
                          onPress={() =>
                            canMark && updateEntry(s.staffId, { isPaid: !e.isPaid })
                          }
                          disabled={!canMark}
                          style={[
                            styles.paidToggle,
                            {
                              backgroundColor: e.isPaid ? '#dcfce7' : C.bg,
                              borderColor: e.isPaid ? '#86efac' : C.border,
                            },
                          ]}
                        >
                          <Feather
                            name={e.isPaid ? 'check-square' : 'square'}
                            size={14}
                            color={e.isPaid ? '#166534' : C.mutedSoft}
                          />
                          <Text
                            style={[
                              styles.paidToggleText,
                              { color: e.isPaid ? '#166534' : C.muted },
                            ]}
                          >
                            Paid leave
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {needsReason && (
                      <View>
                        <Text style={[styles.miniLabel, { color: C.mutedSoft }]}>
                          REASON (OPTIONAL)
                        </Text>
                        <TextInput
                          value={e.reason || ''}
                          onChangeText={(v) => updateEntry(s.staffId, { reason: v })}
                          placeholder="e.g. medical, family emergency…"
                          placeholderTextColor={C.mutedSoft}
                          editable={canMark}
                          style={[
                            styles.reasonInput,
                            { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {canMark && (
            <Pressable
              onPress={handleSubmit}
              disabled={mark.isPending}
              style={({ pressed }) => [
                styles.saveBtn,
                (mark.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {mark.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Attendance</Text>
                </>
              )}
            </Pressable>
          )}
        </>
      )}

      {effectiveBranchId && !dailyLoading && roster.length === 0 && (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="users" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No active staff in this branch.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 12 },
  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },

  filterBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
  },
  filterBtnPrimary: { backgroundColor: COLORS.brand },
  filterBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filterBtnGhost: { borderWidth: 1 },
  filterBtnGhostText: { fontWeight: '700', fontSize: 13 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  noticeText: { fontSize: 12 },

  summaryCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { fontSize: 13, fontWeight: '800' },
  allMarkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  allMarkedText: { color: '#166534', fontWeight: '700', fontSize: 10 },
  unmarkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  unmarkedText: { color: '#92400e', fontWeight: '700', fontSize: 10 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summaryTile: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  summaryIcon: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },

  quickRow: { gap: 6 },
  quickLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  quickBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickBtnText: { fontSize: 11, fontWeight: '700' },

  row: { borderRadius: 14, padding: 12, gap: 10, borderWidth: 1 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarImg: { width: 40, height: 40, borderRadius: 999, backgroundColor: '#e5e7eb' },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },

  onLeaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
  },
  onLeaveText: { color: '#1e40af', fontSize: 10, fontWeight: '800' },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBtnText: { fontSize: 11, fontWeight: '700' },

  detailsBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 8,
  },
  timeRow: { flexDirection: 'row', gap: 8 },
  timeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeInput: { flex: 1, fontSize: 12, fontWeight: '700' },

  leaveBlock: { gap: 6 },
  miniLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  miniChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  miniChipText: { fontSize: 11, fontWeight: '600' },
  paidToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  paidToggleText: { fontSize: 11, fontWeight: '700' },

  reasonInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    marginTop: 4,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brand,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
