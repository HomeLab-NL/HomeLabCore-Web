// Renders the Open Graph / social preview images (1200×630) into public/og/:
//   homelabcore.png  — global HomeLabCore image (light lab-notebook style)
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

const globalHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${base}
  body {
    background-color: #fafaf7;
    background-image: radial-gradient(rgba(22,25,31,0.09) 1.2px, transparent 1.2px);
    background-size: 22px 22px;
    padding: 72px 80px;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .brand { display: flex; align-items: center; gap: 22px; }
  .brand img { height: 92px; width: auto; }
  .brand span { font-size: 56px; font-weight: 700; letter-spacing: -0.02em; }
  .brand b { color: #2b5cc4; font-weight: 700; }
  h1 { font-size: 66px; line-height: 1.08; font-weight: 700; letter-spacing: -0.03em; white-space: nowrap; }
  .rule { height: 2px; background: #3f74d8; width: 120px; margin-bottom: 28px; }
  .foot { display: flex; justify-content: space-between; font-family: ${MONO}; font-size: 24px; color: #4a5160; letter-spacing: 0.04em; }
</style></head><body>
  <div class="brand"><img src="${flask}" alt=""><span>HomeLab<b>Core</b></span></div>
  <div><div class="rule"></div><h1>We build things.<br>Then measure how we built them.</h1></div>
  <div class="foot"><span>INDEPENDENT SOFTWARE LAB</span><span>homelabcore.dev</span></div>
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

await render(globalHtml, "homelabcore.png", "png");

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
