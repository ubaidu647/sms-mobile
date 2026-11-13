import {
  ActivityIndicator,
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
import StaffForm from './StaffForm';
import QueryErrorState from './QueryErrorState';
import { useStaffDetail, useUpdateStaff } from '../hooks/useStaff';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';
import { freshRecord } from '../utils/freshRecord';

// Rendered inside the Modal, which unmounts its children on close: every open
// gets a new query observer, and so its own refetch. Above the Modal it would
// live as long as the detail screen does, and count as fetched after one load.
function EditStaffContent({ staff, isSelf, onClose }) {
  // `staff` may be a list row, which carries a few fields: the form must open
  // from the full record, or saving would write its blanks over the real values.
  // Fresh too: the form saves every field, isActive included, and a cached copy
  // would undo a block made since.
  const detail = useStaffDetail(staff._id, { staleTime: 0 });
  const record = freshRecord(detail);
  const { mutate, isPending } = useUpdateStaff({
    staffId: staff._id,
    onSuccess: () => onClose(),
  });

  if (record) {
    return (
      <StaffForm
        mode="edit"
        staff={record}
        isSelf={isSelf}
        canCreateAllBranch={false}
        onSubmit={(fd) => mutate(fd)}
        isPending={isPending}
        submitLabel="Save Changes"
      />
    );
  }
  if (detail.isError && !detail.isFetching) {
    return (
      <QueryErrorState
        error={detail.error}
        fallback="Could not load this staff member"
        onRetry={detail.refetch}
        style={{ flex: 0 }}
      />
    );
  }
  return <ActivityIndicator size="large" color={COLORS.brand} style={{ marginTop: 40 }} />;
}

export default function EditStaffModal({ open, staff, isSelf, onClose }) {
  const C = useColors();

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
            <Text style={[styles.title, { color: C.text }]}>
              {isSelf ? 'Edit My Profile' : 'Edit Staff Member'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {staff?.user?.name || ''}
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
            {staff ? <EditStaffContent staff={staff} isSelf={isSelf} onClose={onClose} /> : null}
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
});
