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
  Modal,
  Platform,
  Share,
} from "react-native";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../src/store/auth";
import { changeEmail, changePassword, deleteAccount } from "../../src/api/auth";
import { submitBugReport } from "../../src/api/bugReports";
import { exportAll } from "../../src/api/exportData";
import { importFolder } from "../../src/api/importData";
import { api } from "../../src/api/client";
import { LanguagePicker } from "../../src/components/LanguagePicker";
import { colors, spacing, radius, font } from "../../src/theme";

const WEB_APP_URL = "https://notes-world.christopherrehm.de";

const ROLE_KEYS: Record<string, string> = {
  free: "account.roleFree",
  gift: "account.roleGift",
  paid: "account.rolePaid",
  admin: "account.roleAdmin",
};

export default function AccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout, setUser } = useAuth();

  const [bugOpen, setBugOpen] = useState(false);
  const [bugText, setBugText] = useState("");
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    if (importing) return;
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: ["text/markdown", "text/plain", "*/*"],
    });
    if (res.canceled) return;
    setImporting(true);
    try {
      const files = await Promise.all(
        res.assets.map(async (a) => ({
          path: a.name,
          content: await new File(a.uri).text(),
        })),
      );
      await importFolder(files);
      Alert.alert(t("import.done", { count: files.length }));
    } catch (err) {
      Alert.alert(t("import.failed"), (err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await exportAll();
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch (err) {
      Alert.alert(t("common.error"), (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function handleSubmitBug() {
    const description = bugText.trim();
    if (!description || bugSubmitting) return;
    setBugSubmitting(true);
    try {
      const res = await submitBugReport({
        description,
        page: "mobile-app",
        userAgent: `${Platform.OS} app ${Constants.expoConfig?.version ?? "unknown"}`,
      });
      setBugOpen(false);
      setBugText("");
      Alert.alert(t("bug.thanks", { number: res.number }));
    } catch (err) {
      Alert.alert(t("bug.failed"), (err as Error).message);
    } finally {
      setBugSubmitting(false);
    }
  }

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
      Alert.alert(t("common.done"), t("account.emailUpdated"));
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : t("account.emailUpdateFailed");
      setEmailForm((f) => ({ ...f, loading: false, error: msg }));
    }
  }

  async function handleChangePassword() {
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordForm((f) => ({ ...f, error: t("account.passwordsNoMatch") }));
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
      Alert.alert(t("common.done"), t("account.passwordUpdated"));
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : t("account.passwordUpdateFailed");
      setPasswordForm((f) => ({ ...f, loading: false, error: msg }));
    }
  }

  function confirmDelete() {
    Alert.prompt(
      t("account.deleteAccount"),
      t("account.deleteAccountMsg"),
      async (password) => {
        if (!password) return;
        try {
          await deleteAccount(password);
          await logout();
        } catch (e: unknown) {
          const msg =
            e instanceof Error ? e.message : t("account.deleteAccountFailed");
          Alert.alert(t("common.error"), msg);
        }
      },
      "secure-text",
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.heading}>{t("account.title")}</Text>
        <View style={s.planRow}>
          <Text style={s.currentEmail}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>
              {ROLE_KEYS[user?.role ?? "free"]
                ? t(ROLE_KEYS[user?.role ?? "free"])
                : user?.role}
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
                  t("account.upgradeTitle"),
                  t("account.upgradeMsg"),
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("common.open"),
                      onPress: () => Linking.openURL(WEB_APP_URL),
                    },
                  ],
                );
              }
            }}
          >
            <Text style={s.upgradeText}>{t("account.freePlanBanner")}</Text>
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
              {t("account.proPlanBanner", {
                status: user.stripe_subscription_status
                  ? ` · ${user.stripe_subscription_status}`
                  : "",
              })}
            </Text>
          </Pressable>
        )}

        <SectionHeader title={t("account.changeEmail")} />
        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholder={t("account.newEmail")}
            placeholderTextColor={colors.textDim}
            value={emailForm.email}
            onChangeText={(v) => setEmailForm((f) => ({ ...f, email: v }))}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={s.input}
            placeholder={t("account.currentPassword")}
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
              <Text style={s.btnText}>{t("account.updateEmail")}</Text>
            )}
          </Pressable>
        </View>

        <SectionHeader title={t("account.changePassword")} />
        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholder={t("account.currentPassword")}
            placeholderTextColor={colors.textDim}
            value={passwordForm.current}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, current: v }))}
            secureTextEntry
          />
          <TextInput
            style={s.input}
            placeholder={t("account.newPassword")}
            placeholderTextColor={colors.textDim}
            value={passwordForm.next}
            onChangeText={(v) => setPasswordForm((f) => ({ ...f, next: v }))}
            secureTextEntry
          />
          <TextInput
            style={s.input}
            placeholder={t("account.confirmNewPassword")}
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
              <Text style={s.btnText}>{t("account.updatePassword")}</Text>
            )}
          </Pressable>
        </View>

        <SectionHeader title={t("account.data")} />
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={() => router.push("/trash" as never)}
          >
            <Text style={s.btnText}>{t("account.viewTrash")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={s.btnText}>{t("account.exportData")}</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={s.btnText}>{t("account.importData")}</Text>
            )}
          </Pressable>
        </View>

        <SectionHeader title={t("account.about")} />
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={() => router.push("/changelog" as never)}
          >
            <Text style={s.btnText}>{t("account.whatsNew")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={() => Linking.openURL(`${WEB_APP_URL}/docs`)}
          >
            <Text style={s.btnText}>{t("account.helpDocs")}</Text>
          </Pressable>
        </View>

        <SectionHeader title={t("account.reportBug")} />
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={() => setBugOpen(true)}
          >
            <Text style={s.btnText}>{t("account.reportBug")}</Text>
          </Pressable>
        </View>

        <SectionHeader title={t("account.language")} />
        <View style={s.card}>
          <LanguagePicker />
        </View>

        <SectionHeader title={t("account.session")} />
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [s.btn, s.dangerBtn, pressed && s.pressed]}
            onPress={() =>
              Alert.alert(t("account.signOut"), t("account.signOutConfirm"), [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("account.signOut"),
                  style: "destructive",
                  onPress: logout,
                },
              ])
            }
          >
            <Text style={[s.btnText, s.dangerText]}>
              {t("account.signOut")}
            </Text>
          </Pressable>
        </View>

        <SectionHeader title={t("account.dangerZone")} />
        <View style={s.card}>
          <Pressable
            style={({ pressed }) => [s.btn, s.dangerBtn, pressed && s.pressed]}
            onPress={confirmDelete}
          >
            <Text style={[s.btnText, s.dangerText]}>
              {t("account.deleteAccount")}
            </Text>
          </Pressable>
        </View>

        <Text style={s.version}>
          notes-world v{Constants.expoConfig?.version ?? "?"}
        </Text>
      </ScrollView>

      <Modal
        visible={bugOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBugOpen(false)}
      >
        <Pressable style={s.bugBackdrop} onPress={() => setBugOpen(false)} />
        <View style={s.bugSheet}>
          <Text style={s.bugTitle}>{t("account.reportBug")}</Text>
          <TextInput
            style={s.bugInput}
            placeholder={t("bug.placeholder")}
            placeholderTextColor={colors.textDim}
            value={bugText}
            onChangeText={setBugText}
            multiline
            textAlignVertical="top"
            autoFocus
          />
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={handleSubmitBug}
            disabled={bugSubmitting || !bugText.trim()}
          >
            {bugSubmitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={s.btnText}>{t("bug.send")}</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  version: {
    textAlign: "center",
    color: colors.textDim,
    fontSize: font.sm,
    marginTop: spacing.lg,
  },
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
  bugBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  bugSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bugTitle: { color: colors.text, fontSize: font.lg, fontWeight: "700" },
  bugInput: {
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: font.md,
    minHeight: 120,
  },
});
