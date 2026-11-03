// PROTOTYPE: rough code-drawn starting points for img2img: flat shapes in the sprite's own ramps on flat
// water (the APIs want RGB, no alpha). Writes out/bo-<name>.png at the exact art-pixel size.
import sharp from "sharp";
import { COLS } from "./palette.mjs";
import { kitPad } from "./ref.mjs";

const BG = COLS.water[6];
const canvas = (w, h) => ({ w, h, px: Array(w * h).fill(BG) });
const put = (c, x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.px[y * c.w + x] = col; };
const save = (c, name) => { const b = Buffer.alloc(c.w * c.h * 3); c.px.forEach((v, i) => b.set(v, i * 3)); return sharp(b, { raw: { width: c.w, height: c.h, channels: 3 } }).png().toFile(`out/bo-${name}.png`); };
const outline = (c, col) => { // darkest step around every non-water pixel that touches water
  const is = (x, y) => x >= 0 && y >= 0 && x < c.w && y < c.h && c.px[y * c.w + x] !== BG;
  const edge = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (is(x, y) && (!is(x - 1, y) || !is(x + 1, y) || !is(x, y - 1) || !is(x, y + 1))) edge.push([x, y]);
  for (const [x, y] of edge) put(c, x, y, col);
};

// Koi from above, swimming right: tapering body, forked tail, two pectoral fins, white patches.
function koi(w, h) {
  const c = canvas(w, h), cy = (h - 1) / 2, K = COLS.koi, Wh = COLS.koiW;
  const bodyX0 = w * .22, bodyX1 = w - 1;
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    const t = (x - bodyX0) / (bodyX1 - bodyX0);
    if (t >= 0 && t <= 1) { const half = h * .36 * Math.sin(Math.PI * Math.min(1, .15 + t * .95)) ** .7; if (Math.abs(y - cy) <= half) put(c, x, y, K[y < cy ? 6 : 4]); }
  }
  for (let x = 0; x < bodyX0 + 1; x++) { const s = (bodyX0 - x) / bodyX0; for (const sg of [-1, 1]) for (let d = 0; d <= s * h * .32; d++) put(c, x, cy + sg * d, Wh[3]); } // forked tail
  for (const sg of [-1, 1]) for (let i = 0; i < Math.max(2, w * .1); i++) put(c, w * .62 - i, cy + sg * (h * .36 + i * .6), Wh[2]); // pectoral fins
  for (const [fx, fy, r] of [[.45, -.12, .12], [.72, .1, .09], [.86, -.05, .07]]) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot((x - w * fx) / (w * r), (y - cy - h * fy) / (h * r * 1.6)) < 1 && c.px[y * w + x] !== BG) put(c, x, y, Wh[4]);
  outline(c, K[0]);
  return c;
}
// Dragonfly from above, head at the top: wings out (frame 1) or swept back (frame 2).
function dragonfly(w, h, sweep) {
  const c = canvas(w, h), cx = Math.floor(w / 2), D = COLS.dfly, G = COLS.glint;
  for (const [y0, len] of [[3, w / 2 - 1], [5, w / 2 - 2]]) for (const sg of [-1, 1]) for (let i = 2; i <= len; i++) for (let t = 0; t < 2; t++) put(c, cx + sg * i, y0 + t + i * sweep, G[1 + t]);
  for (let y = 1; y < h; y++) put(c, cx, y, D[y < 6 ? 5 : 3]);
  put(c, cx - 1, 1, D[6]); put(c, cx + 1, 1, D[6]); put(c, cx, 0, D[2]);
  outline(c, D[0]);
  return c;
}

await save(koi(32, 16), "koi-32x16");
await save(koi(24, 12), "koi-24x12");
await save(dragonfly(20, 14, 0), "dfly1-20x14");
await save(dragonfly(20, 14, .55), "dfly2-20x14");
const pad = kitPad(8, 3, 2.4), ps = canvas(17, 12);
pad.px.forEach((v, i) => { if (v) ps.px[(Math.floor(i / pad.w) + 2) * 17 + (i % pad.w)] = v; });
await save(ps, "padS-17x12");
const pl = kitPad(13, 6, 0.7), pc = canvas(27, 13);
pl.px.forEach((v, i) => { if (v) pc.px[i] = v; });
await save(pc, "padL-27x13");
// Open flower from slightly above, 11 x 9 on a 12 x 12 canvas (RD's minimum): two rings of petals and a pale centre.
const F = COLS.flower, fc = canvas(12, 12), fx = 5.5, fy = 6;
for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
  const dx = (x - fx) / 5.5, dy = (y - fy) / 4.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  const petal = .75 + .25 * Math.cos(a * 8);
  if (r < petal) put(fc, x, y, F[r < .55 ? 10 : dy < 0 ? 8 : 5]);
  if (r < .3) put(fc, x, y, COLS.light[1]);
}
outline(fc, F[1]);
await save(fc, "flower-12x12");
console.log("wrote blockouts");
