import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { ROUTES } from "../data/routes";
import { SITE_URL } from "../data/site";
import { TRANSLATED_LOCALES, TRANSLATED_PATHS, localizedPath } from "../i18n/locales";
import { isoDate } from "../lib/projects";

// sitemap.xml, generated from the route registry plus published blog entries:
// every indexed page, plus its Dutch and Ukrainian versions where they exist.
export const GET: APIRoute = async () => {
  const entry = (path: string, lastmod: string) => `  <url>\n    <loc>${SITE_URL}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  const posts = (await getCollection("blog", (b) => !b.data.draft)).sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  );
  const routeUrls = Object.values(ROUTES)
    .filter((r) => r.indexed)
    .flatMap((r) => [
      entry(r.path, r.lastmod),
      ...(TRANSLATED_PATHS.has(r.path) ? TRANSLATED_LOCALES.map((l) => entry(localizedPath(r.path, l), r.lastmod)) : []),
    ]);
  const blogUrls = posts.map((p) => entry(`/blog/${p.id}/`, isoDate(p.data.updated ?? p.data.published)));
  const urls = [...routeUrls, ...blogUrls].join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
