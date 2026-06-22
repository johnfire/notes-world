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
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TASK_BOARD_STATUSES,
  TaskStatus,
  compareTasksByPriorityThenDue,
} from "@notes-world/shared";
import type { Item, TypeData } from "@notes-world/shared";
import { fetchAllTasks, updateItem } from "../../src/api/items";
import { reportClientError } from "../../src/api/report";
import { useRefreshOnFocus } from "../../src/lib/useRefreshOnFocus";
import { ItemCard } from "../../src/components/ItemCard";
import { STATUS_LABELS, taskStatusOf } from "../../src/lib/taskStatus";
import { colors, spacing, font } from "../../src/theme";

// A single Kanban lane: every task in one status, priority-sorted exactly like
// the web board. The ◄ ► buttons bump a task to the neighbouring status — the
// phone stand-in for dragging between columns — and the task then leaves the
// lane.
export default function TaskLaneScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ status?: string }>();
  // Guard the route param: an unknown status falls back to Open rather than
  // rendering a broken lane.
  const status = (TASK_BOARD_STATUSES as string[]).includes(params.status ?? "")
    ? (params.status as TaskStatus)
    : TaskStatus.Open;
  const statusIndex = TASK_BOARD_STATUSES.indexOf(status);
  const isFirst = statusIndex === 0;
  const isLast = statusIndex === TASK_BOARD_STATUSES.length - 1;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const tasks = await fetchAllTasks();
      setItems(
        tasks
          .filter((it) => taskStatusOf(it) === status)
          .sort(compareTasksByPriorityThenDue),
      );
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TaskLaneScreen.load",
      });
      setError(t("taskBoard.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, t]);

  useRefreshOnFocus(load, { immediate: true });

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  // Move a task to the neighbouring lane. Mirrors the web board + item editor:
  // landing on Done stamps completed_at; leaving Done clears it.
  async function move(item: Item, direction: -1 | 1) {
    const next = TASK_BOARD_STATUSES[statusIndex + direction];
    if (!next) return;
    // Optimistically drop it from this lane — it no longer belongs here.
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const merged: Record<string, unknown> = {
      ...((item.type_data as Record<string, unknown> | null) ?? {}),
      task_status: next,
    };
    if (next === TaskStatus.Done) merged.completed_at = new Date().toISOString();
    else delete merged.completed_at;
    try {
      await updateItem(item.id, { type_data: merged as TypeData });
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TaskLaneScreen.move",
      });
      // Server rejected the change — reload so the task reappears where it was.
      void load();
    }
  }

  const label = STATUS_LABELS[status] ?? status;

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      <Stack.Screen options={{ title: label }} />
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <View style={s.laneRow}>
              <View style={s.cardWrap}>
                <ItemCard
                  item={item}
                  onPress={() => router.push(`/item/${item.id}`)}
                />
              </View>
              <View style={s.arrows}>
                <Pressable
                  onPress={() => move(item, -1)}
                  disabled={isFirst}
                  hitSlop={6}
                  style={s.arrowBtn}
                  accessibilityLabel={t("taskBoard.moveBack")}
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={isFirst ? colors.textMuted : colors.accent}
                  />
                </Pressable>
                <Pressable
                  onPress={() => move(item, 1)}
                  disabled={isLast}
                  hitSlop={6}
                  style={s.arrowBtn}
                  accessibilityLabel={t("taskBoard.moveForward")}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={isLast ? colors.textMuted : colors.accent}
                  />
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={s.empty}>{error ? error : t("taskBoard.empty")}</Text>
          }
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
  loader: { marginTop: spacing.xl },
  laneRow: { flexDirection: "row", alignItems: "center" },
  cardWrap: { flex: 1 },
  arrows: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: spacing.md,
    gap: spacing.xs,
  },
  arrowBtn: { padding: spacing.xs },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
