import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from "../../src/api/checklists";
import { reportClientError } from "../../src/api/report";
import { colors, spacing, radius, font } from "../../src/theme";
import { sortChecklistItems } from "@notes-world/shared";
import type { ChecklistItem } from "@notes-world/shared";

export default function ChecklistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    getChecklist(id)
      .then((c) => {
        navigation.setOptions({ headerTitle: c.title });
        setItems(c.items ?? []);
      })
      .catch((err) => {
        void reportClientError({
          message: (err as Error).message,
          stack: (err as Error).stack,
          context: "ChecklistDetailScreen.load",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function toggle(item: ChecklistItem) {
    try {
      const updated = await updateChecklistItem(id, item.id, {
        checked: !item.checked,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistDetailScreen.toggle",
      });
    }
  }

  async function onAdd() {
    const name = newName.trim();
    if (!name) return;
    try {
      const created = await addChecklistItem(id, name);
      setNewName("");
      setItems((prev) => [...prev, created]);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistDetailScreen.add",
      });
    }
  }

  async function saveRename(item: ChecklistItem) {
    const name = editValue.trim();
    setEditingId(null);
    if (!name || name === item.name) return;
    try {
      const updated = await updateChecklistItem(id, item.id, { name });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistDetailScreen.rename",
      });
    }
  }

  async function onDelete(itemId: string) {
    try {
      await deleteChecklistItem(id, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ChecklistDetailScreen.delete",
      });
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      <View style={s.addRow}>
        <TextInput
          style={s.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="Add item…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
        <Pressable style={s.addBtn} onPress={onAdd}>
          <Text style={s.addBtnText}>Add</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={sortChecklistItems(items)}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Pressable style={s.check} onPress={() => toggle(item)}>
                <Ionicons
                  name={item.checked ? "checkbox" : "square-outline"}
                  size={22}
                  color={item.checked ? colors.accent : colors.textMuted}
                />
              </Pressable>
              {editingId === item.id ? (
                <TextInput
                  style={[s.name, s.nameInput]}
                  value={editValue}
                  onChangeText={setEditValue}
                  autoFocus
                  onBlur={() => saveRename(item)}
                  onSubmitEditing={() => saveRename(item)}
                  returnKeyType="done"
                />
              ) : (
                <Pressable
                  style={s.nameWrap}
                  onPress={() => {
                    setEditingId(item.id);
                    setEditValue(item.name);
                  }}
                >
                  <Text style={[s.name, item.checked && s.nameChecked]}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={() => onDelete(item.id)} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={s.empty}>No items yet</Text>}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  addRow: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  check: { padding: 2 },
  nameWrap: { flex: 1 },
  name: { flex: 1, color: colors.text, fontSize: font.md },
  nameInput: {
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: 2,
  },
  nameChecked: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
