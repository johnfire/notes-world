import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
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
}

export function ItemCard({ item, onPress }: Props) {
  const typeColor = TYPE_COLORS[item.item_type] ?? colors.typeUntyped;
  const date = new Date(item.updated_at).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });

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
          <Text style={s.date}>{date}</Text>
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
});
