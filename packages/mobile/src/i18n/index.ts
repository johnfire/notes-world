import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SUPPORTED_LANGUAGE_CODES } from "./languages";
import { detectDeviceLanguage } from "./detectLanguage";

import en from "./locales/en.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import sv from "./locales/sv.json";
import da from "./locales/da.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";
import cs from "./locales/cs.json";
import sk from "./locales/sk.json";
import hu from "./locales/hu.json";
import el from "./locales/el.json";
import fi from "./locales/fi.json";
import hr from "./locales/hr.json";
import bg from "./locales/bg.json";
import ro from "./locales/ro.json";
import et from "./locales/et.json";
import lv from "./locales/lv.json";
import lt from "./locales/lt.json";
import sl from "./locales/sl.json";
import ga from "./locales/ga.json";
import mt from "./locales/mt.json";

export const STORAGE_KEY = "nw_language";

const resources = {
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  it: { translation: it },
  nl: { translation: nl },
  pl: { translation: pl },
  sv: { translation: sv },
  da: { translation: da },
  pt: { translation: pt },
  ru: { translation: ru },
  zh: { translation: zh },
  cs: { translation: cs },
  sk: { translation: sk },
  hu: { translation: hu },
  el: { translation: el },
  fi: { translation: fi },
  hr: { translation: hr },
  bg: { translation: bg },
  ro: { translation: ro },
  et: { translation: et },
  lv: { translation: lv },
  lt: { translation: lt },
  sl: { translation: sl },
  ga: { translation: ga },
  mt: { translation: mt },
};

// Synchronous init using the device locale so the first paint is localized.
i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGE_CODES as unknown as string[],
  interpolation: { escapeValue: false },
});

// Apply the persisted choice (async) once it loads, overriding device detection.
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (saved && saved !== i18n.language) void i18n.changeLanguage(saved);
  })
  .catch(() => {});

// Persist every manual language change.
i18n.on("languageChanged", (lng) => {
  void AsyncStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
