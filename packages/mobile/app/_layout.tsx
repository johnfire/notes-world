import { Stack, Redirect, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
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
import { DefaultTab, getDefaultTab, tabHref } from "../src/lib/defaultTab";
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
  const [defaultTab, setDefaultTab] = useState<DefaultTab | null>(null);
  // Guards the one-time cold-start landing so it doesn't fight later navigation.
  const landedRef = useRef(false);

  useEffect(() => {
    void getDefaultTab().then(setDefaultTab);
  }, []);

  if (loading || defaultTab === null) {
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
  const target = tabHref(defaultTab);

  if (!user && !inAuth) return <Redirect href="/(auth)/welcome" />;
  if (user && inAuth) {
    landedRef.current = true;
    return <Redirect href={target} />;
  }
  // Cold start: an authenticated user opens straight into the Notes tab. Send
  // them to their chosen tab once, but only from the tabs group so we never
  // hijack a deep link into an item/tag/trash screen.
  if (
    user &&
    !landedRef.current &&
    defaultTab !== "index" &&
    segments[0] === "(tabs)"
  ) {
    landedRef.current = true;
    return <Redirect href={target} />;
  }
  if (user) landedRef.current = true;
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
