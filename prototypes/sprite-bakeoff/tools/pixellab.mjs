// PROTOTYPE: the PixelLab arm. Draws each sprite at its exact art-pixel size (canvas at least 16 a side,
// PixelLab's minimum) with the kit's palette forced and, on Bitforge, the kit's pad as the style image.
// Usage: node tools/pixellab.mjs <endpoint> <slot...> [--init <png>] [--big]
//   endpoint: bitforge | pixflux | pixen. --nostyle drops Bitforge's style image. Key from ~/.pixellab-api-key. Writes out/pl-<endpoint>-<slot>[-big]-<n>.png
// and appends to out/pl-runs.json. Every call spends trial generations, so run one slot at a time first.
import fs from "node:fs";
import os from "node:os";
import sharp from "sharp";
import { COLS, SLOTS } from "./palette.mjs";

const [endpoint, ...rest] = process.argv.slice(2);
const flag = (f) => rest.includes(f) ? rest[rest.indexOf(f) + 1] : null;
const big = rest.includes("--big"), nostyle = rest.includes("--nostyle");
const slots = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--init");
const key = fs.readFileSync(`${os.homedir()}/.pixellab-api-key`, "utf8").trim();
const DESC = {
  padL: "a green water lily pad seen from above, an oval with a narrow notch cut in to the centre, soft hi-bit pixel art, light from the upper left",
  padS: "a small green water lily pad seen from above, a flat oval with a narrow notch, soft hi-bit pixel art, light from the upper left",
  flower: "a pink water lily flower in full bloom seen from slightly above, pale yellow centre, soft hi-bit pixel art",
  koi: "an orange koi fish with white patches seen from directly above, swimming to the right, soft hi-bit pixel art",
  dfly1: "a dragonfly seen from directly above, wings spread flat, blue-green body, pale glassy wings, soft hi-bit pixel art",
  dfly2: "the same dragonfly seen from directly above, wings swept back mid wing-beat, blue-green body, pale glassy wings",
};
// Larger koi and dragonfly, in case the kit sizes are too small to read.
const BIG = { koi: [24, 12], dfly1: [20, 14], dfly2: [20, 14] };
const b64 = async (s) => ({ type: "base64", base64: (await s.png().toBuffer()).toString("base64"), format: "png" });
const palette = async (ramps) => { const cs = ramps.flatMap((r) => COLS[r]); const b = Buffer.alloc(cs.length * 3); cs.forEach((c, i) => b.set(c, i * 3)); return b64(sharp(b, { raw: { width: cs.length, height: 1, channels: 3 } })); };

const log = fs.existsSync("out/pl-runs.json") ? JSON.parse(fs.readFileSync("out/pl-runs.json")) : [];
for (const id of slots) {
  const slot = SLOTS.find((s) => s.id === id);
  const [w, h] = big && BIG[id] ? BIG[id] : [slot.w, slot.h];
  let size = { width: Math.max(16, w), height: Math.max(16, h) };
  // A seed image fixes the canvas: PixelLab wants them the same size.
  if (flag("--init")) { const m = await sharp(flag("--init")).metadata(); size = { width: m.width, height: m.height }; }
  // Pixen: sides divisible by 4, and square when either side is under 32. It takes no palette, so snap later.
  if (endpoint === "pixen") { const r4 = (v) => Math.ceil(v / 4) * 4; size = { width: r4(size.width), height: r4(size.height) }; if (Math.min(size.width, size.height) < 32) size.width = size.height = Math.max(size.width, size.height); }
  const body = endpoint === "pixen"
    ? { description: DESC[id], image_size: size, no_background: true, outline: "single color outline", detail: "medium detail", view: "high top-down" }
    : { description: DESC[id], image_size: size, no_background: true, outline: "single color outline", shading: "medium shading", detail: "medium detail", view: "high top-down", color_image: await palette(slot.ramps) };
  // The style image must match the canvas, so the kit's pad is centred on it (shrunk only if it can't fit).
  if (endpoint === "bitforge" && !nostyle) { body.style_image = await b64(sharp("out/kit-padL.png").resize({ width: body.image_size.width, height: body.image_size.height, fit: "contain", kernel: "nearest", withoutEnlargement: true, background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 0, bottom: 0, left: 0, right: 0 })); body.style_strength = 50; }
  if (flag("--init")) { body.init_image = await b64(sharp(flag("--init"))); body.init_image_strength = 500; }
  const t0 = Date.now();
  const res = await fetch(`https://api.pixellab.ai/v2/create-image-${endpoint}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json();
  const data = j.image?.base64?.replace(/^data:image\/png;base64,/, "");
  if (!data) { console.log(id, res.status, JSON.stringify(j).slice(0, 500)); continue; }
  const tag = `${endpoint}${nostyle ? "-nostyle" : ""}`;
  const n = log.filter((r) => r.tag === tag && r.id === id && !!r.big === big).length + 1;
  const file = `out/pl-${tag}-${id}${big ? "-big" : ""}-${n}.png`;
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  log.push({ endpoint, tag, id, big, n, file, size: `${w}×${h}`, canvas: `${body.image_size.width}×${body.image_size.height}`, secs: (Date.now() - t0) / 1000, usage: j.usage, init: flag("--init") });
  console.log(file, `${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(j.usage));
}
fs.writeFileSync("out/pl-runs.json", JSON.stringify(log, null, 1));
