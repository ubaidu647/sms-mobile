import { useEffect, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import { useCreateAnnouncement } from '../../hooks/useAnnouncements';
import {
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_TYPES,
  PRIORITY_PILL,
  TYPE_ICONS,
  formatBytes,
  titleCase,
  validateFile,
} from '../../constants/announcement';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import AudiencePicker from './AudiencePicker';

const BLANK_AUDIENCE = {
  scope: 'school',
  branchIds: [],
  classIds: [],
  sectionIds: [],
  staffIds: [],
  targetUserTypes: ['staff', 'student', 'parent'],
};

export default function ComposeAnnouncementModal({ open, onClose }) {
  const C = useColors();
  const { user } = useUserStore();
  const isAdmin = !!user?.role?.isPredefined;
  const isOrgLevel = isAdmin || !!user?.role?.actions?.includes('create-all-branch-announcement');
  // Publishing is its own permission; without it a new notice can only be a draft.
  const canPublish = isAdmin || !!user?.role?.actions?.includes('publish-announcement');
  const statusOptions = canPublish ? ['draft', 'published'] : ['draft'];

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [audience, setAudience] = useState(BLANK_AUDIENCE);
  const [publishedAt, setPublishedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [statusChoice, setStatusChoice] = useState('draft');
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    if (open) return;
    setTitle('');
    setBody('');
    setType('general');
    setPriority('normal');
    setAudience(BLANK_AUDIENCE);
    setPublishedAt('');
    setExpiresAt('');
    setIsPinned(false);
    setRequiresAck(false);
    setStatusChoice('draft');
    setAttachment(null);
  }, [open]);

  const create = useCreateAnnouncement({ onSuccess: () => onClose() });

  const pickAttachment = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'info', text1: 'Permission required to pick an image' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    const filename = asset.uri.split('/').pop() || `image-${Date.now()}.jpg`;
    const extMatch = /\.(jpg|jpeg|png|webp)$/i.exec(filename);
    const ext = (extMatch?.[1] || 'jpg').toLowerCase();
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const next = { uri: asset.uri, name: filename, mimeType, size: asset.fileSize };
    const err = validateFile(next);
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid file', text2: err });
      return;
    }
    setAttachment(next);
  };

  const validate = () => {
    if (!title.trim()) return 'Title is required';
    if (!body.trim()) return 'Body is required';
    if (!audience.targetUserTypes?.length) return 'Pick at least one user type';
    if (audience.scope === 'branch' && !audience.branchIds?.length)
      return 'Pick at least one branch';
    if (audience.scope === 'class' && !audience.classIds?.length) return 'Pick at least one class';
    if (audience.scope === 'section' && !audience.sectionIds?.length)
      return 'Pick at least one section';
    if (audience.scope === 'staff' && !audience.staffIds?.length)
      return 'Pick at least one staff member';
    if (publishedAt && expiresAt && new Date(expiresAt) <= new Date(publishedAt))
      return 'Expires must be after publish date';
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    const fd = new FormData();
    fd.append('title', title.trim());
    fd.append('body', body);
    fd.append('type', type);
    fd.append('priority', priority);
    fd.append('status', canPublish ? statusChoice : 'draft');
    fd.append('audience', JSON.stringify(audience));
    if (publishedAt) fd.append('publishedAt', publishedAt);
    if (expiresAt) fd.append('expiresAt', expiresAt);
    if (isPinned) fd.append('isPinned', 'true');
    if (requiresAck) fd.append('requiresAck', 'true');
    if (attachment) {
      fd.append('attachment', {
        uri: attachment.uri,
        name: attachment.name,
        type: attachment.mimeType,
      });
    }
    create.mutate(fd);
  };

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
            <Text style={[styles.title, { color: C.text }]}>Compose Announcement</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Pick audience, type, priority and publish.
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
                placeholder="e.g. Sports day on Friday"
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
                placeholder="Write the announcement here…"
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>EXPIRES AT</Text>
                <TextInput
                  value={expiresAt}
                  onChangeText={setExpiresAt}
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

            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setIsPinned((v) => !v)}
                style={({ pressed }) => [
                  styles.toggle,
                  {
                    backgroundColor: isPinned ? '#fef3c7' : C.bg,
                    borderColor: isPinned ? '#fde68a' : C.border,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather
                  name={isPinned ? 'check-square' : 'square'}
                  size={13}
                  color={isPinned ? '#92400e' : C.mutedSoft}
                />
                <Text style={[styles.toggleText, { color: isPinned ? '#92400e' : C.text }]}>
                  Pin to top
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRequiresAck((v) => !v)}
                style={({ pressed }) => [
                  styles.toggle,
                  {
                    backgroundColor: requiresAck ? '#dbeafe' : C.bg,
                    borderColor: requiresAck ? '#bfdbfe' : C.border,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather
                  name={requiresAck ? 'check-square' : 'square'}
                  size={13}
                  color={requiresAck ? '#1e40af' : C.mutedSoft}
                />
                <Text style={[styles.toggleText, { color: requiresAck ? '#1e40af' : C.text }]}>
                  Require acknowledgement
                </Text>
              </Pressable>
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
              <View style={styles.chipRow}>
                {statusOptions.map((s) => {
                  const active = statusChoice === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setStatusChoice(s)}
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

            <Text style={[styles.section, { color: C.muted }]}>ATTACHMENT</Text>
            {attachment ? (
              <View
                style={[styles.attachmentRow, { backgroundColor: C.bg, borderColor: C.border }]}
              >
                <View style={styles.attachIcon}>
                  <Feather name="paperclip" size={14} color={COLORS.brand} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.attachName, { color: C.text }]} numberOfLines={1}>
                    {attachment.name}
                  </Text>
                  <Text style={[styles.attachMeta, { color: C.mutedSoft }]}>
                    {attachment.mimeType}
                    {attachment.size ? ` · ${formatBytes(attachment.size)}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setAttachment(null)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
                >
                  <Feather name="trash-2" size={16} color="#dc2626" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickAttachment}
                style={({ pressed }) => [
                  styles.pickBtn,
                  { borderColor: C.border, backgroundColor: C.bg },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="image" size={16} color={COLORS.brand} />
                <Text style={[styles.pickBtnText, { color: C.text }]}>
                  Add image (jpg / png / webp, max 5MB)
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={submit}
              disabled={create.isPending}
              style={({ pressed }) => [
                styles.submit,
                (create.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {create.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.submitText}>
                    {statusChoice === 'published' ? 'Publish' : 'Save Draft'}
                  </Text>
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

  section: {
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '800',
    marginTop: 6,
  },

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
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: { fontSize: 12, fontWeight: '700' },

  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  pickBtnText: { fontSize: 13, fontWeight: '700' },

  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  attachIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.brand + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachName: { fontSize: 12, fontWeight: '700' },
  attachMeta: { fontSize: 11, marginTop: 2 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
