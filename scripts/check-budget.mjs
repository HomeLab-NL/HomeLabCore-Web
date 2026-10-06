// Performance budget: bytes each built page downloads on load (no scrolling),
// at a phone and a desktop width. Fails if a page, or its CSS/JS, exceeds
// the budget. Served uncompressed, so real transfer sizes are smaller.

import { chromium } from "playwright";
import { pagePaths, serve } from "./lib/serve.mjs";

const BUDGET = {
  total: 250 * 1024, // everything requested during load
  css: 40 * 1024,
  js: 10 * 1024,
};
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

const { server, base } = await serve();
const browser = await chromium.launch();
const rows = [];
const failures = [];

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    for (const p of pagePaths()) {
      const page = await context.newPage();
      const sizes = { total: 0, css: 0, js: 0, img: 0, html: 0 };
      page.on("response", async (res) => {
        try {
          const len = (await res.body()).length;
          const type = res.request().resourceType();
          sizes.total += len;
          if (type === "stylesheet") sizes.css += len;
          else if (type === "script") sizes.js += len;
          else if (type === "image") sizes.img += len;
          else if (type === "document") sizes.html += len;
        } catch {}
      });
      await page.goto(base + p, { waitUntil: "networkidle" });
      await page.close();
      rows.push({ page: p, width: viewport.width, ...sizes });
      for (const k of ["total", "css", "js"]) {
        if (sizes[k] > BUDGET[k]) failures.push(`${p} @${viewport.width}px: ${k} ${(sizes[k] / 1024).toFixed(1)} KB > ${BUDGET[k] / 1024} KB`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

const kb = (n) => (n / 1024).toFixed(1).padStart(6);
console.log("width  total   html    css     js    img   page");
for (const r of rows) console.log(`${String(r.width).padStart(5)} ${kb(r.total)} ${kb(r.html)} ${kb(r.css)} ${kb(r.js)} ${kb(r.img)}   ${r.page}`);
if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
const max = Math.max(...rows.map((r) => r.total));
console.log(`✓ budget: largest page load ${(max / 1024).toFixed(1)} KB (budget ${BUDGET.total / 1024} KB); CSS ≤ ${BUDGET.css / 1024} KB; JS ≤ ${BUDGET.js / 1024} KB.`);
