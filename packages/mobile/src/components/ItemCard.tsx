import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { Item } from "@notes-world/shared";
import { ItemType } from "@notes-world/shared";
import { colors, spacing, radius, font } from "../theme";
import { formatDueShort, dateOf, isOverdue } from "../lib/dueDate";
import { STATUS_COLORS, STATUS_LABELS, taskStatusOf } from "../lib/taskStatus";

const TYPE_COLORS: Record<string, string> = {
  [ItemType.Task]: colors.typeTask,
  [ItemType.Note]: colors.typeNote,
  [ItemType.Idea]: colors.typeIdea,
  [ItemType.Reminder]: colors.typeReminder,
  [ItemType.Untyped]: colors.typeUntyped,
  [ItemType.Divider]: colors.typeUntyped,
};

// The coloured left bar + footer status badge (see ../lib/taskStatus) let you
// tell Done from not-done — and each status apart — at a glance in a list.

// Dividers render as a compact one-line section header. A very dark red so they
// stand out against the near-black note cards.
const DIVIDER_BG = "#3d1414";

interface Props {
  item: Item;
  onPress: () => void;
  onDelete?: (id: string) => void;
  // Hierarchy: depth in the parent_id tree (indents the card) and whether the
  // item has children (shows a collapse chevron).
  depth?: number;
  collapsible?: boolean;
  // Collapse state + toggle — used by dividers and by parent items alike.
  collapsed?: boolean;
  hiddenCount?: number;
  onToggle?: () => void;
}

export function ItemCard({
  item,
  onPress,
  onDelete,
  depth,
  collapsible,
  collapsed,
  hiddenCount,
  onToggle,
}: Props) {
  const { t, i18n } = useTranslation();
  const typeColor = TYPE_COLORS[item.item_type] ?? colors.typeUntyped;
  const taskStatus = taskStatusOf(item);
  const statusColor = taskStatus
    ? (STATUS_COLORS[taskStatus] ?? colors.typeTask)
    : null;
  // Tasks show their status on the bar; everything else keeps its type colour.
  const barColor = statusColor ?? typeColor;
  const date = new Date(item.updated_at).toLocaleDateString(i18n.language, {
    day: "2-digit",
    month: "short",
  });
  // Dates come straight off the item so they show wherever a card renders.
  const dueRaw = dateOf(item, "due_date");
  const startRaw = dateOf(item, "start_date");
  const due = dueRaw ? formatDueShort(dueRaw) : "";
  const dueOverdue = dueRaw ? isOverdue(dueRaw) : false;
  const start = startRaw ? formatDueShort(startRaw) : "";

  function handleDelete() {
    Alert.alert(t("item.deleteCardTitle"), t("item.deleteMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => onDelete?.(item.id),
      },
    ]);
  }

  if (item.item_type === ItemType.Divider) {
    return (
      <Pressable
        style={({ pressed }) => [s.divider, pressed && s.cardPressed]}
        onPress={onPress}
      >
        {onToggle && (
          <Pressable
            onPress={onToggle}
            hitSlop={8}
            style={s.chevronBtn}
            accessibilityLabel={
              collapsed
                ? t("tagDetail.expandSection")
                : t("tagDetail.collapseSection")
            }
          >
            <Ionicons
              name={collapsed ? "chevron-forward" : "chevron-down"}
              size={16}
              color={colors.text}
            />
          </Pressable>
        )}
        <Text style={s.dividerText} numberOfLines={1}>
          {item.title}
        </Text>
        {collapsed && !!hiddenCount && (
          <Text style={s.dividerCount}>({hiddenCount})</Text>
        )}
        {onDelete && (
          <Pressable onPress={handleDelete} hitSlop={8} style={s.deleteBtn}>
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        s.card,
        depth ? { marginLeft: spacing.md + depth * 16 } : null,
        pressed && s.cardPressed,
      ]}
      onPress={onPress}
    >
      {collapsible && (
        <Pressable onPress={onToggle} hitSlop={8} style={s.treeChevron}>
          <Ionicons
            name={collapsed ? "chevron-forward" : "chevron-down"}
            size={16}
            color={colors.textMuted}
          />
        </Pressable>
      )}
      <View style={[s.typeBar, { backgroundColor: barColor }]} />
      <View style={s.content}>
        <Text style={s.title} numberOfLines={2}>
          {!!due && (
            <Text style={dueOverdue ? s.dueInlineOverdue : s.dueInline}>
              {due}{"  "}
            </Text>
          )}
          {item.title}
        </Text>
        {!!item.body && (
          <Text style={s.body} numberOfLines={2}>
            {item.body}
          </Text>
        )}
        <View style={s.footer}>
          <View style={s.footerLeft}>
            <Text style={[s.badge, { color: typeColor }]}>
              {item.item_type}
            </Text>
            {taskStatus && statusColor && (
              <Text style={[s.badge, { color: statusColor }]}>
                {STATUS_LABELS[taskStatus] ?? taskStatus}
              </Text>
            )}
          </View>
          <View style={s.footerRight}>
            {!!start && (
              <View style={s.dueWrap}>
                <Ionicons
                  name="play-outline"
                  size={12}
                  color={colors.textMuted}
                />
                <Text style={s.start}>{start}</Text>
              </View>
            )}
            <Text style={s.date}>{date}</Text>
            {onDelete && (
              <Pressable onPress={handleDelete} hitSlop={8} style={s.deleteBtn}>
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={colors.textDim}
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.75,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DIVIDER_BG,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dividerText: {
    flex: 1,
    color: colors.text,
    fontSize: font.md,
    fontWeight: "700",
  },
  chevronBtn: {
    marginRight: spacing.sm,
  },
  dividerCount: {
    color: colors.textMuted,
    fontSize: font.sm,
    marginRight: spacing.sm,
  },
  typeBar: {
    width: 4,
  },
  treeChevron: {
    paddingHorizontal: spacing.xs,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: font.md,
    fontWeight: "600",
  },
  body: {
    color: colors.textMuted,
    fontSize: font.sm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  date: {
    color: colors.textDim,
    fontSize: 11,
  },
  dueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dueInline: {
    color: colors.accent,
    fontWeight: "700",
  },
  dueInlineOverdue: {
    color: colors.danger,
    fontWeight: "700",
  },
  start: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 2,
  },
});
