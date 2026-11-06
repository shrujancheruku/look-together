// PROTOTYPE: finds each sprite's box in the snapped pixel sprite sheet (connected opaque pixels)
// and writes the pixel set's scene.json.
import fs from "node:fs";
import sharp from "sharp";

const dir = "assets/sets/pixel";
const { data, info } = await sharp(`${dir}/sprites.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const seen = new Uint8Array(W * H), boxes = [];
for (let i = 0; i < W * H; i++) {
  if (seen[i] || !data[i * 4 + 3]) continue;
  const stack = [i];
  let [x0, y0, x1, y1, n] = [W, H, 0, 0, 0];
  seen[i] = 1;
  while (stack.length) {
    const j = stack.pop(), x = j % W, y = (j / W) | 0;
    n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const k = (y + dy) * W + (x + dx);
      if (x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H && !seen[k] && data[k * 4 + 3]) { seen[k] = 1; stack.push(k); }
    }
  }
  if (n > 20) boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }); // drop stray fringe pixels
}
// Name by what the prompt asked for: three pads in the top row (left to right), then the
// lotus, bud and boat by shape, and the four small leaves (left to right).
const area = (b) => b.w * b.h;
const byArea = [...boxes].sort((a, b) => area(b) - area(a));
const leaves = byArea.slice(-4).sort((a, b) => a.x - b.x);
const big = byArea.slice(0, -4);
const boat = big.reduce((m, b) => (b.w / b.h > m.w / m.h ? b : m));
const rest = big.filter((b) => b !== boat);
const pads = [...rest].sort((a, b) => a.y - b.y).slice(0, 3).sort((a, b) => a.x - b.x);
const [lotus, bud] = rest.filter((b) => !pads.includes(b)).sort((a, b) => area(b) - area(a));
const sprites = { padFresh: pads[0], padYellow: pads[1], padBrown: pads[2], lotus, bud, boat, leafGreen1: leaves[0], leafOrange1: leaves[1], leafOrange2: leaves[2], leafGreen2: leaves[3] };
const scene = {
  version: 0, set: "pixel", kind: "pixel", source: "Gemini 3 Pro Image; backgrounds snapped at --grid 7.11, sprites (sprites-scene) on their detected grid",
  art: { width: 214, height: 384 }, waterTop: { spring: 232, autumn: 224 },
  seasons: { spring: { bg: "bg-spring.png" }, autumn: { bg: "bg-autumn.png" } },
  sprites: { file: "sprites.png", boxes: sprites },
};
fs.writeFileSync(`${dir}/scene.json`, JSON.stringify(scene, null, 2) + "\n");
console.log(boxes.length, "sprites:", Object.entries(sprites).map(([k, b]) => `${k} ${b.w}x${b.h}`).join(", "));
