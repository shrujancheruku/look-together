// PROTOTYPE (throwaway): a hand-drawn Skia pond scene with a frame-rate overlay and a benchmark.
// Answers "Does a hand-drawn Skia pond scene run smoothly on a mid-range Android?" and hosts the
// blind read for "Which AI image tool paints the pond best?". Never merge.
import React, { useEffect, useRef, useState } from "react";
import { BackHandler, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";
import { Pond, cardRects, type Config, type Glass } from "./src/Pond";
import { PixelPond } from "./src/PixelPond";
import { SETS } from "./src/sets";

const SKIA = process.env.EXPO_PUBLIC_SKIA ?? "v2";
const AUTOBENCH = process.env.EXPO_PUBLIC_AUTOBENCH === "1";
const BINS = 100; // 1 ms histogram bins for UI-thread frame intervals

const BASE: Config = { set: 0, season: "spring", shader: true, sprites: 16, glass: "skia1", artFps: 30, still: false };
// Each step adds or swaps one thing, so the cost of each piece shows as a difference.
const BENCH: [string, Partial<Config>][] = [
  ["layers only", { shader: false, sprites: 0, glass: "none", artFps: 60 }],
  ["+ shader @60", { sprites: 0, glass: "none", artFps: 60 }],
  ["+ shader @30", { sprites: 0, glass: "none" }],
  ["+ 16 sprites @30", { glass: "none" }],
  ["+ skia glass ×1 @30", {}],
  ["+ skia glass ×4 @30", { glass: "skia4" }],
  ["full ×4 @60", { glass: "skia4", artFps: 60 }],
  ["full ×4 uncapped", { glass: "skia4", artFps: 0 }],
  ["full ×4 @30, 48 sprites", { glass: "skia4", sprites: 48 }],
  ["expo-blur ×4 @30", { glass: "expo4" }],
  ["half-res ×4 @30", { set: 1, glass: "skia4" }],
  ["autumn ×4 @30", { season: "autumn", glass: "skia4" }],
  ["still water ×4", { glass: "skia4", still: true }],
  ["pixel ×4 @30", { set: 2, glass: "skia4" }],
  ["pixel ×4 @30, 48 leaves", { set: 2, glass: "skia4", sprites: 48 }],
  ["pixel ×4 uncapped", { set: 2, glass: "skia4", artFps: 0 }],
];
const WARMUP = 2500, MEASURE = 6000;

type Stats = { fps: number; p50: number; p95: number; jank: number; draws: number; vsync: number };

export default function App() {
  const { width: w, height: h } = useWindowDimensions();
  const [cfg, setCfg] = useState<Config>(() => {
    if (Platform.OS !== "web") return BASE;
    const q = new URLSearchParams(window.location.search); // web only: ?set=2&season=autumn
    return { ...BASE, ...(q.get("set") ? { set: Number(q.get("set")) } : {}), ...(q.get("season") ? { season: q.get("season") as Config["season"] } : {}) };
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [hud, setHud] = useState(true);
  const [bench, setBench] = useState<{ i: number; rows: (Stats & { label: string })[] } | null>(null);
  const draws = useSharedValue(0);
  const hist = useSharedValue<number[]>(new Array(BINS).fill(0));

  // Every UI-thread frame. Skia's Android and iOS views draw on this thread, so a slow scene
  // shows up here as long intervals.
  useFrameCallback((f) => {
    const dt = f.timeSincePreviousFrame;
    if (dt == null) return;
    hist.modify((a) => { "worklet"; a[Math.min(BINS - 1, Math.round(dt))] += 1; return a; });
  });

  const read = (ms: number): Stats => {
    const a = hist.value, n = a.reduce((s, x) => s + x, 0) || 1;
    let acc = 0, p50 = 0, p95 = 0, mode = 0;
    a.forEach((x, i) => { if (x > a[mode]) mode = i; });
    for (let i = 0; i < BINS; i++) { acc += a[i]; if (!p50 && acc >= n * 0.5) p50 = i; if (!p95 && acc >= n * 0.95) { p95 = i; break; } }
    const vsync = Math.max(mode, 1);
    const jank = a.reduce((s, x, i) => s + (i > vsync * 1.5 ? x : 0), 0) / n;
    const out = { fps: Math.round((n * 1000) / ms), p50, p95, jank: Math.round(jank * 1000) / 10, draws: Math.round((draws.value * 1000) / ms), vsync };
    hist.value = new Array(BINS).fill(0);
    draws.value = 0;
    return out;
  };

  useEffect(() => {
    if (bench) return;
    const id = setInterval(() => setStats(read(1000)), 1000);
    return () => clearInterval(id);
  }, [bench]);

  // Benchmark: warm up, reset, measure, log one BENCH line per step (logcat tag ReactNativeJS).
  useEffect(() => {
    if (!bench) return;
    if (bench.i >= BENCH.length) {
      console.log(`BENCH_DONE ${JSON.stringify({ skia: SKIA, os: Platform.OS, w, h, rows: bench.rows })}`);
      if (AUTOBENCH && Platform.OS === "android") setTimeout(() => BackHandler.exitApp(), 1000); // ends a Test Lab Game Loop run
      return;
    }
    const [label, over] = BENCH[bench.i];
    setCfg({ ...BASE, ...over });
    const t1 = setTimeout(() => read(1), WARMUP);
    const t2 = setTimeout(() => {
      const row = { label, ...read(MEASURE) };
      console.log(`BENCH ${JSON.stringify({ skia: SKIA, os: Platform.OS, ...row })}`);
      setBench({ i: bench.i + 1, rows: [...bench.rows, row] });
    }, WARMUP + MEASURE);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [bench?.i]);

  const autostarted = useRef(false);
  useEffect(() => {
    if (AUTOBENCH && !autostarted.current) { autostarted.current = true; setTimeout(() => setBench({ i: 0, rows: [] }), 3000); }
  }, []);

  const set = (p: Partial<Config>) => setCfg((c) => ({ ...c, ...p }));
  const layerMB = Math.round((SETS[cfg.set].width * SETS[cfg.set].height * 4 * (SETS[cfg.set].kind === "pixel" ? 1 : 5)) / 1e5) / 10;
  const cards = cardRects(w, h, cfg.glass);
  const ink = cfg.season === "spring" ? "#1f2e36" : "#f4eadc";
  const halo = cfg.season === "spring" ? "rgba(255,255,255,0.9)" : "rgba(20,16,36,0.9)";
  const { still, ...rest } = cfg; // still changes uniforms only; everything else remounts the scene

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {SETS[cfg.set].kind === "pixel"
        ? <PixelPond key={JSON.stringify(rest)} cfg={cfg} w={w} h={h} draws={draws} />
        : <Pond key={JSON.stringify(rest)} cfg={cfg} w={w} h={h} draws={draws} />}

      {cards.map((c, i) => (
        <View key={i} pointerEvents="none" style={{ position: "absolute", left: c.x + 18, top: c.y + 14, width: c.width - 36 }}>
          <Text style={{ color: ink, fontSize: 18, fontWeight: "600", textShadowColor: halo, textShadowRadius: 6 }}>What would it mean to be enough?</Text>
          <Text style={{ color: ink, fontSize: 15, marginTop: 6, textShadowColor: halo, textShadowRadius: 6 }}>"I keep thinking I have to earn rest."</Text>
        </View>
      ))}
      <Text pointerEvents="none" style={{ position: "absolute", left: 24, bottom: 250, right: 24, color: ink, fontSize: 16, textShadowColor: halo, textShadowRadius: 8 }}>
        Text straight over the scene, with only a halo behind it.
      </Text>

      {hud && (
        <View pointerEvents="none" style={{ position: "absolute", top: 44, right: 8, backgroundColor: "rgba(0,0,0,0.7)", padding: 8, borderRadius: 8 }}>
          <Text style={{ color: "#fff", fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }), fontSize: 11 }}>
            {`skia ${SKIA} · ${Platform.OS}\n`}
            {stats ? `UI ${stats.fps} fps (vsync ${stats.vsync} ms)\np50 ${stats.p50} ms · p95 ${stats.p95} ms\njank ${stats.jank}%\nart draws ${stats.draws}/s\n` : "…\n"}
            {`layers ≈ ${layerMB} MB decoded`}
            {bench ? `\nbench ${Math.min(bench.i + 1, BENCH.length)}/${BENCH.length}: ${BENCH[Math.min(bench.i, BENCH.length - 1)][0]}` : ""}
          </Text>
        </View>
      )}

      {bench && bench.i >= BENCH.length ? (
        <ScrollView style={{ position: "absolute", left: 8, right: 8, top: 160, bottom: 120, backgroundColor: "rgba(0,0,0,0.85)", borderRadius: 8, padding: 10 }}>
          <Text selectable style={{ color: "#fff", fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }), fontSize: 11 }}>
            {`step                     fps  p50 p95 jank% draws\n`}
            {bench.rows.map((r) => `${r.label.padEnd(24)} ${String(r.fps).padStart(4)} ${String(r.p50).padStart(4)} ${String(r.p95).padStart(3)} ${String(r.jank).padStart(5)} ${String(r.draws).padStart(5)}`).join("\n")}
          </Text>
        </ScrollView>
      ) : null}

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 8, paddingBottom: 28, gap: 6, backgroundColor: "rgba(0,0,0,0.55)" }}>
        <Row>
          {SETS.map((s, i) => <Chip key={i} on={cfg.set === i} label={s.label} onPress={() => set({ set: i })} />)}
        </Row>
        <Row>
          <Chip on={cfg.season === "autumn"} label={cfg.season} onPress={() => set({ season: cfg.season === "spring" ? "autumn" : "spring" })} />
          <Chip on={cfg.shader} label="shader" onPress={() => set({ shader: !cfg.shader })} />
          <Chip on={cfg.still} label="still water" onPress={() => set({ still: !cfg.still })} />
          <Chip on label={`art ${cfg.artFps || "max"}`} onPress={() => set({ artFps: cfg.artFps === 30 ? 60 : cfg.artFps === 60 ? 0 : 30 })} />
          <Chip on={cfg.sprites > 0} label={`sprites ${cfg.sprites}`} onPress={() => set({ sprites: cfg.sprites === 0 ? 16 : cfg.sprites === 16 ? 48 : 0 })} />
        </Row>
        <Row>
          {(["none", "skia1", "skia4", "expo1", "expo4"] as Glass[]).map((g) => <Chip key={g} on={cfg.glass === g} label={g} onPress={() => set({ glass: g })} />)}
        </Row>
        <Row>
          <Chip on={!!bench && bench.i < BENCH.length} label={bench && bench.i < BENCH.length ? "bench running…" : "run bench (~2 min)"} onPress={() => setBench({ i: 0, rows: [] })} />
          <Chip on={hud} label="HUD" onPress={() => setHud(!hud)} />
        </Row>
      </View>
    </View>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{children}</View>;
const Chip = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: on ? "#e8e2d4" : "rgba(255,255,255,0.15)" }}>
    <Text style={{ color: on ? "#1f2e36" : "#fff", fontSize: 12 }}>{label}</Text>
  </Pressable>
);
