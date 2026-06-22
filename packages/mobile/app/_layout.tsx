import { Stack, Redirect, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import "../src/i18n";
import { AuthProvider, useAuth } from "../src/store/auth";
import { colors } from "../src/theme";
import { useUpdateCheck } from "../src/hooks/useUpdateCheck";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { reportClientError } from "../src/api/report";

// Catch JS errors that escape React's render tree (async code, event handlers).
// Chain to the previous handler so the default crash/dev overlay still runs.
const globalAny = global as unknown as {
  ErrorUtils?: {
    getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
    setGlobalHandler: (h: (error: Error, isFatal?: boolean) => void) => void;
  };
};
if (globalAny.ErrorUtils) {
  const prev = globalAny.ErrorUtils.getGlobalHandler();
  globalAny.ErrorUtils.setGlobalHandler((error, isFatal) => {
    void reportClientError({
      message: error?.message ?? String(error),
      stack: error?.stack,
      context: isFatal ? "global:fatal" : "global",
    });
    prev?.(error, isFatal);
  });
}

function RootRedirect() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const inAuth = segments[0] === "(auth)";

  if (!user && !inAuth) return <Redirect href="/(auth)/welcome" />;
  if (user && inAuth) return <Redirect href="/(tabs)" />;
  return null;
}

function UpdateBanner() {
  const { t } = useTranslation();
  const { update, dismiss, openDownload } = useUpdateCheck();
  if (!update) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{t("update.available")}</Text>
      <TouchableOpacity onPress={openDownload} style={styles.bannerBtn}>
        <Text style={styles.bannerBtnText}>{t("update.download")}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={dismiss} style={styles.bannerDismiss}>
        <Text style={styles.bannerDismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: "#1e3a5f",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 999,
    gap: 10,
  },
  bannerText: { color: "#e0e0e0", flex: 1, fontSize: 13 },
  bannerBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  bannerDismiss: { padding: 4 },
  bannerDismissText: { color: "#888", fontSize: 14 },
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)/welcome" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="item/[id]"
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: "#1a1a1a" },
              headerTintColor: "#f0f0f0",
              headerTitle: "",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="tag/[id]"
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: "#1a1a1a" },
              headerTintColor: "#f0f0f0",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="tasks/[status]"
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: "#1a1a1a" },
              headerTintColor: "#f0f0f0",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="trash"
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: "#1a1a1a" },
              headerTintColor: "#f0f0f0",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="dashboard"
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: "#1a1a1a" },
              headerTintColor: "#f0f0f0",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="changelog"
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: "#1a1a1a" },
              headerTintColor: "#f0f0f0",
              presentation: "card",
            }}
          />
        </Stack>
        <RootRedirect />
        <UpdateBanner />
      </AuthProvider>
    </ErrorBoundary>
  );
}
