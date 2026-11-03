// PROTOTYPE: Retro Diffusion's advanced animation from a start frame (32–256 px, so small sprites are
// padded onto magenta). Usage: node tools/rd-anim.mjs <start.png> <frames> "<motion>"
// Writes out/rd-anim-<n>.png (a spritesheet, magenta keyed out) and appends to out/rd-runs.json.
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import sharp from "sharp";

const [start, frames, motion] = process.argv.slice(2);
const key = fs.readFileSync(`${os.homedir()}/.retro-diffusion-api-key`, "utf8").trim();
const meta = await sharp(start).metadata();
const H = { "X-RD-Token": key, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() };
const body = { prompt: motion, prompt_style: "rd_advanced_animation__custom_action", width: meta.width, height: meta.height, num_images: 1, frames_duration: Number(frames), input_image: (await sharp(start).removeAlpha().png().toBuffer()).toString("base64"), return_spritesheet: true, async: true };
let j = await (await fetch("https://api.retrodiffusion.ai/v2/inferences", { method: "POST", headers: H, body: JSON.stringify(body) })).json();
const t0 = Date.now();
while (j.task_id && !j.base64_images?.length && Date.now() - t0 < 600000) {
  await new Promise((r) => setTimeout(r, 5000));
  j = await (await fetch(`https://api.retrodiffusion.ai/v2/inferences/tasks/${j.task_id}`, { headers: H })).json();
  if (["failed", "error", "cancelled"].includes(j.status)) break;
  j = j.result ?? j;
}
if (!j.base64_images?.length) { console.log("no images", JSON.stringify(j).slice(0, 500)); process.exit(1); }
const log = fs.existsSync("out/rd-runs.json") ? JSON.parse(fs.readFileSync("out/rd-runs.json")) : [];
const n = log.filter((r) => r.anim).length + 1, file = `out/rd-anim-${n}.png`;
const { data, info } = await sharp(Buffer.from(j.base64_images[0], "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let k = 0; k < data.length; k += 4) if (data[k] > 200 && data[k + 2] > 200 && data[k + 1] < 80) data[k + 3] = 0;
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(file);
log.push({ id: "dfly-anim", anim: true, file, start, frames: Number(frames), motion, sheet: `${info.width}×${info.height}`, cost: j.balance_cost });
fs.writeFileSync("out/rd-runs.json", JSON.stringify(log, null, 1));
console.log(file, `${info.width}×${info.height}`, "cost", j.balance_cost, "remaining", j.remaining_balance, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
