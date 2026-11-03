// PROTOTYPE: reads a template run back out cell by cell: one colour per 24 px cell (the median of its
// middle), magenta and the template's grey keyed out, then snapped to the sprite's ramps like snap.mjs.
// Usage: node tools/snap-template.mjs <n...>   Writes out/t<n>-<slot>-{raw,snap}.png and out/template-results.json.
import fs from "node:fs";
import sharp from "sharp";
import { COLS, SLOTS, oklab } from "./palette.mjs";
import { CELL, BOXES } from "./template.mjs";

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const LAB = Object.fromEntries(Object.entries(COLS).map(([k, cs]) => [k, cs.map(oklab)]));
const out = fs.existsSync("out/template-results.json") ? JSON.parse(fs.readFileSync("out/template-results.json")) : {};
for (const n of process.argv.slice(2)) {
  const { data, info } = await sharp(`out/raw-${n}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, run = {};
  for (const slot of SLOTS) {
    const b = BOXES[slot.id], px = [];
    for (let cy = b.y; cy < b.y + b.h; cy++) for (let cx = b.x; cx < b.x + b.w; cx++) {
      const ch = [[], [], []];
      for (let y = 6; y < CELL - 6; y++) for (let x = 6; x < CELL - 6; x++) { const o = ((cy * CELL + y) * W + cx * CELL + x) * 3; for (let k = 0; k < 3; k++) ch[k].push(data[o + k]); }
      const c = ch.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
      const magenta = c[0] > 140 && c[2] > 140 && c[1] < .55 * Math.min(c[0], c[2]);
      const grey = Math.max(...c) - Math.min(...c) < 18 && c[0] > 185; // the template's box, left unpainted
      px.push(magenta || grey ? null : c);
    }
    const snap = px.map((c) => {
      if (!c) return null;
      const L = oklab(c); let best = 1e9, hit = null;
      for (const r of slot.ramps) LAB[r].forEach((q, s) => { const d = dist(L, q); if (d < best) { best = d; hit = COLS[r][s]; } });
      return hit;
    });
    // How well it filled the box: the painted area's bounding box against the box.
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    px.forEach((c, i) => { if (c) { const x = i % b.w, y = (i / b.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
    const rgba = (arr) => { const o = Buffer.alloc(b.w * b.h * 4); arr.forEach((c, i) => { if (c) { o.set(c, i * 4); o[i * 4 + 3] = 255; } }); return o; };
    for (const [kind, arr] of [["raw", px], ["snap", snap]]) await sharp(rgba(arr), { raw: { width: b.w, height: b.h, channels: 4 } }).png().toFile(`out/t${n}-${slot.id}-${kind}.png`);
    run[slot.id] = { painted: x1 < 0 ? "0×0" : `${x1 - x0 + 1}×${y1 - y0 + 1}`, box: `${b.w}×${b.h}`, cells: px.filter(Boolean).length };
  }
  out[n] = run;
  console.log(n, JSON.stringify(run));
}
fs.writeFileSync("out/template-results.json", JSON.stringify(out, null, 1));
