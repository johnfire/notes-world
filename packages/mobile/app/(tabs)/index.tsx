import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  TextInput,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { listItems, archiveItem } from "../../src/api/items";
import { ItemCard } from "../../src/components/ItemCard";
import { useAuth } from "../../src/store/auth";
import { colors, spacing, radius, font } from "../../src/theme";
import type { Item } from "@notes-world/shared";
import { ItemStatus } from "@notes-world/shared";

const PAGE_SIZE = 30;

export default function ItemsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (p: number, q: string, append = false) => {
    try {
      const res = await listItems({
        page: p,
        page_size: PAGE_SIZE,
        search: q || undefined,
        status: ItemStatus.Active,
      });
      setTotal(res.total);
      setItems((prev) => (append ? [...prev, ...res.items] : res.items));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    load(1, search);
  }, [search]);

  function onRefresh() {
    setRefreshing(true);
    setPage(1);
    load(1, search);
  }

  async function onDelete(id: string) {
    try {
      await archiveItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => t - 1);
    } catch {
      // silent — item stays in list if delete fails
    }
  }

  function onEndReached() {
    if (items.length >= total) return;
    const next = page + 1;
    setPage(next);
    load(next, search, true);
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Notes</Text>
        <Pressable onPress={logout} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={s.searchRow}>
        <Ionicons
          name="search-outline"
          size={16}
          color={colors.textDim}
          style={s.searchIcon}
        />
        <TextInput
          style={s.search}
          placeholder="Search…"
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

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
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={s.empty}>
              {search ? "No results" : "No items yet"}
            </Text>
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: font.xxl,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: spacing.xs },
  search: {
    flex: 1,
    color: colors.text,
    fontSize: font.md,
    paddingVertical: spacing.sm,
  },
  loader: { marginTop: spacing.xl },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
