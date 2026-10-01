import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouteDetail, useVehicleDetail } from '../../hooks/useTransport';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import QueryErrorState from '../QueryErrorState';
import { formatMoney } from '../../constants/fee';

const PIN_COLORS = [
  '#10b981',
  '#0d9488',
  '#059669',
  '#2563eb',
  '#0891b2',
  '#4f46e5',
  '#9333ea',
  '#f43f5e',
];

export default function RouteDetailModal({ open, routeId, onClose }) {
  const C = useColors();
  const { data: route, isLoading, isError, error } = useRouteDetail({ id: routeId, enabled: open && !!routeId });

  const populated = route?.vehicleId && typeof route.vehicleId === 'object' ? route.vehicleId : null;
  const vId = populated?._id || (typeof route?.vehicleId === 'string' ? route.vehicleId : '');
  const needFull = !!vId && (!populated || !populated.driver || !populated.manufactureYear);
  const { data: full } = useVehicleDetail({ id: vId, enabled: open && needFull });
  const vehicle = full || populated;

  const stops = [...(route?.stops || [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const perStopDistance = stops.length ? Number(route?.distanceKm || 0) / stops.length : 0;

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
            <Text style={[styles.title, { color: C.text }]}>Route Detail</Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {route?.name || ''}
              {route?.code ? `  ·  ${route.code}` : ''}
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

        {isError ? (
          <QueryErrorState error={error} fallback="Could not load this route" />
        ) : isLoading || !route ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              <View style={styles.vehicleHeader}>
                <View style={[styles.vehicleIcon, { backgroundColor: '#fef3c7' }]}>
                  <Feather name="truck" size={24} color="#d97706" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.regText, { color: C.text }]} numberOfLines={1}>
                    {vehicle?.registrationNumber || 'No vehicle assigned'}
                  </Text>
                  <Text style={[styles.modelText, { color: C.mutedSoft }]} numberOfLines={1}>
                    {vehicle ? [vehicle.make, vehicle.modelName].filter(Boolean).join(' ') || vehicle.vehicleType : '—'}
                    {vehicle?.manufactureYear ? `  ·  ${vehicle.manufactureYear}` : ''}
                  </Text>
                </View>
              </View>
              {vehicle?.driver && (
                <View style={[styles.driverBlock, { borderTopColor: C.border }]}>
                  <View style={styles.kv}>
                    <Text style={[styles.kvKey, { color: C.muted }]}>Driver</Text>
                    <Text style={[styles.kvVal, { color: C.text }]} numberOfLines={1}>
                      {vehicle.driver.name || '—'}
                    </Text>
                  </View>
                  <View style={styles.kv}>
                    <Text style={[styles.kvKey, { color: C.muted }]}>Phone</Text>
                    <Text style={[styles.kvVal, { color: C.text }]} numberOfLines={1}>
                      {vehicle.driver.phone || '—'}
                    </Text>
                  </View>
                  <View style={styles.kv}>
                    <Text style={[styles.kvKey, { color: C.muted }]}>License</Text>
                    <Text style={[styles.kvVal, { color: C.text }]} numberOfLines={1}>
                      {vehicle.driver.licenseNumber || '—'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              <View style={styles.kv}>
                <Text style={[styles.kvKey, { color: C.muted }]}>Path</Text>
                <Text style={[styles.kvVal, { color: C.text }]} numberOfLines={2}>
                  {route.startPoint}  →  {route.endPoint}
                </Text>
              </View>
              <View style={styles.kv}>
                <Text style={[styles.kvKey, { color: C.muted }]}>Base Fee</Text>
                <Text style={[styles.kvVal, { color: COLORS.brand }]}>
                  {formatMoney(route.baseFee)}
                </Text>
              </View>
              {route.distanceKm != null && (
                <View style={styles.kv}>
                  <Text style={[styles.kvKey, { color: C.muted }]}>Distance</Text>
                  <Text style={[styles.kvVal, { color: C.text }]}>{route.distanceKm} km</Text>
                </View>
              )}
              {route.estimatedDurationMin != null && (
                <View style={styles.kv}>
                  <Text style={[styles.kvKey, { color: C.muted }]}>Est. Duration</Text>
                  <Text style={[styles.kvVal, { color: C.text }]}>
                    {route.estimatedDurationMin} min
                  </Text>
                </View>
              )}
              <View style={styles.kv}>
                <Text style={[styles.kvKey, { color: C.muted }]}>Stops</Text>
                <Text style={[styles.kvVal, { color: C.text }]}>{stops.length}</Text>
              </View>
              {route.activeAssignments != null && (
                <View style={styles.kv}>
                  <Text style={[styles.kvKey, { color: C.muted }]}>Active Assignments</Text>
                  <Text style={[styles.kvVal, { color: C.text }]}>{route.activeAssignments}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionLabel, { color: C.muted }]}>STOP SEQUENCE</Text>
            {stops.length === 0 ? (
              <View style={styles.emptyStops}>
                <Text style={[styles.empty, { color: C.muted }]}>No stops defined.</Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {stops.map((s, i) => {
                  const color = PIN_COLORS[i % PIN_COLORS.length];
                  const distance = Number(s.distanceKm ?? perStopDistance).toFixed(1);
                  return (
                    <View key={s._id || i} style={styles.stopRow}>
                      <View style={styles.timelineCol}>
                        <View style={[styles.dot, { backgroundColor: color }]}>
                          <Text style={styles.dotText}>{s.sequence}</Text>
                        </View>
                        {i < stops.length - 1 && <View style={[styles.line, { backgroundColor: C.border }]} />}
                      </View>
                      <View
                        style={[
                          styles.stopBox,
                          { backgroundColor: C.bg, borderColor: C.border, borderLeftColor: color },
                        ]}
                      >
                        <Text style={[styles.stopName, { color: C.text }]} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <View style={styles.stopMetaRow}>
                          <Feather name="clock" size={11} color={C.mutedSoft} />
                          <Text style={[styles.stopMeta, { color: C.muted }]}>
                            Pickup {s.pickupTime || '—'}  ·  Drop {s.dropTime || '—'}
                          </Text>
                        </View>
                        <View style={styles.stopMetaRow}>
                          <Feather name="navigation" size={11} color={C.mutedSoft} />
                          <Text style={[styles.stopMeta, { color: C.muted }]}>
                            {distance} km from start
                            {s.fee != null ? `  ·  ${formatMoney(s.fee)} fee` : ''}
                          </Text>
                        </View>
                        {!!s.landmark && (
                          <View style={styles.stopMetaRow}>
                            <Feather name="map-pin" size={11} color={C.mutedSoft} />
                            <Text style={[styles.stopMeta, { color: C.muted }]} numberOfLines={1}>
                              {s.landmark}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {!!route.notes && (
              <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
                <Text style={[styles.sectionLabel, { color: C.muted, marginBottom: 6 }]}>NOTES</Text>
                <Text style={[styles.notesText, { color: C.text }]}>{route.notes}</Text>
              </View>
            )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 14, gap: 12, paddingBottom: 32 },

  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regText: { fontSize: 15, fontWeight: '800' },
  modelText: { fontSize: 12, marginTop: 2 },
  driverBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },

  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  kvKey: { fontSize: 12 },
  kvVal: { fontSize: 12, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  sectionLabel: { fontSize: 11, letterSpacing: 1.1, fontWeight: '800' },
  emptyStops: { padding: 24, alignItems: 'center' },
  empty: { fontSize: 13 },

  timeline: { gap: 0 },
  stopRow: { flexDirection: 'row', gap: 10 },
  timelineCol: { alignItems: 'center', width: 26 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  line: { width: 2, flex: 1, marginVertical: 2 },
  stopBox: {
    flex: 1,
    marginBottom: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 10,
  },
  stopName: { fontSize: 13, fontWeight: '800' },
  stopMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  stopMeta: { fontSize: 11 },

  notesText: { fontSize: 13, lineHeight: 18 },
});
