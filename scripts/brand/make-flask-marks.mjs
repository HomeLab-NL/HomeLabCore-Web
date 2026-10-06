// Builds the small header/footer flask marks from the supplied logo
// (public/assets/brand/homelab-flask.png, kept unchanged):
//   homelab-flask-mark.png       light theme — original colours
//   homelab-flask-mark-dark.png  dark theme  — the dark navy outline is
//                                lightened so it stays visible on a dark
//                                background; the blue liquid and bubbles
//                                keep their colour.
// Both are 2x the 18px display width. Run: node scripts/brand/make-flask-marks.mjs

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
