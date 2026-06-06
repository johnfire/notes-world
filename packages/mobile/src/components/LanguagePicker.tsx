import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n/languages";
import { colors, spacing, radius, font } from "../theme";

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const current = i18n.resolvedLanguage ?? i18n.language;
  const currentLabel =
    LANGUAGES.find((l) => l.code === current)?.label ?? current;

  function select(code: string) {
    void i18n.changeLanguage(code);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [s.row, pressed && s.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("account.selectLanguage")}
      >
        <Ionicons name="language-outline" size={18} color={colors.textMuted} />
        <Text style={s.value}>{currentLabel}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textDim} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{t("account.selectLanguage")}</Text>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(l) => l.code}
            renderItem={({ item }) => {
              const active = item.code === current;
              return (
                <Pressable
                  style={({ pressed }) => [s.option, pressed && s.pressed]}
                  onPress={() => select(item.code)}
                >
                  <Text style={[s.optionText, active && s.optionTextActive]}>
                    {item.label}
                  </Text>
                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.accent}
                    />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { flex: 1, color: colors.text, fontSize: font.md },
  pressed: { opacity: 0.7 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: "70%",
  },
  sheetTitle: {
    color: colors.text,
    fontSize: font.lg,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: { color: colors.text, fontSize: font.md },
  optionTextActive: { color: colors.accent, fontWeight: "600" },
});
