import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { listTags, deleteTag, createTag } from "../../src/api/tags";
import { reportClientError } from "../../src/api/report";
import { colors, spacing, radius, font } from "../../src/theme";
import type { TagWithCount } from "@notes-world/shared";

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

  async function load() {
    try {
      setError(null);
      const data = await listTags();
      setTags(data);
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

  useEffect(() => {
    load();
  }, []);

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

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.headerRow}>
        <Text style={s.heading}>{t("tags.title")}</Text>
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
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && s.rowPressed]}
              onPress={() => router.push(`/tag/${item.id}` as never)}
              onLongPress={() => confirmDelete(item)}
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
          )}
          ListEmptyComponent={
            <Text style={s.empty}>{error ? error : t("tags.empty")}</Text>
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}
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
  newBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  newBtnText: { color: colors.accent, fontSize: font.md, fontWeight: "600" },
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
