import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ToastModal from './ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useToggleSubjectStatus } from '../hooks/useSubjects';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';

export default function SubjectActionsSheet({
  open,
  subject,
  canUpdate,
  canToggle,
  onClose,
  onView,
  onEdit,
}) {
  const C = useColors();
  const toggle = useToggleSubjectStatus({ onSuccess: onClose });
  const [busy, setBusy] = useState(null);

  const onToggle = () => {
    if (!subject?._id) return;
    Alert.alert(
      subject.isActive ? 'Deactivate Subject' : 'Activate Subject',
      `Are you sure you want to ${subject.isActive ? 'deactivate' : 'activate'} "${subject.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setBusy('toggle');
            toggle.mutate(subject._id);
          },
        },
      ],
    );
  };

  return (
    <ToastModal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: C.card }]}
          onPress={() => {}}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={[styles.handle, { backgroundColor: C.border }]} />
            {!!subject?.name && (
              <Text
                style={[styles.title, { color: C.muted, borderBottomColor: C.border }]}
                numberOfLines={1}
              >
                {subject.name} · {subject.code}
              </Text>
            )}

            <Action icon="eye" label="View Details" onPress={onView} C={C} />

            {canUpdate && <Action icon="edit-2" label="Edit" onPress={onEdit} C={C} />}

            {canToggle && (
              <Action
                icon={subject?.isActive ? 'slash' : 'check-circle'}
                label={subject?.isActive ? 'Deactivate' : 'Activate'}
                onPress={onToggle}
                busy={busy === 'toggle' && toggle.isPending}
                C={C}
                color={subject?.isActive ? '#b45309' : '#047857'}
                last
              />
            )}

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                { backgroundColor: C.bg },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.cancelText, { color: C.text }]}>Cancel</Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </ToastModal>
  );
}

function Action({ icon, label, onPress, busy, color, C, last }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.action,
        { borderBottomColor: C.border },
        last && { borderBottomWidth: 0 },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: (color || COLORS.brand) + '18' }]}>
        {busy ? (
          <ActivityIndicator size="small" color={color || COLORS.brand} />
        ) : (
          <Feather name={icon} size={16} color={color || COLORS.brand} />
        )}
      </View>
      <Text style={[styles.actionLabel, { color: color || C.text }]}>{label}</Text>
      <Feather name="chevron-right" size={18} color={C.mutedSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  cancelBtn: {
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700' },
});
