import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTrash, restoreItem, deleteItem } from "../src/api/items";
import { reportClientError } from "../src/api/report";
import { colors, spacing, radius, font } from "../src/theme";
import type { Item } from "@notes-world/shared";

// Days remaining before the server auto-purges an archived item (30-day window).
function daysLeft(item: Item): number {
  if (!item.archived_at) return 30;
  const elapsed = Math.floor(
    (Date.now() - new Date(item.archived_at).getTime()) / 86400000,
  );
  return Math.max(0, 30 - elapsed);
}

export default function TrashScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerTitle: t("account.trash") });
  }, [t]);

  async function load() {
    try {
      setError(false);
      setItems(await getTrash());
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TrashScreen.load",
      });
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onRestore(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await restoreItem(id);
    } catch (err) {
      void reportClientError({
        message: (err as Error).message,
        stack: (err as Error).stack,
        context: "TrashScreen.restore",
      });
      load();
    }
  }

  function onPurge(id: string) {
    Alert.alert(t("trash.purgeTitle"), t("trash.purgeMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          setItems((prev) => prev.filter((i) => i.id !== id));
          try {
            await deleteItem(id);
          } catch (err) {
            void reportClientError({
              message: (err as Error).message,
              stack: (err as Error).stack,
              context: "TrashScreen.purge",
            });
            load();
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

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.xs,
        }}
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
            {error ? t("trash.loadError") : t("trash.empty")}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.info}>
              <Text style={s.title} numberOfLines={1}>
                {item.title}
              </Text>
              {!!item.body && (
                <Text style={s.body} numberOfLines={1}>
                  {item.body}
                </Text>
              )}
              <Text style={s.days}>
                {t("trash.daysLeft", { days: daysLeft(item) })}
              </Text>
            </View>
            <Pressable
              onPress={() => onRestore(item.id)}
              hitSlop={6}
              style={s.action}
            >
              <Text style={s.restore}>{t("trash.restore")}</Text>
            </Pressable>
            <Pressable
              onPress={() => onPurge(item.id)}
              hitSlop={6}
              style={s.action}
            >
              <Text style={s.delete}>{t("common.delete")}</Text>
            </Pressable>
          </View>
        )}
      />
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
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  info: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: font.md, fontWeight: "600" },
  body: { color: colors.textMuted, fontSize: font.sm, marginTop: 2 },
  days: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  action: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  restore: { color: colors.accent, fontSize: font.sm, fontWeight: "600" },
  delete: { color: colors.danger, fontSize: font.sm, fontWeight: "600" },
});
