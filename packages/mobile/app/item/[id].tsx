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
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getItem,
  updateItem,
  archiveItem,
  deleteItem,
} from "../../src/api/items";
import { reportClientError } from "../../src/api/report";
import { TagManager } from "../../src/components/TagManager";
import {
  formatDueShort,
  dateOf,
  mergeTypeData,
  type DateField,
} from "../../src/lib/dueDate";
import { colors, spacing, radius, font } from "../../src/theme";
import { ItemType, TaskStatus, Priority } from "@notes-world/shared";
import type { Item, TypeData } from "@notes-world/shared";

// Picked Date -> local YYYY-MM-DD (date-only; avoids a UTC off-by-one day).
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateOr(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

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
  // Open date picker ("due_date" | "start_date" | null) and in-flight save flag.
  const [picker, setPicker] = useState<DateField | null>(null);
  const [savingDates, setSavingDates] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

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

  // Dates live in the type_data JSON blob, which the server replaces wholesale,
  // so we merge the change into the existing type_data and send the whole thing.
  // A null value clears the field. Persists immediately (no Save button needed).
  async function persistDate(field: DateField, value: string | null) {
    if (!item) return;
    const merged = mergeTypeData(item.type_data, field, value);
    setSavingDates(true);
    try {
      const updated = await updateItem(item.id, {
        type_data: merged as TypeData,
      });
      setItem(updated);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ItemScreen.persistDate",
      });
      Alert.alert(t("item.saveFailedTitle"), t("item.saveFailedMsg"));
    } finally {
      setSavingDates(false);
    }
  }

  // Status/priority also live in the type_data blob — merge in the change and
  // send the whole thing. A null value clears the field (e.g. completed_at when
  // moving a task off Done). Persists immediately.
  async function persistTaskField(patch: Record<string, string | null>) {
    if (!item) return;
    const merged: Record<string, unknown> = {
      ...((item.type_data as Record<string, unknown> | null) ?? {}),
    };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete merged[key];
      else merged[key] = value;
    }
    setSavingTask(true);
    try {
      const updated = await updateItem(item.id, { type_data: merged as TypeData });
      setItem(updated);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ItemScreen.persistTaskField",
      });
      Alert.alert(t("item.saveFailedTitle"), t("item.saveFailedMsg"));
    } finally {
      setSavingTask(false);
    }
  }

  function dateRow(field: DateField, label: string, value?: string) {
    return (
      <View style={s.dateRow}>
        <Text style={s.dateLabel}>{label}</Text>
        <Pressable
          style={s.dateValueBtn}
          onPress={() => setPicker(field)}
          disabled={savingDates}
          hitSlop={6}
        >
          <Ionicons
            name="calendar-outline"
            size={15}
            color={value ? colors.accent : colors.textDim}
          />
          <Text style={[s.dateValue, !value && s.dateValueEmpty]}>
            {value ? formatDueShort(value) : t("item.dateNotSet")}
          </Text>
        </Pressable>
        {!!value && (
          <Pressable
            onPress={() => void persistDate(field, null)}
            hitSlop={8}
            disabled={savingDates}
            style={s.dateClear}
          >
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    );
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
  const taskTd = item.type_data as {
    task_status?: string;
    priority?: string;
  } | null;
  const statusValue = taskTd?.task_status ?? TaskStatus.Open;
  const priorityValue = taskTd?.priority ?? Priority.Normal;

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
          {item.item_type !== ItemType.Divider && (
            <View style={s.dates}>
              {dateRow(
                "due_date",
                t("item.dueDate"),
                dateOf(item, "due_date"),
              )}
              {dateRow(
                "start_date",
                t("item.startDate"),
                dateOf(item, "start_date"),
              )}
            </View>
          )}
          {item.item_type === ItemType.Task && (
            <View style={s.fields}>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{t("item.status")}</Text>
                <View style={s.chipRow}>
                  {Object.values(TaskStatus).map((st) => {
                    const active = statusValue === st;
                    return (
                      <Pressable
                        key={st}
                        disabled={savingTask}
                        onPress={() =>
                          void persistTaskField({
                            task_status: st,
                            completed_at:
                              st === TaskStatus.Done
                                ? new Date().toISOString()
                                : null,
                          })
                        }
                        style={[s.chip, active && s.chipActive]}
                        hitSlop={4}
                      >
                        <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                          {st}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{t("item.priority")}</Text>
                <View style={s.chipRow}>
                  {Object.values(Priority).map((p) => {
                    const active = priorityValue === p;
                    return (
                      <Pressable
                        key={p}
                        disabled={savingTask}
                        onPress={() => void persistTaskField({ priority: p })}
                        style={[s.chip, active && s.chipActive]}
                        hitSlop={4}
                      >
                        <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                          {p}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
          {picker && (
            <DateTimePicker
              value={parseDateOr(dateOf(item, picker), new Date())}
              mode="date"
              onChange={(event, date) => {
                setPicker(null);
                if (event.type === "set" && date)
                  void persistDate(picker, toISODate(date));
              }}
            />
          )}
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
  dates: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  dateLabel: {
    flex: 1,
    color: colors.textMuted,
    fontSize: font.sm,
  },
  dateValueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  dateValue: {
    color: colors.accent,
    fontSize: font.md,
    fontWeight: "600",
  },
  dateValueEmpty: {
    color: colors.textDim,
    fontWeight: "400",
  },
  dateClear: {
    marginLeft: spacing.xs,
  },
  fields: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: font.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipTxt: {
    color: colors.textMuted,
    fontSize: font.sm,
    fontWeight: "600",
  },
  chipTxtActive: {
    color: colors.text,
    fontWeight: "700",
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
