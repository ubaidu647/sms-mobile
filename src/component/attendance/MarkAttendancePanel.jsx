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
import AttendancePickers from './AttendancePickers';
import { useSectionDaily, useMarkAttendance } from '../../hooks/useAttendance';
import {
  ATTENDANCE_STATUSES,
  STATUS_PILL,
  currentAcademicYear,
  todayISO,
} from '../../constants/attendance';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

function StatusButton({ statusKey, active, onPress }) {
  const c = STATUS_PILL[statusKey];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusBtn,
        active
          ? { backgroundColor: c.solid, borderColor: c.solid }
          : { backgroundColor: c.bg, borderColor: c.bg },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Feather name={c.icon} size={13} color={active ? '#fff' : c.fg} />
      <Text style={[styles.statusBtnText, { color: active ? '#fff' : c.fg }]}>{c.label}</Text>
    </Pressable>
  );
}

function SummaryStrip({ summary, total, C }) {
  if (!summary) return null;
  const items = [
    { key: 'present', count: summary.present },
    { key: 'absent', count: summary.absent },
    { key: 'late', count: summary.late },
    { key: 'half-day', count: summary.halfDay },
    { key: 'leave', count: summary.leave },
  ];
  return (
    <View style={[styles.summaryCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.summaryHeader}>
        <Text style={[styles.summaryTitle, { color: C.text }]}>Today's snapshot</Text>
        {summary.unmarked === 0 ? (
          <View style={[styles.allMarkedBadge, { backgroundColor: '#dcfce7' }]}>
            <Feather name="check-circle" size={11} color="#166534" />
            <Text style={styles.allMarkedText}>All marked</Text>
          </View>
        ) : (
          <View style={[styles.unmarkedBadge, { backgroundColor: '#fef3c7' }]}>
            <Feather name="alert-circle" size={11} color="#92400e" />
            <Text style={styles.unmarkedText}>{summary.unmarked} unmarked</Text>
          </View>
        )}
      </View>
      <View style={styles.summaryGrid}>
        {items.map((i) => {
          const c = STATUS_PILL[i.key];
          return (
            <View key={i.key} style={[styles.summaryTile, { backgroundColor: c.bg }]}>
              <View style={[styles.summaryIcon, { backgroundColor: c.solid }]}>
                <Feather name={c.icon} size={12} color="#fff" />
              </View>
              <Text style={[styles.summaryValue, { color: c.fg }]}>{i.count ?? 0}</Text>
              <Text style={[styles.summaryLabel, { color: c.fg }]}>{c.label}</Text>
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
            <Feather name="users" size={12} color="#fff" />
          </View>
          <Text style={[styles.summaryValue, { color: C.text }]}>{total ?? 0}</Text>
          <Text style={[styles.summaryLabel, { color: C.muted }]}>Total</Text>
        </View>
      </View>
    </View>
  );
}

export default function MarkAttendancePanel({ canMark }) {
  const C = useColors();

  const [branchId, setBranchId] = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(todayISO());

  const { data, isLoading, refetch } = useSectionDaily({
    classId,
    sectionId,
    date,
  });

  const daily = data?.data;
  const roster = daily?.roster || [];

  const [edits, setEdits] = useState({});

  useEffect(() => {
    if (!roster.length) {
      setEdits({});
      return;
    }
    const seed = {};
    for (const r of roster) {
      const a = r.attendance;
      seed[r.studentId] = {
        status: a?.status || '',
        reason: a?.reason || '',
        arrivalTime: a?.arrivalTime || '',
        departureTime: a?.departureTime || '',
        notes: a?.notes || '',
      };
    }
    setEdits(seed);
  }, [data]);

  const setRow = (id, patch) => setEdits((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }));

  const setAll = (status) => {
    const next = { ...edits };
    for (const r of roster) {
      next[r.studentId] = { ...(next[r.studentId] || {}), status };
    }
    setEdits(next);
  };

  const save = useMarkAttendance({ onSuccess: () => refetch() });

  const handleSave = () => {
    const entries = roster
      .map((r) => {
        const e = edits[r.studentId];
        if (!e?.status) return null;
        const entry = { studentId: r.studentId, status: e.status };
        if (e.reason) entry.reason = e.reason;
        if (e.notes) entry.notes = e.notes;
        if (e.status === 'late' && e.arrivalTime) entry.arrivalTime = e.arrivalTime;
        if (e.status === 'half-day' && e.departureTime) entry.departureTime = e.departureTime;
        return entry;
      })
      .filter(Boolean);
    if (entries.length === 0) return;
    save.mutate({ classId, sectionId, date, academicYear, entries });
  };

  const canSave = canMark && roster.length > 0 && classId && sectionId && date;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <AttendancePickers
        markableOnly
        branchId={branchId}
        setBranchId={setBranchId}
        academicYear={academicYear}
        setAcademicYear={setAcademicYear}
        classId={classId}
        setClassId={setClassId}
        sectionId={sectionId}
        setSectionId={setSectionId}
        extraSlot={
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: C.muted }]}>DATE</Text>
            <View style={styles.dateRow}>
              <Feather name="calendar" size={14} color={C.muted} />
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.mutedSoft}
                style={[styles.dateInput, { color: C.text }]}
              />
            </View>
          </View>
        }
      />

      {!classId || !sectionId ? (
        <EmptyState icon="users" text="Pick a class and section to load the roster." C={C} />
      ) : isLoading ? (
        <LoadingState />
      ) : roster.length === 0 ? (
        <EmptyState icon="inbox" text="No students enrolled in this section." C={C} />
      ) : (
        <>
          <SummaryStrip summary={daily?.summary} total={daily?.totalStudents} C={C} />

          {canMark && (
            <View style={styles.bulkRow}>
              <BulkBtn
                icon="check-circle"
                label="All Present"
                color="#10b981"
                onPress={() => setAll('present')}
              />
              <BulkBtn
                icon="x-circle"
                label="All Absent"
                color="#ef4444"
                onPress={() => setAll('absent')}
              />
              <BulkBtn
                icon="sun"
                label="Holiday"
                color="#06b6d4"
                onPress={() => setAll('holiday')}
              />
            </View>
          )}

          {roster.map((r, idx) => {
            const e = edits[r.studentId] || {};
            const status = e.status;
            const c = status ? STATUS_PILL[status] : null;
            const initial = (r.name?.[0] || '?').toUpperCase();
            return (
              <View
                key={r.studentId}
                style={[
                  styles.row,
                  { backgroundColor: C.card, borderColor: C.border },
                  status && { borderLeftWidth: 4, borderLeftColor: c.solid },
                ]}
              >
                <View style={styles.rowTop}>
                  {r.photo ? (
                    <Image source={{ uri: r.photo }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={[styles.meta, { color: C.mutedSoft }]}>
                      #{idx + 1} · Roll {r.rollNumber || '—'}
                    </Text>
                  </View>
                  {!!status && (
                    <View style={[styles.currentPill, { backgroundColor: c.bg }]}>
                      <Feather name={c.icon} size={11} color={c.fg} />
                      <Text style={[styles.currentPillText, { color: c.fg }]}>{c.label}</Text>
                    </View>
                  )}
                </View>

                {!canMark ? null : (
                  <View style={styles.statusGrid}>
                    {ATTENDANCE_STATUSES.map((s) => (
                      <StatusButton
                        key={s}
                        statusKey={s}
                        active={status === s}
                        onPress={() => setRow(r.studentId, { status: s })}
                      />
                    ))}
                  </View>
                )}

                {canMark && status === 'late' && (
                  <DetailField
                    icon="clock"
                    label="Arrival time"
                    value={e.arrivalTime}
                    placeholder="HH:MM"
                    onChange={(v) => setRow(r.studentId, { arrivalTime: v })}
                    C={C}
                  />
                )}
                {canMark && status === 'half-day' && (
                  <DetailField
                    icon="log-out"
                    label="Departure time"
                    value={e.departureTime}
                    placeholder="HH:MM"
                    onChange={(v) => setRow(r.studentId, { departureTime: v })}
                    C={C}
                  />
                )}
                {canMark && ['absent', 'leave', 'half-day', 'late'].includes(status) && (
                  <DetailField
                    icon="message-square"
                    label="Reason"
                    value={e.reason}
                    placeholder="e.g. Sick"
                    onChange={(v) => setRow(r.studentId, { reason: v })}
                    C={C}
                  />
                )}
              </View>
            );
          })}

          {canMark && (
            <Pressable
              onPress={handleSave}
              disabled={!canSave || save.isPending}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.9 },
                (!canSave || save.isPending) && { opacity: 0.6 },
              ]}
            >
              {save.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.saveText}>Save Attendance</Text>
                </>
              )}
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

function BulkBtn({ icon, label, color, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.bulkBtn,
        { backgroundColor: color },
        pressed && { opacity: 0.9 },
      ]}
    >
      <Feather name={icon} size={14} color="#fff" />
      <Text style={styles.bulkText}>{label}</Text>
    </Pressable>
  );
}

function DetailField({ icon, label, value, onChange, placeholder, C }) {
  return (
    <View style={[styles.detailBox, { borderColor: C.border, backgroundColor: C.bg }]}>
      <Feather name={icon} size={13} color={C.muted} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.detailLabel, { color: C.muted }]}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.mutedSoft}
          style={[styles.detailInput, { color: C.text }]}
        />
      </View>
    </View>
  );
}

function EmptyState({ icon, text, C }) {
  return (
    <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
      <Feather name={icon} size={32} color={C.mutedSoft} />
      <Text style={[styles.emptyText, { color: C.muted }]}>{text}</Text>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator size="large" color={COLORS.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: '#e5e7eb',
  },
  dateInput: { flex: 1, fontSize: 14 },

  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  summaryCard: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { fontSize: 14, fontWeight: '800' },
  allMarkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  allMarkedText: { fontSize: 11, fontWeight: '800', color: '#166534' },
  unmarkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  unmarkedText: { fontSize: 11, fontWeight: '800', color: '#92400e' },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryTile: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 78,
    padding: 10,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 4,
  },
  summaryIcon: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  bulkRow: { flexDirection: 'row', gap: 8 },
  bulkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
  },
  bulkText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  row: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarImg: { width: 42, height: 42, borderRadius: 999 },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },

  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentPillText: { fontSize: 11, fontWeight: '800' },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBtn: {
    flexBasis: '31%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBtnText: { fontSize: 12, fontWeight: '800' },

  detailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  detailInput: { fontSize: 13, padding: 0, paddingVertical: 0 },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
