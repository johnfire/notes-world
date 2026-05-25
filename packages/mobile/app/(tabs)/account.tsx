import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/store/auth";
import { changeEmail, changePassword, deleteAccount } from "../../src/api/auth";
import { api } from "../../src/api/client";
import { colors, spacing, radius, font } from "../../src/theme";

const WEB_APP_URL = "https://notes-world.christopherrehm.de";

const ROLE_LABELS: Record<string, string> = {
  free: "Free",
  gift: "Pro (gift)",
  paid: "Pro",
  admin: "Admin",
};

export default function AccountScreen() {
  const { user, logout, setUser } = useAuth();

  const [emailForm, setEmailForm] = useState({
    email: "",
    password: "",
    loading: false,
    error: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
    loading: false,
    error: "",
  });

  async function handleChangeEmail() {
    setEmailForm((f) => ({ ...f, error: "", loading: true }));
    try {
      const updated = await changeEmail(
        emailForm.email.trim(),
        emailForm.password,
      );
      setUser(updated);
      setEmailForm({ email: "", password: "", loading: false, error: "" });
      Alert.alert("Done", "Email updated successfully.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update email";
      setEmailForm((f) => ({ ...f, loading: false, error: msg }));
    }
  }

  async function handleChangePassword() {
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordForm((f) => ({ ...f, error: "Passwords do not match" }));
      return;
    }
    setPasswordForm((f) => ({ ...f, error: "", loading: true }));
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({
        current: "",
        next: "",
        confirm: "",
        loading: false,
        error: "",
      });
      Alert.alert("Done", "Password updated successfully.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update password";
      setPasswordForm((f) => ({ ...f, loading: false, error: msg }));
    }
  }

  function confirmDelete() {
    Alert.prompt(
      "Delete account",
      "Enter your current password to confirm. This cannot be undone.",
      async (password) => {
        if (!password) return;
        try {
          await deleteAccount(password);
          await logout();
        } catch (e: unknown) {
          const msg =
            e instanceof Error ? e.message : "Failed to delete account";
          Alert.alert("Error", msg);
        }
      },
      "secure-text",
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.heading}>Account</Text>
        <View style={s.planRow}>
          <Text style={s.currentEmail}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>
              {ROLE_LABELS[user?.role ?? "free"] ?? user?.role}
            </Text>
          </View>
        </View>

        {user?.role === "free" && (
          <Pressable
            style={({ pressed }) => [s.upgradeBanner, pressed && s.pressed]}
            onPress={async () => {
              try {
                const data = await api.post<{ url: string }>(
                  "/billing/checkout",
                  { plan: "monthly" },
                );
                await Linking.openURL(data.url);
              } catch {
                Alert.alert(
                  "Upgrade",
                  "Visit notes-world.christopherrehm.de to upgrade your account.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Open",
                      onPress: () => Linking.openURL(WEB_APP_URL),
                    },
                  ],
                );
              }
            }}
          >
            <Text style={s.upgradeText}>
              Free plan · 20 tag limit · Tap to upgrade →
            </Text>
          </Pressable>
        )}

        {user?.role === "paid" && (
          <Pressable
            style={({ pressed }) => [s.paidBanner, pressed && s.pressed]}
            onPress={async () => {
              try {
                const data = await api.post<{ url: string }>(
                  "/billing/portal",
                  {},
                );
                await Linking.openURL(data.url);
              } catch {
                Linking.openURL(WEB_APP_URL);
              }
            }}
          >
            <Text style={s.paidText}>
              Pro plan
              {user.stripe_subscription_status
                ? ` · ${user.stripe_subscription_status}`
                : ""}{" "}
              · Manage billing →
            </Text>
          </Pressable>
        )}

        <SectionHeader title="Change email" />
        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholder="New email"
            placeholderTextColor={colors.textDim}
            value={emailForm.email}
            onChangeText={(v) => setEmailForm((f) => ({ ...f, email: v }))}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={s.input}
            placeholder="Current password"
            placeholderTextColor={colors.textDim}
            value={emailForm.password}
            onChangeText={(v) => setEmailForm((f) => ({ ...f, password: v }))}
            secureTextEntry
          />
          {!!emailForm.error && <Text style={s.error}>{emailForm.error}</Text>}
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={handleChangeEmail}
            disabled={emailForm.loading}
          >
            {emailForm.loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={s.btnText}>Update email</Text>
            )}
          </Pressable>
        </View>

        <SectionHeader title="Change password" />
        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholder="Current password"
            placeholderTextColor={colors.textDim}
            value={passwordForm.current}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, current: v }))}
            secureTextEntry
          />
          <TextInput
            style={s.input}
            placeholder="New password"
            placeholderTextColor={colors.textDim}
            value={passwordForm.next}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, next: v }))}
            secureTextEntry
          />
          <TextInput
            style={s.input}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textDim}
            value={passwordForm.confirm}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, confirm: v }))}
            secureTextEntry
          />
          {!!passwordForm.error && (
            <Text style={s.error}>{passwordForm.error}</Text>
          )}
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={handleChangePassword}
            disabled={passwordForm.loading}
          >
            {passwordForm.loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={s.btnText}>Update password</Text>
            )}
          </Pressable>
        </View>

        <SectionHeader title="Session" />
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [s.btn, s.dangerBtn, pressed && s.pressed]}
            onPress={() =>
              Alert.alert("Sign out", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign out", style: "destructive", onPress: logout },
              ])
            }
          >
            <Text style={[s.btnText, s.dangerText]}>Sign out</Text>
          </Pressable>
        </View>

        <SectionHeader title="Danger zone" />
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [s.btn, s.dangerBtn, pressed && s.pressed]}
            onPress={confirmDelete}
          >
            <Text style={[s.btnText, s.dangerText]}>Delete account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  heading: {
    color: colors.text,
    fontSize: font.xxl,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  currentEmail: {
    color: colors.textMuted,
    fontSize: font.md,
    flex: 1,
  },
  roleBadge: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  upgradeBanner: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: spacing.sm,
  },
  paidBanner: {
    backgroundColor: "rgba(92,224,122,0.1)",
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(92,224,122,0.3)",
    marginBottom: spacing.sm,
  },
  upgradeText: {
    color: colors.accent,
    fontSize: font.sm,
    fontWeight: "600",
    textAlign: "center",
  },
  paidText: {
    color: colors.success,
    fontSize: font.sm,
    fontWeight: "600",
    textAlign: "center",
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: font.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: font.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    color: colors.danger,
    fontSize: font.sm,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: "center",
  },
  dangerBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  pressed: { opacity: 0.75 },
  btnText: { color: colors.text, fontSize: font.md, fontWeight: "600" },
  dangerText: { color: colors.danger },
});
