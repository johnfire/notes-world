import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../theme";
import { reportClientError } from "../api/report";
import i18n from "../i18n";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time errors below it, reports them to the server, and shows a
 * recoverable fallback instead of crashing the whole app to a white screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void reportClientError({
      message: error.message,
      stack: error.stack,
      context: info.componentStack ?? undefined,
    });
  }

  handleRetry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{i18n.t("errorBoundary.title")}</Text>
          <Text style={styles.subtitle}>
            {i18n.t("errorBoundary.subtitle")}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleRetry}>
            <Text style={styles.btnText}>{i18n.t("errorBoundary.retry")}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "600" },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  btn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
