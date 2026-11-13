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
import { useFeeStructureDetail } from '../../hooks/useFees';
import { MONTH_OPTIONS, formatMoney, titleCase } from '../../constants/fee';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';

const monthLabel = (m) => MONTH_OPTIONS.find((x) => x.value === Number(m))?.label || '—';

// Read-only detail of a fee structure. Mirrors the web StructureDetailModal.
export default function StructureDetailModal({ open, structure, onClose }) {
  const { symbol: currencySymbol } = useSchoolCurrency();
  const C = useColors();

  const id = structure?._id;
  const { data: detail, isLoading } = useFeeStructureDetail({ id, enabled: open && !!id });

  const s = detail || structure || null;
  // List rows populate `s.class`; the detail endpoint populates `s.classId`.
  const cls = s?.classId || s?.class || null;
  const components = s?.components || [];

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
            <Text style={[styles.title, { color: C.text }]}>Fee Structure</Text>
            {!!s?.name && (
              <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
                {s.name}
              </Text>
            )}
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

        {isLoading && !detail ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : !s ? (
          <View style={styles.center}>
            <Feather name="alert-circle" size={32} color={COLORS.red || '#dc2626'} />
            <Text style={[styles.subtitle, { color: C.muted }]}>Structure not found</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              <View style={styles.grid}>
                <Info
                  label="Class"
                  value={`${cls?.name ?? '—'}${cls?.grade ? ` (Gr ${cls.grade})` : ''}`}
                  C={C}
                />
                <Info label="Year" value={s.academicYear} C={C} />
                <Info label="Status" value={s.isActive ? 'Active' : 'Inactive'} C={C} />
                <Info label="Default Due Day" value={s.defaultDueDay ?? '—'} C={C} />
                <Info label="Late Fee / Day" value={formatMoney(s.lateFeePerDay, currencySymbol)} C={C} />
                <Info label="Serial #" value={s.serialNumber || '—'} C={C} />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: C.mutedSoft }]}>
              COMPONENTS ({components.length})
            </Text>

            {components.length === 0 ? (
              <Text style={[styles.subtitle, { color: C.mutedSoft, paddingHorizontal: 2 }]}>
                No components.
              </Text>
            ) : (
              components.map((c, i) => (
                <View
                  key={i}
                  style={[styles.compCard, { backgroundColor: C.bg, borderColor: C.border }]}
                >
                  <View style={styles.compHeader}>
                    <Text style={[styles.compName, { color: C.text }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={[styles.compAmount, { color: C.text }]}>
                      {formatMoney(c.amount, currencySymbol)}
                    </Text>
                  </View>
                  <View style={styles.tagRow}>
                    <Tag text={titleCase(c.frequency)} C={C} />
                    {(c.frequency === 'annual' || c.frequency === 'quarterly') && (
                      <Tag text={monthLabel(c.billingMonth)} C={C} />
                    )}
                    {c.appliesDiscount !== false && <Tag text="Discountable" C={C} />}
                    {c.isOptional && <Tag text="Optional" C={C} />}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Info({ label, value, C }) {
  return (
    <View style={styles.infoCell}>
      <Text style={[styles.infoLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.infoValue, { color: C.text }]}>
        {value === 0 ? '0' : value || '—'}
      </Text>
    </View>
  );
}

function Tag({ text, C }) {
  return (
    <View style={[styles.tag, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.tagText, { color: C.muted }]}>{text}</Text>
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
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },

  body: { padding: 16, paddingBottom: 40, gap: 12 },

  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  infoCell: { flexBasis: '28%', flexGrow: 1 },
  infoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  infoValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingHorizontal: 2,
    marginTop: 4,
  },

  compCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  compHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compName: { flex: 1, fontSize: 14, fontWeight: '800' },
  compAmount: { fontSize: 14, fontWeight: '800' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '700' },
});
