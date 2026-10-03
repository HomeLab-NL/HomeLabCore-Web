import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One entry per published app. Listings (home, /apps/, /support/), the
// product page bar and the per-app pages read from here.
const apps = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/apps" }),
  schema: z.object({
    name: z.string(),
    /** Value of <html data-brand> on the app's pages; selects the accent. */
    brand: z.enum(["cookfrom", "opsplanner"]),
    /** Key of the icon in src/components/Icon.astro. */
    icon: z.enum(["cookfrom", "opsplanner"]),
    platform: z.string(),
    /** Listing order. */
    order: z.number().int(),
    /** Shown in the homepage app list. */
    onHome: z.boolean(),
    urls: z.object({
      overview: z.string().startsWith("/"),
      privacy: z.string().startsWith("/"),
      support: z.string().startsWith("/"),
    }),
    /** Card copy per listing; the wording differs between pages. */
    cards: z.object({
      home: z.string().optional(),
      apps: z.string(),
      support: z.string(),
    }),
  }),
});

export const collections = { apps };
