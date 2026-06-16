import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { Dependency, Item } from "@notes-world/shared";
import { ItemType } from "@notes-world/shared";
import { getItem, listItems } from "../api/items";
import {
  getDependencies,
  getDependents,
  addDependency,
  removeDependency,
} from "../api/dependencies";
import { reportClientError } from "../api/report";
import { colors, spacing, radius, font } from "../theme";

export function DependencyManager({
  itemId,
  itemType,
}: {
  itemId: string;
  itemType: ItemType;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [dependents, setDependents] = useState<Dependency[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Item[]>([]);

  async function load() {
    try {
      const [d, dep] = await Promise.all([
        getDependencies(itemId),
        getDependents(itemId),
      ]);
      setDeps(d);
      setDependents(dep);
      const ids = [
        ...new Set([
          ...d.map((x) => x.dependency_id),
          ...dep.map((x) => x.dependent_id),
        ]),
      ];
      const items = await Promise.all(
        ids.map((id) => getItem(id).catch(() => null)),
      );
      const map: Record<string, string> = {};
      for (const it of items) if (it) map[it.id] = it.title;
      setTitles(map);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "DependencyManager.load",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [itemId]);

  // Debounced item search for the add-dependency picker.
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await listItems({ search: search.trim(), page_size: 8 });
        setResults(res.items.filter((i) => i.id !== itemId));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, itemId]);

  async function handleAdd(depId: string) {
    setPickerVisible(false);
    setSearch("");
    setResults([]);
    try {
      await addDependency(itemId, depId);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), (err as Error).message);
    }
  }

  async function handleRemove(id: string) {
    setDeps((prev) => prev.filter((d) => d.id !== id));
    try {
      await removeDependency(id);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), (err as Error).message);
      load();
    }
  }

  if (loading) {
    return <ActivityIndicator color={colors.accent} size="small" />;
  }

  // Mirror web: only surface the section for tasks, or when links already exist.
  if (
    itemType !== ItemType.Task &&
    deps.length === 0 &&
    dependents.length === 0
  ) {
    return null;
  }

  return (
    <View style={s.root}>
      <Text style={s.label}>{t("deps.title")}</Text>

      <Text style={s.sub}>{t("deps.dependsOn")}</Text>
      {deps.length === 0 ? (
        <Text style={s.none}>{t("deps.none")}</Text>
      ) : (
        deps.map((dep) => (
          <View key={dep.id} style={s.row}>
            <Pressable
              style={s.rowName}
              onPress={() => router.push(`/item/${dep.dependency_id}` as never)}
            >
              <Text style={s.rowText} numberOfLines={1}>
                {titles[dep.dependency_id] ?? dep.dependency_id}
              </Text>
            </Pressable>
            <Pressable onPress={() => handleRemove(dep.id)} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        ))
      )}
      <Pressable style={s.addBtn} onPress={() => setPickerVisible(true)}>
        <Ionicons name="add" size={14} color={colors.accent} />
        <Text style={s.addText}>{t("deps.add")}</Text>
      </Pressable>

      {dependents.length > 0 && (
        <>
          <Text style={s.sub}>{t("deps.blocking")}</Text>
          {dependents.map((dep) => (
            <Pressable
              key={dep.id}
              style={s.rowName}
              onPress={() => router.push(`/item/${dep.dependent_id}` as never)}
            >
              <Text style={s.rowText} numberOfLines={1}>
                {titles[dep.dependent_id] ?? dep.dependent_id}
              </Text>
            </Pressable>
          ))}
        </>
      )}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setPickerVisible(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{t("deps.add")}</Text>
          <TextInput
            style={s.searchInput}
            placeholder={t("deps.searchPlaceholder")}
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <FlatList
            data={results}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={s.resultRow} onPress={() => handleAdd(item.id)}>
                <Text style={s.rowText} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              search.trim() ? (
                <Text style={s.none}>{t("deps.noResults")}</Text>
              ) : null
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { marginTop: spacing.lg, gap: spacing.xs },
  label: {
    color: colors.textMuted,
    fontSize: font.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sub: {
    color: colors.textDim,
    fontSize: font.sm,
    marginTop: spacing.xs,
  },
  none: { color: colors.textDim, fontSize: font.sm, fontStyle: "italic" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  rowName: { flex: 1, minWidth: 0 },
  rowText: { color: colors.text, fontSize: font.md },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.accentDim,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: 2,
  },
  addText: { color: colors.accent, fontSize: font.sm },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: "60%",
  },
  sheetTitle: {
    color: colors.text,
    fontSize: font.lg,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: font.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
