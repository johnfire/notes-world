import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getItemsByTag, listTags } from "../../src/api/tags";
import { archiveItem } from "../../src/api/items";
import { reportClientError } from "../../src/api/report";
import { ItemCard } from "../../src/components/ItemCard";
import { colors, spacing, font } from "../../src/theme";
import type { Item } from "@notes-world/shared";

export default function TagScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTags()
      .then((tags) => {
        const tag = tags.find((t) => t.id === id);
        if (tag) navigation.setOptions({ headerTitle: tag.name });
      })
      .catch((err) => {
        void reportClientError({
          message: (err as Error).message,
          stack: (err as Error).stack,
          context: "TagScreen.headerTitle",
        });
      });
  }, [id]);

  async function onDelete(id: string) {
    try {
      await archiveItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagScreen.onDelete",
      });
    }
  }

  async function load() {
    try {
      setError(null);
      const res = await getItemsByTag(id);
      setItems(res);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TagScreen.load",
      });
      setError("Couldn't load items. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => router.push(`/item/${item.id}`)}
              onDelete={onDelete}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={s.empty}>
              {error ? error : "No items with this tag"}
            </Text>
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
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
