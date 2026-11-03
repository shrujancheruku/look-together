// PROTOTYPE: raw sheet → art-resolution sprites snapped to the kit's ramps, with the numbers the
// ticket judges on. For every out/raw-<n>.png: pixelify (grid detect + magenta key), cut the sheet
// into sprites, tell them apart by colour, snap each pixel to the nearest step of the sprite's own
// ramps (OKLab), then make an "auto" version at the target size with the outline forced to the
// darkest step: what a script can fix before any hand touch-up. Writes out/<n>-<slot>-{raw,snap,auto}.png
// and out/results.json.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { COLS, SLOTS, oklab } from "./palette.mjs";

const raws = fs.readdirSync("out").filter((f) => /^raw-\d+\.png$/.test(f)).sort();
const results = [];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const LAB = Object.fromEntries(Object.entries(COLS).map(([k, cs]) => [k, cs.map(oklab)]));

for (const f of raws) {
  const n = f.match(/\d+/)[0], art = `out/art-${n}.png`;
  const info = JSON.parse(execFileSync("node", ["tools/pixelify.mjs", `out/${f}`, art, "256", "--key"]).toString());
  const { data, info: im } = await sharp(art).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = im.width, H = im.height, op = (x, y) => data[(y * W + x) * 4 + 3] > 0;

  // Connected pieces (8-neighbour), then merge pieces whose boxes come within 2 art px (wings, petals).
  const lab = new Int32Array(W * H).fill(-1), boxes = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!op(x, y) || lab[y * W + x] >= 0) continue;
    const b = { x0: x, y0: y, x1: x, y1: y, n: 0 }, st = [[x, y]]; lab[y * W + x] = boxes.length;
    while (st.length) {
      const [cx, cy] = st.pop(); b.n++;
      b.x0 = Math.min(b.x0, cx); b.x1 = Math.max(b.x1, cx); b.y0 = Math.min(b.y0, cy); b.y1 = Math.max(b.y1, cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && op(nx, ny) && lab[ny * W + nx] < 0) { lab[ny * W + nx] = boxes.length; st.push([nx, ny]); }
      }
    }
    boxes.push(b);
  }
  let groups = boxes.filter((b) => b.n >= 4);
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i], b = groups[j];
      if (a.x0 - 2 <= b.x1 && b.x0 - 2 <= a.x1 && a.y0 - 2 <= b.y1 && b.y0 - 2 <= a.y1) {
        groups[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), n: a.n + b.n };
        groups.splice(j, 1); merged = true; break outer;
      }
    }
  }
  // Tell sprites apart by which ramp family their pixels sit nearest to.
  const crop = (g) => {
    const w = g.x1 - g.x0 + 1, h = g.y1 - g.y0 + 1, px = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = ((g.y0 + y) * W + g.x0 + x) * 4; px.push(data[o + 3] ? [data[o], data[o + 1], data[o + 2]] : null); }
    return { w, h, px };
  };
  // Only saturated pixels vote: pale wings, petals and koi patches all look alike.
  const FAM = ["pad", "flower", "koi", "dfly"];
  for (const g of groups) {
    const votes = {};
    for (const c of crop(g).px) if (c) {
      const L = oklab(c); if (Math.hypot(L[1], L[2]) < .05) continue;
      let best = 1e9, fam = null; for (const fm of FAM) for (const q of LAB[fm]) { const d = dist(L, q); if (d < best) { best = d; fam = fm; } }
      votes[fam] = (votes[fam] ?? 0) + 1;
    }
    g.fam = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
  }
  const pick = (fam) => groups.filter((g) => g.fam === fam).sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const pads = pick("pad").sort((a, b) => b.n - a.n), dfs = pick("dfly");
  const assign = { padL: pads[0], padS: pads[1], flower: pick("flower")[0], koi: pick("koi")[0], dfly1: dfs[0], dfly2: dfs[1] };
  const run = { n: +n, pixelify: info, pieces: groups.length, extra: groups.length - Object.values(assign).filter(Boolean).length, sprites: {} };

  for (const slot of SLOTS) {
    const g = assign[slot.id];
    if (!g) { run.sprites[slot.id] = { missing: true }; continue; }
    const sp = crop(g);
    // Snap each pixel to the nearest step of this sprite's ramps.
    let dE = 0, cnt = 0;
    const snap = { w: sp.w, h: sp.h, px: [], idx: [] };
    for (const c of sp.px) {
      if (!c) { snap.px.push(null); snap.idx.push(null); continue; }
      const L = oklab(c); let best = 1e9, hit = null;
      for (const r of slot.ramps) LAB[r].forEach((q, s) => { const d = dist(L, q); if (d < best) { best = d; hit = [r, s]; } });
      dE += best; cnt++;
      snap.px.push(COLS[hit[0]][hit[1]]); snap.idx.push(hit);
    }
    // Outline: share of edge pixels (touching transparency) already in their ramp's darkest step.
    const at = (x, y) => x >= 0 && y >= 0 && x < sp.w && y < sp.h && snap.px[y * sp.w + x];
    let edge = 0, dark = 0;
    for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) {
      const i = y * sp.w + x; if (!snap.px[i]) continue;
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) { edge++; if (snap.idx[i][1] <= 1) dark++; }
    }
    // "auto": nearest-neighbour to the target size, then force the outline to the main ramp's darkest step.
    const rgba = (s) => { const b = Buffer.alloc(s.w * s.h * 4); s.px.forEach((c, i) => { if (c) { b.set(c, i * 4); b[i * 4 + 3] = 255; } }); return b; };
    const base = `out/${n}-${slot.id}`;
    await sharp(rgba(sp), { raw: { width: sp.w, height: sp.h, channels: 4 } }).png().toFile(`${base}-raw.png`);
    await sharp(rgba(snap), { raw: { width: sp.w, height: sp.h, channels: 4 } }).png().toFile(`${base}-snap.png`);
    const small = await sharp(rgba(snap), { raw: { width: sp.w, height: sp.h, channels: 4 } }).resize(slot.w, slot.h, { kernel: "nearest", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).raw().toBuffer();
    const sa = (x, y) => x >= 0 && y >= 0 && x < slot.w && y < slot.h && small[(y * slot.w + x) * 4 + 3] > 127;
    const out = Buffer.from(small);
    for (let y = 0; y < slot.h; y++) for (let x = 0; x < slot.w; x++) {
      const o = (y * slot.w + x) * 4;
      if (small[o + 3] <= 127) { out[o + 3] = 0; continue; }
      out[o + 3] = 255;
      if (!sa(x - 1, y) || !sa(x + 1, y) || !sa(x, y - 1) || !sa(x, y + 1)) out.set(COLS[slot.main][0], o);
    }
    await sharp(out, { raw: { width: slot.w, height: slot.h, channels: 4 } }).png().toFile(`${base}-auto.png`);
    run.sprites[slot.id] = {
      size: `${sp.w}×${sp.h}`, target: `${slot.w}×${slot.h}`, scale: +(Math.max(sp.w / slot.w, sp.h / slot.h)).toFixed(2),
      coloursRaw: new Set(sp.px.filter(Boolean).map(String)).size, coloursSnap: new Set(snap.px.filter(Boolean).map(String)).size,
      meanDeltaE: +(dE / cnt * 100).toFixed(1), outlineDark: Math.round(dark / Math.max(1, edge) * 100),
    };
  }
  results.push(run);
  console.log(JSON.stringify({ n: run.n, art: info.art, grid: info.grid, offGrid: info.offGridCells, pieces: run.pieces, extra: run.extra }));
  for (const [k, v] of Object.entries(run.sprites)) console.log("  ", k, JSON.stringify(v));
}
fs.writeFileSync("out/results.json", JSON.stringify(results, null, 1));
