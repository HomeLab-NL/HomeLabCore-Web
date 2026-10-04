// Metadata / SEO check over the built site in dist/:
//   - every page: unique <title>, meta description (sensible length), favicon
//   - indexable pages: canonical = og:url, absolute https://homelabcore.dev URLs,
//     complete Open Graph + Twitter (summary_large_image) tags, og:image
//     pointing at an existing file whose real size matches og:image:width/height,
//     and listed in sitemap.xml
//   - noindex pages: robots noindex and not in sitemap.xml
//   - no preview/development host (pages.dev, localhost) in any <head>
//   - robots.txt references the production sitemap
// Pass --table to print Page → title → description → og:image.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { DIST, pagePaths } from "./lib/serve.mjs";

const SITE = "https://homelabcore.dev";
const failures = [];
const rows = [];

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function headOf(html) {
  return html.slice(0, html.indexOf("</head>"));
}
function meta(head, attr, name) {
  const re = new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, "i");
  const re2 = new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${name}"`, "i");
  const m = re.exec(head) ?? re2.exec(head);
  return m ? decode(m[1]) : undefined;
}
function link(head, rel) {
  const m = new RegExp(`<link[^>]*rel="${rel}"[^>]*href="([^"]*)"`, "i").exec(head);
  return m ? m[1] : undefined;
}

const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const titles = new Map();

for (const p of pagePaths()) {
  const file = p.endsWith(".html") ? path.join(DIST, p) : path.join(DIST, p, "index.html");
  const head = headOf(fs.readFileSync(file, "utf8"));
  const fail = (msg) => failures.push(`${p}: ${msg}`);

  const title = decode((/<title>([^<]*)<\/title>/.exec(head) ?? [])[1] ?? "");
  const description = meta(head, "name", "description");
  if (!title) fail("missing <title>");
  if (titles.has(title)) fail(`duplicate <title> (also ${titles.get(title)})`);
  titles.set(title, p);
  if (!description) fail("missing meta description");
  else if (description.length < 50 || description.length > 230) fail(`description length ${description.length} (want 50–230)`);
  if (!link(head, "icon")) fail("missing favicon");
  if (/pages\.dev|localhost|127\.0\.0\.1/.test(head)) fail("development/preview host in <head>");

  const robots = meta(head, "name", "robots") ?? "";
  if (robots.includes("noindex")) {
    if ([...sitemapUrls].some((u) => u === SITE + p || u === SITE + p.replace(/\.html$/, ""))) fail("noindex page listed in sitemap");
    rows.push({ p, title, description, image: "— (noindex)" });
    continue;
  }

  const canonical = link(head, "canonical");
  if (!canonical?.startsWith(SITE + "/")) fail(`canonical not absolute on ${SITE}: ${canonical}`);
  if (!sitemapUrls.has(canonical)) fail(`canonical ${canonical} not in sitemap.xml`);

  const og = Object.fromEntries(
    ["type", "site_name", "title", "description", "url", "image", "image:type", "image:width", "image:height", "image:alt"].map((k) => [k, meta(head, "property", `og:${k}`)]),
  );
  const tw = Object.fromEntries(["card", "title", "description", "image", "image:alt"].map((k) => [k, meta(head, "name", `twitter:${k}`)]));
  for (const [k, v] of Object.entries(og)) if (!v) fail(`missing og:${k}`);
  for (const [k, v] of Object.entries(tw)) if (!v) fail(`missing twitter:${k}`);
  if (og.url !== canonical) fail(`og:url (${og.url}) ≠ canonical (${canonical})`);
  if (tw.card !== "summary_large_image") fail(`twitter:card is ${tw.card}`);
  if (tw.image !== og.image) fail("twitter:image ≠ og:image");
  if (tw.title !== og.title || tw.description !== og.description) fail("twitter title/description ≠ og");

  if (og.image?.startsWith(SITE + "/")) {
    const imgFile = path.join(DIST, og.image.slice(SITE.length));
    if (!fs.existsSync(imgFile)) fail(`og:image file missing: ${og.image}`);
    else {
      const m = await sharp(imgFile).metadata();
      if (String(m.width) !== og["image:width"] || String(m.height) !== og["image:height"]) {
        fail(`og:image is ${m.width}×${m.height}, tags say ${og["image:width"]}×${og["image:height"]}`);
      }
    }
  } else fail(`og:image not absolute on ${SITE}: ${og.image}`);

  rows.push({ p, title, description, image: og.image?.replace(SITE, "") });
}

const robotsTxt = fs.readFileSync(path.join(DIST, "robots.txt"), "utf8");
if (!robotsTxt.includes(`Sitemap: ${SITE}/sitemap.xml`)) failures.push("robots.txt: missing production Sitemap line");

if (process.argv.includes("--table")) {
  console.log("| Page | Title | Description | OG image |\n|---|---|---|---|");
  for (const r of rows) console.log(`| \`${r.p}\` | ${r.title} | ${r.description} | \`${r.image}\` |`);
}
if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`✓ metadata: ${rows.length} pages — unique titles, descriptions, canonical = og:url, complete OG/Twitter tags, og:image files exist at their declared size, sitemap/robots consistent.`);
