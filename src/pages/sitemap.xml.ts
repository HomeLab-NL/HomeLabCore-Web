import type { APIRoute } from "astro";
import { ROUTES } from "../data/routes";
import { SITE_URL } from "../data/site";

// sitemap.xml, generated from the route registry.
export const GET: APIRoute = () => {
  const urls = Object.values(ROUTES)
    .filter((r) => r.indexed)
    .map((r) => `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n  </url>`)
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
