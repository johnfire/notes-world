import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
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
    },
    fallbackLng: "en",
    supportedLngs: [
      "en",
      "de",
      "fr",
      "es",
      "it",
      "nl",
      "pl",
      "sv",
      "da",
      "pt",
      "ru",
      "zh",
      "cs",
      "sk",
      "hu",
      "el",
      "fi",
      "hr",
      "bg",
      "ro",
      "et",
      "lv",
      "lt",
      "sl",
      "ga",
      "mt",
    ],
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "nw_language",
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
