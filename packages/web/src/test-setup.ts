import "@testing-library/jest-dom";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./i18n/locales/en.json";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: "en",
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
}

// Suppress act() warnings — RTL's userEvent wraps in act internally; the warnings
// are false positives from async state updates inside useEffect/event handlers.
const originalError = console.error.bind(console);
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("not wrapped in act"))
      return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
