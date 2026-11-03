// PROTOTYPE: PixelLab sprites cropped to what was drawn and snapped to the sprite's ramps (Pixen takes no
// palette, and Bitforge's forced palette is checked the same way). Writes out/pls-<name>.png.
import fs from "node:fs";
import sharp from "sharp";
import { COLS, SLOTS, oklab } from "./palette.mjs";

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const LAB = Object.fromEntries(Object.entries(COLS).map(([k, cs]) => [k, cs.map(oklab)]));
for (const r of JSON.parse(fs.readFileSync("out/pl-runs.json"))) {
  const slot = SLOTS.find((s) => s.id === r.id);
  const trimmed = await sharp(r.file).trim({ threshold: 0 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = trimmed, o = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) { o[i + 3] = 0; continue; }
    const L = oklab([data[i], data[i + 1], data[i + 2]]); let best = 1e9, hit = null;
    for (const rp of slot.ramps) LAB[rp].forEach((q, s) => { const d = dist(L, q); if (d < best) { best = d; hit = COLS[rp][s]; } });
    o.set(hit, i); o[i + 3] = 255;
  }
  const name = r.file.replace(/^out\/pl-/, "");
  await sharp(o, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(`out/pls-${name}`);
  r.drawn = `${info.width}×${info.height}`;
  console.log(name, r.drawn, "asked", r.size);
}
