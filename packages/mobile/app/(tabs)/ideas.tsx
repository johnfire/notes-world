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
import { IDEA_BOARD_MATURITIES } from "@notes-world/shared";
import { fetchAllIdeas } from "../../src/api/items";
import { reportClientError } from "../../src/api/report";
import { useRefreshOnFocus } from "../../src/lib/useRefreshOnFocus";
import { MATURITY_COLORS, maturityOf } from "../../src/lib/ideaMaturity";
import { colors, spacing, radius, font } from "../../src/theme";

// The idea board, phone-shaped — same drill-down as the task board, but the axis
// is maturity instead of status. The stages are a list with live counts; tapping
// one opens that lane (ideas/[maturity]). Stage order mirrors the web Ideas board.
export default function IdeasScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const ideas = await fetchAllIdeas();
      const next: Record<string, number> = {};
      for (const maturity of IDEA_BOARD_MATURITIES) next[maturity] = 0;
      for (const item of ideas) {
        const m = maturityOf(item);
        if (m) next[m] = (next[m] ?? 0) + 1;
      }
      setCounts(next);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "IdeasScreen.load",
      });
      setError(t("ideaBoard.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Recompute counts whenever the tab regains focus so a maturity change made on
  // the lane screen (or elsewhere) is reflected here.
  useRefreshOnFocus(load, { immediate: true });

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>{t("tabs.ideas")}</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={IDEA_BOARD_MATURITIES}
          keyExtractor={(maturity) => maturity}
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
          renderItem={({ item: maturity }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && s.rowPressed]}
              onPress={() => router.push(`/ideas/${maturity}` as never)}
            >
              <View
                style={[
                  s.dot,
                  { backgroundColor: MATURITY_COLORS[maturity] ?? colors.accent },
                ]}
              />
              <Text style={s.maturityName}>{maturity}</Text>
              <Text style={s.count}>{counts[maturity] ?? 0}</Text>
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
  maturityName: { flex: 1, color: colors.text, fontSize: font.md },
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
