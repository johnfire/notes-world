import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius, font } from "../src/theme";

const WEB_ORIGIN = "https://notes-world.christopherrehm.de";

interface Entry {
  hash: string;
  message: string;
  date: string;
}

export default function ChangelogScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerTitle: t("account.whatsNew") });
  }, [t]);

  useEffect(() => {
    fetch(`${WEB_ORIGIN}/changelog.json`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<Entry[]>;
      })
      .then(setEntries)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

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
        data={entries}
        keyExtractor={(e) => e.hash}
        contentContainerStyle={s.scroll}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.message}>{item.message}</Text>
            <Text style={s.date}>
              {new Date(item.date).toLocaleDateString(i18n.language, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={s.empty}>
            {error ? t("changelog.loadError") : t("changelog.empty")}
          </Text>
        }
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
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  message: { color: colors.text, fontSize: font.md },
  date: { color: colors.textDim, fontSize: font.sm },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: font.md,
  },
});
