// PROTOTYPE: writes index.html, the side-by-side page for issue #79, with every sprite inlined.
import fs from "node:fs";
import { COLS, SLOTS, hex } from "./palette.mjs";

const results = JSON.parse(fs.readFileSync("out/results.json"));
const runsLog = JSON.parse(fs.readFileSync("out/runs.json"));
const img = (f) => fs.existsSync(f) ? `data:image/png;base64,${fs.readFileSync(f).toString("base64")}` : null;
const dims = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const pix = (f, z, alt) => { if (!f || !fs.existsSync(f)) return `<span class="none">none</span>`; const [w, h] = dims(f); return `<img src="${img(f)}" width="${w * z}" height="${h * z}" alt="${alt}">`; };
const variant = (n) => runsLog.find((r) => r.n === n)?.variant ?? "scale";
const model = (n) => runsLog.find((r) => r.n === n)?.model ?? "gemini-3-pro-image";
const PRICE = { "gemini-3-pro-image": 0.134, "gemini-nano-banana-2.1": 0.0504 };
const NOTES = {
  1: "Clean. The dragonfly's second frame differs only in wing colour, not in pose.",
  2: "Cleanest pads and flower. The dragonfly frames are almost identical.",
  3: "Drew a third dragonfly. The koi is small and seen side-on.",
  4: "Canvas prompt. Drew three koi, two of them identical. Pads are on style.",
  5: "Canvas prompt. Both lily pads are drawn standing upright, which is unusable.",
  6: "Nano Banana 2.1, the cheap model. It kept the one-row layout and came closest to the sizes, but its edges are softer and it turned the second dragonfly frame 90°.",
};
const ROWS = [["padL", "Large lily pad"], ["padS", "Small lily pad"], ["flower", "Open flower"], ["koi", "Koi"], ["dfly", "Dragonfly, 2 frames"]];
import sharpLib from "sharp";
const tRes = fs.existsSync("out/template-results.json") ? JSON.parse(fs.readFileSync("out/template-results.json")) : {};
const tRuns = runsLog.filter((r) => r.variant === "template");
const thumbs = {};
for (const r of tRuns) thumbs[r.n] = "data:image/jpeg;base64," + (await sharpLib(`out/raw-${r.n}.png`).resize(720).jpeg({ quality: 80 }).toBuffer()).toString("base64");
// PixelLab trial runs, grouped by how they were asked.
const plRuns = fs.existsSync("out/pl-runs.json") ? JSON.parse(fs.readFileSync("out/pl-runs.json")) : [];
const plGroup = (r) => r.init ? (r.id === "dfly2" ? "Bitforge, frame 2 seeded from Pixen's frame 1" : "Bitforge, seeded with the kit's pad") : r.tag === "pixen" ? "Pixen (no palette option, snapped afterwards)" : r.tag === "bitforge-nostyle" ? "Bitforge, palette forced, no style image" : "Bitforge, palette forced, kit pad as style image";
const PL_ORDER = ["Bitforge, seeded with the kit's pad", "Pixen (no palette option, snapped afterwards)", "Bitforge, palette forced, no style image", "Bitforge, frame 2 seeded from Pixen's frame 1", "Bitforge, palette forced, kit pad as style image"];
const plDrawn = (f) => { const [w, h] = dims(f); return `${w}×${h}`; };
const plSection = PL_ORDER.map((g) => { const rs = plRuns.filter((r) => plGroup(r) === g); if (!rs.length) return ""; return `<div class="plgroup"><h3>${g}</h3><div class="plrow">${rs.map((r) => { const name = r.file.replace(/^out\/pl-/, ""), snapF = `out/pls-${name}`; return `<figure class="pane plcard"><span class="tag">${SLOTS.find((x) => x.id === r.id).label}${r.big ? ", larger" : ""}</span><div class="pair">${pix(r.file, 6, "as returned")}${pix(snapF, 6, "snapped")}</div><figcaption>asked ${r.size} · drew ${plDrawn(snapF)}</figcaption></figure>`; }).join("")}</div></div>`; }).join("");
const kit = { padL: "out/kit-padL.png", padS: "out/kit-padS.png", flower: "out/kit-flower.png" };
const cost = runsLog.reduce((a, r) => a + PRICE[r.model ?? "gemini-3-pro-image"], 0);

let grid = `<div class="grid" style="--cols:${results.length + 1}"><div class="corner"></div><div class="colhead">Kit<small>code-drawn, at target size</small></div>`;
for (const r of results) grid += `<div class="colhead">Run ${r.n}<small>${model(r.n) === "gemini-3-pro-image" ? "3 Pro Image" : "Nano Banana 2.1"} · ${variant(r.n) === "canvas" ? "canvas prompt" : "scale prompt"}</small></div>`;
for (const [id, label] of ROWS) {
  const slot = SLOTS.find((s) => s.id === (id === "dfly" ? "dfly1" : id));
  grid += `<div class="rowhead">${label}<small>target ${slot.w}×${slot.h} art px</small></div>`;
  grid += `<div class="cell kit">${kit[id] ? `<div class="pane"><span class="tag">as shipped</span>${pix(kit[id], 6, `${label}, kit`)}</div>` : `<span class="none">not in the kit</span>`}</div>`;
  for (const r of results) {
    const ids = id === "dfly" ? ["dfly1", "dfly2"] : [id];
    const m = r.sprites[ids[0]];
    if (!m || m.missing) { grid += `<div class="cell"><span class="none">not found</span></div>`; continue; }
    const snapPane = id === "dfly"
      ? `<div class="flip">${ids.map((k, i) => `<span class="f f${i}" data-raw="${img(`out/${r.n}-${k}-raw.png`)}" data-snap="${img(`out/${r.n}-${k}-snap.png`)}">${pix(`out/${r.n}-${k}-snap.png`, 3, `${label} frame ${i + 1}`)}</span>`).join("")}</div>`
      : `<span data-raw="${img(`out/${r.n}-${id}-raw.png`)}" data-snap="${img(`out/${r.n}-${id}-snap.png`)}">${pix(`out/${r.n}-${id}-snap.png`, 3, `${label}, run ${r.n}`)}</span>`;
    const autoPane = id === "dfly"
      ? `<div class="flip">${ids.map((k, i) => `<span class="f f${i}">${pix(`out/${r.n}-${k}-auto.png`, 6, `${label} frame ${i + 1}, shrunk`)}</span>`).join("")}</div>`
      : pix(`out/${r.n}-${id}-auto.png`, 6, `${label}, run ${r.n}, shrunk`);
    grid += `<div class="cell"><div class="pane big"><span class="tag">AI size, snapped</span>${snapPane}</div><div class="pane"><span class="tag">shrunk to target</span>${autoPane}</div>
      <dl><dt>drawn</dt><dd>${m.size} <em>(${m.scale}×)</em></dd><dt>colours</dt><dd>${m.coloursRaw} → ${m.coloursSnap}</dd><dt>off-ramp</dt><dd>ΔE ${m.meanDeltaE}</dd><dt>outline</dt><dd>${m.outlineDark}%</dd></dl></div>`;
  }
}
grid += `</div>`;

const notes = results.map((r) => `<li><b>Run ${r.n}</b>: ${r.pixelify.art} art px at ${r.pixelify.grid.x} image px each, ${r.pixelify.offGridCells} off-grid. ${NOTES[r.n] ?? ""}</li>`).join("");
const water = hex(COLS.water[5]), waterDeep = hex(COLS.water[2]);

fs.writeFileSync("index.html", `<title>Sprite Kit Bake-off</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Nunito:wght@400;600;700&display=swap">
<!-- PROTOTYPE (throwaway, never merge): answers issue #79, which AI tool draws the sprite kit best.
     Only the Gemini 3 Pro Image + pixelify arm is run here. Built by tools/page.mjs from out/. -->
<style>
  /* Layout: a dark workbench (single look by choice, like the kit pages); a wide grid of sprites, one row per sprite and one column per run, which scrolls sideways inside its own box. */
  :root {
    --bench: #15171d; --bench-2: #20232c; --line: #343846; --ink: #eef0f4; --muted: #a2a8b6; --accent: #e9c47e;
    --water: ${water}; --water-deep: ${waterDeep}; --bad: #f08a7e;
    --display: "Fraunces", Georgia, serif; --body: "Nunito", "Segoe UI", system-ui, sans-serif; --mono: ui-monospace, "SF Mono", Menlo, monospace;
    color-scheme: dark;
  }
  body { background: var(--bench); color: var(--ink); font: 15px/1.5 var(--body); }
  main { max-width: 1320px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 28px; }
  h1 { font: 500 30px/1.15 var(--display); margin: 0; text-wrap: balance; }
  h2 { font: 700 12px var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 0 0 10px; }
  p, li { color: var(--muted); max-width: 72ch; margin: 0; }
  p b, li b { color: var(--ink); }
  .lede { display: grid; gap: 10px; }
  .finding { border-left: 3px solid var(--accent); padding-left: 14px; display: grid; gap: 8px; }
  .finding p { color: var(--ink); }
  ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .bar button { font: 600 13px var(--body); color: var(--ink); background: var(--bench-2); border: 1px solid var(--line); border-radius: 8px; padding: 7px 11px; cursor: pointer; }
  .bar button[aria-pressed="true"] { background: var(--accent); color: #1b1610; border-color: var(--accent); }
  .bar button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .bar span { color: var(--muted); font-size: 13px; margin-right: 4px; }
  .scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; }
  .grid { display: grid; grid-template-columns: 150px repeat(var(--cols), minmax(190px, 1fr)); min-width: max-content; }
  .grid > div { padding: 12px; border-bottom: 1px solid var(--line); border-right: 1px solid var(--line); }
  .colhead, .rowhead { font: 500 16px var(--display); background: var(--bench-2); }
  .colhead small, .rowhead small { display: block; font: 12px var(--body); color: var(--muted); }
  .rowhead { position: sticky; left: 0; z-index: 1; }
  .corner { background: var(--bench-2); position: sticky; left: 0; z-index: 1; }
  .cell { display: grid; gap: 8px; align-content: start; }
  .pane { background: var(--water); border-radius: 6px; padding: 22px 10px 10px; position: relative; display: grid; place-items: center; min-height: 70px; }
  body.deep .pane { background: var(--water-deep); }
  body.flat .pane { background: #6e7480; }
  .pane .tag { position: absolute; top: 4px; left: 8px; font: 600 10px var(--body); letter-spacing: .06em; text-transform: uppercase; color: #0d1a20; opacity: .7; }
  body.deep .pane .tag { color: #e8f0f4; }
  .pane img { image-rendering: pixelated; image-rendering: crisp-edges; max-width: none; display: block; }
  .flip { display: grid; } .flip .f { grid-area: 1 / 1; } .flip .f1 { visibility: hidden; }
  body.frame2 .flip .f0 { visibility: hidden; } body.frame2 .flip .f1 { visibility: visible; }
  .tgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr)); gap: 16px; }
  .tgrid figure { margin: 0; display: grid; gap: 8px; align-content: start; min-width: 0; }
  .tgrid .sheet { width: 100%; height: auto; border-radius: 6px; }
  .tgrid figcaption { color: var(--muted); font-size: 13px; } .tgrid figcaption b { color: var(--ink); }
  .strip .row { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; justify-content: center; }
  .pl { display: grid; gap: 18px; } .pl h3 { font: 500 17px var(--display); margin: 0 0 8px; }
  .plrow { display: flex; flex-wrap: wrap; gap: 12px; }
  .plcard { margin: 0; align-content: start; gap: 6px; }
  .pair { display: flex; gap: 14px; align-items: flex-end; }
  .plcard figcaption { font: 11px var(--mono); color: #0d1a20; opacity: .75; }
  body.deep .plcard figcaption { color: #e8f0f4; }
  .key { font-size: 13px; }
  .none { color: var(--muted); font-size: 13px; font-style: italic; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 0 10px; margin: 0; font: 12px/1.6 var(--mono); font-variant-numeric: tabular-nums; }
  dt { color: var(--muted); } dd { margin: 0; } dd em { font-style: normal; color: var(--bad); }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; } td { color: var(--ink); }
  .pass { color: #9fd49a; font-weight: 700; }
  @media (prefers-reduced-motion: reduce) { .pane img { transition: none; } }
</style>
<main>
  <header class="lede">
    <h2>Which AI tool draws the sprite kit best?</h2>
    <h1>Gemini gets the style, PixelLab gets the size</h1>
    <p>The same test set each time: a large and a small lily pad, the open flower, the koi and a 2-frame dragonfly, asked for in the chosen style with the kit's own pad, flower and ramps as the reference. Each sheet is pixelified, cut into sprites and snapped to that sprite's ramps. PixelLab's free trial is further down. Retro Diffusion passed the terms gate but is not tested yet.</p>
  </header>

  <section class="finding">
    <h2>What the runs show</h2>
    <p><b>The style fits.</b> After snapping, pads and the flower sit on the kit's ramps with almost no colour loss (ΔE 1–4), the outlines are already in the darkest step, and the light comes from the upper left.</p>
    <p><b>The size doesn't.</b> Every 3 Pro Image run drew each sprite 1.7–3.5× too large and ignored every size and layout instruction, including a named canvas. Nano Banana 2.1 came closer (1.1–2.7×) and kept the layout. Shrinking to the target is fine for the pads but wrecks the koi and the dragonfly, so at the kit's sizes those need redrawing by hand, not touching up.</p>
    <p><b>Frames aren't frames.</b> The dragonfly's second frame barely changes pose in any run, and Gemini added, dropped or turned sprites in 4 of 6 runs.</p>
  </section>

  <div class="bar" role="toolbar" aria-label="View">
    <span>Show</span><button type="button" id="bSnap" aria-pressed="true">Snapped</button><button type="button" id="bRaw" aria-pressed="false">Before snapping</button>
    <span>Behind</span><button type="button" id="bgDay" aria-pressed="true">Spring water</button><button type="button" id="bgDeep" aria-pressed="false">Deep water</button><button type="button" id="bgFlat" aria-pressed="false">Grey</button>
    <span>Dragonfly</span><button type="button" id="bPlay" aria-pressed="true">Flap</button><button type="button" id="bStep">Next frame</button>
  </div>

  <div class="scroll">${grid}</div>

  <section class="finding">
    <h2>Second try: an exact-size template</h2>
    <p>Each run got a layout template beside the style reference: a 132 × 56 grid of 24 px cells with one box per sprite at exactly its size in art pixels, and the instruction to paint one art pixel per cell. Nano Banana 2.1 followed it in <b>1 of 4</b> runs, and 3 Pro Image in <b>1 of 3</b>. Even where a sprite landed in its box, the model's pixel grid didn't line up with the cells, and at 18 × 8 and 13 × 9 the koi and dragonfly come back as noise. Only the large pad holds up.</p>
  </section>
  <div class="tgrid">${tRuns.map((r) => `<figure><img class="sheet" src="${thumbs[r.n]}" alt="Run ${r.n} as returned" width="720" height="305"><figcaption><b>Run ${r.n}</b> · ${model(r.n) === "gemini-3-pro-image" ? "3 Pro Image" : "Nano Banana 2.1"} · ${tRes[r.n] ? "read cell by cell below" : "ignored the template"}</figcaption>${tRes[r.n] ? `<div class="pane strip"><span class="tag">read cell by cell, snapped, at true size</span><div class="row">${SLOTS.map((sl) => pix(`out/t${r.n}-${sl.id}-snap.png`, 6, `${sl.label}, run ${r.n}`)).join("")}</div></div>` : ""}</figure>`).join("")}</div>

  <section class="finding">
    <h2>PixelLab, free trial (16 of 40 generations)</h2>
    <p><b>Size is solved.</b> PixelLab draws on a canvas of exactly the size asked (16 px at the smallest), so every sprite lands within a few pixels of its target with no shrinking or grid guessing. The palette can be forced on Bitforge, and Pixen's colours snap cleanly.</p>
    <p><b>Quality depends on the model.</b> Seeded with the kit's own pad, Bitforge keeps the shape and adds texture: the best pad on this page. Pixen draws the most readable flower and dragonfly. Text alone on Bitforge, or with the pad as its style image, gives blobs. The koi isn't readable at 18 × 8 or 24 × 12 on any model, and seeding frame 2 from frame 1 kept the pose, so wing frames still need a hand.</p>
  </section>
  <div class="pl">${plSection}<p class="key">Each card: as returned on the left, snapped to the sprite's ramps on the right, both at 6×.</p></div>

  <section>
    <h2>How to read a cell</h2>
    <ul>
      <li><b>AI size, snapped</b>: the sprite at the size Gemini drew it, every pixel moved to the nearest step of its own ramps, shown 3×.</li>
      <li><b>Shrunk to target</b>: nearest-neighbour down to the kit size with the outline forced to the darkest step, shown 6× like the kit column. This is what a script gets you before Aseprite.</li>
      <li><b>colours</b> before → after snapping; <b>off-ramp</b> is the mean OKLab distance moved (×100; under 3 is invisible); <b>outline</b> is the share of edge pixels already in the ramp's darkest steps.</li>
      <li>The koi and dragonfly ramps are provisional: the kit never had them.</li>
    </ul>
  </section>

  <section>
    <h2>Runs</h2>
    <ul>${notes}</ul>
  </section>

  <section>
    <h2>Cheapest for rapid prototyping</h2>
    <p style="margin-bottom:10px">One <b>round</b> means regenerating the whole test set once: 6 sprites, or one sheet on Gemini, which draws them all in one image.</p>
    <div class="scroll" style="border:0"><table>
      <tr><th>Option</th><th>Price</th><th>Per round</th><th>20 rounds a month</th><th>Notes</th></tr>
      <tr><td><b>Gemini Nano Banana 2.1</b> + pixelify</td><td>about $0.05 a 2K image</td><td>$0.05</td><td>$1</td><td>Already wired up in project look-together. No account, no subscription.</td></tr>
      <tr><td><b>Gemini 3 Pro Image</b> + pixelify</td><td>about $0.134 a 2K image</td><td>$0.13</td><td>$2.70</td><td>Hits the shared quota (HTTP 429) when calls run in parallel.</td></tr>
      <tr><td><b>Retro Diffusion</b> RD Fast</td><td>$0.03 an image (Plus $0.06, Pro $0.18)</td><td>$0.18</td><td>$3.60</td><td>Prepaid balance that never expires. One sprite an image, assumed.</td></tr>
      <tr><td><b>PixelLab</b> Tier 1</td><td>$12 a month, flat</td><td>within the allowance</td><td>$12</td><td>Monthly allowance not public. Pro Flash costs 5 units an image.</td></tr>
    </table></div>
    <p style="margin-top:10px">Gemini's prices are Gemini API list prices; Vertex's were not confirmed. PixelLab is cheaper only above about 240 Nano Banana sheets or 400 RD Fast images a month.</p>
  </section>

  <section>
    <h2>Terms gate</h2>
    <div class="scroll" style="border:0"><table>
      <tr><th></th><th>Commercial use, ownership</th><th>Training on our inputs</th><th>Access</th><th>Billing</th><th></th></tr>
      <tr><td><b>Gemini 3 Pro Image</b> (Vertex)</td><td>Ours; Google output indemnity on GA models</td><td>None without permission</td><td>API, project look-together</td><td>Per image, about $0.134 at 2K</td><td class="pass">Pass</td></tr>
      <tr><td><b>Retro Diffusion</b></td><td>Ours, rights assigned to us. Free-usage outputs become public, so only paid balance</td><td>Never on inputs. They may train on our outputs</td><td>API and MCP; building our own product on it is allowed</td><td>Prepaid balance that never expires, from $0.03 an image</td><td class="pass">Pass</td></tr>
      <tr><td><b>PixelLab</b></td><td>Ours, commercial on all tiers; Open RAIL-M use rules apply</td><td>Not without notice in the UI</td><td>API (api.pixellab.ai/v2)</td><td>Monthly subscription, cancel any time</td><td class="pass">Pass</td></tr>
    </table></div>
    <p style="margin-top:10px">Neither of the other two lets us train a model on its outputs, which we don't plan to do. Gemini cost for this page: ${runsLog.length} images, about $${cost.toFixed(2)}.</p>
  </section>
</main>
<script>
  const $ = (id) => document.getElementById(id);
  const press = (on, ...off) => { on.setAttribute("aria-pressed", "true"); off.forEach((b) => b.setAttribute("aria-pressed", "false")); };
  const show = (kind) => document.querySelectorAll("[data-snap]").forEach((s) => { s.querySelector("img").src = s.dataset[kind]; });
  $("bSnap").onclick = () => { press($("bSnap"), $("bRaw")); show("snap"); };
  $("bRaw").onclick = () => { press($("bRaw"), $("bSnap")); show("raw"); };
  const bg = (cls, b) => { document.body.classList.remove("deep", "flat"); if (cls) document.body.classList.add(cls); press(b, ...[$("bgDay"), $("bgDeep"), $("bgFlat")].filter((x) => x !== b)); };
  $("bgDay").onclick = () => bg(null, $("bgDay")); $("bgDeep").onclick = () => bg("deep", $("bgDeep")); $("bgFlat").onclick = () => bg("flat", $("bgFlat"));
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timer = null;
  const play = (on) => { clearInterval(timer); timer = null; $("bPlay").setAttribute("aria-pressed", String(on)); if (on) timer = setInterval(() => document.body.classList.toggle("frame2"), 125); };
  $("bPlay").onclick = () => play(!timer);
  $("bStep").onclick = () => { play(false); document.body.classList.toggle("frame2"); };
  play(!still);
</script>
`);
console.log("wrote index.html", (fs.statSync("index.html").size / 1024).toFixed(0) + " KB");
