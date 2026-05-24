import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createItem } from "../../src/api/items";
import { colors, spacing, radius, font } from "../../src/theme";
import { ItemType } from "@notes-world/shared";

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

  async function handleSave() {
    if (!title.trim()) return;
    setError("");
    setLoading(true);
    try {
      await createItem({
        title: title.trim(),
        body: body.trim() || undefined,
        item_type: type,
      });
      setTitle("");
      setBody("");
      setType(ItemType.Note);
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
});
