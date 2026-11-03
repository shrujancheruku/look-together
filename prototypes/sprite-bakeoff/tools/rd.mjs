// PROTOTYPE: the Retro Diffusion arm. RD Pro at the exact art-pixel size, starting from a code-drawn
// blockout (img2img), with the sprite's ramps forced as the palette and the background removed.
// Usage: node tools/rd.mjs <slot> <blockout.png> [--n 2] [--seed 7] [--strength .55] [--key] [--check]
// --key: swap the blockout's water for magenta and key it out ourselves; RD's remove_bg eats pale wings and fins.
// Key from ~/.retro-diffusion-api-key. Writes out/rd-<blockout>-<seed>-<i>.png and appends to out/rd-runs.json.
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import sharp from "sharp";
import { COLS, SLOTS } from "./palette.mjs";

const [id, bo, ...rest] = process.argv.slice(2);
const opt = (f, d) => rest.includes(f) ? rest[rest.indexOf(f) + 1] : d;
const keyBg = rest.includes("--key");
const n = Number(opt("--n", 1)), seed = Number(opt("--seed", 7)), strength = Number(opt("--strength", .55)), check = rest.includes("--check");
const key = fs.readFileSync(`${os.homedir()}/.retro-diffusion-api-key`, "utf8").trim();
const PROMPT = {
  padS: "a small green water lily pad seen from above, a flat oval with a narrow notch, soft pixel art, light from the upper left, coloured outline",
  koi: "an orange and white koi fish seen from directly above, swimming right, forked tail, small pectoral fins, soft pixel art, coloured outline",
  dfly1: "a dragonfly seen from directly above, head at the top, wings spread straight out, slim blue-green body, pale glassy wings, soft pixel art",
  dfly2: "a dragonfly seen from directly above, head at the top, wings swept back towards the tail, slim blue-green body, pale glassy wings, soft pixel art",
};
const slot = SLOTS.find((s) => s.id === id);
const meta = await sharp(bo).metadata();
const MAG = [255, 0, 255];
const cols = [...slot.ramps.flatMap((r) => COLS[r]), keyBg ? MAG : COLS.water[6]]; // the background colour stays so it can be removed
let input = await sharp(bo).removeAlpha().raw().toBuffer();
if (keyBg) for (let i = 0; i < input.length; i += 3) if (input[i] === COLS.water[6][0] && input[i + 1] === COLS.water[6][1] && input[i + 2] === COLS.water[6][2]) input.set(MAG, i);
const pal = Buffer.alloc(cols.length * 3); cols.forEach((c, i) => pal.set(c, i * 3));
const body = {
  prompt: PROMPT[id], prompt_style: "rd_pro__default", width: meta.width, height: meta.height, num_images: n, seed,
  input_image: (await sharp(input, { raw: { width: meta.width, height: meta.height, channels: 3 } }).png().toBuffer()).toString("base64"), strength,
  input_palette: (await sharp(pal, { raw: { width: cols.length, height: 1, channels: 3 } }).png().toBuffer()).toString("base64"),
  remove_bg: !keyBg, bypass_prompt_expansion: true, check_cost: check, async: !check,
};
// The idempotency key keeps a retried POST from being charged twice; RD only takes it on async calls.
const H = { "X-RD-Token": key, "Content-Type": "application/json", ...(check ? {} : { "Idempotency-Key": crypto.randomUUID() }) };
let j = await (await fetch("https://api.retrodiffusion.ai/v2/inferences", { method: "POST", headers: H, body: JSON.stringify(body) })).json();
if (check) { console.log(JSON.stringify(j).slice(0, 600)); process.exit(0); }
const t0 = Date.now();
while (j.task_id && !j.base64_images?.length) {
  await new Promise((r) => setTimeout(r, 3000));
  j = await (await fetch(`https://api.retrodiffusion.ai/v2/inferences/tasks/${j.task_id}`, { headers: H })).json();
  if (["failed", "error", "cancelled"].includes(j.status)) break;
  j = j.result ?? j;
  if (Date.now() - t0 > 240000) break;
}
const imgs = j.base64_images ?? [];
if (!imgs.length) { console.log("no images", JSON.stringify(j).slice(0, 500)); process.exit(1); }
const log = fs.existsSync("out/rd-runs.json") ? JSON.parse(fs.readFileSync("out/rd-runs.json")) : [];
const base = bo.replace(/^out\/bo-|\.png$/g, "");
for (const [i, b] of imgs.entries()) {
  const file = `out/rd-${base}-s${seed}${keyBg ? "-k" : ""}-${i + 1}.png`;
  let png = Buffer.from(b, "base64");
  if (keyBg) { const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); for (let k = 0; k < data.length; k += 4) if (data[k] > 200 && data[k + 2] > 200 && data[k + 1] < 80) data[k + 3] = 0; png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(); }
  fs.writeFileSync(file, png);
  log.push({ id, file, blockout: bo, size: `${meta.width}×${meta.height}`, seed, strength, cost: j.balance_cost / imgs.length });
  console.log(file);
}
console.log("cost", j.balance_cost, "remaining", j.remaining_balance);
fs.writeFileSync("out/rd-runs.json", JSON.stringify(log, null, 1));
