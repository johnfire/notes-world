import { Platform } from "react-native";
import Constants from "expo-constants";
import { BASE_URL, getToken } from "./client";

const APP_VERSION = Constants.expoConfig?.version ?? "unknown";

/**
 * Fire-and-forget crash/error reporter for the native app. Uses fetch directly
 * (never the api request<T> wrapper) so a reporting failure can't recurse or
 * throw back into an error handler. Never rejects — best-effort only.
 */
export async function reportClientError(report: {
  message: string;
  context?: string;
  stack?: string;
}): Promise<void> {
  try {
    const token = await getToken().catch(() => null);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Client-Type": "native-app",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    await fetch(`${BASE_URL}/client-errors`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        app: "mobile",
        appVersion: APP_VERSION,
        platform: Platform.OS,
        ...report,
      }),
    }).catch(() => {});
  } catch {
    // swallow — reporting must never crash the app
  }
}
