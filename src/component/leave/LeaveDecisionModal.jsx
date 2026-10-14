import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { formatLeaveRange, titleCase } from '../../utils/leave';
import { COLORS } from '../../theme/colors';

const CONFIG = {
  approve: {
    title: 'Approve leave',
    button: 'Approve',
    color: '#16a34a',
    icon: 'check',
    noteLabel: 'NOTE (OPTIONAL)',
    noteRequired: false,
  },
  reject: {
    title: 'Reject leave',
    button: 'Reject',
    color: '#dc2626',
    icon: 'x',
    noteLabel: 'REASON FOR REJECTING *',
    noteRequired: true,
  },
  cancel: {
    title: 'Cancel leave',
    button: 'Cancel leave',
    color: '#6b7280',
    icon: 'slash',
    noteLabel: 'NOTE (OPTIONAL)',
    noteRequired: false,
  },
};

/** Note prompt for approve / reject / cancel. `onSubmit(note)`. */
export default function LeaveDecisionModal({ action, req, pending, onClose, onSubmit, C }) {
  const [note, setNote] = useState('');
  const open = !!action && !!req;
  const cfg = CONFIG[action] || CONFIG.approve;

  useEffect(() => {
    if (open) setNote('');
  }, [open, action, req?._id]);

  const submit = () => {
    const trimmed = note.trim();
    if (cfg.noteRequired && !trimmed) {
      Toast.show({ type: 'error', text1: 'A note is required to reject' });
      return;
    }
    onSubmit?.(trimmed);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>{cfg.title}</Text>
          {!!req && (
            <Text style={[styles.sub, { color: C.muted }]}>
              {req.applicant?.name ? `${req.applicant.name} · ` : ''}
              {titleCase(req.leaveType)} · {formatLeaveRange(req.fromDate, req.toDate)}
            </Text>
          )}
          {action === 'cancel' && req?.status === 'approved' && (
            <Text style={[styles.hint, { color: C.muted }]}>
              Attendance rows written by this leave are removed and its quota is freed.
            </Text>
          )}
          <Text style={[styles.label, { color: C.muted }]}>{cfg.noteLabel}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            placeholder={cfg.noteRequired ? 'Why is this rejected?' : 'Optional'}
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              { color: C.text, borderColor: C.border, backgroundColor: C.bg },
            ]}
          />
          <View style={styles.row}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.btn,
                styles.ghost,
                { borderColor: C.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.btnText, { color: C.text }]}>Back</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={pending}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: cfg.color },
                (pressed || pending) && { opacity: 0.8 },
              ]}
            >
              {pending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name={cfg.icon} size={14} color="#fff" />
                  <Text style={[styles.btnText, { color: '#fff' }]}>{cfg.button}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 12 },
  hint: { fontSize: 11 },
  label: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700', marginTop: 6 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ghost: { borderWidth: 1 },
  btnText: { fontSize: 13, fontWeight: '700' },
});
