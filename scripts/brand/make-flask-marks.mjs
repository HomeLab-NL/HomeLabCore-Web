// Builds the small header/footer flask marks and site favicons from the
// official HomeLabCore flask logo (public/assets/brand/homelab-flask.png,
// kept unchanged):
//   homelab-flask-mark.png       light theme — original colours
//   homelab-flask-mark-dark.png  dark theme  — the dark navy outline is
//                                lightened so it stays visible on a dark
//                                background; the blue liquid and bubbles
//                                keep their colour.
//   public/assets/favicon.svg    square SVG favicon embedding the original
//                                flask on the studio #fafaf7 tile so the dark
//                                navy outline and </> cutout are high-contrast
//                                in both light/dark browser tabs and Firefox
//                                bookmarks.
//   public/assets/favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png
//   public/favicon.ico           multi-size ICO (16x16, 32x32, 48x48)
// Run: node scripts/brand/make-flask-marks.mjs

import fs from "node:fs";
import sharp from "sharp";

const SRC = "public/assets/brand/homelab-flask.png";
const OUT = "public/assets/brand";
const WIDTH = 36; // 2x of the 18px rendered width
const OUTLINE_DARK_THEME = [0xdb, 0xe4, 0xf5]; // light blue-grey

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const recoloured = Buffer.from(data);
for (let i = 0; i < recoloured.length; i += 4) {
  const [r, g, b, a] = [recoloured[i], recoloured[i + 1], recoloured[i + 2], recoloured[i + 3]];
  if (a === 0) continue;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance < 0.2) {
    // dark navy outline -> light outline, keep alpha (anti-aliasing)
    [recoloured[i], recoloured[i + 1], recoloured[i + 2]] = OUTLINE_DARK_THEME;
  }
}

const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
await sharp(data, raw).resize({ width: WIDTH }).png({ compressionLevel: 9, palette: true }).toFile(`${OUT}/homelab-flask-mark.png`);
await sharp(recoloured, raw).resize({ width: WIDTH }).png({ compressionLevel: 9, palette: true }).toFile(`${OUT}/homelab-flask-mark-dark.png`);

for (const f of ["homelab-flask-mark.png", "homelab-flask-mark-dark.png"]) {
  const m = await sharp(`${OUT}/${f}`).metadata();
  console.log(f, `${m.width}x${m.height}`, (await sharp(`${OUT}/${f}`).toBuffer()).length, "bytes");
}

// Build square favicon tile from the original homelab-flask.png without redesigning it.
// Trim the 3px bottom canvas margin (y=400..402) that contains a 1px edge artifact at y=402.
const TRIM_H = 400;
const trimmedFlaskBuf = await sharp(SRC)
  .extract({ left: 0, top: 0, width: info.width, height: TRIM_H })
  .png({ compressionLevel: 9 })
  .toBuffer();
const flaskB64 = trimmedFlaskBuf.toString("base64");
// Flask aspect is 256 x 400. Inside a 64x64 viewBox:
// height = 56 (y = 4), width = 56 * (256 / 400) = 35.84 -> 36 (x = 14).
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="HomeLabCore">
  <rect width="64" height="64" rx="14" fill="#fafaf7"/>
  <image href="data:image/png;base64,${flaskB64}" x="14" y="4" width="36" height="56" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
fs.writeFileSync("public/assets/favicon.svg", faviconSvg);
console.log("favicon.svg", Buffer.byteLength(faviconSvg), "bytes");

async function renderFaviconPng(size) {
  const pad = Math.max(1, Math.round(size * 0.0625));
  const innerH = size - pad * 2;
  const innerW = Math.max(1, Math.round(innerH * (info.width / TRIM_H)));
  const resizedFlask = await sharp(trimmedFlaskBuf).resize(innerW, innerH, { fit: "contain" }).png().toBuffer();
  const rx = Math.round(size * 0.21875);
  const bgSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<rect width="${size}" height="${size}" rx="${rx}" fill="#fafaf7"/>` +
      `</svg>`
  );
  return sharp(bgSvg)
    .composite([{ input: resizedFlask, left: Math.round((size - innerW) / 2), top: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const png16 = await renderFaviconPng(16);
const png32 = await renderFaviconPng(32);
const png48 = await renderFaviconPng(48);
const png180 = await renderFaviconPng(180);

fs.writeFileSync("public/assets/favicon-16x16.png", png16);
fs.writeFileSync("public/assets/favicon-32x32.png", png32);
fs.writeFileSync("public/assets/apple-touch-icon.png", png180);

// Pack 16x16, 32x32, 48x48 PNG frames into a standard ICO container
function buildIco(frames) {
  const count = frames.length;
  const headerSize = 6 + count * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(count, 4);
  let offset = headerSize;
  frames.forEach(({ size, buf }, idx) => {
    const pos = 6 + idx * 16;
    header.writeUInt8(size >= 256 ? 0 : size, pos);
    header.writeUInt8(size >= 256 ? 0 : size, pos + 1);
    header.writeUInt8(0, pos + 2); // palette
    header.writeUInt8(0, pos + 3); // reserved
    header.writeUInt16LE(1, pos + 4); // color planes
    header.writeUInt16LE(32, pos + 6); // bpp
    header.writeUInt32LE(buf.length, pos + 8);
    header.writeUInt32LE(offset, pos + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...frames.map((f) => f.buf)]);
}

const ico = buildIco([
  { size: 16, buf: png16 },
  { size: 32, buf: png32 },
  { size: 48, buf: png48 },
]);
fs.writeFileSync("public/favicon.ico", ico);
console.log("favicon-16x16.png", png16.length, "bytes");
console.log("favicon-32x32.png", png32.length, "bytes");
console.log("apple-touch-icon.png", png180.length, "bytes");
console.log("favicon.ico", ico.length, "bytes");
