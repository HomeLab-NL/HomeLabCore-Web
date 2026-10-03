// Runs axe-core (WCAG 2.0/2.1/2.2 A + AA rules) against every built page in
// dist/, in BOTH themes, at a phone and a desktop width. Any violation fails.

import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { contextWithTheme, pagePaths, serve, THEMES } from "./lib/serve.mjs";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

const { server, base } = await serve();
const browser = await chromium.launch();
const pages = pagePaths();
const failures = [];
let runs = 0;

try {
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      const context = await contextWithTheme(browser, theme, { viewport });
      for (const p of pages) {
        const page = await context.newPage();
        await page.goto(base + p, { waitUntil: "load" });
        const applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
        if (applied !== theme) failures.push(`${p} [${theme}]: page rendered with data-theme="${applied}"`);
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        runs++;
        for (const v of violations) {
          failures.push(
            `${p} [${theme} @${viewport.width}px] — ${v.id} (${v.impact}): ${v.help}\n` +
              v.nodes.map((n) => `    ${n.target.join(" ")}  ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`).join("\n"),
          );
        }
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
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`✓ axe: no WCAG A/AA violations — ${pages.length} pages × ${THEMES.length} themes × ${VIEWPORTS.length} viewports (${runs} runs).`);
