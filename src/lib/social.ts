// Social preview (Open Graph / Twitter) images. Files are rendered by
// scripts/og/render-og.mjs into public/og/ at 1200×630.

import fs from "node:fs";
import path from "node:path";
import { getEntry } from "astro:content";
import { SITE_URL } from "../data/site";

export interface SocialImage {
  url: string;
  type: string;
  width: number;
  height: number;
  alt: string;
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const GLOBAL: SocialImage = {
  url: `${SITE_URL}/og/homelabcore.png`,
  type: "image/png",
  width: OG_WIDTH,
  height: OG_HEIGHT,
  alt: "HomeLabCore — We build things. Then measure how we built them.",
};

/** The project's social image if one was rendered, otherwise the global one. */
export async function socialImage(projectId?: string): Promise<SocialImage> {
  if (!projectId) return GLOBAL;
  const file = path.resolve("public/og", `${projectId}.jpg`);
  const project = await getEntry("projects", projectId);
  if (!project?.data.cover || !fs.existsSync(file)) return GLOBAL;
  const { cover, name } = project.data;
  const alt = cover.kind === "concept" ? `${name} — concept art, not gameplay. ${cover.alt}` : cover.alt;
  return { url: `${SITE_URL}/og/${projectId}.jpg`, type: "image/jpeg", width: OG_WIDTH, height: OG_HEIGHT, alt };
}
