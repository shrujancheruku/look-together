import React, { useEffect, useMemo, useRef } from "react";
import { PixelRatio, Platform, View, type GestureResponderEvent } from "react-native";
import { Atlas, BlendMode, ClipOp, FilterMode, Group, Image, ImageShader, MipmapMode, PaintStyle, Path, Rect, Shader, Skia, TileMode, Canvas, useImage, useRSXformBuffer, type SkImage, type SkSurface } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import { PIXEL_SKSL } from "./pixel";
import { cardRects } from "./layout";
import type { Config } from "./Pond";

const pixelEffect = Skia.RuntimeEffect.Make(PIXEL_SKSL)!;
const scene = require("../assets/sets/pixel/scene.json");
const BG = { spring: require("../assets/sets/pixel/bg-spring.png"), autumn: require("../assets/sets/pixel/bg-autumn.png") };
const SHEET = require("../assets/sets/pixel/sprites.png");
const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
const IS_WEB = Platform.OS === "web";
// Web only, ?raster=1: a CPU raster surface instead of a WebGL offscreen. Measured in Chrome on a Mac:
// WebGL offscreen + readback ~18 ms a render, raster ~134 ms (SkSL on the CPU). Both lose to plain
// per-screen-pixel shading on web, which costs nothing measurable there.
const WEB_RASTER = typeof window !== "undefined" && !!window.location?.search?.includes("raster=1");
const now = () => { "worklet"; return globalThis.performance?.now?.() ?? Date.now(); };
const AW: number = scene.art.width, AH: number = scene.art.height;
const B = scene.sprites.boxes as Record<string, { x: number; y: number; w: number; h: number }>;
const LEAVES = ["leafGreen1", "leafOrange1", "leafGreen2", "leafOrange2"];
// Fixed pieces, in art pixels, kept inside the narrowest phone crop (~x 30..184).
const FIXED: [string, number, number][] = [
  ["boat", 128, 240], ["padFresh", 46, 270], ["lotus", 48, 258], ["padYellow", 112, 290], ["bud", 122, 276], ["padBrown", 66, 306],
];

// A card with 1-art-pixel notched corners, so the glass edge stays on the grid.
const notched = (x: number, y: number, w: number, h: number, k: number) => {
  const b = Skia.PathBuilder.Make();
  b.moveTo(x + k, y).lineTo(x + w - k, y).lineTo(x + w - k, y + k).lineTo(x + w, y + k).lineTo(x + w, y + h - k).lineTo(x + w - k, y + h - k)
    .lineTo(x + w - k, y + h).lineTo(x + k, y + h).lineTo(x + k, y + h - k).lineTo(x, y + h - k).lineTo(x, y + k).lineTo(x + k, y + k).close();
  return b.build();
};

// `offscreen`: draw the whole world at art resolution into a 214×384 surface on the UI thread,
// then show it with one nearest-neighbour upscale. Without it, shaders run per screen pixel.
export function PixelPond({ cfg, w, h, draws, work, offscreen }: { cfg: Config; w: number; h: number; draws: SharedValue<number>; work: SharedValue<number>; offscreen: boolean }) {
  const bg = useImage(BG[cfg.season]);
  const sheet = useImage(SHEET);

  // Whole device pixels per art pixel, covering the screen (crops the sides on tall phones).
  const dpr = PixelRatio.get();
  const kPx = Math.ceil(Math.max((w * dpr) / AW, (h * dpr) / AH));
  const k = kPx / dpr; // in dp
  const ox = (w - AW * k) / 2, oy = (h - AH * k) / 2;
  const waterTop: number = scene.waterTop[cfg.season];

  const t = useSharedValue(0), still = useSharedValue(cfg.still), fps = useSharedValue(cfg.artFps);
  useEffect(() => { still.value = cfg.still; fps.value = cfg.artFps; }, [cfg.still, cfg.artFps]);
  const rips = useSharedValue<number[]>([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
  const tint = cfg.season === "spring" ? [1, 1, 1, 0.35] : [0.09, 0.08, 0.17, 0.42];
  const uniforms = useDerivedValue(() => {
    const r = rips.value;
    return {
      frost: 0, tint,
      art: [AW, AH], t: t.value, still: still.value ? 1 : 0, season: cfg.season === "autumn" ? 1 : 0, waterTop,
      rip0: [r[0], r[1], r[2], 0], rip1: [r[3], r[4], r[5], 0], rip2: [r[6], r[7], r[8], 0], rip3: [r[9], r[10], r[11], 0],
    };
  });
  const frostUniforms = useDerivedValue(() => ({ ...uniforms.value, frost: 1 }));
  const ripIdx = useRef(0);
  const onTap = (e: GestureResponderEvent) => {
    const r = [...rips.value], i = (ripIdx.current++ % 4) * 3;
    r[i] = Math.floor((e.nativeEvent.locationX - ox) / k); r[i + 1] = Math.floor((e.nativeEvent.locationY - oy) / k); r[i + 2] = t.value;
    rips.value = r;
  };

  // Sprites: the fixed pads and bud bob one art pixel; leaves drift one art pixel at a time.
  const items = useMemo(() => [
    ...FIXED.map(([name, x, y], i) => ({ name, x, y, ph: i * 0.7, drift: 0 })),
    ...Array.from({ length: cfg.sprites }, (_, i) => ({ name: LEAVES[i % 4], x: (i * 37) % 200, y: waterTop + 6 + ((i * 23) % 80), ph: i * 1.3, drift: 2 + (i % 3) })),
  ], [cfg.sprites, waterTop]);
  const rects = useMemo(() => items.map((s) => { const b = B[s.name]; return Skia.XYWHRect(b.x, b.y, b.w, b.h); }), [items]);
  const transforms = useRSXformBuffer(items.length, (val, i) => {
    "worklet";
    const s = items[i];
    const x = s.drift ? Math.floor((s.x + t.value * s.drift) % (AW + 40)) - 40 : s.x;
    const y = s.y + (Math.floor(t.value * 1.5 + s.ph) % 2);
    val.set(1, 0, x, y);
  });

  // Cards on the art grid: whole art pixels in position and size.
  const snap = (v: number) => Math.round((v - ox) / k) * k + ox;
  const cards = cardRects(w, h, cfg.glass).map((c) => ({ x: snap(c.x), y: snap(c.y), w: Math.round(c.width / k) * k, h: Math.round(c.height / k) * k }));
  const border = cfg.season === "spring" ? "#ffffff" : "#ffd9b0";

  // The offscreen world: the same shader, sprites and frost cards, in art pixels.
  const surf = useSharedValue<SkSurface | null>(null);
  const tex = useSharedValue<SkImage | null>(null);
  const dirty = useSharedValue(1);
  useEffect(() => { dirty.value = 1; }, [cfg.still]);
  const bgShader = useMemo(() => bg?.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Nearest, MipmapMode.None) ?? null, [bg]);
  const artCards = useMemo(() => cards.map((c) => {
    const x = Math.round((c.x - ox) / k), y = Math.round((c.y - oy) / k), cw = Math.round(c.w / k), ch = Math.round(c.h / k);
    return { clip: notched(x, y, cw, ch, 1), edge: notched(x + 0.5, y + 0.5, cw - 1, ch - 1, 1) };
  }), [cfg.glass, w, h, k]);
  const season = cfg.season === "autumn" ? 1 : 0;
  const borderColor = Skia.Color(border);

  useFrameCallback((f) => {
    let changed = dirty.value === 1;
    if (!still.value) {
      const secs = f.timeSinceFirstFrame / 1000;
      const step = fps.value ? Math.floor(secs * fps.value) / fps.value : secs;
      if (step !== t.value) { t.value = step; changed = true; if (!offscreen) draws.value += 1; }
    }
    if (!offscreen || !changed || !bgShader) return;
    dirty.value = 0;
    const t0 = now();
    if (!surf.value) surf.value = IS_WEB && WEB_RASTER ? Skia.Surface.Make(AW, AH) : Skia.Surface.MakeOffscreen(AW, AH);
    const s = surf.value;
    if (!s) return;
    const c = s.getCanvas();
    const r = rips.value;
    const u = [AW, AH, t.value, still.value ? 1 : 0, season, waterTop, r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, r[9], r[10], r[11], 0];
    const paint = Skia.Paint();
    paint.setAntiAlias(false);
    paint.setShader(pixelEffect.makeShaderWithChildren([...u, 0, ...tint], [bgShader]));
    c.drawRect(Skia.XYWHRect(0, 0, AW, AH), paint);
    if (sheet && items.length) {
      const xf = items.map((it) => {
        const x = it.drift ? Math.floor((it.x + t.value * it.drift) % (AW + 40)) - 40 : it.x;
        return Skia.RSXform(1, 0, x, it.y + (Math.floor(t.value * 1.5 + it.ph) % 2));
      });
      c.drawAtlas(sheet, rects, xf, Skia.Paint(), BlendMode.SrcOver, undefined, NEAREST);
    }
    if (artCards.length) {
      const frost = Skia.Paint();
      frost.setAntiAlias(false);
      frost.setShader(pixelEffect.makeShaderWithChildren([...u, 1, ...tint], [bgShader]));
      const edge = Skia.Paint();
      edge.setAntiAlias(false); edge.setStyle(PaintStyle.Stroke); edge.setStrokeWidth(1); edge.setColor(borderColor); edge.setAlphaf(0.7);
      for (const a of artCards) {
        c.save(); c.clipPath(a.clip, ClipOp.Intersect, false); c.drawRect(Skia.XYWHRect(0, 0, AW, AH), frost); c.restore();
        c.drawPath(a.edge, edge);
      }
    }
    s.flush();
    const snap = s.makeImageSnapshot();
    tex.value = IS_WEB && !WEB_RASTER ? snap.makeNonTextureImage() : snap; // a WebGL offscreen snapshot lives in its own context
    draws.value += 1;
    work.value += now() - t0;
  });

  return (
    <View style={{ width: w, height: h }} onStartShouldSetResponder={() => true} onResponderGrant={onTap}>
      {offscreen ? (
        <Canvas style={{ width: w, height: h }}>
          <Image image={tex} x={ox} y={oy} width={AW * k} height={AH * k} fit="fill" sampling={NEAREST} />
        </Canvas>
      ) : (
      <Canvas style={{ width: w, height: h }}>
        <Group transform={[{ translateX: ox }, { translateY: oy }, { scale: k }]}>
          {bg ? (
            cfg.shader ? (
              <Rect x={0} y={0} width={AW} height={AH}>
                <Shader source={pixelEffect} uniforms={uniforms}><ImageShader image={bg} rect={Skia.XYWHRect(0, 0, AW, AH)} fit="fill" sampling={NEAREST} /></Shader>
              </Rect>
            ) : (
              <Rect x={0} y={0} width={AW} height={AH}><ImageShader image={bg} rect={Skia.XYWHRect(0, 0, AW, AH)} fit="fill" sampling={NEAREST} /></Rect>
            )
          ) : null}
          {sheet ? <Atlas image={sheet} sprites={rects} transforms={transforms} sampling={NEAREST} /> : null}
        </Group>
        {/* Glass: the scene again, clipped to each card, in frost mode (works on web too, unlike
            a runtime-shader backdrop filter). Sprites under a card are covered, not frosted. */}
        {bg && cfg.glass !== "none" && cards.map((c, i) => (
          <Group key={i} clip={notched(c.x, c.y, c.w, c.h, k)}>
            <Group transform={[{ translateX: ox }, { translateY: oy }, { scale: k }]}>
              <Rect x={0} y={0} width={AW} height={AH}>
                <Shader source={pixelEffect} uniforms={frostUniforms}><ImageShader image={bg} rect={Skia.XYWHRect(0, 0, AW, AH)} fit="fill" sampling={NEAREST} /></Shader>
              </Rect>
            </Group>
          </Group>
        ))}
        {cfg.glass !== "none" && cards.map((c, i) => (
          <Path key={`b${i}`} path={notched(c.x + k / 2, c.y + k / 2, c.w - k, c.h - k, k)} color={border} style="stroke" strokeWidth={k} opacity={0.7} antiAlias={false} />
        ))}
      </Canvas>
      )}
    </View>
  );
}
