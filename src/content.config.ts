import { defineCollection, reference } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { AA_TEXT, contrast } from "./lib/contrast";
import { textBackgrounds, type ThemeName } from "./lib/theme-tokens";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb colour");
const sitePath = z.string().startsWith("/");

// A project accent has a fill (dots, rules, figure tints — decoration only)
// and a text colour, for each theme. The text colour must reach WCAG AA on
// every background text can sit on in that theme, or the build fails.
const accentTheme = z.object({ fill: hex, text: hex });
const accent = z
  .object({ light: accentTheme, dark: accentTheme })
  .superRefine((value, ctx) => {
    for (const theme of ["light", "dark"] as ThemeName[]) {
      for (const [token, bg] of Object.entries(textBackgrounds(theme))) {
        const ratio = contrast(value[theme].text, bg);
        if (ratio < AA_TEXT) {
          ctx.addIssue({
            code: "custom",
            path: [theme, "text"],
            message: `${value[theme].text} on ${theme} ${token} (${bg}) is ${ratio.toFixed(2)}:1; WCAG AA needs ${AA_TEXT}:1`,
          });
        }
      }
    }
  });

export const STATUSES = {
  "closed-testing": "Closed testing",
  "active-development": "In development",
  experiment: "Experiment",
  live: "Live",
  archived: "Archived",
} as const;

const projects = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/projects" }),
  schema: ({ image }) => {
    // Captions and alt text for handoff assets are copied verbatim from
    // the visual handoff manifest (handoff/phase2-visuals/manifest.json).
    const figure = z.object({
      src: image(),
      alt: z.string().min(1),
      caption: z.string().min(1),
      /**
       * What the image is, shown next to the caption:
       * screenshot   — an unedited application capture
       * composition  — whole real application screenshots placed in a neutral frame
       * illustration — artwork from the product itself
       * diagram      — a source-backed architecture/workflow diagram, not a screenshot
       * concept      — concept / development art: intended visual direction,
       *                not a screenshot, render or implemented content
       */
      kind: z.enum(["screenshot", "composition", "illustration", "diagram", "concept"]),
    });
    return z.object({
      name: z.string(),
      /** Where the project lives: /apps/ or /lab/. */
      section: z.enum(["apps", "lab"]),
      /** Short category, e.g. "Android app", "Game". */
      kind: z.string(),
      /** Empty when the platform has not been announced. */
      platforms: z.array(z.string()),
      status: z.enum(Object.keys(STATUSES) as [keyof typeof STATUSES, ...(keyof typeof STATUSES)[]]),
      /** One or two sentences, used on cards. Facts only. */
      summary: z.string(),
      /** Name used inside the product while it is in development, if different. */
      workingTitle: z.string().optional(),
      order: z.number().int(),
      featured: z.boolean().default(false),
      accent: accent.optional(),
      urls: z.object({
        overview: sitePath,
        privacy: sitePath.optional(),
        support: sitePath.optional(),
      }),
      /** Card copy on /support/. */
      supportSummary: z.string().optional(),
      /** Card image (16:9). */
      cover: figure.optional(),
      /** Project page lead image (16:9). */
      hero: figure.optional(),
      /** Project page gallery. */
      figures: z.array(figure).default([]),
      /** Visible note on the project page with the visuals' provenance and limits. */
      visualNote: z.string().optional(),
      /** Information or assets still missing; shown as marked placeholders and listed in reports. */
      missing: z.array(z.string()).default([]),
    });
  },
});

// Dated site updates (pages published, projects listed). Shown in "Recent
// updates" on the homepage. Only facts that happened on this site.
const updates = defineCollection({
  loader: file("src/content/updates.json"),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    projects: z.array(reference("projects")).default([]),
    href: sitePath.optional(),
  }),
});

// Public workflow benchmarks (Claude / Codex / Qwen). No runs are published
// yet; this schema is what the first one must provide.
const benchmarks = defineCollection({
  loader: glob({ pattern: "*.{md,mdx}", base: "./src/content/benchmarks" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    published: z.coerce.date(),
    /** Every tool/model compared, with the exact version used. */
    systems: z
      .array(
        z.object({
          name: z.string(),
          vendor: z.string(),
          version: z.string(),
        }),
      )
      .min(2),
    tasks: z.number().int().positive(),
    /** Path to the raw results file shipped with the run. */
    rawData: sitePath,
    methodology: z.string(),
  }),
});

export const collections = { projects, updates, benchmarks };
