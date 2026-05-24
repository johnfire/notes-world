import { Stack, Redirect, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../src/store/auth";
import { colors } from "../src/theme";

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

  if (!user && !inAuth) return <Redirect href="/(auth)/login" />;
  if (user && inAuth) return <Redirect href="/(tabs)" />;
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
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
      </Stack>
      <RootRedirect />
    </AuthProvider>
  );
}
