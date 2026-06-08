import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { listChecklists, createChecklist } from "../../src/api/checklists";
import { reportClientError } from "../../src/api/report";
import { colors, spacing, radius, font } from "../../src/theme";
import type { Checklist } from "@notes-world/shared";

export default function ChecklistsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [lists, setLists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  async function load() {
    try {
      setLists(await listChecklists());
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistsScreen.load",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  async function onCreate() {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const created = await createChecklist(title);
      setNewTitle("");
      setLists((prev) => [...prev, created]);
      router.push(`/checklist/${created.id}` as never);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistsScreen.create",
      });
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Text style={s.heading}>{t("tabs.checklists")}</Text>
      <View style={s.addRow}>
        <TextInput
          style={s.input}
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="New list name…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={onCreate}
          returnKeyType="done"
        />
        <Pressable style={s.addBtn} onPress={onCreate}>
          <Text style={s.addBtnText}>Add</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && s.rowPressed]}
              onPress={() => router.push(`/checklist/${item.id}` as never)}
            >
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.count}>
                {item.checked_count ?? 0}/{item.item_count ?? 0}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>No lists yet</Text>}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  heading: {
    color: colors.text,
    fontSize: font.xxl,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: font.md,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: font.md },
  loader: { marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surface },
  title: { flex: 1, color: colors.text, fontSize: font.md },
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
