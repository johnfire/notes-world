import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { Tag, TagWithCount } from "@notes-world/shared";
import {
  getTagsForItem,
  listTags,
  addTagToItem,
  removeTagFromItem,
} from "../api/tags";
import { colors, spacing, radius, font } from "../theme";

interface Props {
  itemId: string;
}

export function TagManager({ itemId }: Props) {
  const { t } = useTranslation();
  const [itemTags, setItemTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, [itemId]);

  async function load() {
    try {
      const [tags, all] = await Promise.all([
        getTagsForItem(itemId),
        listTags(),
      ]);
      setItemTags(tags);
      setAllTags(all);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(tag: TagWithCount) {
    setPickerVisible(false);
    setSearch("");
    if (itemTags.find((t) => t.id === tag.id)) return;
    try {
      await addTagToItem(itemId, tag.id);
      setItemTags((prev) => [...prev, tag]);
    } catch {
      // silent
    }
  }

  async function handleRemove(tagId: string) {
    try {
      await removeTagFromItem(itemId, tagId);
      setItemTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch {
      // silent
    }
  }

  const available = allTags.filter(
    (t) =>
      !itemTags.find((it) => it.id === t.id) &&
      t.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <ActivityIndicator color={colors.accent} size="small" />;

  return (
    <View style={s.root}>
      <Text style={s.label}>{t("tags.label")}</Text>
      <View style={s.chips}>
        {itemTags.map((tag) => (
          <View
            key={tag.id}
            style={[s.chip, tag.color ? { borderColor: tag.color } : null]}
          >
            <Text style={[s.chipText, tag.color ? { color: tag.color } : null]}>
              {tag.name}
            </Text>
            <Pressable onPress={() => handleRemove(tag.id)} hitSlop={6}>
              <Ionicons
                name="close"
                size={13}
                color={tag.color ?? colors.textMuted}
              />
            </Pressable>
          </View>
        ))}
        <Pressable style={s.addBtn} onPress={() => setPickerVisible(true)}>
          <Ionicons name="add" size={14} color={colors.accent} />
          <Text style={s.addText}>{t("tags.add")}</Text>
        </Pressable>
      </View>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setPickerVisible(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{t("tags.add")}</Text>
          <TextInput
            style={s.searchInput}
            placeholder={t("tags.search")}
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <FlatList
            data={available}
            keyExtractor={(t) => t.id}
            renderItem={({ item: tag }) => (
              <Pressable style={s.tagRow} onPress={() => handleAdd(tag)}>
                <View
                  style={[
                    s.tagDot,
                    { backgroundColor: tag.color ?? colors.textDim },
                  ]}
                />
                <Text style={s.tagName}>{tag.name}</Text>
                <Text style={s.tagCount}>{tag.item_count}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={s.empty}>
                {search ? t("tags.noMatching") : t("tags.allAdded")}
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    marginTop: spacing.lg,
  },
  label: {
    color: colors.textMuted,
    fontSize: font.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: font.sm,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.accentDim,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  addText: {
    color: colors.accent,
    fontSize: font.sm,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
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
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagName: {
    flex: 1,
    color: colors.text,
    fontSize: font.md,
  },
  tagCount: {
    color: colors.textDim,
    fontSize: font.sm,
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    padding: spacing.md,
    fontSize: font.md,
  },
});
