// PROTOTYPE: the style reference handed to the image model: the kit's own code-drawn pad and
// flower (same maths as the Pond Style Kit) plus the ramps as swatches, upscaled 12x on magenta.
// Also writes the 1x code-drawn pieces so the page can show them beside the AI sprites.
import fs from "node:fs";
import sharp from "sharp";
import { COLS, SLOTS } from "./palette.mjs";

const hash2 = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// The kit's pad: an oval with a notch, light from the upper left, coloured outline in the darkest step.
export function kitPad(rx, ry, notch) {
  const np = COLS.pad.length, w = rx * 2 + 1, h = ry * 2 + 1, px = Array(w * h).fill(null);
  const inside = (x, y) => { const e2 = (x / rx) ** 2 + (y / ry) ** 2; if (e2 > 1) return false; let a = Math.atan2(y / ry, x / rx) - notch; a = Math.atan2(Math.sin(a), Math.cos(a)); return !(Math.abs(a) < .28 && e2 > .02); };
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    if (!inside(x, y)) continue;
    const v = .6 - (y / ry) * .25 - (x / rx) * .1 + (hash2(x >> 1, y >> 1, 13) - .5) * .25;
    let s = 1 + Math.round(clamp(v, 0, 1) * (np - 2));
    const a = Math.atan2(y / ry, x / rx);
    if (Math.abs(Math.sin((a - notch) * 3.5)) < .12 && (x / rx) ** 2 + (y / ry) ** 2 > .05) s = Math.max(1, s - 1);
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) s = 0;
    px[(y + ry) * w + x + rx] = COLS.pad[s];
  }
  return { w, h, px };
}
export function kitFlower() {
  const rows = ["..P.P..", ".PpPpP.", "PpPcPpP", ".pPpPp.", "..ppp.."], nf = COLS.flower.length;
  const h = rows.length, w = rows[0].length, px = Array(w * h).fill(null);
  const at = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== ".";
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x];
    if (ch === ".") continue;
    let c = ch === "P" ? COLS.flower[nf - 1] : ch === "p" ? COLS.flower[nf - 3] : COLS.light[2];
    if (ch !== "c" && (!at(x - 1, y) || !at(x + 1, y) || !at(x, y + 1))) c = ch === "P" ? COLS.flower[nf - 2] : COLS.flower[0];
    px[y * w + x] = c;
  }
  return { w, h, px };
}
export function toRGBA({ w, h, px }, bg = null) {
  const b = Buffer.alloc(w * h * 4);
  px.forEach((c, i) => { const v = c ?? bg; if (v) { b[i * 4] = v[0]; b[i * 4 + 1] = v[1]; b[i * 4 + 2] = v[2]; b[i * 4 + 3] = 255; } });
  return b;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.mkdirSync("out", { recursive: true });
  const S = 12, MAG = [255, 0, 255];
  const padL = kitPad(13, 6, 0.7), padS = kitPad(8, 3, 2.4), fl = kitFlower();
  // Layout in art px: the two pads and the flower, then one row of swatches per ramp the test set uses.
  const used = [...new Set(SLOTS.flatMap((s) => s.ramps))];
  const W = 80, H = 22 + used.length * 4 + 2;
  const art = { w: W, h: H, px: Array(W * H).fill(null) };
  const blit = (sp, ox, oy) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const c = sp.px[y * sp.w + x]; if (c) art.px[(oy + y) * W + ox + x] = c; } };
  blit(padL, 3, 4); blit(padS, 36, 7); blit(fl, 60, 8);
  used.forEach((r, i) => COLS[r].forEach((c, s) => { for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) art.px[(22 + i * 4 + dy) * W + 3 + s * 4 + dx] = c; }));
  await sharp(toRGBA(art, MAG), { raw: { width: W, height: H, channels: 4 } }).resize(W * S, H * S, { kernel: "nearest" }).png().toFile("out/ref.png");
  for (const [n, sp] of [["kit-padL", padL], ["kit-padS", padS], ["kit-flower", fl]])
    await sharp(toRGBA(sp), { raw: { width: sp.w, height: sp.h, channels: 4 } }).png().toFile(`out/${n}.png`);
  console.log("wrote out/ref.png", `${W * S}x${H * S}`, "ramps:", used.join(", "));
}
