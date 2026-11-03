import React, { useEffect, useMemo, useRef } from "react";
import { PixelRatio, View, type GestureResponderEvent } from "react-native";
import { Atlas, FilterMode, Group, ImageShader, MipmapMode, Path, Rect, Shader, Skia, Canvas, useImage, useRSXformBuffer } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import { PIXEL_SKSL } from "./pixel";
import { cardRects } from "./layout";
import type { Config } from "./Pond";

const pixelEffect = Skia.RuntimeEffect.Make(PIXEL_SKSL)!;
const scene = require("../assets/sets/pixel/scene.json");
const BG = { spring: require("../assets/sets/pixel/bg-spring.png"), autumn: require("../assets/sets/pixel/bg-autumn.png") };
const SHEET = require("../assets/sets/pixel/sprites.png");
const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
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

export function PixelPond({ cfg, w, h, draws }: { cfg: Config; w: number; h: number; draws: SharedValue<number> }) {
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
  useFrameCallback((f) => {
    if (still.value) return;
    const now = f.timeSinceFirstFrame / 1000;
    const step = fps.value ? Math.floor(now * fps.value) / fps.value : now;
    if (step !== t.value) { t.value = step; draws.value += 1; }
  });
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

  return (
    <View style={{ width: w, height: h }} onStartShouldSetResponder={() => true} onResponderGrant={onTap}>
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
    </View>
  );
}
