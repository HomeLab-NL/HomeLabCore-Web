// Social preview (Open Graph / Twitter) images. Files are rendered by
// scripts/og/render-og.mjs into public/og/ at 1200×630.

import fs from "node:fs";
import path from "node:path";
import { getEntry } from "astro:content";
import { SITE_URL } from "../data/site";
import type { Locale } from "../i18n/locales";
import { localizeProject } from "./projects";

export interface SocialImage {
  url: string;
  type: string;
  width: number;
  height: number;
  alt: string;
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// The global image exists once per language (same design, translated text).
const GLOBAL_ALT: Record<Locale, string> = {
  en: "HomeLabCore — We build ideas. Independent software & AI lab.",
  nl: "HomeLabCore — We bouwen ideeën.",
  uk: "HomeLabCore — Ми будуємо ідеї. Незалежна лабораторія програмного забезпечення та AI.",
};
const globalImage = (lang: Locale): SocialImage => ({
  url: `${SITE_URL}/og/${lang === "en" ? "homelabcore" : `homelabcore-${lang}`}.png`,
  type: "image/png",
  width: OG_WIDTH,
  height: OG_HEIGHT,
  alt: GLOBAL_ALT[lang],
});

/** The project's social image if one was rendered, otherwise the global one for the language. */
export async function socialImage(projectId?: string, lang: Locale = "en"): Promise<SocialImage> {
  if (!projectId) return globalImage(lang);
  const file = path.resolve("public/og", `${projectId}.jpg`);
  const entry = await getEntry("projects", projectId);
  if (!entry?.data.cover || !fs.existsSync(file)) return globalImage(lang);
  const { name, cover: localCover } = localizeProject(entry, lang).data;
  const cover = localCover!;
  const alt = cover.kind === "concept" ? `${name} — concept art, not gameplay. ${cover.alt}` : cover.alt;
  return { url: `${SITE_URL}/og/${projectId}.jpg`, type: "image/jpeg", width: OG_WIDTH, height: OG_HEIGHT, alt };
}
