import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import KeyboardAvoidingView from './KeyboardAvoidingView';
import ToastModal from './ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  useSectionsList,
  useCreateSection,
  useUpdateSection,
  useToggleSectionStatus,
} from '../hooks/useClasses';
import { STATUS_PILL } from '../constants/classes';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';
import SectionForm from './SectionForm';

function SectionCard({ section, canUpdate, canToggle, onEdit, onToggle, busyId, C }) {
  const cap = section.capacity ?? 0;
  const cur = section.currentStrength ?? 0;
  const pct = cap > 0 ? Math.min(100, Math.round((cur / cap) * 100)) : 0;
  const almostFull = cap > 0 && cur / cap >= 0.9;
  const statusP = section.isActive ? STATUS_PILL.active : STATUS_PILL.inactive;
  const teacherName =
    section.classTeacherInfo?.user?.name ||
    (typeof section.classTeacher === 'object' ? section.classTeacher?.user?.name : null);
  const teacherDesignation =
    section.classTeacherInfo?.designation ||
    (typeof section.classTeacher === 'object' ? section.classTeacher?.designation : null);

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(section.name?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
              {section.name}
            </Text>
            <View style={[styles.pill, { backgroundColor: statusP.bg }]}>
              <Text style={[styles.pillText, { color: statusP.fg }]}>
                {statusP.label}
              </Text>
            </View>
            {almostFull && (
              <View style={[styles.pill, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.pillText, { color: '#92400e' }]}>Almost Full</Text>
              </View>
            )}
          </View>
          <Text style={[styles.meta, { color: C.mutedSoft }]} numberOfLines={1}>
            {section.serialNumber ? `${section.serialNumber} · ` : ''}
            {section.academicYear || ''}
          </Text>
        </View>
      </View>

      <View>
        <View style={styles.barRow}>
          <Text style={[styles.barLabel, { color: C.muted }]}>
            Capacity
          </Text>
          <Text style={[styles.barLabel, { color: C.text, fontWeight: '700' }]}>
            {cur} / {cap}
          </Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: C.bg }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${pct}%`,
                backgroundColor: almostFull ? '#f59e0b' : COLORS.brand,
              },
            ]}
          />
        </View>
      </View>

      {(teacherName || teacherDesignation) && (
        <View style={[styles.teacherRow, { borderTopColor: C.border }]}>
          <Feather name="user" size={13} color={C.mutedSoft} />
          <Text style={[styles.teacherText, { color: C.muted }]} numberOfLines={1}>
            {teacherName || 'Unassigned'}
            {teacherDesignation ? ` · ${teacherDesignation}` : ''}
          </Text>
        </View>
      )}

      {(canUpdate || canToggle) && (
        <View style={styles.actionRow}>
          {canUpdate && (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [
                styles.actBtn,
                { backgroundColor: '#0ea5e9' },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Feather name="edit-2" size={13} color="#fff" />
              <Text style={styles.actBtnText}>Edit</Text>
            </Pressable>
          )}
          {canToggle && (
            <Pressable
              onPress={onToggle}
              disabled={busyId === section._id}
              style={({ pressed }) => [
                styles.actBtn,
                {
                  backgroundColor: section.isActive ? '#f59e0b' : '#10b981',
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              {busyId === section._id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather
                    name={section.isActive ? 'slash' : 'check-circle'}
                    size={13}
                    color="#fff"
                  />
                  <Text style={styles.actBtnText}>
                    {section.isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function SectionsModal({
  open,
  cls,
  onClose,
  canCreate,
  canUpdate,
  canToggle,
}) {
  const C = useColors();
  const classId = cls?._id;

  const { data, isLoading, refetch } = useSectionsList(classId, { enabled: open });
  const sections = data?.data || [];

  const [addOpen, setAddOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);

  const create = useCreateSection({ classId, onSuccess: () => setAddOpen(false) });
  const update = useUpdateSection({
    classId,
    sectionId: editSection?._id,
    onSuccess: () => setEditSection(null),
  });
  const toggle = useToggleSectionStatus({ classId });

  const onToggle = (section) => {
    Alert.alert(
      section.isActive ? 'Deactivate Section' : 'Activate Section',
      `Are you sure you want to ${section.isActive ? 'deactivate' : 'activate'} section ${section.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => toggle.mutate(section._id) },
      ],
    );
  };

  return (
    <ToastModal
      visible={open}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Sections</Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {cls?.name} · Grade {cls?.grade?.toUpperCase()} · {cls?.academicYear}
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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && sections.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.brand} />
            </View>
          ) : sections.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="layers" size={36} color={C.mutedSoft} />
              <Text style={[styles.emptyText, { color: C.muted }]}>
                No sections yet
              </Text>
              {canCreate && (
                <Pressable
                  onPress={() => setAddOpen(true)}
                  style={({ pressed }) => [
                    styles.addBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.addBtnText}>Add Section</Text>
                </Pressable>
              )}
            </View>
          ) : (
            sections.map((s) => (
              <SectionCard
                key={s._id}
                section={s}
                canUpdate={canUpdate}
                canToggle={canToggle}
                onEdit={() => setEditSection(s)}
                onToggle={() => onToggle(s)}
                busyId={toggle.isPending ? toggle.variables : null}
                C={C}
              />
            ))
          )}
        </ScrollView>

        {sections.length > 0 && canCreate && (
          <View style={[styles.footer, { borderTopColor: C.border, backgroundColor: C.card }]}>
            <Pressable
              onPress={() => setAddOpen(true)}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.addBtnText}>Add Section</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {/* Add Section */}
      <ToastModal
        visible={addOpen}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setAddOpen(false)}
      >
        <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: C.text }]}>Add Section</Text>
              <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
                {cls?.name}
              </Text>
            </View>
            <Pressable
              onPress={() => setAddOpen(false)}
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
          <KeyboardAvoidingView
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              <SectionForm
                mode="create"
                cls={cls}
                onSubmit={(payload) => create.mutate(payload)}
                isPending={create.isPending}
                submitLabel="Create Section"
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ToastModal>

      {/* Edit Section */}
      <ToastModal
        visible={!!editSection}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setEditSection(null)}
      >
        <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: C.text }]}>Edit Section</Text>
              <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
                {cls?.name} · {editSection?.name}
              </Text>
            </View>
            <Pressable
              onPress={() => setEditSection(null)}
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
          <KeyboardAvoidingView
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              {!!editSection && (
                <SectionForm
                  mode="edit"
                  cls={cls}
                  section={editSection}
                  onSubmit={(payload) => update.mutate(payload)}
                  isPending={update.isPending}
                  submitLabel="Save Changes"
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ToastModal>
    </ToastModal>
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
  subtitle: { fontSize: 12, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16, paddingBottom: 32, gap: 12 },

  center: { padding: 32, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  footer: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth },

  card: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 4 },

  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '700' },

  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: 11 },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },

  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  teacherText: { fontSize: 12, flex: 1 },

  actionRow: { flexDirection: 'row', gap: 8 },
  actBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
  },
  actBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
