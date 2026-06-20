import React, { useCallback, useEffect, useState } from "react";
import {
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { getItemsByType } from "../../src/api/items";
import { reportClientError } from "../../src/api/report";
import { useRefreshOnFocus } from "../../src/lib/useRefreshOnFocus";
import { selectCompletedItems } from "../../src/lib/dueDate";
import { ItemCard } from "../../src/components/ItemCard";
import { colors, spacing, font } from "../../src/theme";
import type { Item } from "@notes-world/shared";
import { ItemType } from "@notes-world/shared";

// The Done view: every completed item across all tags and untagged, in one place
// — so "hidden" by the per-tag toggle is never "lost". It is a virtual filter on
// completion status, NOT a literal "done" tag: nothing is moved or retagged.
export default function DoneScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      // The server caps a page at 200, so page through every task to be sure no
      // completed item is missed. MAX_PAGES is a runaway-loop safety stop.
      const PAGE = 200;
      const MAX_PAGES = 50;
      const tasks: Item[] = [];
      for (let p = 0; p < MAX_PAGES; p++) {
        const batch = await getItemsByType(ItemType.Task, PAGE, p * PAGE);
        tasks.push(...batch);
        if (batch.length < PAGE) break;
      }
      // selectCompletedItems is defensive — a malformed item is skipped, never
      // throws — so one bad row can't blank the list.
      setItems(selectCompletedItems(tasks));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "DoneScreen.load",
      });
      setError(t("done.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when the tab regains focus so a task completed elsewhere shows up.
  useRefreshOnFocus(load);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>{t("tabs.done")}</Text>
        {!loading && !error && (
          <Text style={s.count}>{t("done.count", { count: items.length })}</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={s.empty}>{error ? error : t("done.empty")}</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: "700" },
  count: { color: colors.textMuted, fontSize: font.sm },
  loader: { marginTop: spacing.xl },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
