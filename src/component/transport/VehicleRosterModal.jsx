import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useVehicleRoster } from '../../hooks/useTransport';
import { ASSIGNMENT_DIRECTION_LABELS } from '../../constants/transport';
import { currentAcademicYear, formatMoney } from '../../constants/fee';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';

export default function VehicleRosterModal({ open, vehicleId, vehicleLabel, onClose }) {
  const { symbol: currencySymbol } = useSchoolCurrency();
  const C = useColors();
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());

  const { data, isLoading, refetch, isFetching } = useVehicleRoster({
    vehicleId,
    academicYear,
    enabled: open && !!vehicleId,
  });
  const roster = data?.data || data;
  const passengers = roster?.passengers || [];

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Vehicle Roster</Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {vehicleLabel || ''}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: C.bg },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <View style={[styles.toolbar, { borderBottomColor: C.border }]}>
          <Text style={[styles.toolbarLabel, { color: C.muted }]}>ACADEMIC YEAR</Text>
          <TextInput
            value={academicYear}
            onChangeText={setAcademicYear}
            placeholder="2025-2026"
            placeholderTextColor={C.mutedSoft}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            onSubmitEditing={refetch}
            style={[styles.toolbarInput, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
          />
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : !roster ? (
          <View style={styles.center}>
            <Text style={[styles.empty, { color: C.muted }]}>No roster data.</Text>
          </View>
        ) : (
          <FlatList
            data={passengers}
            keyExtractor={(it) => it._id}
            contentContainerStyle={styles.listContent}
            refreshing={isFetching}
            onRefresh={refetch}
            ListHeaderComponent={
              <View style={styles.stats}>
                <Stat label="Capacity" value={roster.capacity} C={C} tone="neutral" />
                <Stat label="Occupied" value={roster.occupied} C={C} tone="brand" />
                <Stat
                  label="Available"
                  value={roster.available}
                  C={C}
                  tone={roster.available === 0 ? 'danger' : 'success'}
                />
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="users" size={28} color={C.mutedSoft} />
                <Text style={[styles.emptyText, { color: C.muted }]}>No passengers yet.</Text>
              </View>
            }
            renderItem={({ item: p }) => (
              <View style={[styles.row, { backgroundColor: C.bg, borderColor: C.border }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                    {p.studentId?.userId?.name || '—'}
                  </Text>
                  <Text style={[styles.meta, { color: C.mutedSoft }]} numberOfLines={1}>
                    {p.studentId?.admissionNumber || '—'}
                    {p.stopName ? `  ·  ${p.stopName}` : ''}
                  </Text>
                  <Text style={[styles.meta, { color: C.mutedSoft }]}>
                    {ASSIGNMENT_DIRECTION_LABELS[p.direction] || p.direction}
                  </Text>
                </View>
                <Text style={[styles.fee, { color: COLORS.brand }]}>{formatMoney(p.monthlyFee, currencySymbol)}</Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Stat({ label, value, tone, C }) {
  const tones = {
    neutral: { bg: C.bg, fg: C.text, border: C.border },
    brand: { bg: COLORS.brand + '18', fg: COLORS.brand, border: COLORS.brand + '33' },
    success: { bg: '#dcfce7', fg: '#166534', border: '#86efac' },
    danger: { bg: '#fee2e2', fg: '#991b1b', border: '#fecaca' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <View style={[styles.stat, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.statValue, { color: t.fg }]}>{value ?? 0}</Text>
      <Text style={[styles.statLabel, { color: t.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  toolbarInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },

  listContent: { padding: 14, gap: 8, paddingBottom: 32 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 9, letterSpacing: 1, fontWeight: '700', marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  name: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },
  fee: { fontSize: 13, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { alignItems: 'center', padding: 24, gap: 6 },
  emptyText: { fontSize: 13 },
});
