import React, { useEffect, useState } from "react";
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
import { listTags } from "../../src/api/tags";
import { reportClientError } from "../../src/api/report";
import { colors, spacing, radius, font } from "../../src/theme";
import type { TagWithCount } from "@notes-world/shared";

export default function TagsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await listTags();
      setTags(data);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagsScreen.load",
      });
      setError(t("tags.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Text style={s.heading}>{t("tags.title")}</Text>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(t) => t.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && s.rowPressed]}
              onPress={() => router.push(`/tag/${item.id}` as never)}
            >
              <View
                style={[
                  s.dot,
                  { backgroundColor: item.color ?? colors.accent },
                ]}
              />
              <Text style={s.tagName}>{item.name}</Text>
              <Text style={s.count}>{item.item_count ?? 0}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={s.empty}>{error ? error : t("tags.empty")}</Text>
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  heading: {
    color: colors.text,
    fontSize: font.xxl,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  tagName: { flex: 1, color: colors.text, fontSize: font.md },
  count: {
    color: colors.textMuted,
    fontSize: font.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
