import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { getItemsByTag, listTags } from "../../src/api/tags";
import { archiveItem } from "../../src/api/items";
import {
  collapsedDividers,
  getSortOrder,
  saveSortOrder,
} from "../../src/api/sortOrders";
import { reportClientError } from "../../src/api/report";
import { ItemCard } from "../../src/components/ItemCard";
import {
  getParentDividerMap,
  getHiddenCounts,
} from "../../src/lib/dividerGrouping";
import { applySavedOrder, moveItem } from "../../src/lib/sortItems";
import { sortItemsByDue } from "../../src/lib/dueDate";
import { colors, spacing, font, radius } from "../../src/theme";
import { ItemType } from "@notes-world/shared";
import type { Item } from "@notes-world/shared";

type SortMode = "manual" | "due_date";
const sortModeKey = (tagId: string) => `nw_tag_sort:${tagId}`;

function dueOf(item: Item): string | undefined {
  const td = item.type_data as { due_date?: string } | null | undefined;
  return td?.due_date || undefined;
}

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
  const [reordering, setReordering] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("manual");

  // Restore the per-tag sort preference (local-only; the tag screen is a
  // different surface from the web dashboard block, which keeps its own).
  useEffect(() => {
    AsyncStorage.getItem(sortModeKey(id))
      .then((v) => {
        if (v === "due_date" || v === "manual") setSortMode(v);
      })
      .catch(() => {});
  }, [id]);

  function changeSort(mode: SortMode) {
    if (mode === sortMode) return;
    setSortMode(mode);
    // Reordering is meaningless in date order — leave it on switch.
    if (mode === "due_date") setReordering(false);
    // Fire-and-forget: keep the choice the user just made even if the save
    // fails (matches the collapsed-divider behaviour above).
    AsyncStorage.setItem(sortModeKey(id), mode).catch((err) => {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagScreen.changeSort",
      });
    });
  }

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
      const [res, collapsedIds, orderRows] = await Promise.all([
        getItemsByTag(id),
        // If the collapsed-state fetch fails, fall back to nothing collapsed.
        collapsedDividers.get(id).catch(() => [] as string[]),
        // If the saved-order fetch fails, fall back to server order.
        getSortOrder(`tag:${id}`).catch(
          () => [] as Array<{ item_id: string; sort_order: number }>,
        ),
      ]);
      setItems(applySavedOrder(res, orderRows));
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

  useEffect(() => {
    navigation.setOptions({
      // Reordering only applies to manual order; hide it in date mode.
      headerRight:
        sortMode === "due_date"
          ? undefined
          : () => (
              <Pressable onPress={() => setReordering((r) => !r)} hitSlop={8}>
                <Text style={s.headerAction}>
                  {reordering ? t("common.done") : t("tagDetail.reorder")}
                </Text>
              </Pressable>
            ),
    });
  }, [reordering, sortMode, t]);

  function onMove(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const next = moveItem(prev, index, direction);
      if (next !== prev) {
        saveSortOrder(
          `tag:${id}`,
          next.map((i) => i.id),
        ).catch((err) => {
          void reportClientError({
            message: (err as Error).message,
            stack: (err as Error).stack,
            context: "TagScreen.onMove",
          });
        });
      }
      return next;
    });
  }

  const parentDividerMap = getParentDividerMap(items);
  const hiddenCounts = getHiddenCounts(items);
  // Hide items whose parent divider is collapsed; dividers always stay visible.
  // While reordering, show everything so positions are unambiguous.
  const manualItems = reordering
    ? items
    : items.filter((item) => {
        const parent = parentDividerMap.get(item.id);
        return !(parent && collapsed.has(parent));
      });

  // Date mode is a flat chronological view: dividers are structural (and
  // undated) so they're dropped here.
  const dueItems = useMemo(
    () => sortItemsByDue(items.filter((i) => i.item_type !== ItemType.Divider)),
    [items],
  );

  const visibleItems = sortMode === "due_date" ? dueItems : manualItems;

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <>
        <View style={s.sortBar}>
          <View style={s.sortToggle}>
            <Pressable
              onPress={() => changeSort("manual")}
              style={[
                s.sortBtn,
                sortMode === "manual" && s.sortBtnActive,
              ]}
            >
              <Text
                style={[
                  s.sortBtnText,
                  sortMode === "manual" && s.sortBtnTextActive,
                ]}
              >
                {t("tagDetail.sortManual")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => changeSort("due_date")}
              style={[
                s.sortBtn,
                sortMode === "due_date" && s.sortBtnActive,
              ]}
            >
              <Text
                style={[
                  s.sortBtnText,
                  sortMode === "due_date" && s.sortBtnTextActive,
                ]}
              >
                {t("tagDetail.sortDue")}
              </Text>
            </Pressable>
          </View>
        </View>
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) =>
            reordering ? (
              <View style={s.reorderRow}>
                <Text
                  style={[
                    s.reorderTitle,
                    item.item_type === ItemType.Divider && s.reorderDivider,
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
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
                  disabled={index === visibleItems.length - 1}
                  style={s.reorderBtn}
                >
                  <Text
                    style={[
                      s.reorderArrow,
                      index === visibleItems.length - 1 && s.reorderDisabled,
                    ]}
                  >
                    ↓
                  </Text>
                </Pressable>
              </View>
            ) : item.item_type === ItemType.Divider ? (
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
                dueDate={dueOf(item)}
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
        </>
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
  headerAction: {
    color: colors.accent,
    fontSize: font.md,
    paddingHorizontal: spacing.sm,
  },
  sortBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sortToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  sortBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sortBtnActive: {
    backgroundColor: colors.surfaceHigh,
  },
  sortBtnText: {
    color: colors.textMuted,
    fontSize: font.sm,
  },
  sortBtnTextActive: {
    color: colors.text,
    fontWeight: "600",
  },
  reorderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginVertical: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  reorderTitle: { color: colors.text, fontSize: font.md, flex: 1 },
  reorderDivider: { color: colors.textMuted, fontStyle: "italic" },
  reorderBtn: { paddingHorizontal: spacing.sm },
  reorderArrow: { color: colors.accent, fontSize: font.lg },
  reorderDisabled: { color: colors.textMuted, opacity: 0.4 },
});
