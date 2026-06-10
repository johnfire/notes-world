import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { getItemsByTag, listTags } from "../../src/api/tags";
import { archiveItem } from "../../src/api/items";
import { collapsedDividers } from "../../src/api/sortOrders";
import { reportClientError } from "../../src/api/report";
import { ItemCard } from "../../src/components/ItemCard";
import {
  getParentDividerMap,
  getHiddenCounts,
} from "../../src/lib/dividerGrouping";
import { colors, spacing, font } from "../../src/theme";
import { ItemType } from "@notes-world/shared";
import type { Item } from "@notes-world/shared";

export default function TagScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [items, setItems] = useState<Item[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCollapse(dividerId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(dividerId)) next.delete(dividerId);
      else next.add(dividerId);
      // Fire-and-forget: keep the local state the user just set even if the
      // save fails (web app behaves the same).
      collapsedDividers.save(id, Array.from(next)).catch((err) => {
        void reportClientError({
          message: (err as Error).message,
          stack: (err as Error).stack,
          context: "TagScreen.toggleCollapse",
        });
      });
      return next;
    });
  }

  useEffect(() => {
    listTags()
      .then((tags) => {
        const tag = tags.find((t) => t.id === id);
        if (tag) navigation.setOptions({ headerTitle: tag.name });
      })
      .catch((err) => {
        void reportClientError({
          message: (err as Error).message,
          stack: (err as Error).stack,
          context: "TagScreen.headerTitle",
        });
      });
  }, [id]);

  async function onDelete(id: string) {
    try {
      await archiveItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagScreen.onDelete",
      });
    }
  }

  async function load() {
    try {
      setError(null);
      const [res, collapsedIds] = await Promise.all([
        getItemsByTag(id),
        // If the collapsed-state fetch fails, fall back to nothing collapsed.
        collapsedDividers.get(id).catch(() => [] as string[]),
      ]);
      setItems(res);
      setCollapsed(new Set(collapsedIds));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagScreen.load",
      });
      setError(t("tagDetail.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const parentDividerMap = getParentDividerMap(items);
  const hiddenCounts = getHiddenCounts(items);
  // Hide items whose parent divider is collapsed; dividers always stay visible.
  const visibleItems = items.filter((item) => {
    const parent = parentDividerMap.get(item.id);
    return !(parent && collapsed.has(parent));
  });

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            item.item_type === ItemType.Divider ? (
              <ItemCard
                item={item}
                onPress={() => router.push(`/item/${item.id}`)}
                onDelete={onDelete}
                collapsed={collapsed.has(item.id)}
                hiddenCount={hiddenCounts.get(item.id) ?? 0}
                onToggle={() => toggleCollapse(item.id)}
              />
            ) : (
              <ItemCard
                item={item}
                onPress={() => router.push(`/item/${item.id}`)}
                onDelete={onDelete}
              />
            )
          }
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
          ListEmptyComponent={
            <Text style={s.empty}>{error ? error : t("tagDetail.empty")}</Text>
          }
          contentContainerStyle={{
            paddingVertical: spacing.sm,
            paddingBottom: spacing.xl,
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loader: { marginTop: spacing.xl },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
