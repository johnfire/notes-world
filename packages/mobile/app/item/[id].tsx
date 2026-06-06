import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getItem,
  updateItem,
  archiveItem,
  deleteItem,
} from "../../src/api/items";
import { reportClientError } from "../../src/api/report";
import { TagManager } from "../../src/components/TagManager";
import { colors, spacing, radius, font } from "../../src/theme";
import { ItemType } from "@notes-world/shared";
import type { Item } from "@notes-world/shared";

const TYPE_COLORS: Record<string, string> = {
  [ItemType.Task]: colors.typeTask,
  [ItemType.Note]: colors.typeNote,
  [ItemType.Idea]: colors.typeIdea,
  [ItemType.Reminder]: colors.typeReminder,
  [ItemType.Untyped]: colors.typeUntyped,
};

export default function ItemScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [item, setItem] = useState<Item | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getItem(id);
        setItem(data);
        setTitle(data.title);
        setBody(data.body ?? "");
      } catch (err) {
        void reportClientError({
          message: (err as Error).message,
          stack: (err as Error).stack,
          context: "ItemScreen.load",
        });
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!item) return;
    setDirty(title !== item.title || body !== (item.body ?? ""));
  }, [title, body, item]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        dirty ? (
          <Pressable
            onPress={handleSave}
            hitSlop={8}
            style={{ marginRight: 4 }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text
                style={{
                  color: colors.accent,
                  fontSize: font.md,
                  fontWeight: "700",
                }}
              >
                {t("common.save")}
              </Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={handleArchive}
            hitSlop={8}
            style={{ marginRight: 4 }}
          >
            <Ionicons
              name="archive-outline"
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ),
    });
  }, [dirty, saving, title, body, t]);

  async function handleSave() {
    if (!item || !dirty) return;
    setSaving(true);
    try {
      const updated = await updateItem(item.id, {
        title,
        body: body || undefined,
      });
      setItem(updated);
      setDirty(false);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ItemScreen.handleSave",
      });
      Alert.alert(t("item.saveFailedTitle"), t("item.saveFailedMsg"));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(t("item.deleteTitle"), t("item.deleteMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          if (!item) return;
          try {
            await archiveItem(item.id);
            await deleteItem(item.id);
            router.back();
          } catch (err) {
            void reportClientError({
              message: (err as Error).message,
              stack: (err as Error).stack,
              context: "ItemScreen.handleDelete",
            });
            Alert.alert(t("item.deleteFailedTitle"), t("item.deleteFailedMsg"));
          }
        },
      },
    ]);
  }

  function handleArchive() {
    Alert.alert(t("item.archiveTitle"), t("item.archiveMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.archive"),
        style: "destructive",
        onPress: async () => {
          if (!item) return;
          try {
            await archiveItem(item.id);
            router.back();
          } catch (err) {
            void reportClientError({
              message: (err as Error).message,
              stack: (err as Error).stack,
              context: "ItemScreen.handleArchive",
            });
            Alert.alert(
              t("item.archiveFailedTitle"),
              t("item.archiveFailedMsg"),
            );
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={s.center}>
        <Text style={{ color: colors.textMuted }}>
          {loadError ? t("item.loadError") : t("item.notFound")}
        </Text>
      </View>
    );
  }

  const typeColor = TYPE_COLORS[item.item_type] ?? colors.typeUntyped;

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.typeBadge, { color: typeColor }]}>
            {item.item_type}
          </Text>
          <TextInput
            style={s.titleInput}
            value={title}
            onChangeText={setTitle}
            multiline
            placeholder={t("item.title")}
            placeholderTextColor={colors.textDim}
          />
          <TextInput
            style={s.bodyInput}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            placeholder={t("item.body")}
            placeholderTextColor={colors.textDim}
          />
          <TagManager itemId={item.id} />
          <Pressable style={s.deleteBtn} onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={s.deleteTxt}>{t("item.deleteNote")}</Text>
          </Pressable>
          <Text style={s.meta}>
            {t("item.updated", {
              date: new Date(item.updated_at).toLocaleDateString(i18n.language),
            })}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { padding: spacing.md, gap: spacing.sm },
  typeBadge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  titleInput: {
    color: colors.text,
    fontSize: font.xl,
    fontWeight: "700",
    lineHeight: 28,
    paddingVertical: spacing.sm,
  },
  bodyInput: {
    color: colors.text,
    fontSize: font.md,
    lineHeight: 22,
    minHeight: 200,
    paddingTop: spacing.sm,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  deleteTxt: {
    color: colors.danger,
    fontSize: font.sm,
  },
  meta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: spacing.sm,
  },
});
