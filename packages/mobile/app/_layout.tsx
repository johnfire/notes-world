import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/store/auth";

function RootRedirect() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootRedirect />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
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
      </Stack>
    </AuthProvider>
  );
}
