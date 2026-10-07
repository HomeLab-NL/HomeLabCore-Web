// Security headers: every built page is served with the dist/_headers rules
// (as Cloudflare Pages does) and must load in Chromium, in both themes and
// with the menu and language switch used, without a single
// Content-Security-Policy violation or blocked request.

import { chromium } from "playwright";
import { contextWithTheme, headersFor, pagePaths, serve, THEMES } from "./lib/serve.mjs";

const REQUIRED = [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
];

const failures = [];
const pages = pagePaths();

for (const p of pages) {
  const h = headersFor(p);
  for (const name of REQUIRED) if (!h[name]) failures.push(`${p}: missing ${name}`);
  const csp = h["Content-Security-Policy"] ?? "";
  if (csp.includes("INLINE_SCRIPT_HASHES")) failures.push(`${p}: CSP placeholder not filled (run npm run build)`);
  if (/script-src[^;]*'unsafe-(inline|eval)'/.test(csp)) failures.push(`${p}: script-src allows unsafe-inline/eval`);
}

const { server, base } = await serve();
const browser = await chromium.launch();
let runs = 0;

try {
  for (const theme of THEMES) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      const context = await contextWithTheme(browser, theme, { viewport });
      await context.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener("securitypolicyviolation", (e) =>
          window.__cspViolations.push(`${e.violatedDirective} blocked ${e.blockedURI || "inline"}`),
        );
      });
      for (const p of pages) {
        const page = await context.newPage();
        const errors = [];
        page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
        const res = await page.goto(base + p, { waitUntil: "load" });
        if (!res.headers()["content-security-policy"]) failures.push(`${p}: served without a CSP`);

        // Use the interactive parts so their scripts run under the policy too.
        const toggle = page.locator(viewport.width < 900 ? ".nav__toggle" : "[data-theme-toggle]").first();
        if (await toggle.isVisible()) await toggle.click();
        const lang = page.locator(".lang-switch summary").first();
        if (await lang.isVisible()) await lang.click();
        await page.waitForTimeout(50);

        const violations = await page.evaluate(() => window.__cspViolations);
        for (const v of violations) failures.push(`${p} [${theme} @${viewport.width}px]: CSP ${v}`);
        for (const e of errors) failures.push(`${p} [${theme} @${viewport.width}px]: ${e}`);
        runs++;
        await page.close();
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`✗ security headers: ${failures.length} problem(s)\n` + [...new Set(failures)].join("\n"));
  process.exit(1);
}
console.log(`✓ security headers on all ${pages.length} pages; ${runs} page loads without CSP violations or blocked requests`);
