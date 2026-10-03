// Checks the built site in dist/:
//   1. every legacy URL (scripts/legacy-urls.txt) still resolves;
//   2. every internal href/src in every page resolves;
//   3. every sitemap <loc> and canonical URL resolves.
// "Resolves" mirrors Cloudflare Pages: /x serves x, x.html or x/index.html.

import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const SITE = "https://homelabcore.dev";

if (!fs.existsSync(DIST)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

function resolves(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const rel = clean.replace(/^\/+/, "");
  const candidates = [rel, `${rel}.html`, path.join(rel, "index.html")];
  return candidates.some((c) => {
    const file = path.join(DIST, c);
    return file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile();
  });
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith(".html") ? [p] : [];
  });
}

const failures = [];

// 1. legacy URLs
const legacy = fs
  .readFileSync("scripts/legacy-urls.txt", "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
for (const u of legacy) {
  if (!resolves(u)) failures.push(`legacy URL no longer resolves: ${u}`);
}

// 2. internal links and assets
const pages = htmlFiles(DIST);
let links = 0;
for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const page = "/" + path.relative(DIST, file);
  for (const m of html.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    for (const ref of m[1].split(",").map((s) => s.trim().split(/\s+/)[0])) {
      let target = ref;
      if (target.startsWith(SITE)) target = target.slice(SITE.length) || "/";
      if (!target.startsWith("/") || target.startsWith("//")) continue; // external, mailto:, #anchor
      links++;
      if (!resolves(target)) failures.push(`${page}: broken internal link ${ref}`);
    }
  }
}

// 3. sitemap
const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length === 0) failures.push("sitemap.xml has no <loc> entries");
for (const loc of locs) {
  if (!loc.startsWith(SITE)) failures.push(`sitemap URL outside ${SITE}: ${loc}`);
  else if (!resolves(loc.slice(SITE.length) || "/")) failures.push(`sitemap URL does not resolve: ${loc}`);
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  console.error(`\n${failures.length} problem(s).`);
  process.exit(1);
}
console.log(
  `✓ ${legacy.length} legacy URLs, ${links} internal links in ${pages.length} pages, ${locs.length} sitemap URLs — all resolve.`,
);
