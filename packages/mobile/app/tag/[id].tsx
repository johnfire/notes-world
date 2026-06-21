import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { getItemsByTag, listTags, addTagToItem } from "../../src/api/tags";
import { archiveItem, createDivider, setParent } from "../../src/api/items";
import {
  collapsedDividers,
  hideCompleted as hideCompletedApi,
  getSortOrder,
  saveSortOrder,
} from "../../src/api/sortOrders";
import { reportClientError } from "../../src/api/report";
import { ItemCard } from "../../src/components/ItemCard";
import {
  getParentDividerMap,
  getHiddenCounts,
} from "../../src/lib/dividerGrouping";
import {
  computeDepths,
  parentsWithChildren,
  hiddenByCollapse,
} from "../../src/lib/hierarchy";
import { applySavedOrder, moveItem } from "../../src/lib/sortItems";
import {
  sortItemsByDate,
  sortItemsByStatus,
  isCompleted,
  type DateField,
} from "../../src/lib/dueDate";
import { colors, spacing, font, radius } from "../../src/theme";
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
  const [reordering, setReordering] = useState(false);
  // Per-tag "hide completed" view filter. Default ON; persisted like sort order.
  const [hideCompleted, setHideCompleted] = useState(true);

  // One-shot reorder: rearrange by a date field once (soonest first, undated
  // last) and persist it as the normal manual order. Manual drag stays fully
  // available afterwards — this just gives the list a quick starting order.
  function persistOrder(ordered: typeof items, context: string) {
    setItems(ordered);
    saveSortOrder(
      `tag:${id}`,
      ordered.map((i) => i.id),
    ).catch((err) => {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context,
      });
    });
  }

  function sortByDate(field: DateField) {
    persistOrder(sortItemsByDate(items, field), "TagScreen.sortByDate");
  }

  function sortByStatus() {
    persistOrder(sortItemsByStatus(items), "TagScreen.sortByStatus");
  }

  async function addDivider() {
    try {
      const divider = await createDivider();
      await addTagToItem(divider.id, id);
      await load();
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagScreen.addDivider",
      });
    }
  }

  function toggleHideCompleted() {
    setHideCompleted((prev) => {
      const next = !prev;
      // Fire-and-forget: keep the state the user just set even if the save
      // fails (matches the collapse toggle).
      hideCompletedApi.save(id, next).catch((err) => {
        void reportClientError({
          message: (err as Error).message,
          stack: (err as Error).stack,
          context: "TagScreen.toggleHideCompleted",
        });
      });
      return next;
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
      const [res, collapsedIds, orderRows, hidden] = await Promise.all([
        getItemsByTag(id),
        // If the collapsed-state fetch fails, fall back to nothing collapsed.
        collapsedDividers.get(id).catch(() => [] as string[]),
        // If the saved-order fetch fails, fall back to server order.
        getSortOrder(`tag:${id}`).catch(
          () => [] as Array<{ item_id: string; sort_order: number }>,
        ),
        // A failed fetch falls back to the default (ON) — completed stay hidden.
        hideCompletedApi.get(id).catch(() => true),
      ]);
      setItems(applySavedOrder(res, orderRows));
      setCollapsed(new Set(collapsedIds));
      setHideCompleted(hidden);
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
      headerRight: () => (
        <Pressable onPress={() => setReordering((r) => !r)} hitSlop={8}>
          <Text style={s.headerAction}>
            {reordering ? t("common.done") : t("tagDetail.reorder")}
          </Text>
        </Pressable>
      ),
    });
  }, [reordering, t]);

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

  async function setItemParent(item: Item, parentId: string | null) {
    try {
      const updated = await setParent(item.id, parentId);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagScreen.setItemParent",
      });
    }
  }

  // Nest under the nearest non-divider item directly above — it's adjacent, so
  // the flat order stays a valid tree without any reordering.
  function indentItem(index: number) {
    const item = items[index];
    let prev: Item | null = null;
    for (let j = index - 1; j >= 0; j--) {
      if (items[j].item_type !== ItemType.Divider) {
        prev = items[j];
        break;
      }
    }
    if (prev && prev.id !== item.parent_id && prev.id !== item.id) {
      void setItemParent(item, prev.id);
    }
  }

  // Move up one level toward the top (parent → grandparent, or out to the top).
  function outdentItem(item: Item) {
    const parent = item.parent_id
      ? items.find((i) => i.id === item.parent_id)
      : undefined;
    void setItemParent(item, parent?.parent_id ?? null);
  }

  const parentDividerMap = getParentDividerMap(items);
  const hiddenCounts = getHiddenCounts(items);
  const depths = computeDepths(items);
  const parentsSet = parentsWithChildren(items);
  const hiddenByParent = hiddenByCollapse(items, collapsed);
  // Hide items whose parent divider is collapsed; dividers always stay visible.
  // While reordering, show everything so positions are unambiguous.
  const visibleItems = reordering
    ? items
    : items.filter((item) => {
        const parent = parentDividerMap.get(item.id);
        if (parent && collapsed.has(parent)) return false;
        if (hiddenByParent.has(item.id)) return false;
        // Pure view filter — toggling off (or un-completing an item) brings it
        // back with all its tags intact.
        if (hideCompleted && isCompleted(item)) return false;
        return true;
      });

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <>
        <View style={s.sortBar}>
          <Pressable onPress={addDivider} style={s.sortBtn} hitSlop={6}>
            <Text style={s.sortBtnText}>{t("tagDetail.addDivider")}</Text>
          </Pressable>
          <Pressable
            onPress={toggleHideCompleted}
            style={[s.sortBtn, hideCompleted && s.sortBtnActive]}
            hitSlop={6}
            accessibilityRole="switch"
            accessibilityState={{ checked: hideCompleted }}
          >
            <Text style={s.sortBtnText}>
              {hideCompleted ? "✓ " : ""}
              {t("tagDetail.hideCompleted")}
            </Text>
          </Pressable>
          <Text style={s.sortByLabel}>{t("tagDetail.sortBy")}</Text>
          {(
            [
              ["due_date", "tagDetail.sortDue"],
              ["start_date", "tagDetail.sortStart"],
            ] as Array<[DateField, string]>
          ).map(([field, label]) => (
            <Pressable
              key={field}
              onPress={() => sortByDate(field)}
              style={s.sortBtn}
              hitSlop={6}
            >
              <Text style={s.sortBtnText}>{t(label)}</Text>
            </Pressable>
          ))}
          <Pressable onPress={sortByStatus} style={s.sortBtn} hitSlop={6}>
            <Text style={s.sortBtnText}>{t("tagDetail.sortStatus")}</Text>
          </Pressable>
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
                    { marginLeft: (depths.get(item.id) ?? 0) * 16 },
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
                {item.item_type !== ItemType.Divider && (
                  <>
                    <Pressable
                      onPress={() => outdentItem(item)}
                      hitSlop={8}
                      disabled={!item.parent_id}
                      style={s.reorderBtn}
                    >
                      <Text
                        style={[
                          s.reorderArrow,
                          !item.parent_id && s.reorderDisabled,
                        ]}
                      >
                        ⇤
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => indentItem(index)}
                      hitSlop={8}
                      style={s.reorderBtn}
                    >
                      <Text style={s.reorderArrow}>⇥</Text>
                    </Pressable>
                  </>
                )}
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
                depth={depths.get(item.id) ?? 0}
                collapsible={parentsSet.has(item.id)}
                collapsed={collapsed.has(item.id)}
                onToggle={() => toggleCollapse(item.id)}
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
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sortByLabel: {
    color: colors.textMuted,
    fontSize: font.sm,
    marginRight: "auto",
  },
  sortBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sortBtnActive: {
    borderColor: colors.accent,
  },
  sortBtnText: {
    color: colors.accent,
    fontSize: font.sm,
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
