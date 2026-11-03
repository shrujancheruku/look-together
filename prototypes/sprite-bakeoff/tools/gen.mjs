// PROTOTYPE: asks Gemini 3 Pro Image (Vertex AI, project look-together, global endpoint) for the
// test sprite sheet, with out/ref.png as the style reference. Usage: node tools/gen.mjs [runs=3]
// Writes out/raw-<n>.png and appends tokens per run to out/runs.json.
import fs from "node:fs";
import { execSync } from "node:child_process";

const runs = Number(process.argv[2] ?? 3);
const PROMPT = `Pixel art sprite sheet for a calm pond game, in exactly the style of the attached reference: soft hi-bit pixel art, light from the upper left, each sprite outlined with a one-pixel coloured outline in the darkest colour of its own ramp (never black), no anti-aliasing, no blur, no dithering inside shapes. Use only colours from the swatch rows in the reference.

Every sprite is drawn at a tiny size in art pixels and then upscaled 12x with nearest-neighbour, so every art pixel is a crisp 12x12 block, the same block size for every sprite. Solid flat pure magenta (#FF00FF) background. One row, left to right, with wide magenta gaps (at least 6 art pixels) and nothing touching:
1. A large lily pad seen from slightly above, an oval with a notch, 27 x 13 art pixels, green ramp.
2. A small lily pad, the same style, 17 x 7 art pixels.
3. A pink water lily flower in full bloom seen from slightly above, 11 x 9 art pixels, pink ramp with a pale yellow centre.
4. A koi seen from directly above, swimming right, orange with white patches, 18 x 8 art pixels.
5. A dragonfly seen from directly above, wings spread flat, 13 x 9 art pixels, blue-green body with pale glassy wings.
6. The same dragonfly as the next animation frame: identical body, wings swept slightly back, 13 x 9 art pixels.
No text, no labels, no swatches, no shadows, no water, no ground.`;

// Variant "canvas": name the whole canvas in art pixels, which kept scale in the pond-skia prototype.
const CANVAS = PROMPT.replace("Every sprite is drawn at a tiny size in art pixels and then upscaled 12x with nearest-neighbour, so every art pixel is a crisp 12x12 block, the same block size for every sprite.",
  "The whole image is a small 132 x 56 pixel canvas upscaled 24x with nearest-neighbour, so every art pixel is a crisp 24x24 block. The sprites are tiny on that canvas: together they fill well under the canvas width, with most of the canvas left empty magenta. Count the art pixels: each sprite must be exactly the size given, no larger.");
const prompt = process.argv[3] === "canvas" ? CANVAS : PROMPT;
const token = execSync("gcloud auth print-access-token").toString().trim();
const url = `https://aiplatform.googleapis.com/v1/projects/look-together/locations/global/publishers/google/models/${process.env.MODEL ?? "gemini-3-pro-image"}:generateContent`;
const ref = fs.readFileSync("out/ref.png").toString("base64");
const log = fs.existsSync("out/runs.json") ? JSON.parse(fs.readFileSync("out/runs.json")) : [];
await Promise.all(Array.from({ length: runs }, async () => {
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-goog-user-project": "look-together" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/png", data: ref } }, { text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "21:9", imageSize: "2K" } },
    }),
  });
  const j = await res.json();
  const img = (j.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData);
  if (!img) return console.log("no image", res.status, JSON.stringify(j).slice(0, 400));
  const n = log.length + 1; log.push({ n, model: process.env.MODEL ?? "gemini-3-pro-image", variant: process.argv[3] ?? "scale", secs: (Date.now() - t0) / 1000, usage: j.usageMetadata });
  const file = `out/raw-${n}.png`;
  fs.writeFileSync(file, Buffer.from(img.inlineData.data, "base64"));
  console.log(file, `${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(j.usageMetadata?.candidatesTokensDetails ?? []));
}));
fs.writeFileSync("out/runs.json", JSON.stringify(log, null, 1));
