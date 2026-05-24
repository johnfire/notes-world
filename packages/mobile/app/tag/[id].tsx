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
import { getItemsByTag } from "../../src/api/tags";
import { listTags } from "../../src/api/tags";
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

  useEffect(() => {
    listTags().then((tags) => {
      const tag = tags.find((t) => t.id === id);
      if (tag) navigation.setOptions({ headerTitle: tag.name });
    });
  }, [id]);

  async function load() {
    try {
      const res = await getItemsByTag(id);
      setItems(res.items);
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
            <Text style={s.empty}>No items with this tag</Text>
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
