import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listChecklists,
  createChecklist,
  renameChecklist,
  deleteChecklist,
} from "../../src/api/checklists";
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
  const [actionList, setActionList] = useState<Checklist | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingAction, setSavingAction] = useState(false);

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

  function openActions(list: Checklist) {
    setActionList(list);
    setRenameValue(list.title);
  }

  async function handleRename() {
    const title = renameValue.trim();
    if (!actionList || !title || title === actionList.title) return;
    setSavingAction(true);
    try {
      await renameChecklist(actionList.id, title);
      setActionList(null);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), (err as Error).message);
    } finally {
      setSavingAction(false);
    }
  }

  function handleDelete() {
    if (!actionList) return;
    const list = actionList;
    Alert.alert(t("checklists.deleteTitle"), t("checklists.deleteMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          setActionList(null);
          try {
            await deleteChecklist(list.id);
            await load();
          } catch (err) {
            Alert.alert(t("common.error"), (err as Error).message);
          }
        },
      },
    ]);
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
              onLongPress={() => openActions(item)}
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

      <Modal
        visible={!!actionList}
        transparent
        animationType="slide"
        onRequestClose={() => setActionList(null)}
      >
        <Pressable style={s.backdrop} onPress={() => setActionList(null)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{t("checklists.rename")}</Text>
          <View style={s.renameRow}>
            <TextInput
              style={s.input}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={t("checklists.namePlaceholder")}
              placeholderTextColor={colors.textDim}
              onSubmitEditing={handleRename}
              returnKeyType="done"
            />
            <Pressable
              style={s.addBtn}
              onPress={handleRename}
              disabled={savingAction || !renameValue.trim()}
            >
              <Text style={s.addBtnText}>{t("common.save")}</Text>
            </Pressable>
          </View>
          <Pressable style={s.deleteAction} onPress={handleDelete}>
            <Text style={s.deleteActionText}>{t("common.delete")}</Text>
          </Pressable>
        </View>
      </Modal>
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
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetTitle: { color: colors.text, fontSize: font.lg, fontWeight: "700" },
  renameRow: { flexDirection: "row", gap: spacing.sm },
  deleteAction: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  deleteActionText: { color: colors.danger, fontSize: font.md, fontWeight: "600" },
});
