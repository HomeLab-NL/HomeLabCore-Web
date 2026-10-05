// Theme behaviour tests against the built site:
//   - first visit -> light, even when the OS prefers dark
//   - the saved theme is applied before first paint (no flash), on every page
//   - the toggle works by keyboard, persists across pages and visits
//   - the toggle's accessible name names the theme it switches to
//   - blocked storage falls back to light without errors
//   - the inline theme script precedes the stylesheet in every page

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { DIST, pagePaths, serve, STORAGE_KEY } from "./lib/serve.mjs";

const LIGHT_BG = "rgb(250, 250, 247)"; // #fafaf7
const DARK_BG = "rgb(11, 13, 16)"; // #0b0d10

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push([true, name]);
  } catch (e) {
    results.push([false, name, e.message]);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

// Records data-theme at the moment <body> is inserted, i.e. before first paint.
const RECORD_THEME_AT_BODY = () => {
  new MutationObserver((_, obs) => {
    if (document.body) {
      window.__themeAtBody = document.documentElement.getAttribute("data-theme");
      obs.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
};

const { server, base } = await serve();
const browser = await chromium.launch();
const pages = pagePaths();

try {
  await test("first visit is light, even with OS dark preference", async () => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto(base + "/");
    const state = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute("data-theme"),
      bg: getComputedStyle(document.body).backgroundColor,
    }));
    assert(state.theme === "light", `data-theme is ${state.theme}`);
    assert(state.bg === LIGHT_BG, `body background is ${state.bg}`);
    assert((await page.getByRole("button", { name: "Dark theme" }).count()) === 1, "toggle is not named 'Dark theme' in light theme");
    await ctx.close();
  });

  await test(`saved dark theme is applied before first paint on all ${pages.length} pages`, async () => {
    const ctx = await browser.newContext({ colorScheme: "light" });
    await ctx.addInitScript(([k]) => localStorage.setItem(k, "dark"), [STORAGE_KEY]);
    await ctx.addInitScript(RECORD_THEME_AT_BODY);
    const page = await ctx.newPage();
    for (const p of pages) {
      await page.goto(base + p);
      const atBody = await page.evaluate(() => window.__themeAtBody);
      assert(atBody === "dark", `${p}: data-theme was "${atBody}" when <body> was created`);
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      assert(bg === DARK_BG, `${p}: body background ${bg}`);
    }
    await ctx.close();
  });

  await test("toggle is a button named after the theme it switches to", async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(base + "/");
    const btn = page.getByRole("button", { name: "Dark theme" });
    assert((await btn.count()) === 1, "no single button named 'Dark theme'");
    assert(await btn.isVisible(), "toggle not visible at desktop width");
    await ctx.close();
  });

  await test("keyboard toggle switches theme, persists across pages and visits", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(RECORD_THEME_AT_BODY);
    const page = await ctx.newPage();
    await page.goto(base + "/");
    // Tab from the top of the page until the toggle has focus.
    let focused = false;
    for (let i = 0; i < 30 && !focused; i++) {
      await page.keyboard.press("Tab");
      focused = await page.evaluate(() => document.activeElement?.hasAttribute("data-theme-toggle") ?? false);
    }
    assert(focused, "toggle never received focus via Tab");
    await page.keyboard.press("Space");
    let s = await page.evaluate((k) => ({
      theme: document.documentElement.getAttribute("data-theme"),
      stored: localStorage.getItem(k),
      meta: document.querySelector('meta[name="theme-color"]').content,
    }), STORAGE_KEY);
    assert(s.theme === "dark" && s.stored === "dark", `after Space: ${JSON.stringify(s)}`);
    assert((await page.getByRole("button", { name: "Light theme" }).count()) === 1, "toggle not renamed 'Light theme' in dark theme");
    assert(s.meta === "#0b0d10", `theme-color meta is ${s.meta}`);

    await page.goto(base + "/privacy/cookfrom");
    assert((await page.evaluate(() => window.__themeAtBody)) === "dark", "dark not kept on next page before paint");
    assert((await page.getByRole("button", { name: "Light theme" }).count()) === 1, "toggle label not restored on the next page");

    const page2 = await ctx.newPage(); // a later visit in the same browser
    await page2.goto(base + "/apps/");
    assert((await page2.evaluate(() => window.__themeAtBody)) === "dark", "dark not kept on a new visit");

    await page2.locator("[data-theme-toggle]").focus();
    await page2.keyboard.press("Enter");
    s = await page2.evaluate((k) => ({ theme: document.documentElement.getAttribute("data-theme"), stored: localStorage.getItem(k) }), STORAGE_KEY);
    assert(s.theme === "light" && s.stored === "light", `after Enter: ${JSON.stringify(s)}`);
    await ctx.close();
  });

  await test("manual choice wins over OS preference", async () => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    await ctx.addInitScript(([k]) => localStorage.setItem(k, "light"), [STORAGE_KEY]);
    const page = await ctx.newPage();
    await page.goto(base + "/");
    assert((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "light", "not light");
    await ctx.close();
  });

  await test("blocked localStorage: light theme, no errors, toggle still works", async () => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/");
    assert((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "light", "not light");
    await page.locator("[data-theme-toggle]").click();
    assert((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark", "toggle failed");
    assert(errors.length === 0, `page errors: ${errors.join("; ")}`);
    await ctx.close();
  });

  await test("mobile: menu opens by keyboard, holds the toggle, closes on Escape", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(base + "/");
    const menuBtn = page.getByRole("button", { name: "Menu" });
    assert(await menuBtn.isVisible(), "menu button hidden");
    assert(!(await page.locator("[data-theme-toggle]").isVisible()), "toggle visible before the menu is opened");
    await menuBtn.focus();
    await page.keyboard.press("Enter");
    assert((await menuBtn.getAttribute("aria-expanded")) === "true", "menu not expanded");
    assert(await page.locator("[data-theme-toggle]").isVisible(), "toggle not visible in open menu");
    await page.keyboard.press("Escape");
    assert((await menuBtn.getAttribute("aria-expanded")) === "false", "Escape did not close the menu");
    await ctx.close();
  });

  await test("without JS: light theme, navigation visible, toggle hidden", async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(base + "/");
    assert(await page.getByRole("link", { name: "Benchmarks" }).first().isVisible(), "nav links hidden without JS");
    assert(!(await page.locator("[data-theme-toggle]").isVisible()), "non-working toggle shown without JS");
    await ctx.close();
  });
} finally {
  await browser.close();
  server.close();
}

// Static check: the theme script must run before the stylesheet loads.
const order = [];
for (const p of pages) {
  const file = p.endsWith(".html") ? path.join(DIST, p) : path.join(DIST, p, "index.html");
  const html = fs.readFileSync(file, "utf8");
  const script = html.indexOf(`localStorage.getItem("${STORAGE_KEY}")`);
  const css = html.indexOf('rel="stylesheet"');
  if (script === -1 || css === -1 || script > css) order.push(p);
}
results.push([order.length === 0, `theme script precedes the stylesheet in all ${pages.length} pages`, order.join(", ")]);

for (const [ok, name, detail] of results) console[ok ? "log" : "error"](`${ok ? "✓" : "✗"} ${name}${!ok && detail ? `\n    ${detail}` : ""}`);
process.exit(results.every(([ok]) => ok) ? 0 : 1);
