// Renders the Open Graph / social preview images (1200×630) into public/og/:
//   homelabcore.png, homelabcore-nl.png, homelabcore-uk.png — the global
//                      HomeLabCore image per language, in the style of the
//                      homepage: big "We build ideas." title and the flask
//   <project>.jpg    — one per project, from that project's verified cover
//                      image in src/content/projects/*.json. Handoff covers
//                      already carry the project name and HomeLabCore, so
//                      they are used as they are; concept art gets a name
//                      tag and is labelled "Concept art · Not gameplay".
// The images do not depend on the site theme. Re-run after changing a
// project cover: node scripts/og/render-og.mjs

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT = "public/og";
const W = 1200;
const H = 630;

const dataUri = (file) => {
  const ext = path.extname(file).slice(1).replace("jpg", "jpeg");
  return `data:image/${ext};base64,${fs.readFileSync(file).toString("base64")}`;
};

const FONT = `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
const MONO = `ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace`;
const flask = dataUri("public/assets/brand/homelab-flask.png");

const base = `
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${W}px; height: ${H}px; }
  body { font-family: ${FONT}; color: #16191f; background: #fafaf7; overflow: hidden; }
`;

const font = (file) => dataUri(`public/assets/fonts/${file}`).replace("data:image/woff2", "data:font/woff2");
// The homepage hero: label, huge display title and the brand flask (a still
// of the animated SVG), on the light "hall" wall.
const GLOBAL_COPY = {
  en: { label: "Independent software & AI lab", title: "We build ideas." },
  nl: { title: "We bouwen ideeën." },
  uk: { label: "Незалежна лабораторія програмного забезпечення та AI", title: "Ми будуємо ідеї." },
};
const animatedFlask = dataUri("public/assets/brand/homelabcore-animated.svg").replace("data:image/svg", "data:image/svg+xml");
const globalHtml = ({ label, title }) => `<!doctype html><html><head><meta charset="utf-8"><style>${base}
  @font-face { font-family: "HLC Display"; font-weight: 800; src: url(${font("bricolage-grotesque-latin-800-normal.woff2")}) format("woff2"); unicode-range: U+0000-00FF, U+2000-206F; }
  @font-face { font-family: "HLC Display"; font-weight: 800; src: url(${font("geologica-cyrillic-800-normal.woff2")}) format("woff2"); unicode-range: U+0400-045F, U+0490-0491; }
  body { padding: 64px 80px 56px; display: grid; grid-template-columns: 1fr 300px; grid-template-rows: auto 1fr auto; column-gap: 40px; }
  .label { grid-column: 1 / -1; font-family: ${MONO}; font-size: 24px; letter-spacing: 0.1em; text-transform: uppercase; color: #4a5160; }
  h1 { align-self: center; font-family: "HLC Display", ${FONT}; font-weight: 800; font-size: 132px; line-height: 0.95; letter-spacing: -0.045em; }
  .crop { align-self: center; justify-self: end; position: relative; width: 250px; aspect-ratio: 30 / 46; overflow: hidden; }
  .crop img { position: absolute; top: 0; left: calc(-100% * 12 / 30); width: calc(100% * 194 / 30); max-width: none; }
  .foot { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: baseline; border-top: 2px solid #e3e2dc; padding-top: 22px; }
  .brand { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; }
  .brand b { color: #2b5cc4; font-weight: 700; }
  .site { font-family: ${MONO}; font-size: 24px; color: #4a5160; letter-spacing: 0.04em; }
</style></head><body${label ? "" : ' style="grid-template-rows: 1fr auto"'}>
  ${label ? `<div class="label">${label}</div>` : ""}
  <h1>${title}</h1>
  <div class="crop"><img src="${animatedFlask}" alt=""></div>
  <div class="foot"><span class="brand">HomeLab<b>Core</b></span><span class="site">homelabcore.dev</span></div>
</body></html>`;

const projectHtml = (image, name, label) => `<!doctype html><html><head><meta charset="utf-8"><style>${base}
  .art { position: absolute; inset: 0; width: ${W}px; height: ${H}px; object-fit: cover; }
  .tag {
    position: absolute; left: 32px; bottom: 32px;
    display: flex; align-items: center; gap: 14px;
    padding: 14px 22px; border-radius: 10px;
    background: rgba(250,250,247,0.94); box-shadow: 0 2px 10px rgba(0,0,0,0.18);
  }
  .tag img { height: 40px; width: auto; }
  .tag .name { font-size: 30px; font-weight: 700; letter-spacing: -0.01em; }
  .tag .site { font-size: 22px; color: #4a5160; }
  .label {
    position: absolute; right: 32px; bottom: 32px;
    padding: 12px 18px; border-radius: 8px;
    background: rgba(22,25,31,0.86); color: #fafaf7;
    font-family: ${MONO}; font-size: 22px; letter-spacing: 0.06em; text-transform: uppercase;
  }
</style></head><body>
  <img class="art" src="${image}" alt="">
  <div class="tag"><img src="${flask}" alt=""><span class="name">${name}</span><span class="site">HomeLabCore</span></div>
  ${label ? `<div class="label">${label}</div>` : ""}
</body></html>`;

// Cover image as it is, scaled to fill 1200×630 (16:9 covers lose ~2% top and bottom).
const plainHtml = (image) => `<!doctype html><html><head><meta charset="utf-8"><style>${base}
  .art { position: absolute; inset: 0; width: ${W}px; height: ${H}px; object-fit: cover; }
</style></head><body><img class="art" src="${image}" alt=""></body></html>`;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

async function render(html, file, type) {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, file), type, ...(type === "jpeg" ? { quality: 82 } : {}) });
  console.log(`${file}  ${(fs.statSync(path.join(OUT, file)).size / 1024).toFixed(0)} KB`);
}

for (const [lang, copy] of Object.entries(GLOBAL_COPY)) {
  await render(globalHtml(copy), lang === "en" ? "homelabcore.png" : `homelabcore-${lang}.png`, "png");
}

const dir = "src/content/projects";
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const id = path.basename(f, ".json");
  const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (!p.cover) continue; // falls back to the global image
  const img = path.resolve(dir, p.cover.src);
  const concept = p.cover.kind === "concept";
  const html = concept
    ? projectHtml(dataUri(img), p.name, "Concept art · Not gameplay")
    : plainHtml(dataUri(img));
  await render(html, `${id}.jpg`, "jpeg");
}

await browser.close();
