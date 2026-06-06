import { getLocales } from "expo-localization";
import { SUPPORTED_LANGUAGE_CODES } from "./languages";

/**
 * Resolve the initial UI language from the device system locale.
 * Returns the device's primary language code if it is supported, else "en".
 * The persisted user choice (AsyncStorage) is applied separately, after init.
 */
export function detectDeviceLanguage(): string {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    if (
      code &&
      (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code)
    ) {
      return code;
    }
  } catch {
    // expo-localization unavailable (e.g. test env) — fall back to English.
  }
  return "en";
}
