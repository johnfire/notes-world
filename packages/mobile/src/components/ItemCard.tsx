import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Item } from "@notes-world/shared";
import { ItemType } from "@notes-world/shared";
import { colors, spacing, radius, font } from "../theme";

const TYPE_COLORS: Record<string, string> = {
  [ItemType.Task]: colors.typeTask,
  [ItemType.Note]: colors.typeNote,
  [ItemType.Idea]: colors.typeIdea,
  [ItemType.Reminder]: colors.typeReminder,
  [ItemType.Untyped]: colors.typeUntyped,
  [ItemType.Divider]: colors.typeUntyped,
};

interface Props {
  item: Item;
  onPress: () => void;
  onDelete?: (id: string) => void;
}

export function ItemCard({ item, onPress, onDelete }: Props) {
  const typeColor = TYPE_COLORS[item.item_type] ?? colors.typeUntyped;
  const date = new Date(item.updated_at).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });

  function handleDelete() {
    Alert.alert("Delete note?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete?.(item.id),
      },
    ]);
  }

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      onPress={onPress}
    >
      <View style={[s.typeBar, { backgroundColor: typeColor }]} />
      <View style={s.content}>
        <Text style={s.title} numberOfLines={2}>
          {item.title}
        </Text>
        {!!item.body && (
          <Text style={s.body} numberOfLines={2}>
            {item.body}
          </Text>
        )}
        <View style={s.footer}>
          <Text style={[s.badge, { color: typeColor }]}>{item.item_type}</Text>
          <View style={s.footerRight}>
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
  typeBar: {
    width: 4,
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
  deleteBtn: {
    padding: 2,
  },
});
