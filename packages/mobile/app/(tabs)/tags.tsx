import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listTags,
  deleteTag,
  createTag,
  renameTag,
  setTagColor,
} from "../../src/api/tags";
import { reportClientError } from "../../src/api/report";
import { getSortOrder, saveSortOrder } from "../../src/api/sortOrders";
import { applySavedOrder, moveItem } from "../../src/lib/sortItems";
import { useRefreshOnFocus } from "../../src/lib/useRefreshOnFocus";
import { colors, spacing, radius, font } from "../../src/theme";
import type { TagWithCount } from "@notes-world/shared";

// Mirror of the web palette (packages/web/src/utils/colors.ts) so tag colors
// match across platforms.
const PALETTE = [
  "#ffffff", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
];

export default function TagsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [reordering, setReordering] = useState(false);
  // Tag-actions sheet (rename / color / delete), opened by long-press.
  const [actionTag, setActionTag] = useState<TagWithCount | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  async function load() {
    try {
      setError(null);
      // Apply the same custom tag order the web sidebar saves (context
      // "tags:all") so the list matches across platforms; tags without a saved
      // position fall to the end, exactly as on web.
      const [data, savedOrder] = await Promise.all([
        listTags(),
        getSortOrder("tags:all").catch(() => []),
      ]);
      setTags(applySavedOrder(data, savedOrder));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagsScreen.load",
      });
      setError(t("tags.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Load on first focus and refresh whenever the tab is re-focused or the app
  // returns to the foreground, so tags created on another device appear.
  useRefreshOnFocus(load, { immediate: true });

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      await createTag(name);
      setNewName("");
      setAdding(false);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function doDelete(tag: TagWithCount, deleteItems: boolean) {
    try {
      await deleteTag(tag.id, deleteItems);
      await load();
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagsScreen.deleteTag",
      });
    }
  }

  function openActions(tag: TagWithCount) {
    setActionTag(tag);
    setRenameValue(tag.name);
  }

  async function handleRename() {
    const name = renameValue.trim();
    if (!actionTag || !name || name === actionTag.name) return;
    setSavingAction(true);
    try {
      await renameTag(actionTag.id, name);
      setActionTag(null);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), (err as Error).message);
    } finally {
      setSavingAction(false);
    }
  }

  async function handleColor(color: string | null) {
    if (!actionTag) return;
    setSavingAction(true);
    try {
      await setTagColor(actionTag.id, color);
      setActionTag(null);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), (err as Error).message);
    } finally {
      setSavingAction(false);
    }
  }

  function confirmDelete(tag: TagWithCount) {
    Alert.alert(t("tags.deleteTitle", { name: tag.name }), t("tags.deleteMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("tags.deleteTagOnly"),
        onPress: () => void doDelete(tag, false),
      },
      {
        text: t("tags.deleteWithNotes"),
        style: "destructive",
        onPress: () => void doDelete(tag, true),
      },
    ]);
  }

  // Reorder via up/down arrows, saved to the shared "tags:all" context so the
  // newest order set on either platform becomes the order on both (last write
  // wins). Mirrors the per-tag item reorder on the tag detail screen.
  function onMove(index: number, direction: -1 | 1) {
    setTags((prev) => {
      const next = moveItem(prev, index, direction);
      if (next !== prev) {
        saveSortOrder(
          "tags:all",
          next.map((tg) => tg.id),
        ).catch((err) => {
          void reportClientError({
            message: (err as Error).message,
            stack: (err as Error).stack,
            context: "TagsScreen.onMove",
          });
        });
      }
      return next;
    });
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.headerRow}>
        <Text style={s.heading}>{t("tags.title")}</Text>
        <View style={s.headerActions}>
          {tags.length > 1 && (
            <Pressable
              onPress={() => setReordering((r) => !r)}
              hitSlop={8}
              style={s.newBtn}
            >
              <Ionicons
                name={reordering ? "checkmark" : "swap-vertical"}
                size={18}
                color={colors.accent}
              />
              <Text style={s.newBtnText}>
                {reordering ? t("common.done") : t("tagDetail.reorder")}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setAdding((a) => !a)}
            hitSlop={8}
            style={s.newBtn}
          >
            <Ionicons
              name={adding ? "close" : "add"}
              size={18}
              color={colors.accent}
            />
            <Text style={s.newBtnText}>{t("tags.new")}</Text>
          </Pressable>
        </View>
      </View>
      {adding && (
        <View style={s.addRow}>
          <TextInput
            style={s.addInput}
            placeholder={t("tags.namePlaceholder")}
            placeholderTextColor={colors.textDim}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Pressable
            style={s.addSubmit}
            onPress={handleCreate}
            disabled={creating || !newName.trim()}
          >
            {creating ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={s.addSubmitText}>{t("tags.add")}</Text>
            )}
          </Pressable>
        </View>
      )}
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(t) => t.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item, index }) =>
            reordering ? (
              <View style={s.row}>
                <View
                  style={[
                    s.dot,
                    { backgroundColor: item.color ?? colors.accent },
                  ]}
                />
                <Text style={s.tagName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Pressable
                  onPress={() => onMove(index, -1)}
                  hitSlop={8}
                  disabled={index === 0}
                  style={s.reorderBtn}
                >
                  <Text
                    style={[s.reorderArrow, index === 0 && s.reorderDisabled]}
                  >
                    ↑
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onMove(index, 1)}
                  hitSlop={8}
                  disabled={index === tags.length - 1}
                  style={s.reorderBtn}
                >
                  <Text
                    style={[
                      s.reorderArrow,
                      index === tags.length - 1 && s.reorderDisabled,
                    ]}
                  >
                    ↓
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [s.row, pressed && s.rowPressed]}
                onPress={() => router.push(`/tag/${item.id}` as never)}
                onLongPress={() => openActions(item)}
              >
                <View
                  style={[
                    s.dot,
                    { backgroundColor: item.color ?? colors.accent },
                  ]}
                />
                <Text style={s.tagName}>{item.name}</Text>
                <Text style={s.count}>{item.item_count ?? 0}</Text>
              </Pressable>
            )
          }
          ListEmptyComponent={
            <Text style={s.empty}>{error ? error : t("tags.empty")}</Text>
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}

      <Modal
        visible={!!actionTag}
        transparent
        animationType="slide"
        onRequestClose={() => setActionTag(null)}
      >
        <Pressable style={s.backdrop} onPress={() => setActionTag(null)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle} numberOfLines={1}>
            {actionTag?.name}
          </Text>

          <Text style={s.sheetLabel}>{t("tags.rename")}</Text>
          <View style={s.renameRow}>
            <TextInput
              style={s.addInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={t("tags.namePlaceholder")}
              placeholderTextColor={colors.textDim}
              returnKeyType="done"
              onSubmitEditing={handleRename}
            />
            <Pressable
              style={s.addSubmit}
              onPress={handleRename}
              disabled={savingAction || !renameValue.trim()}
            >
              <Text style={s.addSubmitText}>{t("common.save")}</Text>
            </Pressable>
          </View>

          <Text style={s.sheetLabel}>{t("tags.color")}</Text>
          <View style={s.swatches}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => handleColor(c)}
                disabled={savingAction}
                style={[
                  s.swatch,
                  { backgroundColor: c },
                  actionTag?.color === c && s.swatchActive,
                ]}
              />
            ))}
          </View>
          {!!actionTag?.color && (
            <Pressable onPress={() => handleColor(null)} disabled={savingAction}>
              <Text style={s.removeColor}>{t("tags.removeColor")}</Text>
            </Pressable>
          )}

          <Pressable
            style={s.deleteAction}
            onPress={() => {
              const tag = actionTag;
              setActionTag(null);
              if (tag) confirmDelete(tag);
            }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={s.deleteActionText}>{t("common.delete")}</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: spacing.md,
  },
  heading: {
    color: colors.text,
    fontSize: font.xxl,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  newBtnText: { color: colors.accent, fontSize: font.md, fontWeight: "600" },
  reorderBtn: { paddingHorizontal: spacing.sm },
  reorderArrow: { color: colors.accent, fontSize: font.lg },
  reorderDisabled: { color: colors.textMuted, opacity: 0.4 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: font.md,
  },
  addSubmit: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addSubmitText: { color: colors.text, fontSize: font.sm, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: font.lg,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  sheetLabel: {
    color: colors.textMuted,
    fontSize: font.sm,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  renameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: { borderColor: colors.text },
  removeColor: {
    color: colors.textMuted,
    fontSize: font.sm,
    paddingVertical: spacing.xs,
  },
  deleteAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteActionText: { color: colors.danger, fontSize: font.md, fontWeight: "600" },
  loader: { marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowPressed: { backgroundColor: colors.surface },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  tagName: { flex: 1, color: colors.text, fontSize: font.md },
  count: {
    color: colors.textMuted,
    fontSize: font.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
