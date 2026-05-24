import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../../src/store/auth";
import { login } from "../../src/api/auth";
import { colors, spacing, radius, font } from "../../src/theme";

export default function LoginScreen() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const user = await login({ email: email.trim(), password });
      setUser(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.inner}>
        <Text style={s.logo}>Notes World</Text>
        <Text style={s.subtitle}>Your personal knowledge base</Text>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.textDim}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={colors.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
          {!!error && <Text style={s.error}>{error}</Text>}
          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={s.btnText}>Sign in</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  logo: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.md,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: font.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    color: colors.danger,
    fontSize: font.sm,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnText: {
    color: colors.text,
    fontSize: font.md,
    fontWeight: "700",
  },
});
