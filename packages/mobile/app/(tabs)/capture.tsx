import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createItem } from "../../src/api/items";
import { listTags, addTagToItem } from "../../src/api/tags";
import { colors, spacing, radius, font } from "../../src/theme";
import { ItemType } from "@notes-world/shared";
import type { TagWithCount } from "@notes-world/shared";

const TYPES: { label: string; value: ItemType }[] = [
  { label: "Note", value: ItemType.Note },
  { label: "Task", value: ItemType.Task },
  { label: "Idea", value: ItemType.Idea },
  { label: "Reminder", value: ItemType.Reminder },
];

const TYPE_COLORS: Record<string, string> = {
  [ItemType.Note]: colors.typeNote,
  [ItemType.Task]: colors.typeTask,
  [ItemType.Idea]: colors.typeIdea,
  [ItemType.Reminder]: colors.typeReminder,
};

export default function CaptureScreen() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<ItemType>(ItemType.Note);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    listTags()
      .then(setAllTags)
      .catch(() => {});
  }, []);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!title.trim()) return;
    setError("");
    setLoading(true);
    try {
      const item = await createItem({
        title: title.trim(),
        body: body.trim() || undefined,
        item_type: type,
      });
      await Promise.all(
        selectedTagIds.map((tagId) => addTagToItem(item.id, tagId)),
      );
      setTitle("");
      setBody("");
      setType(ItemType.Note);
      setSelectedTagIds([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.heading}>Quick Capture</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.typeRow}
            contentContainerStyle={s.typeRowInner}
          >
            {TYPES.map((t) => {
              const active = t.value === type;
              const col = TYPE_COLORS[t.value];
              return (
                <Pressable
                  key={t.value}
                  style={[
                    s.typeChip,
                    active && { backgroundColor: col + "33", borderColor: col },
                  ]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={[s.typeLabel, active && { color: col }]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput
            style={s.titleInput}
            placeholder="Title…"
            placeholderTextColor={colors.textDim}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            maxLength={500}
          />

          <TextInput
            style={s.bodyInput}
            placeholder="Body (optional)…"
            placeholderTextColor={colors.textDim}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
          />

          <View style={s.tagSection}>
            <Text style={s.tagLabel}>Tags</Text>
            <View style={s.chips}>
              {selectedTagIds.map((id) => {
                const tag = allTags.find((t) => t.id === id);
                if (!tag) return null;
                return (
                  <Pressable
                    key={id}
                    style={[
                      s.chip,
                      tag.color ? { borderColor: tag.color } : null,
                    ]}
                    onPress={() => toggleTag(id)}
                  >
                    <Text
                      style={[
                        s.chipText,
                        tag.color ? { color: tag.color } : null,
                      ]}
                    >
                      {tag.name}
                    </Text>
                    <Ionicons
                      name="close"
                      size={13}
                      color={tag.color ?? colors.textMuted}
                    />
                  </Pressable>
                );
              })}
              <Pressable
                style={s.addTagBtn}
                onPress={() => setPickerVisible(true)}
              >
                <Ionicons name="add" size={14} color={colors.accent} />
                <Text style={s.addTagText}>Add tag</Text>
              </Pressable>
            </View>
          </View>

          <Modal
            visible={pickerVisible}
            transparent
            animationType="slide"
            onRequestClose={() => {
              setPickerVisible(false);
              setTagSearch("");
            }}
          >
            <Pressable
              style={s.backdrop}
              onPress={() => {
                setPickerVisible(false);
                setTagSearch("");
              }}
            />
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>Add tag</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search tags…"
                placeholderTextColor={colors.textDim}
                value={tagSearch}
                onChangeText={setTagSearch}
                autoFocus
              />
              <FlatList
                data={allTags.filter(
                  (t) =>
                    !selectedTagIds.includes(t.id) &&
                    t.name.toLowerCase().includes(tagSearch.toLowerCase()),
                )}
                keyExtractor={(t) => t.id}
                renderItem={({ item: tag }) => (
                  <Pressable
                    style={s.tagRow}
                    onPress={() => {
                      toggleTag(tag.id);
                      setPickerVisible(false);
                      setTagSearch("");
                    }}
                  >
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
                  <Text style={s.emptyTags}>
                    {tagSearch ? "No matching tags" : "No tags available"}
                  </Text>
                }
              />
            </View>
          </Modal>

          {!!error && <Text style={s.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              s.saveBtn,
              { backgroundColor: TYPE_COLORS[type] },
              pressed && { opacity: 0.8 },
              !title.trim() && s.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : saved ? (
              <Ionicons name="checkmark" size={22} color={colors.text} />
            ) : (
              <Text style={s.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.md },
  heading: {
    color: colors.text,
    fontSize: font.xxl,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  typeRow: { flexGrow: 0 },
  typeRowInner: { gap: spacing.sm, paddingVertical: spacing.xs },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeLabel: {
    color: colors.textMuted,
    fontSize: font.sm,
    fontWeight: "600",
  },
  titleInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: font.lg,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: colors.border,
  },
  bodyInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: font.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 160,
  },
  error: { color: colors.danger, fontSize: font.sm },
  saveBtn: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.text, fontSize: font.md, fontWeight: "700" },
  tagSection: { gap: spacing.sm },
  tagLabel: {
    color: colors.textMuted,
    fontSize: font.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
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
  chipText: { color: colors.textMuted, fontSize: font.sm },
  addTagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.accentDim,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  addTagText: { color: colors.accent, fontSize: font.sm },
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
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagName: { flex: 1, color: colors.text, fontSize: font.md },
  tagCount: { color: colors.textDim, fontSize: font.sm },
  emptyTags: {
    color: colors.textMuted,
    textAlign: "center",
    padding: spacing.md,
    fontSize: font.md,
  },
});
