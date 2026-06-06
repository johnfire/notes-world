import React from "react";
import { View, Text, Pressable, StyleSheet, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, font } from "../../src/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <Ionicons name="document-text" size={64} color={colors.accent} />
        <Text style={s.title}>Notes World</Text>
        <Text style={s.tagline}>{t("auth.tagline")}</Text>
      </View>

      <View style={s.features}>
        <FeatureRow icon="bulb-outline" text={t("auth.featureCapture")} />
        <FeatureRow icon="pricetag-outline" text={t("auth.featureTags")} />
        <FeatureRow
          icon="phone-portrait-outline"
          text={t("auth.featureOffline")}
        />
      </View>

      <View style={s.actions}>
        <Pressable
          style={({ pressed }) => [s.primaryBtn, pressed && s.pressed]}
          onPress={() =>
            router.push({
              pathname: "/(auth)/login",
              params: { mode: "register" },
            })
          }
        >
          <Text style={s.primaryBtnText}>{t("auth.createFreeAccount")}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}
          onPress={() =>
            router.push({
              pathname: "/(auth)/login",
              params: { mode: "login" },
            })
          }
        >
          <Text style={s.secondaryBtnText}>{t("auth.signIn")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.featureRow}>
      <Ionicons name={icon as never} size={20} color={colors.accent} />
      <Text style={s.featureText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    justifyContent: "space-between",
    paddingTop: 80,
    paddingBottom: 48,
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: font.md,
    textAlign: "center",
  },
  features: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureText: {
    color: colors.text,
    fontSize: font.md,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  secondaryBtn: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
  primaryBtnText: {
    color: colors.text,
    fontSize: font.md,
    fontWeight: "700",
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontSize: font.md,
    fontWeight: "600",
  },
});
