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
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { listItems, archiveItem } from "../../src/api/items";
import { reportClientError } from "../../src/api/report";
import { ItemCard } from "../../src/components/ItemCard";
import { useAuth } from "../../src/store/auth";
import { colors, spacing, radius, font } from "../../src/theme";
import type { Item } from "@notes-world/shared";
import { ItemStatus, ItemType } from "@notes-world/shared";

const PAGE_SIZE = 30;

// Home type filter — the mobile analogue of the web view tabs.
const FILTERS: Array<{ value: ItemType | null; labelKey: string }> = [
  { value: null, labelKey: "home.filterAll" },
  { value: ItemType.Task, labelKey: "capture.typeTask" },
  { value: ItemType.Idea, labelKey: "capture.typeIdea" },
  { value: ItemType.Note, labelKey: "capture.typeNote" },
  { value: ItemType.Reminder, labelKey: "capture.typeReminder" },
];

export default function ItemsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ItemType | null>(null);

  const load = useCallback(
    async (p: number, q: string, append = false) => {
      try {
        setError(null);
        const res = await listItems({
          page: p,
          page_size: PAGE_SIZE,
          search: q || undefined,
          status: ItemStatus.Active,
          item_type: filter ?? undefined,
        });
        setTotal(res.total);
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
      } catch (err) {
        void reportClientError({
          message: (err as Error).message,
          stack: (err as Error).stack,
          context: "ItemsScreen.load",
        });
        setError(t("home.loadError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, filter],
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    load(1, search);
  }, [search, filter]);

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
    } catch (err) {
      // Item stays in the list if delete fails, but still report it.
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "ItemsScreen.onDelete",
      });
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
        <Text style={s.title}>{t("home.title")}</Text>
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
          placeholder={t("home.search")}
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={s.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Pressable
              key={f.labelKey}
              onPress={() => setFilter(f.value)}
              style={[s.filterChip, active && s.filterChipActive]}
              hitSlop={4}
            >
              <Text
                style={[s.filterText, active && s.filterTextActive]}
              >
                {t(f.labelKey)}
              </Text>
            </Pressable>
          );
        })}
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
              {error ? error : search ? t("home.noResults") : t("home.empty")}
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: { color: colors.textMuted, fontSize: font.sm, fontWeight: "600" },
  filterTextActive: { color: colors.text },
  loader: { marginTop: spacing.xl },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
