// PROTOTYPE: asks Gemini 3 Pro Image (Vertex AI, project look-together) for pixel-art pond assets.
// Usage: node tools/gen-pixel.mjs <name...>   Writes assets/pixel-raw/<name>-<n>.png
import fs from "node:fs";
import { execSync } from "node:child_process";

const STYLE = "Modern high-resolution pixel art, hi-bit style like the backgrounds of Eastward or Sea of Stars, not 8-bit. Crisp square pixels on one consistent grid, each art pixel exactly 4x4 image pixels, a limited palette of about 40 colours, sparing ordered dithering, no anti-aliasing, no blur, no smooth gradients, no outlines thicker than one art pixel. Calm and gentle, never busy. No text, no people, no animals.";
const PROMPTS = {
  "bg-spring": `${STYLE} A calm forest pond seen from the shore, portrait 9:16. Spring morning: pale blue sky with soft clouds at the top, a far bank of rounded green trees with a few pink blossoms across the middle, and still pond water filling the bottom of the image. The horizon where the bank meets the water is a straight line exactly 42% down from the top. Leave the water empty: no lily pads, no boat, no plants on the water.`,
  "bg-autumn": `${STYLE} A calm forest pond seen from the shore, portrait 9:16. Autumn evening: sky from deep indigo at the top to warm amber at the horizon, a pale full moon, a far bank of rounded orange, red and gold trees across the middle, and dark still pond water filling the bottom of the image with a faint moon reflection. The horizon where the bank meets the water is a straight line exactly 42% down from the top. Leave the water empty: no lily pads, no boat, no plants on the water.`,
  "sprites": `${STYLE} A sprite sheet on a solid flat pure magenta (#FF00FF) background, seen from slightly above, all at the same pixel scale: three round lily pads with a notch in a row (fresh green, yellowing, brown and curling), then a pink lotus flower in bloom, a closed pink lily bud, a small wooden rowboat, and four small floating leaves (two green, two orange). Each item separate with wide magenta space between them, no shadows, no ground, nothing touching the edges.`,
  "splash": `${STYLE} A sprite animation strip on a solid flat pure magenta (#FF00FF) background: 6 frames left to right of a single water drop falling onto a still pond surface and spreading into a widening oval ripple ring that fades out. Pale blue-white water on the magenta, each frame the same size, evenly spaced in one row, wide magenta gaps, no shadows.`,
};
PROMPTS["bg-spring-hibit"] = PROMPTS["bg-spring"].replace("each art pixel exactly 4x4 image pixels", "drawn as a small 216 x 384 pixel canvas and then upscaled 7x with nearest-neighbour, so every art pixel is a 7x7 block; fine detail, small trees with many leaf clusters, thin one-pixel highlights").replace("exactly 42% down", "exactly 40% down");
const HIBIT = "drawn as a small 216 x 384 pixel canvas and then upscaled 7x with nearest-neighbour, so every art pixel is a 7x7 block; fine detail, small trees with many leaf clusters, thin one-pixel highlights";
PROMPTS["bg-autumn-hibit"] = PROMPTS["bg-autumn"].replace("each art pixel exactly 4x4 image pixels", HIBIT);
PROMPTS["sprites-hibit"] = PROMPTS["sprites"].replace("each art pixel exactly 4x4 image pixels", "drawn at a small pixel size and upscaled 7x with nearest-neighbour, so every art pixel is a 7x7 block, the same art-pixel size for every item") + " Only these items: no colour swatches, no palette, no labels.";
PROMPTS["sprites-scene"] = PROMPTS["sprites-hibit"].replace("A sprite sheet", "A small-scale sprite sheet for a 216 x 384 pixel scene: each lily pad only 36 art pixels wide, the lotus 28, the bud 12 wide, the boat 56 long, each leaf 14 long, so they are small with little interior detail. A sprite sheet");
const ASPECT = { "sprites-scene": "16:9", "bg-autumn-hibit": "9:16", "sprites-hibit": "16:9", "bg-spring-hibit": "9:16", "bg-spring": "9:16", "bg-autumn": "9:16", sprites: "16:9", splash: "21:9" };

const token = execSync("gcloud auth print-access-token").toString().trim();
const url = "https://aiplatform.googleapis.com/v1/projects/look-together/locations/global/publishers/google/models/gemini-3-pro-image:generateContent";
fs.mkdirSync("assets/pixel-raw", { recursive: true });
await Promise.all(process.argv.slice(2).map(async (name) => {
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-goog-user-project": "look-together" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPTS[name] }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ASPECT[name], imageSize: "2K" } },
    }),
  });
  const j = await res.json();
  const parts = j.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData);
  if (!img) return console.log(name, res.status, JSON.stringify(j).slice(0, 400));
  const n = fs.readdirSync("assets/pixel-raw").filter((f) => f.startsWith(name + "-")).length + 1;
  const file = `assets/pixel-raw/${name}-${n}.${img.inlineData.mimeType.split("/")[1]}`;
  fs.writeFileSync(file, Buffer.from(img.inlineData.data, "base64"));
  console.log(name, file, `${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(j.usageMetadata ?? {}));
}));
