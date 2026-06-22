import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { TASK_BOARD_STATUSES } from "@notes-world/shared";
import { fetchAllTasks } from "../../src/api/items";
import { reportClientError } from "../../src/api/report";
import { useRefreshOnFocus } from "../../src/lib/useRefreshOnFocus";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  taskStatusOf,
} from "../../src/lib/taskStatus";
import { colors, spacing, radius, font } from "../../src/theme";

// The task board, phone-shaped: a horizontal Kanban doesn't fit a narrow screen,
// so the lanes are a list of statuses with live counts. Tapping a status opens
// that single lane (tasks/[status]). Lane order mirrors the web board exactly.
export default function TasksScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const tasks = await fetchAllTasks();
      const next: Record<string, number> = {};
      for (const status of TASK_BOARD_STATUSES) next[status] = 0;
      for (const item of tasks) {
        const st = taskStatusOf(item);
        if (st) next[st] = (next[st] ?? 0) + 1;
      }
      setCounts(next);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TasksScreen.load",
      });
      setError(t("taskBoard.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Recompute counts whenever the tab regains focus so a status change made on
  // the lane screen (or elsewhere) is reflected here.
  useRefreshOnFocus(load, { immediate: true });

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>{t("tabs.tasks")}</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={TASK_BOARD_STATUSES}
          keyExtractor={(status) => status}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          ListHeaderComponent={
            error ? <Text style={s.error}>{error}</Text> : null
          }
          renderItem={({ item: status }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && s.rowPressed]}
              onPress={() => router.push(`/tasks/${status}` as never)}
            >
              <View
                style={[
                  s.dot,
                  { backgroundColor: STATUS_COLORS[status] ?? colors.accent },
                ]}
              />
              <Text style={s.statusName}>{STATUS_LABELS[status] ?? status}</Text>
              <Text style={s.count}>{counts[status] ?? 0}</Text>
            </Pressable>
          )}
          contentContainerStyle={{
            paddingVertical: spacing.sm,
            paddingBottom: spacing.xl,
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: "700" },
  loader: { marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowPressed: { backgroundColor: colors.surface },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  statusName: { flex: 1, color: colors.text, fontSize: font.md },
  count: {
    color: colors.textMuted,
    fontSize: font.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
    paddingVertical: spacing.sm,
    fontSize: font.sm,
  },
});
