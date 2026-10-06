// Tiny static server for dist/, mirroring Cloudflare Pages path resolution:
// /x serves x, x.html or x/index.html; anything else is 404.html with 404.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

export const DIST = path.resolve("dist");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

export function resolveFile(urlPath) {
  const rel = decodeURIComponent(urlPath.split(/[?#]/)[0]).replace(/^\/+/, "");
  return [rel, `${rel}.html`, path.join(rel, "index.html")]
    .map((c) => path.join(DIST, c))
    .find((f) => f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile());
}

export function serve() {
  const server = http.createServer((req, res) => {
    const file = resolveFile(new URL(req.url, "http://x").pathname);
    if (!file) {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      fs.createReadStream(path.join(DIST, "404.html")).pipe(res);
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` })),
  );
}

/** Every built page as a URL path ("/", "/apps/", "/404.html", ...). */
export function pagePaths(dir = DIST) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === "_astro" ? [] : pagePaths(p);
      if (!e.name.endsWith(".html")) return [];
      const rel = "/" + path.relative(DIST, p).split(path.sep).join("/");
      return [rel.replace(/index\.html$/, "")];
    })
    .sort();
}

export const THEMES = ["light", "dark"];
export const STORAGE_KEY = "hlc-theme";

/** Browser context with a saved theme choice in place before any page script runs. */
export async function contextWithTheme(browser, theme, options = {}) {
  const context = await browser.newContext(options);
  if (theme) {
    await context.addInitScript(
      ([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch {}
      },
      [STORAGE_KEY, theme],
    );
  }
  return context;
}
