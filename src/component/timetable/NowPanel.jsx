import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import { useLiveNow } from '../../hooks/useTimetable';
import { DAY_LABELS } from '../../constants/timetable';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function NowPanel() {
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const isOrgLevel = isAdmin || !!user?.role?.actions?.includes('view-all-branch-timetable');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [branchId, setBranchId] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];

  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data: nowRes, isFetching } = useLiveNow({
    branchId: effectiveBranchId || undefined,
    refetchKey: tick,
  });
  const data = nowRes?.data;
  const slots = data?.slots || [];
  // With All branches the branches can be in different periods: `period` is
  // then null and `branches` carries each branch's own period.
  const branchPeriods = data?.branches || [];
  const inSession = !!data?.period || branchPeriods.length > 0;
  const branchName = (id) => branches.find((b) => b._id === id)?.name || 'Branch';

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.banner, { backgroundColor: COLORS.brand + '10', borderColor: COLORS.brand + '40' }]}>
        <View style={styles.clockIcon}>
          <Feather name="clock" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerLabel, { color: COLORS.brand }]}>NOW</Text>
          <Text style={[styles.bannerTime, { color: C.text }]}>
            {data?.now ?? '—'}
            {data?.day ? ` · ${DAY_LABELS[data.day]}` : ''}
          </Text>
          {data?.period ? (
            <Text style={[styles.bannerSub, { color: C.muted }]}>
              {data.period.name} ({data.period.startTime} – {data.period.endTime})
            </Text>
          ) : branchPeriods.length > 0 ? (
            <>
              <Text style={[styles.bannerSub, { color: C.muted }]}>Periods differ by branch</Text>
              {branchPeriods.map((b) => (
                <Text
                  key={String(b.branchId)}
                  style={[styles.bannerBranch, { color: C.mutedSoft }]}
                  numberOfLines={1}
                >
                  {branchName(b.branchId)}: {b.period?.name} ({b.period?.startTime} –{' '}
                  {b.period?.endTime})
                </Text>
              ))}
            </>
          ) : (
            <Text style={[styles.bannerSub, { color: C.muted }]}>No active period</Text>
          )}
        </View>
      </View>

      {isOrgLevel && branches.length > 0 && (
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
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

      {isFetching && slots.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : slots.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="moon" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            {inSession
              ? 'No classes scheduled for this period.'
              : 'School is not in session right now.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.summaryRow, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.summaryText, { color: C.text }]}>
              {slots.length} class{slots.length === 1 ? '' : 'es'} in session
            </Text>
            <Text style={[styles.summarySub, { color: C.mutedSoft }]}>
              Auto-refresh every minute
            </Text>
          </View>

          {slots.map((s) => (
            <View
              key={s._id}
              style={[styles.slotRow, { backgroundColor: C.card, borderColor: C.border }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.slotName, { color: C.text }]} numberOfLines={1}>
                  {s.subject?.name || s.customLabel || '—'}
                </Text>
                <Text style={[styles.slotMeta, { color: C.muted }]} numberOfLines={1}>
                  {s.class?.name || ''}
                  {s.section?.name ? ` · ${s.section.name}` : ''}
                  {'  ·  '}
                  {s.staff?.user?.name || '—'}
                </Text>
              </View>
              {!!s.room && (
                <View style={styles.roomPill}>
                  <Feather name="map-pin" size={11} color="#374151" />
                  <Text style={styles.roomPillText}>{s.room}</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  clockIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  bannerTime: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  bannerSub: { fontSize: 12, marginTop: 2 },
  bannerBranch: { fontSize: 11, marginTop: 1 },

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 8 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },

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

  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },

  summaryRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryText: { fontSize: 13, fontWeight: '800' },
  summarySub: { fontSize: 11, marginTop: 2 },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  slotName: { fontSize: 14, fontWeight: '800' },
  slotMeta: { fontSize: 11, marginTop: 2 },

  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  roomPillText: { color: '#374151', fontWeight: '700', fontSize: 11 },
});
