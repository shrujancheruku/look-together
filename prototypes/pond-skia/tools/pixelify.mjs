// PROTOTYPE: turns "pixel-art-looking" AI output into true pixel art: finds the art-pixel grid,
// samples one colour per cell, quantizes to a fixed palette size and keys out magenta.
// Usage: node tools/pixelify.mjs <in.png> <out.png> [colours=48] [--key] [--crop x,y,w,h]
import sharp from "sharp";

const [inp, out, ...rest] = process.argv.slice(2);
const colours = Number(rest.find((a) => /^\d+$/.test(a)) ?? 48);
const key = rest.includes("--key");
const cropArg = rest[rest.indexOf("--crop") + 1];
let img = sharp(inp).removeAlpha();
if (rest.includes("--crop")) { const [left, top, width, height] = cropArg.split(",").map(Number); img = img.extract({ left, top, width, height }); }
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => (y * W + x) * 3;

// Edge energy per column / row; the grid shows as a period where edges line up.
const diff = (a, b) => Math.abs(data[a] - data[b]) + Math.abs(data[a + 1] - data[b + 1]) + Math.abs(data[a + 2] - data[b + 2]);
const colE = new Float64Array(W), rowE = new Float64Array(H);
for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) { colE[x] += diff(px(x, y), px(x - 1, y)); rowE[y] += diff(px(x, y), px(x, y - 1)); }
function period(E) {
  const mean = E.reduce((s, v) => s + v, 0) / E.length;
  const all = [];
  // Fractional periods: AI "pixels" are rarely a whole number of image pixels.
  for (let s = 3; s <= 24; s += 0.05) {
    let best = { s, phase: 0, score: 0 };
    for (let phase = 0; phase < s; phase += 0.5) {
      let on = 0, n = 0;
      for (let f = phase; f < E.length - 1; f += s) { on += Math.max(E[Math.floor(f)], E[Math.ceil(f)]); n++; }
      const score = (on / n / mean) * (1 - 1 / s); // edge energy on the grid lines vs chance
      if (score > best.score) best = { s, phase, score };
    }
    all.push(best);
  }
  // Multiples of the true period score as well; take the smallest period close to the best.
  const top = Math.max(...all.map((b) => b.score));
  return all.find((b) => b.score >= top * 0.9);
}
const forced = rest.includes("--grid") ? Number(rest[rest.indexOf("--grid") + 1]) : 0; // when the AI mixed pixel sizes
const gx = forced ? { ...period(colE), s: forced } : period(colE), gy = forced ? { ...period(rowE), s: forced } : period(rowE);
const s = (gx.s + gy.s) / 2;
const cols = Math.floor((W - gx.phase) / s), rows = Math.floor((H - gy.phase) / s);
const inner = Math.max(1, Math.floor(s / 2) - 1); // sample the middle of each cell

// One colour per cell: the median of its inner pixels (edges are where the AI blurs).
const small = Buffer.alloc(cols * rows * 4);
let noisy = 0;
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const ch = [[], [], []];
  const cx = Math.floor(gx.phase + (c + 0.5) * s), cy = Math.floor(gy.phase + (r + 0.5) * s);
  for (let y = -inner; y <= inner; y++) for (let x = -inner; x <= inner; x++) {
    const o = px(Math.min(W - 1, cx + x), Math.min(H - 1, cy + y));
    for (let k = 0; k < 3; k++) ch[k].push(data[o + k]);
  }
  const o = (r * cols + c) * 4;
  for (let k = 0; k < 3; k++) { ch[k].sort((a, b) => a - b); small[o + k] = ch[k][ch[k].length >> 1]; }
  const spread = ch[0][Math.floor(ch[0].length * 0.9)] - ch[0][Math.floor(ch[0].length * 0.1)];
  if (spread > 40) noisy++; // a cell that isn't one flat colour: off-grid detail or a mixed edge
  const isKey = key && small[o] > 140 && small[o + 2] > 140 && small[o + 1] < 0.55 * Math.min(small[o], small[o + 2]); // magenta and its blended fringe, not pink
  small[o + 3] = isKey ? 0 : 255;
}

const t = sharp(small, { raw: { width: cols, height: rows, channels: 4 } });
await t.png({ palette: true, colours, quality: 85, dither: 0 }).toFile(out); // the colour cap only applies below quality 100
const q = await sharp(out).ensureAlpha().raw().toBuffer();
const used = new Set();
for (let i = 0; i < q.length; i += 4) if (q[i + 3]) used.add((q[i] << 16) | (q[i + 1] << 8) | q[i + 2]);
console.log(JSON.stringify({ in: inp, out, source: `${W}x${H}`, grid: { x: +gx.s.toFixed(2), y: +gy.s.toFixed(2), phase: [gx.phase, gy.phase], confidence: +((gx.score + gy.score) / 2).toFixed(2) }, art: `${cols}x${rows}`, offGridCells: `${((noisy / (cols * rows)) * 100).toFixed(1)}%`, colours: used.size }));
