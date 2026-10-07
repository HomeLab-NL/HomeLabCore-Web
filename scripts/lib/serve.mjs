// Tiny static server for dist/, mirroring Cloudflare Pages path resolution:
// /x serves x, x.html or x/index.html; anything else is 404.html with 404.
// Path rules in dist/_headers (e.g. the security headers on /*) are applied
// to responses as Cloudflare does, so browser checks run under the same CSP.

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
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
};

export function resolveFile(urlPath) {
  const rel = decodeURIComponent(urlPath.split(/[?#]/)[0]).replace(/^\/+/, "");
  return [rel, `${rel}.html`, path.join(rel, "index.html")]
    .map((c) => path.join(DIST, c))
    .find((f) => f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile());
}

/**
 * Path rules from dist/_headers as [{ pattern: RegExp, headers: {name: value} }].
 * Rules for absolute URLs (preview hosts) are skipped.
 */
export function headerRules() {
  const file = path.join(DIST, "_headers");
  if (!fs.existsSync(file)) return [];
  const rules = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      const glob = line.trim();
      rules.push({
        skip: !glob.startsWith("/"),
        pattern: new RegExp("^" + glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"),
        headers: {},
      });
      continue;
    }
    const i = line.indexOf(":");
    rules.at(-1).headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules.filter((r) => !r.skip);
}

export function headersFor(urlPath, rules = headerRules()) {
  return Object.assign({}, ...rules.filter((r) => r.pattern.test(urlPath)).map((r) => r.headers));
}

/** Contents of every inline <script> (no src, JavaScript type) in the built pages. */
export function inlineScripts() {
  const out = [];
  for (const p of pagePaths()) {
    const html = fs.readFileSync(resolveFile(p), "utf8");
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bsrc=/.test(attrs)) continue;
      const type = attrs.match(/\btype="([^"]*)"/)?.[1];
      if (type && !/^(text\/javascript|module)$/.test(type)) continue;
      out.push(body);
    }
  }
  return out;
}

export function serve() {
  const rules = headerRules();
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://x").pathname;
    for (const [name, value] of Object.entries(headersFor(pathname, rules))) res.setHeader(name, value);
    const file = resolveFile(pathname);
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
