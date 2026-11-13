import { useState } from 'react';
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
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import { useFreeTeachers } from '../../hooks/useTimetable';
import {
  DAYS,
  DAY_LABELS,
  currentAcademicYear,
} from '../../constants/timetable';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function FreeTeachersPanel() {
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const isOrgLevel = isAdmin || !!user?.role?.actions?.includes('view-all-branch-timetable');

  const [day, setDay] = useState('mon');
  const [periodNumber, setPeriodNumber] = useState('1');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [branchId, setBranchId] = useState('');
  const [touched, setTouched] = useState(false);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];

  const { data: freeRes, isFetching } = useFreeTeachers({
    day,
    periodNumber: Number(periodNumber) || 0,
    academicYear,
    branchId: isOrgLevel ? branchId || undefined : undefined,
    enabled: touched,
  });
  const teachers = freeRes?.data?.teachers || [];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View>
          <Text style={[styles.label, { color: C.muted }]}>DAY</Text>
          <View style={styles.chipRow}>
            {DAYS.map((d) => {
              const active = day === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDay(d)}
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
                    {DAY_LABELS[d]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.muted }]}>PERIOD #</Text>
            <TextInput
              value={periodNumber}
              onChangeText={(v) => setPeriodNumber(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={C.mutedSoft}
              style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
            />
          </View>
          <View style={{ flex: 1.5 }}>
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
                  style={[
                    styles.chipText,
                    { color: C.text },
                    !branchId && styles.chipTextActive,
                  ]}
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

        <Pressable
          onPress={() => setTouched(true)}
          style={({ pressed }) => [
            styles.primary,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Feather name="search" size={14} color="#fff" />
          <Text style={styles.primaryText}>Find</Text>
        </Pressable>
      </View>

      {!touched ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="user-check" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Pick a day and period, then hit Find.
          </Text>
        </View>
      ) : isFetching ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : teachers.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="users" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            No teachers free at this time.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.summary, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="user-check" size={14} color={COLORS.brand} />
            <Text style={[styles.summaryText, { color: C.text }]}>
              {teachers.length} free on {DAY_LABELS[day]}, period {periodNumber}
            </Text>
          </View>

          {teachers.map((t) => {
            const name = t.name || t.user?.name || '?';
            const initials =
              name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0]?.toUpperCase())
                .join('') || '?';
            return (
              <View
                key={t._id}
                style={[styles.teacherRow, { backgroundColor: C.card, borderColor: C.border }]}
              >
                {t.photo ? (
                  <Image source={{ uri: t.photo }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.teacherName, { color: C.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[styles.teacherMeta, { color: C.muted }]} numberOfLines={1}>
                    {t.designation || '—'}
                    {t.serialNumber ? ` · ${t.serialNumber}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 4 },
  input: {
    height: 42,
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
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryText: { fontSize: 13, fontWeight: '700' },

  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  teacherName: { fontSize: 14, fontWeight: '800' },
  teacherMeta: { fontSize: 11, marginTop: 2 },
});
