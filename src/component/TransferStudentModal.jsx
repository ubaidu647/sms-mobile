import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KeyboardAvoidingView from './KeyboardAvoidingView';
import ToastModal from './ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  useClassesDropdown,
  useSectionsDropdown,
  useTransferStudent,
} from '../hooks/useStudents';
import { transferStudentSchema } from '../validation/studentSchema';
import { currentAcademicYear } from '../constants/students';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';

export default function TransferStudentModal({ open, student, onClose }) {
  const C = useColors();
  const branchId =
    student?.branch?._id ||
    (typeof student?.branchId === 'string' ? student.branchId : student?.branchId?._id) ||
    '';

  const { mutate, isPending } = useTransferStudent({
    studentId: student?._id,
    onSuccess: () => onClose(),
  });

  const defaultValues = {
    academicYear: student?.academicYear || currentAcademicYear(),
    classId: '',
    sectionId: '',
  };

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({ resolver: yupResolver(transferStudentSchema), defaultValues });

  const academicYear = useWatch({ control, name: 'academicYear' });
  const classId = useWatch({ control, name: 'classId' });

  const { data: classesData } = useClassesDropdown({
    branchId,
    academicYear,
    enabled: open && !!branchId && !!academicYear,
  });
  const classes = classesData?.data || [];

  const { data: sectionsData } = useSectionsDropdown(classId, {
    enabled: open && !!classId,
  });
  const sections = sectionsData?.data || [];

  // Reset deeper fields when parents change
  useEffect(() => {
    setValue('classId', '');
  }, [academicYear, setValue]);

  useEffect(() => {
    setValue('sectionId', '');
  }, [classId, setValue]);

  useEffect(() => {
    if (!open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onValidationError = (errs) => {
    const first = Object.values(errs || {}).find((e) => e?.message)?.message;
    Toast.show({
      type: 'error',
      text1: 'Please pick a year, class and section',
      text2: first || 'Some fields are invalid',
    });
  };

  const submit = (data) => {
    mutate({
      academicYear: data.academicYear,
      classId: data.classId,
      sectionId: data.sectionId,
    });
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
            <Text style={[styles.title, { color: C.text }]}>Transfer Student</Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {student?.user?.name || ''}
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
            <View style={[styles.warnBanner, { borderColor: '#fde68a' }]}>
              <Feather name="info" size={16} color="#92400e" />
              <Text style={styles.warnBannerText}>
                Transfer moves the student to a new class/section within the same
                branch. A new roll number will be assigned and academic status will
                reset to <Text style={{ fontWeight: '800' }}>enrolled</Text>.
              </Text>
            </View>

            <View style={[styles.currentCard, { backgroundColor: C.bg, borderColor: C.border }]}>
              <Text style={[styles.currentLabel, { color: C.muted }]}>CURRENT</Text>
              <Text style={[styles.currentVal, { color: C.text }]} numberOfLines={1}>
                {student?.class?.name || '—'}
                {student?.section?.name ? ` · ${student.section.name}` : ''}
                {student?.academicYear ? ` · ${student.academicYear}` : ''}
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: C.text }]}>
                Academic Year <Text style={styles.required}>*</Text>
              </Text>
              <Controller
                control={control}
                name="academicYear"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="2025-2026"
                    placeholderTextColor={C.mutedSoft}
                    style={[
                      styles.input,
                      { color: C.text, backgroundColor: C.bg, borderColor: C.border },
                      errors.academicYear && { borderColor: COLORS.red },
                    ]}
                  />
                )}
              />
              {!!errors.academicYear && (
                <Text style={styles.errorText}>{errors.academicYear.message}</Text>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: C.text }]}>
                New Class <Text style={styles.required}>*</Text>
              </Text>
              <Controller
                control={control}
                name="classId"
                render={({ field: { value, onChange } }) =>
                  classes.length > 0 ? (
                    <View style={styles.chipRow}>
                      {classes.map((c) => {
                        const active = value === c._id;
                        return (
                          <Pressable
                            key={c._id}
                            onPress={() => onChange(c._id)}
                            style={[
                              styles.chip,
                              { backgroundColor: C.bg, borderColor: C.border },
                              active && styles.chipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: C.text },
                                active && styles.chipTextActive,
                              ]}
                            >
                              {c.name} ({c.grade?.toUpperCase()})
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
                      No active classes for this year on this branch.
                    </Text>
                  )
                }
              />
              {!!errors.classId && (
                <Text style={styles.errorText}>{errors.classId.message}</Text>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: C.text }]}>
                New Section <Text style={styles.required}>*</Text>
              </Text>
              <Controller
                control={control}
                name="sectionId"
                render={({ field: { value, onChange } }) =>
                  !classId ? (
                    <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
                      Pick a class first.
                    </Text>
                  ) : sections.length > 0 ? (
                    <View style={styles.chipRow}>
                      {sections.map((s) => {
                        const cap = s.capacity ?? 0;
                        const cur = s.currentStrength ?? 0;
                        const full = cap > 0 && cur >= cap;
                        const active = value === s._id;
                        return (
                          <Pressable
                            key={s._id}
                            onPress={() => onChange(s._id)}
                            style={[
                              styles.chip,
                              { backgroundColor: C.bg, borderColor: C.border },
                              active && styles.chipActive,
                              full && !active && { opacity: 0.5 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: C.text },
                                active && styles.chipTextActive,
                              ]}
                            >
                              {s.name} · {cur}/{cap}
                              {full ? ' · Full' : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
                      No sections in this class.
                    </Text>
                  )
                }
              />
              {!!errors.sectionId && (
                <Text style={styles.errorText}>{errors.sectionId.message}</Text>
              )}
            </View>

            <Pressable
              onPress={handleSubmit(submit, onValidationError)}
              disabled={isPending}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.9 },
                isPending && { opacity: 0.7 },
              ]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="repeat" size={16} color="#fff" />
                  <Text style={styles.submitText}>Transfer Student</Text>
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

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  warnBannerText: { color: '#92400e', fontSize: 12, flex: 1, lineHeight: 18 },

  currentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  currentLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  currentVal: { fontSize: 14, fontWeight: '700', marginTop: 4 },

  label: { fontSize: 12, fontWeight: '700' },
  required: { color: COLORS.red },
  errorText: { color: COLORS.red, fontSize: 11 },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 14,
  },

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

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
