import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import ToastModal from '../ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUpdateAssignment } from '../../hooks/useTeacherAssignments';
import { TEACHING_ROLES, titleCase } from '../../constants/teacherAssignment';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

const toYMD = (iso) => (iso ? String(iso).slice(0, 10) : '');

export default function EditAssignmentModal({ open, assignment, onClose }) {
  const C = useColors();

  const [role, setRole] = useState('teacher');
  const [isPrimary, setIsPrimary] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && assignment) {
      setRole(assignment.role || 'teacher');
      setIsPrimary(!!assignment.isPrimary);
      setStartDate(toYMD(assignment.startDate));
      setEndDate(toYMD(assignment.endDate));
      setNotes(assignment.notes || '');
      setStatus(assignment.status || 'active');
      setIsActive(assignment.isActive !== false);
    }
  }, [open, assignment]);

  const update = useUpdateAssignment({
    id: assignment?._id,
    onSuccess: () => onClose(),
  });

  const handleSubmit = () => {
    const payload = {
      role,
      isPrimary,
      status,
      isActive,
    };
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    if (notes != null) payload.notes = notes;
    update.mutate(payload);
  };

  if (!assignment) return null;

  return (
    <ToastModal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Edit Assignment</Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {assignment.staff?.user?.name
                ? `${assignment.staff.user.name} — ${assignment.subject?.name} · ${
                    assignment.class?.name
                  }/${assignment.section?.name}`
                : 'Update assignment'}
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

        <KeyboardAvoidingView
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.note}>
              <Feather name="info" size={14} color="#92400e" />
              <Text style={styles.noteText}>
                Teacher, subject and section cannot be changed. To change them, unassign and
                re-create.
              </Text>
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>ROLE</Text>
              <View style={styles.chipRow}>
                {TEACHING_ROLES.map((r) => {
                  const active = role === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRole(r)}
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
                        {titleCase(r)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              onPress={() => setIsPrimary((v) => !v)}
              style={({ pressed }) => [
                styles.toggleRow,
                {
                  backgroundColor: isPrimary ? '#fef3c7' : C.bg,
                  borderColor: isPrimary ? '#fde68a' : C.border,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather
                name={isPrimary ? 'check-square' : 'square'}
                size={14}
                color={isPrimary ? '#92400e' : C.mutedSoft}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleText, { color: isPrimary ? '#92400e' : C.text }]}>
                  Primary teacher
                </Text>
                <Text style={[styles.toggleHint, { color: isPrimary ? '#92400e' : C.muted }]}>
                  Will demote any existing primary for this subject + section.
                </Text>
              </View>
            </Pressable>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>START DATE</Text>
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-06-01"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>END DATE</Text>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="optional"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                  ]}
                />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
                <View style={styles.chipRow}>
                  {['active', 'inactive'].map((s) => {
                    const active = status === s;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setStatus(s)}
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
                          {titleCase(s)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>ACTIVE</Text>
                <View style={styles.chipRow}>
                  {[
                    { v: true, l: 'Yes' },
                    { v: false, l: 'No' },
                  ].map((o) => {
                    const active = isActive === o.v;
                    return (
                      <Pressable
                        key={o.l}
                        onPress={() => setIsActive(o.v)}
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
                          {o.l}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>NOTES</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Optional internal note"
                placeholderTextColor={C.mutedSoft}
                style={[
                  styles.input,
                  {
                    height: 70,
                    textAlignVertical: 'top',
                    paddingTop: 10,
                    color: C.text,
                    borderColor: C.border,
                    backgroundColor: C.bg,
                  },
                ]}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={update.isPending}
              style={({ pressed }) => [
                styles.submit,
                (update.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {update.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitText}>Save Changes</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16, paddingBottom: 32, gap: 14 },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  noteText: { color: '#92400e', fontSize: 12, flex: 1 },

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleText: { fontSize: 13, fontWeight: '700' },
  toggleHint: { fontSize: 11, marginTop: 2 },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brand,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
