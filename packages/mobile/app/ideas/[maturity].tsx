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
import { IDEA_BOARD_MATURITIES, IdeaMaturity } from "@notes-world/shared";
import type { Item, TypeData } from "@notes-world/shared";
import { fetchAllIdeas, updateItem } from "../../src/api/items";
import { reportClientError } from "../../src/api/report";
import { useRefreshOnFocus } from "../../src/lib/useRefreshOnFocus";
import { ItemCard } from "../../src/components/ItemCard";
import { maturityOf } from "../../src/lib/ideaMaturity";
import { colors, spacing, font } from "../../src/theme";

// A single idea-maturity lane — same shape as a task lane, but the axis is
// maturity. Ideas have no priority/due, so within a stage we sort freshest
// first. The ◄ ► buttons bump an idea to the neighbouring stage (it then leaves
// the lane); unlike tasks, changing maturity has no side effect to stamp.
export default function IdeaLaneScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ maturity?: string }>();
  // Guard the route param: an unknown maturity falls back to Seed rather than
  // rendering a broken lane.
  const maturity = (IDEA_BOARD_MATURITIES as string[]).includes(
    params.maturity ?? "",
  )
    ? (params.maturity as IdeaMaturity)
    : IdeaMaturity.Seed;
  const index = IDEA_BOARD_MATURITIES.indexOf(maturity);
  const isFirst = index === 0;
  const isLast = index === IDEA_BOARD_MATURITIES.length - 1;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const ideas = await fetchAllIdeas();
      setItems(
        ideas
          .filter((it) => maturityOf(it) === maturity)
          // Freshest first — recency is the most useful order within a stage.
          .sort((a, b) =>
            a.updated_at < b.updated_at
              ? 1
              : a.updated_at > b.updated_at
                ? -1
                : 0,
          ),
      );
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "IdeaLaneScreen.load",
      });
      setError(t("ideaBoard.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [maturity, t]);

  useRefreshOnFocus(load, { immediate: true });

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  // Move an idea to the neighbouring stage — just sets maturity, no completed_at
  // bookkeeping (that's tasks-only).
  async function move(item: Item, direction: -1 | 1) {
    const next = IDEA_BOARD_MATURITIES[index + direction];
    if (!next) return;
    // Optimistically drop it from this lane — it no longer belongs here.
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const merged: Record<string, unknown> = {
      ...((item.type_data as Record<string, unknown> | null) ?? {}),
      maturity: next,
    };
    try {
      await updateItem(item.id, { type_data: merged as TypeData });
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "IdeaLaneScreen.move",
      });
      // Server rejected the change — reload so the idea reappears where it was.
      void load();
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      <Stack.Screen options={{ title: maturity }} />
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
                  accessibilityLabel={t("ideaBoard.moveBack")}
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
                  accessibilityLabel={t("ideaBoard.moveForward")}
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
            <Text style={s.empty}>{error ? error : t("ideaBoard.empty")}</Text>
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
