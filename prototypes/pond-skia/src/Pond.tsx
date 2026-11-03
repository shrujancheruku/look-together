import React, { useMemo, useRef, type ComponentRef } from "react";
import { Platform, View, type GestureResponderEvent } from "react-native";
import { BlurView, BlurTargetView } from "expo-blur";
import { Atlas, BackdropFilter, Blur, Canvas, Fill, Group, Image, ImageShader, RoundedRect, Shader, Skia, rect, rrect, useImage, useRSXformBuffer } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import { sceneEffect } from "./shader";
import { SETS, SPRITE, type Season } from "./sets";
import { cardRects, type Glass } from "./layout";

export { cardRects, type Glass };

export type Config = { set: number; season: Season; shader: boolean; sprites: number; glass: Glass; artFps: 0 | 30 | 60; still: boolean };

const WATER_TOP = 1150 / 2688; // fraction of the authored height where the water starts


export function Pond({ cfg, w, h, draws }: { cfg: Config; w: number; h: number; draws: SharedValue<number> }) {
  const set = SETS[cfg.set];
  const L = set.seasons[cfg.season];
  const sky = useImage(L.sky), bank = useImage(L.bank), water = useImage(L.water), wash = useImage(L.wash), line = useImage(L.line);
  const sprites = useImage(set.sprites);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);

  // The art clock: advances only at the art frame rate, and not at all on Still water,
  // so Skia gets no new uniforms and stops redrawing.
  const t = useSharedValue(0), boil = useSharedValue(0), still = useSharedValue(cfg.still), fps = useSharedValue(cfg.artFps);
  still.value = cfg.still;
  fps.value = cfg.artFps;
  const rips = useSharedValue<number[]>([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
  useFrameCallback((f) => {
    if (still.value) return;
    const now = f.timeSinceFirstFrame / 1000;
    const step = fps.value ? Math.floor(now * fps.value) / fps.value : now;
    if (step !== t.value) { t.value = step; draws.value += 1; }
    const b = Math.floor(now * 8);
    if (b !== boil.value) boil.value = b;
  });

  const scale = Math.max(w / set.width, h / set.height);
  const top = (h - set.height * scale) / 2 + WATER_TOP * set.height * scale;
  const full = rect(0, 0, w, h);
  const uniforms = useDerivedValue(() => {
    const r = rips.value;
    return {
      res: [w, h], t: t.value, boil: boil.value, still: still.value ? 1 : 0, season: cfg.season === "autumn" ? 1 : 0, waterTop: top,
      rip0: [r[0], r[1], r[2], 0], rip1: [r[3], r[4], r[5], 0], rip2: [r[6], r[7], r[8], 0], rip3: [r[9], r[10], r[11], 0],
    };
  });
  const ripIdx = useRef(0);
  const onTap = (e: GestureResponderEvent) => {
    const r = [...rips.value], i = (ripIdx.current++ % 4) * 3;
    r[i] = e.nativeEvent.locationX; r[i + 1] = e.nativeEvent.locationY; r[i + 2] = t.value;
    rips.value = r;
  };

  // Sprites: half drops playing 8 frames at 12 fps, half leaves drifting on the water.
  const seeds = useMemo(() => Array.from({ length: cfg.sprites }, (_, i) => ({ x: ((i * 0.618) % 1) * w, y: top + 40 + ((i * 0.371) % 1) * (h - top - 80), ph: (i * 5.3) % 16, leaf: i % 2 === 1, k: i % 4 })), [cfg.sprites, w, h, top]);
  const row = SPRITE.row[cfg.season] * SPRITE.cell;
  const spriteRects = useDerivedValue(() => seeds.map((s) => {
    const frame = s.leaf ? SPRITE.leaf[0] + s.k : SPRITE.drop[0] + (Math.floor(t.value * 12 + s.ph) % 16 < 8 ? Math.floor(t.value * 12 + s.ph) % 16 : 7);
    return Skia.XYWHRect(frame * SPRITE.cell, row, SPRITE.cell, SPRITE.cell);
  }));
  const transforms = useRSXformBuffer(cfg.sprites, (val, i) => {
    "worklet";
    const s = seeds[i];
    const tt = t.value;
    const sc = s.leaf ? 0.45 : 0.6;
    const a = s.leaf ? Math.sin(tt * 0.4 + s.ph) * 0.3 + s.k : 0;
    const x = s.leaf ? (s.x + tt * 6) % w : s.x, y = s.y + (s.leaf ? Math.sin(tt * 0.8 + s.ph) * 3 : 0);
    const c = Math.cos(a) * sc, sn = Math.sin(a) * sc;
    val.set(c, sn, x - c * 64 + sn * 64, y - sn * 64 - c * 64);
  });

  const cards = cardRects(w, h, cfg.glass);
  const skiaGlass = cfg.glass.startsWith("skia");
  const tint = cfg.season === "spring" ? "rgba(255,255,255,0.32)" : "rgba(24,20,44,0.38)";

  const canvas = (
    <Canvas style={{ width: w, height: h }}>
      {sky && bank && water && wash && line ? (
        cfg.shader ? (
          <Fill>
            <Shader source={sceneEffect} uniforms={uniforms}>
              {[sky, bank, water, wash, line].map((img, i) => <ImageShader key={i} image={img} fit="cover" rect={full} />)}
            </Shader>
          </Fill>
        ) : (
          [sky, bank, water, wash, line].map((img, i) => <Image key={i} image={img} fit="cover" rect={full} />)
        )
      ) : null}
      {sprites && cfg.sprites > 0 ? <Atlas image={sprites} sprites={spriteRects} transforms={transforms} /> : null}
      {skiaGlass && cards.map((c, i) => (
        <Group key={i} clip={rrect(c, 22, 22)}>
          <BackdropFilter filter={<Blur blur={18} />}><Fill color={tint} /></BackdropFilter>
        </Group>
      ))}
      {skiaGlass && cards.map((c, i) => <RoundedRect key={`b${i}`} rect={rrect(c, 22, 22)} color="rgba(255,255,255,0.45)" style="stroke" strokeWidth={1} />)}
    </Canvas>
  );

  return (
    <View style={{ width: w, height: h }} onStartShouldSetResponder={() => true} onResponderGrant={onTap}>
      {Platform.OS === "android" ? <BlurTargetView ref={blurTarget} style={{ width: w, height: h }}>{canvas}</BlurTargetView> : canvas}
      {cfg.glass.startsWith("expo") && cards.map((c, i) => (
        <BlurView key={i} intensity={60} tint={cfg.season === "spring" ? "light" : "dark"} blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus"
          style={{ position: "absolute", left: c.x, top: c.y, width: c.width, height: c.height, borderRadius: 22, overflow: "hidden" }} />
      ))}
    </View>
  );
}
