// PROTOTYPE: the CI contrast render. Draws the scene headless at a frozen frame, in both seasons,
// with the glass cards, then measures the text colour against the pixels under each text box.
// A box whose worst pixels pass 4.5:1 can keep the soft halo; one that fails needs the firm halo,
// which passes on its own inner colour. Exits 1 if any firm halo would fail too.
import React from "react";
import fs from "node:fs";
import sharp from "sharp";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

const W = 412, H = 915; // a common Android viewport in dp, drawn at 1x
const INK = { spring: "#1f2e36", autumn: "#f4eadc" } as const;
const HALO = { spring: "#ffffff", autumn: "#141024" } as const; // firm halo inner colours
const TINT = { spring: "rgba(255,255,255,0.32)", autumn: "rgba(24,20,44,0.38)" } as const;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = ([r, g, b]: number[]) => {
  const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

(async () => {
  await LoadSkiaWeb();
  const S: any = await import("@shopify/react-native-skia/lib/module/headless");
  const { Skia } = S.getSkiaExports();
  const { SCENE_SKSL } = await import("../src/sksl");
  const { cardRects } = await import("../src/layout");
  const effect = Skia.RuntimeEffect.Make(SCENE_SKSL);
  const load = (p: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))));
  const full = Skia.XYWHRect(0, 0, W, H);
  const cards = cardRects(W, H, "skia4");
  const boxes = [...cards.map((c: any, i: number) => ({ name: `card ${i + 1}`, x: c.x + 18, y: c.y + 14, w: c.width - 36, h: 50 })), { name: "bare text", x: 24, y: H - 250 - 22, w: W - 48, h: 22 }];
  let failed = false;

  for (const season of ["spring", "autumn"] as const) {
    for (const [frame, still, t] of [["still", 1, 0], ["moving t=1.3s", 0, 1.3]] as const) {
      const imgs = ["sky", "bank", "water", "wash", "line"].map((n) => load(`assets/sets/standin/${season}/${n}.webp`));
      const scale = Math.max(W / 1242, H / 2688);
      const uniforms = { res: [W, H], t, boil: Math.floor(t * 8), still, season: season === "autumn" ? 1 : 0, waterTop: (H - 2688 * scale) / 2 + (1150 / 2688) * 2688 * scale, rip0: [0, 0, -1, 0], rip1: [0, 0, -1, 0], rip2: [0, 0, -1, 0], rip3: [0, 0, -1, 0] };
      const img = await S.drawOffscreen(S.makeOffscreenSurface(W, H), (
        <>
          <S.Fill><S.Shader source={effect} uniforms={uniforms}>{imgs.map((im: any, i: number) => <S.ImageShader key={i} image={im} fit="cover" rect={full} />)}</S.Shader></S.Fill>
          {cards.map((c: any, i: number) => (
            <S.Group key={i} clip={Skia.RRectXY(Skia.XYWHRect(c.x, c.y, c.width, c.height), 22, 22)}><S.BackdropFilter filter={<S.Blur blur={18} />}><S.Fill color={TINT[season]} /></S.BackdropFilter></S.Group>
          ))}
        </>
      ));
      const png = Buffer.from(img.encodeToBytes());
      fs.mkdirSync(".tools-out", { recursive: true });
      fs.writeFileSync(`.tools-out/contrast-${season}-${still ? "still" : "moving"}.png`, png);
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      const ink = hex(INK[season]);
      for (const b of boxes) {
        const rs: number[] = [];
        for (let y = Math.round(b.y); y < b.y + b.h; y++) for (let x = Math.round(b.x); x < b.x + b.w; x++) {
          const o = (y * info.width + x) * info.channels;
          rs.push(ratio(ink, [data[o], data[o + 1], data[o + 2]]));
        }
        rs.sort((p, q) => p - q);
        const worst = rs[Math.floor(rs.length * 0.05)]; // 5th percentile: ignore single grain pixels
        const firm = ratio(ink, hex(HALO[season]));
        const halo = worst >= 4.5 ? "soft" : "firm";
        if (halo === "firm" && firm < 4.5) failed = true;
        console.log(`${season.padEnd(6)} ${frame.padEnd(14)} ${b.name.padEnd(9)} worst ${worst.toFixed(2).padStart(5)}:1 → ${halo} halo${halo === "firm" ? ` (inner ${firm.toFixed(1)}:1)` : ""}`);
      }
    }
  }
  process.exit(failed ? 1 : 0);
})();
