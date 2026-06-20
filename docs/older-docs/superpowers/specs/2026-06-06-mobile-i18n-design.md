# Mobile i18n — Design

**Date:** 2026-06-06
**Status:** Approved (pending spec review)
**Issue context:** Web i18n is complete (26 languages, dropdown on landing + account). Mobile (`packages/mobile`, Expo SDK 54 / expo-router) has zero i18n. This adds it.

## Goal

Give the Expo mobile app the same multilingual support as web: 26 languages, device-locale detection on first launch, and a dropdown language selector on the Account (settings) screen.

## Decisions (from brainstorming)

- **Languages:** match web's 26 exactly (all EU official languages + Chinese + Russian), same codes and native labels.
- **Translations:** AI-generated now for all 25 non-English locales (same method as the existing web locales).
- **First launch:** detect the device system language via `expo-localization`; fall back to English if unsupported. Manual choice persists thereafter.

## Architecture

Mirrors `packages/web/src/i18n/`.

```
packages/mobile/src/i18n/
  index.ts            i18next + react-i18next init, AsyncStorage persistence
  detectLanguage.ts   resolve initial lng: device locale (∈ 26) else "en"
  languages.ts        the 26 { code, label } entries (native labels, copied from web)
  locales/
    en.json           authored source of truth (~125 strings, namespaced)
    <code>.json       25 AI-generated translations, identical key set to en.json
packages/mobile/src/components/
  LanguagePicker.tsx  Modal-based dropdown (RN has no <select>)
```

### Dependencies added

- `i18next`, `react-i18next` — pinned to versions compatible with the installed React 19 (web uses i18next ^26, react-i18next ^17; mobile will match).
- `expo-localization` — installed via `expo install` so the SDK 54-compatible version is chosen.

No `i18next-browser-languagedetector` (browser-only). Detection is custom.

### Detection & persistence flow

1. `detectLanguage()` reads `Localization.getLocales()[0].languageCode`. If it is one of the 26 supported codes, that is the initial language; otherwise `"en"`.
2. i18next is initialised synchronously with that language (no async gate on first paint).
3. On app mount, the i18n module async-reads AsyncStorage key `nw_language`. If present and different from the current language, it calls `changeLanguage()`.
4. A `languageChanged` listener writes the new code back to AsyncStorage `nw_language`.

Result: first launch → device language (if supported); every launch after → last manually chosen language. Same key name (`nw_language`) as web for conceptual parity; storage backend differs (AsyncStorage vs localStorage).

### Language picker UI

- A `LanguagePicker` row is added to the Account screen under a new `Language` section (`SectionHeader`).
- The row shows the current language's native label and a chevron; tapping opens a `Modal`.
- The modal contains a scrollable `FlatList` of all 26 native labels; the active one is check-marked.
- Selecting an item calls `i18n.changeLanguage(code)` (which persists via the listener) and dismisses the modal.
- Styled with existing `theme.ts` tokens (`colors`, `spacing`, `radius`, `font`).

## String migration

Extract the ~125 hardcoded user-facing strings into namespaced keys in `en.json` and replace with `t(...)`.

Namespaces (by surface):

- `tabs.*` — tab bar labels (`(tabs)/_layout.tsx`)
- `auth.*` — welcome + login screens
- `home.*` — `(tabs)/index.tsx`
- `capture.*` — `(tabs)/capture.tsx`
- `tags.*` — tags list, tag detail, TagManager
- `item.*` — item detail (`item/[id].tsx`), ItemCard
- `account.*` — account screen (largest surface)
- `common.*` — shared words (Save, Cancel, Delete, Done, Error, …)

Component strings use the `useTranslation()` hook. Imperative strings (`Alert.alert`, helpers outside components) use the `i18n.t` singleton import. Interpolated strings (e.g. role/plan banners) use i18next interpolation (`t("key", { value })`).

Files touched for extraction:
`(tabs)/_layout.tsx`, `(tabs)/index.tsx`, `(tabs)/capture.tsx`, `(tabs)/tags.tsx`, `(tabs)/account.tsx`, `(auth)/welcome.tsx`, `(auth)/login.tsx`, `item/[id].tsx`, `tag/[id].tsx`, `_layout.tsx` (i18n import), `components/ItemCard.tsx`, `components/TagManager.tsx`, `components/ErrorBoundary.tsx`.

The i18n module is imported once at the app entry (`app/_layout.tsx`).

## Testing

Mobile has no test runner; the root uses vitest. Locale files are plain JSON (no RN runtime), so add a **key-parity test** runnable from the root `npm test`:

- For every `locales/<code>.json`, assert its flattened key set equals `en.json`'s — catches missing or extra keys across all 26 files.
- Assert `languages.ts` codes exactly equal the locale file set and i18next `supportedLngs`.

## Out of scope

- Pluralization rules and gendered forms.
- RTL layout (none of the 26 languages are RTL).
- Date/number/currency localization.
- Sharing the `LANGUAGES` array via `@notes-world/shared` (duplicated into mobile to keep the change contained; 26 stable lines).

## Done when

- `expo-localization` + i18next deps installed; app boots in the device language.
- All 13 listed files use `t(...)`; no user-facing hardcoded strings remain in them.
- 26 locale files exist with identical key sets; key-parity test passes under `npm test`.
- Account screen shows a working language dropdown that switches the UI live and persists across restarts.
