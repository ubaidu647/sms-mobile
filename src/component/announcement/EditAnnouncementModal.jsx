import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import { useUpdateAnnouncement } from '../../hooks/useAnnouncements';
import {
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_TYPES,
  PRIORITY_PILL,
  TYPE_ICONS,
  localInputToISO,
  titleCase,
  toLocalDateTimeInput,
} from '../../constants/announcement';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import AudiencePicker from './AudiencePicker';

export default function EditAnnouncementModal({ open, announcement, onClose }) {
  const C = useColors();
  const { user } = useUserStore();
  const isAdmin = !!user?.role?.isPredefined;
  const isOrgLevel = isAdmin || !!user?.role?.actions?.includes('update-all-branch-announcement');
  // Any move into or out of published/archived needs publish-announcement.
  // Without it a draft can only stay a draft, and a published/archived notice
  // can only keep its current status (un-publishing to draft is a publish
  // decision too, so it isn't offered).
  const canPublish = isAdmin || !!user?.role?.actions?.includes('publish-announcement');
  const currentStatus = announcement?.status || 'draft';
  const statusOptions = canPublish ? ANNOUNCEMENT_STATUSES : [currentStatus];
  // On a live notice, pinning / ack / taking it down are publish decisions.
  const lockPublishFields =
    !canPublish && (currentStatus === 'published' || currentStatus === 'archived');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [audience, setAudience] = useState(null);
  const [publishedAt, setPublishedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [status, setStatus] = useState('draft');
  const [isActive, setIsActive] = useState(true);
  // What the form was seeded with — only fields that differ are sent, so an
  // untouched date is never re-sent (and re-interpreted) on save.
  const initialRef = useRef({});

  // Seed on the open transition (or when a different notice is opened), not on
  // every refetch of the same notice, so in-progress edits survive.
  useEffect(() => {
    if (!open || !announcement) return;
    const init = {
      priority: announcement.priority || 'normal',
      publishedAt: toLocalDateTimeInput(announcement.publishedAt),
      expiresAt: toLocalDateTimeInput(announcement.expiresAt),
      isPinned: !!announcement.isPinned,
      requiresAck: !!announcement.requiresAck,
      status: announcement.status || 'draft',
      isActive: announcement.isActive !== false,
    };
    initialRef.current = init;
    setTitle(announcement.title || '');
    setBody(announcement.body || '');
    setType(announcement.type || 'general');
    setPriority(init.priority);
    setAudience(announcement.audience || null);
    setPublishedAt(init.publishedAt);
    setExpiresAt(init.expiresAt);
    setIsPinned(init.isPinned);
    setRequiresAck(init.requiresAck);
    setStatus(init.status);
    setIsActive(init.isActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, announcement?._id]);

  const update = useUpdateAnnouncement({
    id: announcement?._id,
    onSuccess: () => onClose(),
  });

  const submit = () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Title is required' });
      return;
    }
    if (!body.trim()) {
      Toast.show({ type: 'error', text1: 'Body is required' });
      return;
    }
    const init = initialRef.current;
    const payload = { title: title.trim(), body, type };
    if (priority !== init.priority) payload.priority = priority;
    if (isPinned !== init.isPinned) payload.isPinned = isPinned;
    if (requiresAck !== init.requiresAck) payload.requiresAck = requiresAck;
    if (isActive !== init.isActive) payload.isActive = isActive;
    if (status !== init.status) payload.status = status;
    if (audience) payload.audience = audience;

    // Dates: only when edited. A cleared field sends null (removes the date);
    // anything else goes as a full ISO instant built from local time.
    let pubISO;
    if (publishedAt.trim() !== init.publishedAt) {
      pubISO = localInputToISO(publishedAt);
      if (pubISO === undefined) {
        Toast.show({
          type: 'error',
          text1: 'Invalid publish date',
          text2: 'Use YYYY-MM-DD or YYYY-MM-DD HH:mm',
        });
        return;
      }
      payload.publishedAt = pubISO;
    }
    let expISO;
    if (expiresAt.trim() !== init.expiresAt) {
      expISO = localInputToISO(expiresAt);
      if (expISO === undefined) {
        Toast.show({
          type: 'error',
          text1: 'Invalid expiry date',
          text2: 'Use YYYY-MM-DD or YYYY-MM-DD HH:mm',
        });
        return;
      }
      payload.expiresAt = expISO;
    }
    const effPub = pubISO !== undefined ? pubISO : localInputToISO(publishedAt);
    const effExp = expISO !== undefined ? expISO : localInputToISO(expiresAt);
    if (effPub && effExp && new Date(effExp) <= new Date(effPub)) {
      Toast.show({ type: 'error', text1: 'Expires must be after publish date' });
      return;
    }
    update.mutate(payload);
  };

  if (!announcement) return null;

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
            <Text style={[styles.title, { color: C.text }]}>Edit Announcement</Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {announcement.serialNumber || announcement.title}
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View>
              <Text style={[styles.label, { color: C.muted }]}>TITLE *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor={C.mutedSoft}
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>BODY *</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                multiline
                placeholder="Body…"
                placeholderTextColor={C.mutedSoft}
                style={[
                  styles.input,
                  {
                    height: 120,
                    textAlignVertical: 'top',
                    paddingTop: 10,
                    color: C.text,
                    borderColor: C.border,
                    backgroundColor: C.bg,
                  },
                ]}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>TYPE</Text>
              <View style={styles.chipRow}>
                {ANNOUNCEMENT_TYPES.map((t) => {
                  const active = type === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: C.bg, borderColor: C.border },
                        active && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Feather name={TYPE_ICONS[t]} size={11} color={active ? '#fff' : C.muted} />
                      <Text
                        style={[
                          styles.chipText,
                          { color: C.text, marginLeft: 4 },
                          active && styles.chipTextActive,
                        ]}
                      >
                        {titleCase(t)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>PRIORITY</Text>
              <View style={styles.chipRow}>
                {ANNOUNCEMENT_PRIORITIES.map((p) => {
                  const active = priority === p;
                  const pill = PRIORITY_PILL[p];
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPriority(p)}
                      disabled={lockPublishFields && !active}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: active ? pill.solid : C.bg,
                          borderColor: active ? pill.solid : C.border,
                        },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fff' : C.text }]}>
                        {pill.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>PUBLISH AT</Text>
                <TextInput
                  value={publishedAt}
                  onChangeText={setPublishedAt}
                  editable={!lockPublishFields}
                  placeholder="YYYY-MM-DD HH:mm"
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
                <Text style={[styles.label, { color: C.muted }]}>EXPIRES AT</Text>
                <TextInput
                  value={expiresAt}
                  onChangeText={setExpiresAt}
                  editable={!lockPublishFields}
                  placeholder="YYYY-MM-DD HH:mm"
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

            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setIsPinned((v) => !v)}
                disabled={lockPublishFields}
                style={({ pressed }) => [
                  styles.toggle,
                  {
                    backgroundColor: isPinned ? '#fef3c7' : C.bg,
                    borderColor: isPinned ? '#fde68a' : C.border,
                  },
                  (pressed || lockPublishFields) && { opacity: lockPublishFields ? 0.5 : 0.85 },
                ]}
              >
                <Feather
                  name={isPinned ? 'check-square' : 'square'}
                  size={13}
                  color={isPinned ? '#92400e' : C.mutedSoft}
                />
                <Text style={[styles.toggleText, { color: isPinned ? '#92400e' : C.text }]}>
                  Pin
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRequiresAck((v) => !v)}
                disabled={lockPublishFields}
                style={({ pressed }) => [
                  styles.toggle,
                  {
                    backgroundColor: requiresAck ? '#dbeafe' : C.bg,
                    borderColor: requiresAck ? '#bfdbfe' : C.border,
                  },
                  (pressed || lockPublishFields) && { opacity: lockPublishFields ? 0.5 : 0.85 },
                ]}
              >
                <Feather
                  name={requiresAck ? 'check-square' : 'square'}
                  size={13}
                  color={requiresAck ? '#1e40af' : C.mutedSoft}
                />
                <Text style={[styles.toggleText, { color: requiresAck ? '#1e40af' : C.text }]}>
                  Require Ack
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIsActive((v) => !v)}
                disabled={lockPublishFields}
                style={({ pressed }) => [
                  styles.toggle,
                  {
                    backgroundColor: isActive ? '#dcfce7' : C.bg,
                    borderColor: isActive ? '#86efac' : C.border,
                  },
                  (pressed || lockPublishFields) && { opacity: lockPublishFields ? 0.5 : 0.85 },
                ]}
              >
                <Feather
                  name={isActive ? 'check-square' : 'square'}
                  size={13}
                  color={isActive ? '#166534' : C.mutedSoft}
                />
                <Text style={[styles.toggleText, { color: isActive ? '#166534' : C.text }]}>
                  Active
                </Text>
              </Pressable>
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
              <View style={styles.chipRow}>
                {statusOptions.map((s) => {
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

            <Text style={[styles.section, { color: C.muted }]}>AUDIENCE</Text>
            <AudiencePicker value={audience} onChange={setAudience} isOrgLevel={isOrgLevel} />

            <Pressable
              onPress={submit}
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
  body: { padding: 16, paddingBottom: 32, gap: 14 },

  section: { fontSize: 11, letterSpacing: 1.1, fontWeight: '800', marginTop: 6 },

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row2: { flexDirection: 'row', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  toggle: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: { fontSize: 12, fontWeight: '700' },

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
