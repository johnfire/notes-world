import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDashboard } from "../src/api/dashboard";
import { listItems } from "../src/api/items";
import { listTags, getItemsByTag } from "../src/api/tags";
import { reportClientError } from "../src/api/report";
import { colors, spacing, radius, font } from "../src/theme";
import {
  ViewType,
  ItemType,
  ItemStatus,
  TaskStatus,
  isOverdue,
  dateOf,
} from "@notes-world/shared";
import type { Block, Item, TagWithCount } from "@notes-world/shared";

interface BlockData {
  block: Block;
  items?: Item[];
  tags?: TagWithCount[];
}

async function fetchBlockData(block: Block): Promise<BlockData> {
  const cfg = block.config ?? {};
  const limit = cfg.limit ?? 5;
  const tasks = async () =>
    (
      await listItems({
        item_type: ItemType.Task,
        status: ItemStatus.Active,
        page_size: 100,
      })
    ).items;

  switch (block.view_type) {
    case ViewType.RecentItems:
      return {
        block,
        items: (await listItems({ status: ItemStatus.Active, page_size: limit }))
          .items,
      };
    case ViewType.Notes:
      return {
        block,
        items: cfg.filter_tag_id
          ? await getItemsByTag(cfg.filter_tag_id)
          : (
              await listItems({
                item_type: ItemType.Note,
                status: ItemStatus.Active,
                page_size: limit,
              })
            ).items,
      };
    case ViewType.Ideas:
      return {
        block,
        items: (
          await listItems({
            item_type: ItemType.Idea,
            status: ItemStatus.Active,
            page_size: limit,
          })
        ).items,
      };
    case ViewType.ItemsByTag:
      return {
        block,
        items: cfg.tag_id ? await getItemsByTag(cfg.tag_id) : [],
      };
    case ViewType.ActionableTasks: {
      const all = await tasks();
      return {
        block,
        items: all.filter((i) => {
          const st = (i.type_data as { task_status?: string } | null)
            ?.task_status;
          return st === TaskStatus.Open || st === TaskStatus.InProgress;
        }),
      };
    }
    case ViewType.BlockedTasks: {
      const all = await tasks();
      return {
        block,
        items: all.filter(
          (i) =>
            (i.type_data as { task_status?: string } | null)?.task_status ===
            TaskStatus.Blocked,
        ),
      };
    }
    case ViewType.OverdueTasks: {
      const all = await tasks();
      return {
        block,
        items: all.filter((i) => {
          const st = (i.type_data as { task_status?: string } | null)
            ?.task_status;
          const due = dateOf(i, "due_date");
          return st !== TaskStatus.Done && !!due && isOverdue(due);
        }),
      };
    }
    case ViewType.TagCloud:
      return { block, tags: await listTags() };
    default:
      return { block };
  }
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const [data, setData] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerTitle: t("dashboard.title") });
  }, [t]);

  async function load() {
    try {
      const { blocks } = await getDashboard();
      const ordered = [...blocks]
        .filter(
          (b) =>
            b.view_type !== ViewType.QuickCapture &&
            b.view_type !== ViewType.DependencyGraph,
        )
        .sort((a, b) => a.row - b.row || a.column - b.column);
      const resolved = await Promise.all(ordered.map(fetchBlockData));
      setData(resolved);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "DashboardScreen.load",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
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
      >
        {data.length === 0 && (
          <Text style={s.empty}>{t("dashboard.empty")}</Text>
        )}
        {data.map(({ block, items, tags }) => (
          <View key={block.id} style={s.card}>
            <Text style={s.cardTitle}>{block.title || block.view_type}</Text>
            {tags ? (
              <View style={s.tagWrap}>
                {tags.map((tag) => (
                  <Pressable
                    key={tag.id}
                    style={s.tagChip}
                    onPress={() => router.push(`/tag/${tag.id}` as never)}
                  >
                    <Text style={s.tagChipText}>
                      {tag.name} {tag.item_count ?? 0}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : items && items.length > 0 ? (
              items.slice(0, block.config?.limit ?? 8).map((item) => (
                <Pressable
                  key={item.id}
                  style={s.itemRow}
                  onPress={() => router.push(`/item/${item.id}`)}
                >
                  {(() => {
                    const due = dateOf(item, "due_date");
                    if (!due) return null;
                    return (
                      <Text
                        style={[
                          s.due,
                          isOverdue(due) && { color: colors.danger },
                        ]}
                      >
                        {due.slice(5, 10)}{" "}
                      </Text>
                    );
                  })()}
                  <Text style={s.itemText} numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={s.emptyBlock}>{t("dashboard.emptyBlock")}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: font.md,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemText: { flex: 1, color: colors.text, fontSize: font.sm },
  due: { color: colors.accent, fontSize: font.sm, fontWeight: "700" },
  emptyBlock: { color: colors.textDim, fontSize: font.sm, fontStyle: "italic" },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tagChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagChipText: { color: colors.textMuted, fontSize: font.sm },
});
