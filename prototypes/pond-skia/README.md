# PROTOTYPE: hand-drawn Skia pond scene (throwaway)

Answers [Does a hand-drawn Skia pond scene run smoothly on a mid-range Android?](https://github.com/shrujancheruku/look-together/issues/65), and hosts the phone-side blind read for [Which AI image tool paints the pond best?](https://github.com/shrujancheruku/look-together/issues/67). Not production code; never merge.

One Expo SDK 58 app draws a pond from five painted layers (sky, bank, water, wash, line) through one SkSL shader (water shimmer, tap ripples, line boil on twos, fixed paper grain), with Atlas sprites (drops, leaves), frosted-glass cards (Skia `BackdropFilter`, or `expo-blur` for comparison) and React Native text with a halo on top. A HUD shows UI-thread frame rate, p50/p95 frame time, jank, and how often the art redraws. **Run bench** steps through 13 configurations, 6 s each after a 2.5 s warm-up, and logs one `BENCH {json}` line per step.

The layers are procedural stand-ins from `tools/gen-standins.tsx`, at 1242×2688 and half size. They compress far better than real painted art, so their file sizes mean nothing; decoded GPU memory depends only on pixel size (5 layers × 1242×2688 × 4 B ≈ 67 MB).

| Path | What |
|---|---|
| `App.tsx` | HUD, controls, the bench |
| `src/Pond.tsx` | The scene: shader, sprites, glass, art clock (30/60/max fps, stops on Still water) |
| `src/sksl.ts` | The scene shader |
| `src/sets.ts` | Layer sets; the image-tool bake-off adds its sets here under blind labels |
| `tools/gen-standins.tsx` | Paints the stand-in layers headless (`npm run gen`) |
| `tools/contrast.tsx` | The CI contrast render: headless frozen frame, both seasons, glass included (`npm run contrast`) |
| `tools/testlab.sh` | Runs a bench APK as a Firebase Test Lab Game Loop and prints its `BENCH` lines |
| `eas.json` | `proto` / `proto-v3` (interactive), `bench` / `bench-v3` (bench on launch) |

## Pixel style (exploration)

A second style, switched with the **Pixel (hi-bit)** chip (web: `?set=2&season=autumn`). `src/PixelPond.tsx` draws a 214×384 art-pixel scene scaled to the screen by a whole number of device pixels, sampled nearest-neighbour. `src/pixel.ts` moves the water shimmer, ripples and twinkles in whole art pixels, and the glass is the same shader in frost mode (3-art-pixel cells, tinted, colour stepped), clipped to cards with notched corners.

Assets: `tools/gen-pixel.mjs` asks Gemini 3 Pro Image for them (raw output in `assets/pixel-raw/`, about $0.13 each). `tools/pixelify.mjs` finds the fake pixel grid, takes one median colour per cell, caps the palette and keys out magenta. `tools/pixel-manifest.mjs` finds each sprite's box and writes `scene.json`.

## Run

```sh
npm i
npm run web                                         # web (CanvasKit); open in a normal browser, not headless
npx eas-cli build -p android --profile proto        # v2 APK; proto-v3 for react-native-skia 3.9
npm run bench:log                                   # with a phone on adb: tap "run bench", read BENCH lines
tools/testlab.sh bench.apk a16x,35 a36xq,36         # Test Lab Galaxy A16 5G and A36 5G (project look-together)
```

`EXPO_PUBLIC_SKIA=v3` swaps in `react-native-skia` 3.9.1: `tools/eas-pre-install.mjs` rewrites the dependency on EAS, Metro aliases the import, and the app gets its own package id and minSdk 26.

## Learned while building

- **Headless works in Node.** `drawOffscreen` renders the full scene, shader and `BackdropFilter` glass included, from a script bundled by esbuild with `react-native` aliased to `react-native-web` (`tools/run.mjs`). Pure code (`sksl.ts`, `layout.ts`) must stay free of asset `require`s so CI can import it.
- **Skia 2.14 paths are built with `Skia.PathBuilder`**, not `Skia.Path.Make().moveTo`.
- **Still water stops redrawing** by not advancing the art clock: unchanged uniforms mean no new Skia frames.
- **Skia web has no runtime-shader image filters** (`MakeRuntimeShader` throws "Not implemented on React Native Web"), so a pixelating backdrop filter breaks the canvas on web; the pixel glass is drawn by the scene shader instead.
- **Gemini's pixel art is not on a true grid.** Its pixel size is fractional (7.11, 17.2, 22.95 image px), mixed within one image unless a canvas size is named, and edges are soft. Naming a canvas ("a 216 x 384 canvas upscaled 7x") got 214×384; naming sprite sizes in art pixels got scene-scale sprites that snap at 0.1% off-grid. Horizons ignored the prompt both times.
- **Art-resolution offscreen (`Pixel (art-res offscreen)`, set 3):** the world renders into a 214×384 surface on the UI thread and is shown with one nearest upscale. On web it loses: reading the WebGL offscreen back costs ~18 ms a render (UI fell to 77 fps, 29% jank in Chrome on a Mac), and a CPU raster surface costs ~134 ms. Native is what the builds measure; web should shade per screen pixel.
- **Index images arrive exactly on web:** a 0–255 ramp, greyscale PNG and the red channel of an RGB PNG, both 256/256 through a shader in CanvasKit (`src/indexTest.ts`, logged as `INDEX`).
- **First contrast run:** on the glass cards, text passes with the soft halo in both seasons (≥5.7:1 at the worst 5%). Bare spring text over the water fails (3.7:1), so it needs the firm halo (14:1 on its inner colour).
