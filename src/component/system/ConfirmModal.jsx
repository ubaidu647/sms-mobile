import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import ToastModal from '../ToastModal';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

const TONE_BG = { danger: '#b91c1c', warning: '#b45309', primary: COLORS.brand };

// Centered confirm dialog. `children` lets callers slot extra inputs (e.g. the
// renew grace field). Mirrors web organizations/ConfirmModal.
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'primary',
  loading = false,
  onConfirm,
  onClose,
  children,
}) {
  const C = useColors();
  const bg = TONE_BG[confirmTone] || TONE_BG.primary;

  return (
    <ToastModal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]}>{title}</Text>
          {!!message && <Text style={[styles.message, { color: C.muted }]}>{message}</Text>}
          {children}
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.ghost,
                { borderColor: C.border, backgroundColor: C.bg },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.ghostText, { color: C.text }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.confirm,
                { backgroundColor: bg },
                (loading || pressed) && { opacity: 0.85 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
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
  sheet: { borderRadius: 16, padding: 18, gap: 10 },
  title: { fontSize: 17, fontWeight: '800' },
  message: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  ghost: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { fontWeight: '700', fontSize: 13 },
  confirm: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
