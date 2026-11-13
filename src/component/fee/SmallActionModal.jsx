import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import ToastModal from '../ToastModal';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

// Generic modal for short forms: void voucher, void payment, late fee, regenerate.
// Pass `fields` (array of { key, label, placeholder, type?, required? }) and `onSubmit`.
export default function SmallActionModal({
  open,
  title,
  subtitle,
  fields = [],
  submitLabel = 'Save',
  submitTone = 'brand', // 'brand' | 'danger'
  isPending,
  onClose,
  onSubmit,
}) {
  const C = useColors();
  const [values, setValues] = useState({});

  useEffect(() => {
    if (open) {
      const init = {};
      for (const f of fields) init[f.key] = f.defaultValue ?? '';
      setValues(init);
    }
  }, [open, fields]);

  const setField = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  const submit = () => {
    for (const f of fields) {
      if (f.required && !String(values[f.key] || '').trim()) {
        Toast.show({ type: 'error', text1: `${f.label} is required` });
        return;
      }
    }
    onSubmit?.(values);
  };

  const submitBg = submitTone === 'danger' ? '#b91c1c' : COLORS.brand;

  return (
    <ToastModal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: C.card }]}>
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { color: C.text }]}>{title}</Text>
              {!!subtitle && (
                <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={2}>
                  {subtitle}
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
              <Feather name="x" size={18} color={C.text} />
            </Pressable>
          </View>

          {fields.map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={[styles.label, { color: C.muted }]}>
                {f.label.toUpperCase()}
                {f.required ? ' *' : ''}
              </Text>
              <TextInput
                value={String(values[f.key] ?? '')}
                onChangeText={(v) => setField(f.key, v)}
                placeholder={f.placeholder || ''}
                placeholderTextColor={C.mutedSoft}
                keyboardType={f.type === 'number' ? 'decimal-pad' : 'default'}
                multiline={!!f.multiline}
                style={[
                  styles.input,
                  f.multiline && {
                    height: 70,
                    textAlignVertical: 'top',
                    paddingTop: 10,
                  },
                  { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </View>
          ))}

          <View style={styles.actionsRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.ghostBtn,
                { borderColor: C.border, backgroundColor: C.bg },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.ghostBtnText, { color: C.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={isPending}
              style={({ pressed }) => [
                styles.submit,
                { backgroundColor: submitBg, flex: 1 },
                (isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={14} color="#fff" />
                  <Text style={styles.submitText}>{submitLabel}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ToastModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  sheet: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 6,
  },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: { gap: 6 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  ghostBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { fontWeight: '700', fontSize: 13 },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
