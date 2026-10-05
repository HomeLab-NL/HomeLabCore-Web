// Site languages. English lives at the existing URLs; Dutch and Ukrainian
// copies of the translated pages live under /nl/ and /uk/. Privacy policies
// and support pages are published in English only.

export const LOCALES = ["en", "nl", "uk"] as const;
export type Locale = (typeof LOCALES)[number];
export const TRANSLATED_LOCALES = ["nl", "uk"] as const satisfies readonly Locale[];

export const LOCALE_INFO: Record<Locale, { short: string; name: string; hreflang: string; ogLocale: string }> = {
  en: { short: "EN", name: "English", hreflang: "en", ogLocale: "en_US" },
  nl: { short: "NL", name: "Nederlands", hreflang: "nl", ogLocale: "nl_NL" },
  uk: { short: "UA", name: "Українська", hreflang: "uk", ogLocale: "uk_UA" },
};

/** English paths that also exist in Dutch and Ukrainian. */
export const TRANSLATED_PATHS = new Set([
  "/",
  "/apps/",
  "/apps/cookfrom",
  "/apps/ops-planner/",
  "/apps/ai-tutor/",
  "/apps/keyboard-trainer/",
  "/lab/",
  "/lab/agentlab/",
  "/lab/at-the-mountains-of-madness/",
  "/benchmarks/",
  "/about",
]);

/** The URL of an English page in another language (always with a trailing slash). */
export function localizedPath(path: string, lang: Locale): string {
  if (lang === "en") return path;
  return `/${lang}${path.endsWith("/") ? path : `${path}/`}`;
}

/** Link target for an internal English path: the translation if one exists, else the English page. */
export function href(path: string, lang: Locale): string {
  return TRANSLATED_PATHS.has(path) ? localizedPath(path, lang) : path;
}
