// PROTOTYPE: the layout template for the "template" runs. A 132 x 56 grid of 24 px cells on magenta
// (the 3168 x 1344 the model returns at 21:9 2K), with a lighter box per sprite at exactly its size in
// art pixels. The model paints into the boxes; snap-template.mjs reads one colour per cell back out.
import fs from "node:fs";
import sharp from "sharp";
import { SLOTS } from "./palette.mjs";

export const CELL = 24, GW = 132, GH = 56;
// Box per slot, in cells: one row, 5 cells apart, bottoms aligned on row 34.
export const BOXES = (() => { let x = 5; return Object.fromEntries(SLOTS.map((s) => { const b = { x, y: 34 - s.h, w: s.w, h: s.h }; x += s.w + 5; return [s.id, b]; })); })();

if (import.meta.url === `file://${process.argv[1]}`) {
  const W = GW * CELL, H = GH * CELL, b = Buffer.alloc(W * H * 3);
  const set = (x, y, [r, g, bl]) => { const o = (y * W + x) * 3; b[o] = r; b[o + 1] = g; b[o + 2] = bl; };
  const inBox = (cx, cy) => Object.values(BOXES).some((q) => cx >= q.x && cx < q.x + q.w && cy >= q.y && cy < q.y + q.h);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), line = x % CELL === 0 || y % CELL === 0;
    set(x, y, inBox(cx, cy) ? (line ? [200, 200, 200] : [240, 240, 240]) : (line ? [230, 0, 230] : [255, 0, 255]));
  }
  fs.mkdirSync("out", { recursive: true });
  await sharp(b, { raw: { width: W, height: H, channels: 3 } }).png().toFile("out/template.png");
  console.log("wrote out/template.png", `${W}x${H}`, JSON.stringify(BOXES));
}
