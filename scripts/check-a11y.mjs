// Runs axe-core (WCAG 2.0/2.1/2.2 A + AA rules) against every built page in
// dist/, at a phone and a desktop width. Fails on any violation that is not
// listed in KNOWN_ISSUES.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const DIST = path.resolve("dist");
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 1280, height: 800 },
];

// Violations that exist in the current design and are scheduled to be fixed
// by a later phase. Each entry is a rule id; remove it once fixed so the
// check guards against regressions.
const KNOWN_ISSUES = {
  // The dark theme's studio blue (#3f74d8) is ~4.2–4.5:1 on its backgrounds,
  // just under AA. Fixed by the Phase 2 light theme (blue text #2b5cc4).
  "color-contrast": "Phase 2: light theme tokens",
  // Links inside paragraphs differ from body text by colour only. Fixed by
  // underlining in-text links in the Phase 2 design.
  "link-in-text-block": "Phase 2: underline links in running text",
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

function serve() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const rel = urlPath.replace(/^\/+/, "");
    const file = [rel, `${rel}.html`, path.join(rel, "index.html")]
      .map((c) => path.join(DIST, c))
      .find((f) => f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile());
    if (!file) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function pagePaths(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return pagePaths(p);
    if (!e.name.endsWith(".html")) return [];
    const rel = "/" + path.relative(DIST, p).split(path.sep).join("/");
    return [rel.replace(/index\.html$/, "")];
  });
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const failures = [];
const known = new Map();

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    for (const p of pagePaths(DIST).sort()) {
      const page = await context.newPage();
      await page.goto(base + p);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      for (const v of violations) {
        if (v.id in KNOWN_ISSUES) {
          known.set(v.id, (known.get(v.id) ?? 0) + v.nodes.length);
          continue;
        }
        failures.push(
          `${p} @${viewport.width}px — ${v.id} (${v.impact}): ${v.help}\n` +
            v.nodes.map((n) => `    ${n.target.join(" ")}`).join("\n"),
        );
      }
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

for (const [id, count] of known) {
  console.warn(`! known issue, not failing: ${id} (${count} nodes) — ${KNOWN_ISSUES[id]}`);
}
if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`✓ axe: no new WCAG A/AA violations on ${pagePaths(DIST).length} pages × ${VIEWPORTS.length} viewports.`);
