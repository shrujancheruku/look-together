// PROTOTYPE: paints procedural stand-in layers for the pond scene (not art; the image-tool
// bake-off replaces them). Writes assets/sets/standin{,-half}/<season>/<layer>.webp, a
// sprite sheet per set and each set's scene.json.
import React from "react";
import fs from "node:fs";
import sharp from "sharp";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

const W = 1242, H = 2688; // authored size: the largest portrait phone we target
const CELL = 128, CELLS = 12; // sprite cell size; 8 drop frames + 4 leaves per season row

const PAL = {
  spring: { sky1: "#c9dfec", sky2: "#f7efe0", wat1: "#dfe8de", wat2: "#6e97a0", crowns: ["#7fae5c", "#93c06a", "#5f9446", "#a9cc7a"], trunk: "#5a4636", pad: "#5d8f45", padR: "#3f6e30", line: "#2f3a2a", leaf: "#7fa65a", drop: "#ffffff" },
  autumn: { sky1: "#1e1a32", sky2: "#c07a4c", wat1: "#6a4a44", wat2: "#14142a", crowns: ["#c8692e", "#d9913a", "#a4471f", "#e0b04a"], trunk: "#3a2522", pad: "#6f6a2c", padR: "#4c4a1c", line: "#2a1c14", leaf: "#c8692e", drop: "#ffe6c8" },
} as const;
type Season = keyof typeof PAL;

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

(async () => {
  await LoadSkiaWeb();
  const S = await import("@shopify/react-native-skia/lib/module/headless");
  const { Skia } = S.getSkiaExports();
  const { Rect, Circle, Oval, Group, Blur, Path, LinearGradient, Turbulence } = S as any;
  const vec = (x: number, y: number) => Skia.Point(x, y);

  const render = async (w: number, h: number, el: React.ReactNode) => {
    const img = await S.drawOffscreen(S.makeOffscreenSurface(w, h), el);
    return Buffer.from(img.encodeToBytes()); // PNG
  };
  // Watercolour-ish: a blurred blob whose alpha is broken up by noise, with a darker edge.
  const wash = (key: string, x: number, y: number, rx: number, ry: number, color: string, op = 0.55) => (
    <Group key={key} opacity={op}>
      <Oval x={x - rx} y={y - ry} width={rx * 2} height={ry * 2} color={color}><Blur blur={rx * 0.08} /></Oval>
      <Oval x={x - rx} y={y - ry} width={rx * 2} height={ry * 2} color={color} style="stroke" strokeWidth={rx * 0.05} opacity={0.5}><Blur blur={rx * 0.03} /></Oval>
    </Group>
  );
  const grainMask = (k: string) => (
    <Rect key={k} x={0} y={0} width={W} height={H} blendMode="dstIn"><Turbulence freqX={0.004} freqY={0.006} octaves={3} seed={3} /></Rect>
  );
  const wobblyPad = (cx: number, cy: number, rx: number, ry: number, j = 0.04) => {
    const p = Skia.PathBuilder.Make();
    const n = 48, notch = 0.35;
    for (let i = 0; i <= n; i++) {
      const a = notch / 2 + (i / n) * (Math.PI * 2 - notch);
      const r = 1 + (rnd() - 0.5) * j;
      const px = cx + Math.cos(a - Math.PI / 2) * rx * r, py = cy + Math.sin(a - Math.PI / 2) * ry * r;
      i === 0 ? p.moveTo(cx, cy) : null;
      p.lineTo(px, py);
    }
    return p.close().build();
  };
  const PADS = [[380, 2050, 210, 80], [860, 2300, 170, 64], [640, 1780, 140, 52], [260, 2470, 150, 56], [1010, 1960, 110, 42]];

  const layers = (s: Season) => {
    const c = PAL[s];
    seed = 11;
    const trees = Array.from({ length: 26 }, (_, i) => {
      const x = (i / 25) * W + (rnd() - 0.5) * 60, y = 1000 + rnd() * 90, r = 90 + rnd() * 80;
      return wash(`t${i}`, x, y, r, r * 1.3, c.crowns[i % 4], 0.65);
    });
    return {
      sky: (
        <>
          <Rect x={0} y={0} width={W} height={H}><LinearGradient start={vec(0, 0)} end={vec(0, H * 0.45)} colors={[c.sky1, c.sky2]} /></Rect>
          {Array.from({ length: 10 }, (_, i) => wash(`c${i}`, rnd() * W, 150 + rnd() * 700, 200 + rnd() * 200, 60 + rnd() * 40, s === "spring" ? "#ffffff" : "#e0a07c", 0.35))}
        </>
      ),
      bank: (
        <>
          <Group>{trees}{grainMask("g")}</Group>
          <Rect x={0} y={1120} width={W} height={60} color={c.trunk} opacity={0.6}><Blur blur={14} /></Rect>
        </>
      ),
      water: (
        <Group>
          <Rect x={0} y={1150} width={W} height={H - 1150}><LinearGradient start={vec(0, 1150)} end={vec(0, H)} colors={[c.wat1, c.wat2]} /></Rect>
          {Array.from({ length: 14 }, (_, i) => wash(`w${i}`, rnd() * W, 1300 + rnd() * 1300, 300, 30, c.wat2, 0.25))}
        </Group>
      ),
      wash: <>{PADS.map(([x, y, rx, ry], i) => <Path key={i} path={wobblyPad(x, y, rx, ry)} color={i % 2 ? c.padR : c.pad} opacity={0.85}><Blur blur={3} /></Path>)}</>,
      line: <>{PADS.map(([x, y, rx, ry], i) => <Path key={i} path={wobblyPad(x + 4, y - 3, rx, ry, 0.07)} color={c.line} style="stroke" strokeWidth={3.5} opacity={0.8} />)}</>,
    };
  };

  const sprites = () => (
    <>
      {(["spring", "autumn"] as Season[]).map((s, row) => (
        <Group key={s}>
          {Array.from({ length: 8 }, (_, f) => (
            <Group key={f} opacity={1 - f / 9}>
              {f < 2 ? <Circle cx={f * CELL + 64} cy={row * CELL + 40 + f * 20} r={9} color={PAL[s].drop} /> : null}
              <Oval x={f * CELL + 64 - f * 7} y={row * CELL + 96 - f * 2.2} width={f * 14} height={f * 4.4} color={PAL[s].drop} style="stroke" strokeWidth={3} />
            </Group>
          ))}
          {Array.from({ length: 4 }, (_, k) => (
            <Group key={k} transform={[{ translateX: (8 + k) * CELL + 64 }, { translateY: row * CELL + 64 }, { rotate: k * 0.8 }]}>
              <Oval x={-44} y={-18} width={88} height={36} color={PAL[s].leaf} />
              <Oval x={-44} y={-18} width={88} height={36} color={PAL[s].line} style="stroke" strokeWidth={2.5} />
            </Group>
          ))}
        </Group>
      ))}
    </>
  );

  for (const [set, scale] of [["standin", 1], ["standin-half", 0.5]] as const) {
    const w = Math.round(W * scale), h = Math.round(H * scale);
    const manifest: any = { version: 0, set, authored: { width: W, height: H }, pixels: { width: w, height: h }, seasons: {}, sprites: { file: "sprites.webp", cell: CELL, columns: CELLS, rows: { spring: 0, autumn: 1 }, drop: [0, 8], leaf: [8, 4] } };
    for (const s of ["spring", "autumn"] as Season[]) {
      const dir = `assets/sets/${set}/${s}`;
      fs.mkdirSync(dir, { recursive: true });
      manifest.seasons[s] = {};
      for (const [name, el] of Object.entries(layers(s))) {
        const png = await render(W, H, el);
        const file = `${dir}/${name}.webp`;
        await sharp(png).resize(w, h).webp({ quality: 82, alphaQuality: 90 }).toFile(file);
        manifest.seasons[s][name] = { file: `${s}/${name}.webp`, opaque: name === "sky", bytes: fs.statSync(file).size };
      }
    }
    await sharp(await render(CELL * CELLS, CELL * 2, sprites())).webp({ quality: 90 }).toFile(`assets/sets/${set}/sprites.webp`);
    fs.writeFileSync(`assets/sets/${set}/scene.json`, JSON.stringify(manifest, null, 2) + "\n");
    console.log(set, w, "x", h);
  }
})();
