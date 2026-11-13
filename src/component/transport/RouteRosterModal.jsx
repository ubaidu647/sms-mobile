import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouteRoster } from '../../hooks/useTransport';
import {
  ASSIGNMENT_DIRECTION_LABELS,
} from '../../constants/transport';
import { currentAcademicYear, formatMoney } from '../../constants/fee';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';

export default function RouteRosterModal({ open, routeId, routeLabel, onClose }) {
  const { symbol: currencySymbol } = useSchoolCurrency();
  const C = useColors();
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());

  const { data, isLoading, refetch, isFetching } = useRouteRoster({
    routeId,
    academicYear,
    enabled: open && !!routeId,
  });
  const roster = data?.data || data;
  const stops = roster?.stops || [];

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
            <Text style={[styles.title, { color: C.text }]}>Route Roster</Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {routeLabel || ''}
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
          <Text style={[styles.total, { color: COLORS.brand }]}>
            {roster?.totalStudents ?? 0} total
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : !roster ? (
          <View style={styles.center}>
            <Text style={[styles.empty, { color: C.muted }]}>No roster data.</Text>
          </View>
        ) : stops.length === 0 ? (
          <View style={styles.center}>
            <Feather name="users" size={32} color={C.mutedSoft} />
            <Text style={[styles.empty, { color: C.muted, textAlign: 'center' }]}>
              No assigned students yet for this academic year.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scroll}
            refreshing={isFetching}
            onRefresh={refetch}
            showsVerticalScrollIndicator={false}
          >
            {stops.map((s) => (
              <View key={s.stopName} style={[styles.stopBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                <View style={[styles.stopHeader, { borderBottomColor: C.border }]}>
                  <Text style={[styles.stopName, { color: C.text }]} numberOfLines={1}>
                    {s.stopName}
                  </Text>
                  <Text style={[styles.stopCount, { color: COLORS.brand }]}>
                    {s.count} student{s.count === 1 ? '' : 's'}
                  </Text>
                </View>
                {(s.students || []).map((p) => (
                  <View key={p.assignmentId} style={[styles.studentRow, { borderTopColor: C.border }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.studentName, { color: C.text }]} numberOfLines={1}>
                        {p.name || '—'}
                      </Text>
                      <Text style={[styles.studentMeta, { color: C.mutedSoft }]} numberOfLines={1}>
                        {p.admissionNumber || '—'}
                        {p.rollNumber ? `  ·  Roll ${p.rollNumber}` : ''}
                        {`  ·  ${ASSIGNMENT_DIRECTION_LABELS[p.direction] || p.direction}`}
                      </Text>
                    </View>
                    <Text style={[styles.fee, { color: COLORS.brand }]}>
                      {formatMoney(p.monthlyFee, currencySymbol)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
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
  total: { fontSize: 11, fontWeight: '800' },

  scroll: { padding: 14, gap: 10, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  empty: { fontSize: 13 },

  stopBox: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stopName: { fontSize: 13, fontWeight: '800', flex: 1, paddingRight: 8 },
  stopCount: { fontSize: 11, fontWeight: '800' },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  studentName: { fontSize: 13, fontWeight: '700' },
  studentMeta: { fontSize: 11, marginTop: 2 },
  fee: { fontSize: 13, fontWeight: '800' },
});
