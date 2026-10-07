import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import {
  useAddAttachment,
  useAnnouncementDetail,
  useRemoveAttachment,
} from '../../hooks/useAnnouncements';
import { formatBytes, formatDateTime, validateFile } from '../../constants/announcement';
import { openSafeUrl } from '../../utils/openSafeUrl';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function ManageAttachmentsModal({ open, announcement, onClose }) {
  const C = useColors();
  const id = announcement?._id;
  const { data: detail, isFetching, refetch } = useAnnouncementDetail({
    id,
    enabled: open && !!id,
  });

  const attachments =
    detail?.attachments ?? announcement?.attachments ?? [];

  const addMutation = useAddAttachment({ id });
  const removeMutation = useRemoveAttachment({ id });

  useEffect(() => {
    if (open && id) refetch();
  }, [open, id, refetch]);

  const pickAndUpload = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'info', text1: 'Permission required' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    const filename = asset.uri.split('/').pop() || `image-${asset.fileSize || ''}.jpg`;
    const extMatch = /\.(jpg|jpeg|png|webp)$/i.exec(filename);
    const ext = (extMatch?.[1] || 'jpg').toLowerCase();
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const next = { uri: asset.uri, name: filename, mimeType, size: asset.fileSize };
    const err = validateFile(next);
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid file', text2: err });
      return;
    }
    const fd = new FormData();
    fd.append('attachment', { uri: next.uri, name: next.name, type: next.mimeType });
    addMutation.mutate(fd);
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
            <Text style={[styles.title, { color: C.text }]}>Attachments</Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {announcement.title}
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

        <View style={styles.toolbar}>
          <Pressable
            onPress={pickAndUpload}
            disabled={addMutation.isPending}
            style={({ pressed }) => [
              styles.addBtn,
              (addMutation.isPending || pressed) && { opacity: 0.85 },
            ]}
          >
            {addMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="plus" size={15} color="#fff" />
                <Text style={styles.addBtnText}>Add image</Text>
              </>
            )}
          </Pressable>
        </View>

        {isFetching && attachments.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : attachments.length === 0 ? (
          <View style={styles.center}>
            <Feather name="paperclip" size={32} color={C.mutedSoft} />
            <Text style={[styles.empty, { color: C.muted, textAlign: 'center' }]}>
              No attachments yet. Tap “Add image” to upload one.
            </Text>
          </View>
        ) : (
          <FlatList
            data={attachments}
            keyExtractor={(it) => it._id || it.url || it.name}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.row, { backgroundColor: C.bg, borderColor: C.border }]}>
                <View style={styles.icon}>
                  <Feather name="file-text" size={16} color={COLORS.brand} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.rowMeta, { color: C.mutedSoft }]}>
                    {item.mimeType}
                    {item.size != null ? ` · ${formatBytes(item.size)}` : ''}
                    {item.uploadedAt ? ` · ${formatDateTime(item.uploadedAt)}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => openSafeUrl(item.url)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    { backgroundColor: C.card, borderColor: C.border },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Feather name="external-link" size={14} color={C.text} />
                </Pressable>
                <Pressable
                  onPress={() => removeMutation.mutate(item._id)}
                  disabled={removeMutation.isPending}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
                    (removeMutation.isPending || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <Feather name="trash-2" size={14} color="#dc2626" />
                </Pressable>
              </View>
            )}
          />
        )}
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
  toolbar: {
    padding: 14,
    flexDirection: 'row',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  listContent: { padding: 14, gap: 10, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.brand + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { fontSize: 13, fontWeight: '700' },
  rowMeta: { fontSize: 11, marginTop: 2 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  empty: { fontSize: 13 },
});
