# How would we render our own pixel-art scene, like a game, under the Inquiry flow?

Research for [How would we render our own pixel-art scene, like a game, under the Inquiry flow?](https://github.com/shrujancheruku/look-together/issues/68). Sources read on 2026-11-03. Package versions come from the npm registry that day, and Expo's bundled versions from [`bundledNativeModules.json` on the `sdk-58` branch](https://github.com/expo/expo/blob/sdk-58/packages/expo/bundledNativeModules.json). Anything marked **unverified** was not confirmed in a primary source and must not be read as fact.

Setup: Expo SDK 58 (React Native 0.88.1, Reanimated 4.7.1, worklets 0.13.0, `@shopify/react-native-skia` 2.14.0 bundled), a dev build, one TypeScript codebase for iOS, Android and web. Text, input, dictation and accessibility stay native. The Inquiry is an event-driven state machine ([ADR 0004](../adr/0004-inquiry-is-an-app-owned-state-machine.md)), and nothing about an Inquiry leaves the device ([ADR 0003](../adr/0003-inquiry-content-never-on-our-servers.md)).

Starting point: the `prototype/pond-skia` branch's `src/PixelPond.tsx` draws a 214×384 art-pixel pond. It scales a `Group` by a whole number of device pixels and runs the scene shader inside that scaled group, so **the shader runs once per screen pixel**, not once per art pixel. At a scale of 7 device pixels per art pixel that is about 49 shader runs for each art pixel. Motion already moves in whole art pixels (`src/pixel.ts`), and the glass is the same shader in frost mode.

## Short answer

**Keep React Native Skia v2 (the SDK 58 bundled version) and turn the pond into a small, data-driven world drawn at art resolution into an offscreen surface, then upscaled by a whole number with nearest-neighbour sampling, under native text.** Do not embed a game engine.

Why:

1. **It already works on all three platforms, with one API and one shader language,** and it is the only option here that also renders headless in Node for CI (the prototype already does this). Web stays: CanvasKit costs 2.9 MB gzipped, loaded async ([Skia web](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/getting-started/web.mdx)). Nothing found is a strong reason to drop web.
2. **Art resolution makes the GPU cost tiny.** 214×384 is about 82,000 pixels, against about 2.6 million on a 1080×2400 phone. Skia v2 can draw into an offscreen surface on the UI thread (`Skia.Surface.MakeOffscreen`, `useTexture`, `usePictureAsTexture`) and hand the image to the visible canvas ([v2 textures](https://wcandillon.github.io/react-native-skia/v2/docs/animations/textures/)). That one change fixes the prototype's per-screen-pixel shading.
3. **Engines don't fit the constraints.** Unity as a Library "supports only full-screen rendering" on Android and iOS and can't host more than one runtime ([Unity](https://docs.unity.com/en-us/engine/current/manual/platform-specific/cross-platform-features/unityasa-library)). Godot's LibGodot shipped in 4.6 for "Linux, Windows, and macOS" only ([Godot 4.6](https://godotengine.org/releases/4.6/)); mobile embedding comes through a third-party React Native wrapper with no web build. Defold staff say it is not designed to be embedded ([forum](https://forum.defold.com/t/how-to-add-defold-game-in-android-app-as-library/75528)). All of them would add a second runtime, a second asset pipeline, and a web story through an iframe.
4. **The game-like parts are plain TypeScript, not an engine:** a scene model projected from the Inquiry's state, a director that turns state changes into short transitions, a fixed-step clock that runs only while something moves, and indexed colour with palette textures so seasons, time of day, Still water and the Step-out are palette swaps.
5. **Seeded growth has to happen on the CPU in integer maths.** GPU float maths and even JavaScript's `Math.sin` are not guaranteed identical across devices, so the lily is built as integer art pixels and palette indices in TypeScript, and the GPU only looks colours up.

Keep `react-native-skia` v3 (Graphite) as an upgrade path, not the starting point: it needs Vulkan 1.1 on Android and Graphite is native-only, so web still runs WebGL ([v3 installation](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/getting-started/installation.md)). Keep `react-native-webgpu` + TypeGPU in reserve for compute-heavy effects, which this scene doesn't need.

Main risks (all to measure in the prototype, see Open questions):

- **Web offscreen cost.** On web, "a texture belongs to the WebGL context that created it", and texture hooks read the snapshot back with `makeRasterImage()` ([textures](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/animations/textures.md)). A per-frame readback of a 214×384 image is small, but its cost is **unverified**.
- **Index images must survive decoding exactly.** If Skia colour-manages or premultiplies an index PNG, the palette lookup reads the wrong entry. **Unverified**; test with a full 0–255 ramp.
- **Effort.** Authoring a world and hero sprites by hand is several times the work of curating AI-painted layers (estimate below).

## 1. Where the scene runs

| | Maturity with Expo SDK 58 | Web | App size | Draw thread | Under native text |
|:--|:--|:--|:--|:--|:--|
| **Skia v2** (`@shopify/react-native-skia` 2.14.0, bundled) | Bundled by Expo; works in the prototype on iOS, Android, web | Yes, CanvasKit on WebGL, 2.9 MB gzipped wasm, async ([web](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/getting-started/web.mdx)) | iOS ~6 MB, Android ~4 MB ([bundle size](https://shopify.github.io/react-native-skia/docs/getting-started/bundle-size)) | UI thread via Reanimated worklets; offscreen surfaces too ([v2 textures](https://wcandillon.github.io/react-native-skia/v2/docs/animations/textures/)) | A native view; RN text siblings draw on top (the prototype does this) |
| **Skia v3** (`react-native-skia` 3.9.1, Graphite) | Not bundled; dev build only, "does not run in Expo Go"; minSdk 26; Vulkan 1.1 marked required, so Play filters out devices without it; Android TV not supported ([v3 install](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/getting-started/installation.md)) | Yes, but "On the Web, Skia renders with WebGL: Graphite and the WebGPU interop are only available on native platforms" | Not published for v3 (**unverified**) | `SkiaGraphiteView` records on "the JS thread, the Reanimated UI runtime, or a dedicated worklet runtime"; on Android "the main thread pays nothing for a frame" ([Graphite](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/canvas/graphite.md)) | Same as v2 |
| **WebGPU** (`react-native-webgpu` 0.21.0, Dawn; TypeGPU 0.12.9) | RN ≥ 0.81, new architecture only, minSdk 26, config plugin for Expo, not in Expo Go ([install](https://wcandillon.github.io/react-native-webgpu/docs/getting-started/installation), [TypeGPU RN](https://docs.swmansion.com/TypeGPU/integration/react-native/)). The docs now install `react-native-webgpu`; the older `react-native-wgpu` name was last published as 0.5.17 in 2026-07 (that it is a rename is **unverified**) | The browser's own WebGPU; separate code path. WebGPU is in Chrome, Edge, Firefox and Safari 26 (iOS 26+) ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers)); older iPhones get nothing | Dawn binaries; size not published (**unverified**) | Off the JS thread with `react-native-worklets` | A native view; text on top |
| **`expo-gl`** 58.0.4 (WebGL 2) | First-party, in Expo Go; worklet support is "experimental"; several WebGL2 methods unimplemented; "methods don't perform type or bounds checking", invalid arguments "may cause a native crash" ([expo-gl](https://docs.expo.dev/versions/latest/sdk/gl-view/)) | Yes (browser WebGL 2) | Small (**unverified**) | JS thread by default; UI thread with experimental worklets, where Three.js and Pixi.js "won't work" | A native view; text on top |
| **Godot via LibGodot** (`@borndotcom/react-native-godot` 1.0.1, 2025-11) | LibGodot in 4.6 supports "Linux, Windows, and macOS" ([4.6](https://godotengine.org/releases/4.6/)); 4.7 is out but no 4.7 notes on mobile LibGodot were found (**unverified**). Mobile is via Born's wrapper on a Migeran branch (`libgodot_migeran_45`); no Expo statement ([repo](https://github.com/borndotcom/react-native-godot)) | Not in the wrapper. Godot's own web export is WebGL 2 only, full-page, usually in an iframe ([web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)) | Not published (**unverified**) | Its own thread: "Godot is running on a separate thread" | `RTNGodotView`; z-order with RN text **unverified** |
| **Unity as a Library** | Android, iOS, Windows. "Unity supports only full-screen rendering" on mobile; one runtime only; after unload it "retains memory (between 80 and 180 MB)"; on iOS it can't reload after quit ([Unity](https://docs.unity.com/en-us/engine/current/manual/platform-specific/cross-platform-features/unityasa-library)) | Separate WebGL build | Large (**unverified**) | Its own | Full-screen only, so it can't sit as one layer under RN text without an Industry licence |
| **Defold** | No built-in embedding; staff: not designed to be embedded in other Android apps ([forum](https://forum.defold.com/t/how-to-add-defold-game-in-android-app-as-library/75528)) | HTML5 export, WebGL 2 ([HTML5](https://defold.com/manuals/html5/)) | Small (**unverified**) | Its own | Only via a WebView |
| **Bevy** 0.20 (2026-10-08) | Rust; no React Native embedding found (**unverified**) | WebGPU/WebGL builds ([news](https://bevy.org/news/)) | **unverified** | Its own | Custom native bridge needed |

Notes:

- **Native text on top is the same for every option that is a normal native view.** On Android a `SurfaceView` "punches a hole in its window" and the view hierarchy composites siblings on top, at the cost of "a full alpha-blended composite ... each time the Surface changes" ([SurfaceView](https://developer.android.com/reference/android/view/SurfaceView)). That cost is one more reason to redraw only when something moves.
- **The engine options add a second runtime, a second asset pipeline and a separate web build,** for features this scene doesn't use (physics, input systems, audio graphs, editors). Their main draw (an editor for scenes) is matched well enough by Aseprite plus a JSON manifest.
- **Skia v3's WebGPU interop** lets a WebGPU pass draw into a texture Skia then shows, with no copy, on native only ([Skia WebGPU](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/webgpu.md)). That is the clean route to compute effects later, if ever needed.

## 2. Scene architecture

**One world, many views.** Model the pond as one small world in art pixels (wider than any phone, so tablets and wide web panes show more of it, not bigger pixels). Screens are camera framings of that world, not separate scenes: home frames the open pond and its Recap flowers; an Inquiry frames its lily; a Path follows the brook; the Recap rests on the pool. This matches the native quiet stack and the wide-web panes in [What are the app's screens?](https://github.com/shrujancheruku/look-together/issues/47): navigation stays React Navigation, and the route chooses the camera target. On wide web the world sits behind all panes, framed on the rightmost pane's subject. Separate scenes would need cuts or crossfades at every push, and the pond is one place in the look decision ([#54](https://github.com/shrujancheruku/look-together/issues/54)).

**A scene model, not an entity framework.** A small world doesn't need an ECS. Three plain TypeScript layers:

1. **`sceneFromState(inquiries, ui) → Scene`**, a pure function. It reads the reducer's records (Problem, Probes, Paths and their ends, Recap, Step-out) and the UI state (route, season, Still water, Reduce Motion, keyboard open) and returns a list of things in the world: each with an id, kind (pad, lily, flower, closed lily, boat, leaf), position in art pixels, growth stage and palette row. Nothing in the scene is stored; it is all derived. That keeps [ADR 0004](../adr/0004-inquiry-is-an-app-owned-state-machine.md) intact: the reducer stays event-driven and never sees a tick.
2. **A director** that diffs the previous and next `Scene` by id and turns differences into short, named cues: a new Probe (a pad unfurls), a Path finished (its pad turns and a bud forms), a Recap (the flower opens, the pool settles), a Step-out (the water stills, palette shifts to the Step-out row, no other motion). Each cue is a timeline of whole-art-pixel keyframes. Cues run on the UI thread (a Reanimated `useFrameCallback`), fed through shared values; they never write back to the reducer.
3. **A renderer** that, each art frame, draws the world into the art-resolution offscreen surface: background index layers through the palette shader, Atlas sprites, the procedural water, the pixel-frost cards; then one nearest-neighbour blit to the screen.

**Fixed-step motion, stepped rendering, render on demand.**

- Simulate at a fixed step (for example 30 Hz, an accumulator in the frame callback), so ripples, drifting leaves and cue timelines play the same whatever the display rate (60, 90, 120 Hz). Motion moves in whole art pixels, so there is nothing to interpolate.
- Present only when the art changes. The prototype already learned that unchanged uniforms produce no new Skia frames ("Still water stops redrawing"). Ambient motion (water shimmer, palette cycling) needs only 8–12 new frames a second; cues can use 30.
- **Stop the clock entirely** on Still water, Reduce Motion, when the app is backgrounded (`AppState`), and while the person reads or types a Reflection (see §5). Battery and thermal gains of this are **unverified** by measurement here, but every skipped frame skips GPU work and, on Android, the compositing above.
- Cue timelines still apply under Reduce Motion, as cuts: jump to the end state (the flower is open), so meaning is never only in motion.

## 3. Pixel rendering techniques

**Integer scaling.** Godot's docs put the rule plainly: integer scale mode "prevents uneven pixel scaling from occurring", and its `viewport` mode is "low-resolution rendering that is then stretched to the final window size" ([multiple resolutions](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html)). For Look Together:

- Pick `k` (device pixels per art pixel) per window as a whole number. Phones: the prototype's `ceil(max(w·dpr/AW, h·dpr/AH))` covers the screen and crops the sides; key art must sit inside the narrowest crop (the prototype keeps it inside x 30..184).
- Tablets and wide web panes: use Godot's `expand` idea, keeping `k` near the phone's and showing more world, so the pixels stay the same physical size. This needs the world drawn wider than one phone frame.
- Snap card rectangles, borders and notches to the art grid, as the prototype does, so the glass edges stay on the grid.

**Smooth camera over a low-resolution render.** Render the offscreen surface one art pixel larger than the view on each side, place the camera at a whole art pixel inside it, and apply the leftover fraction as a whole-device-pixel offset in the upscale blit. The world stays on its grid, and camera pans move in device pixels, not art-pixel jumps. This is a standard technique in pixel-art engines (for example Unity's Pixel Perfect Camera renders to an upscaled render texture); a primary write-up of the fractional-offset variant was not found, so treat the details as **unverified** until prototyped.

**Indexed colour with palette textures.**

- Store backgrounds and hero sprites as 8-bit index images (a single-channel or greyscale PNG) and keep the colours in a palette texture: 256 entries wide, one row per palette. Rows: spring morning, autumn evening, dusk in-betweens, Still water (lower contrast, cooler), Step-out (quiet, near-monochrome), and the contrast modes.
- The SkSL shader samples the index with nearest sampling and looks the colour up: `palette.eval(float2(index * 255 + 0.5, row + 0.5))`. Time of day is a mix between two rows. Skia child shaders are evaluated with `.eval()` and image shaders use pixel coordinates ([SkSL](https://skia.org/docs/user/sksl/)).
- This is how seasons, time of day, Still water and the Step-out become palette swaps with no new art.
- Risk: the index must reach the shader unchanged. Skia shaders return premultiplied colour ([SkSL](https://skia.org/docs/user/sksl/)); use opaque images, strip colour profiles, and test a 0–255 ramp on iOS, Android and web (**unverified**).

**Palette cycling for water.** The classic method: pixels are indices, and "animated effects rotate ranges of palette entries"; Mark Ferrari used it for "rain, snow, waves, fog, and waterfalls", and Joseph Huckaby's "BlendShift" fades between steps ([Huckaby](http://www.effectgames.com/effect/article-Old_School_Color_Cycling_with_HTML5.html)). In the shader that is one uniform per range: `index' = start + (index - start + offset) mod length`. It is cheap, needs no new frames of art, and stops by freezing `offset`.

**Procedural pixel art at art resolution.** Water shimmer, sky gradients, light shafts, mist and foliage sway run in the scene shader **per art pixel**, into the offscreen surface:

- Draw the scene shader in a `Rect` of `AW × AH` into `Skia.Surface.MakeOffscreen(AW, AH)` (or `useTexture` / `usePictureAsTexture`) on the UI thread ([v2 textures](https://wcandillon.github.io/react-native-skia/v2/docs/animations/textures/)), then draw that image once with `FilterMode.Nearest` scaled by `k`. This replaces the prototype's per-screen-pixel shading.
- Quantise every procedural result to palette indices (dithered ramps, not smooth gradients), so the output stays on the palette and on the grid.
- Glass cards: frost the art-resolution image in a second pass, clipped to the cards, as the prototype does. Skia web has no runtime-shader image filters, so keep glass as a shader pass, not a `BackdropFilter`.
- On web, the offscreen image is snapshotted per frame ([textures](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/animations/textures.md)). If that is slow, the fallback is to draw the shader directly in the visible canvas at `k` scale, accepting per-screen-pixel cost on web only.

## 4. Seeded growth

Goal: the same Inquiry state and seed draw the same lily on every device and in CI.

- **Do the growth on the CPU, in integer maths.** GPU float precision differs across hardware, and even JavaScript's `Math.sin` returns "an implementation-approximated Number" ([ECMA-262](https://tc39.es/ecma262/#sec-math.sin)), so Hermes and a browser's engine may differ in the last bits. Integer operations are exact: `Math.imul`, `>>>`, `|0`.
- Use a small integer PRNG (mulberry32 or splitmix32) seeded from the Inquiry's local id, which never leaves the device ([ADR 0003](../adr/0003-inquiry-content-never-on-our-servers.md)). Growth inputs come from the records: number of Probes, which Paths ended and how, the Recap, the Inquiry's age in days.
- Output an indexed bitmap (or a list of art-pixel runs with palette indices), upload it with `Skia.Image.MakeRaster` ([image](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/image.md)), and draw it with nearest sampling through the palette. Nearest sampling plus a palette lookup has no float sensitivity in practice, so the lily's pixels match everywhere (the shader-side lookup is **unverified** until the golden test runs on devices).
- Keep sin-based hashes (the prototype's `fract(sin(...) * 43758.5)`) only for ambient sparkle that is allowed to differ by device, and freeze them in CI renders.
- **Version the generator.** Store a `growthVersion` with each Inquiry, so an app update doesn't redraw old lilies differently. A change to the generator is a forward-only migration, like the protocol changes in [ADR 0009](../adr/0009-the-backend-serves-two-protocol-versions-side-by-side.md).
- CI: golden tests compare the **index buffer** byte for byte (fast, exact, platform-free), and the rendered PNG with a small tolerance.

## 5. Reading over a scene

What primary sources say:

- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/): "Provide high contrast between text/UI and background" (basic), "Provide an option to turn off / hide background movement" (intermediate), "Avoid flickering images and repetitive patterns" (basic), "Allow players to progress through text prompts at their own pace" (basic).
- WCAG 2.2 SC 2.2.2: moving content that starts on its own, lasts more than five seconds and "is presented in parallel with other content" needs "a mechanism for the user to pause, stop, or hide it" ([Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). Still water is that mechanism; it must stop all ambient motion, palette cycling included.
- Adam Robinson-Yu on *A Short Hike*: "the low-resolution can help the world feel lush, and let your imagination fill in the details"; he added "a soft outline effect to objects to help them stand out", and "the option to fine tune the pixel size" because some players found the look "less endearing"; the aim was "the peaceful meditative feeling" ([PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)).

What this means for Look Together (design judgement, not sourced):

- **The scene recedes while the person reads or writes.** On a Path step or with the keyboard up, the director eases to a "reading" palette row (lower contrast, less saturation), slows ambient motion to near zero, and keeps the camera still. It comes back when they look up (scroll stops, keyboard closes).
- **Text sits on panels, not on the art.** The pixel-frost cards from the prototype are the panels. Body text stays Fraunces and Nunito ([#58](https://github.com/shrujancheruku/look-together/issues/58)), never a pixel font, and follows the system text size. The first contrast run already showed bare spring text over water fails (3.7:1) and glass cards pass (≥5.7:1).
- **Calm and nostalgic, not retro:** soft value ranges and few hues per palette, coloured shadows rather than black outlines, large art pixels with plenty of empty water, slow stepped motion, no CRT scanlines, chiptune, HUD frames, score-like counters or blinking. "Hi-bit" (modern colour depth on a pixel grid) suits this better than an 8-bit console palette. An optional pixel-size setting, as in *A Short Hike*, is worth considering.

## 6. Tooling and checks

- **Hero sprites and palettes in Aseprite.** Author in indexed mode against the master palette. Export with the CLI: `aseprite -b lotus.ase --split-layers --list-tags --sheet sprites.png --data sprites.json --format json-array`, and `--color-mode indexed` to force the mode ([Aseprite CLI](https://www.aseprite.org/docs/cli/)). A build script (`tools/pixel-import.mjs`) turns the sheet into an index PNG plus `scene.json` boxes and tags, and turns `palettes.json` (or a `.gpl` file) into the palette texture. Lua scripts (`--script`) can check that every pixel uses the master palette.
- **AI output becomes reference, not assets.** The prototype found Gemini's pixel art "is not on a true grid", with fractional, mixed pixel sizes. `tools/pixelify.mjs` can still turn concept images into a starting sheet for hand clean-up.
- **CI contrast render.** Keep the headless CanvasKit render (`tools/contrast.tsx`, `drawOffscreen` in Node). Render each camera framing × palette row (seasons, Still water, Step-out, contrast modes) with the clock frozen, then check text-box regions against halo tokens, as [#56](https://github.com/shrujancheruku/look-together/issues/56) set. Palette rows make the matrix explicit and small.
- **Golden images.** Exact index buffers for seeded lilies (see §4) plus tolerant PNG goldens of each framing. Device-to-CanvasKit differences are expected to be small at nearest sampling but are **unverified**; one Test Lab run per release can catch them.
- **Reduce Motion and Still water.** `AccessibilityInfo.isReduceMotionEnabled()` / Reanimated's `useReducedMotion` (web reads `prefers-reduced-motion`) and the Still water toggle all stop the art clock, freeze palette cycling, and turn cues into cuts. The scene stays hidden from screen readers.

## 7. Comparison of rendering options

| | Fits native text, a11y | Web | Headless CI | Extra runtime | Effort to adopt | Verdict |
|:--|:--|:--|:--|:--|:--|:--|
| **Skia v2 + art-resolution offscreen** | Yes | Yes (CanvasKit) | Yes, already working | None (bundled) | Low; prototype exists | **Recommended** |
| Skia v3 Graphite | Yes | Yes, but WebGL, not Graphite | Yes (**unverified** for v3) | Swap of the Skia package; Vulkan required | Low–medium | Later upgrade if v2 frame times fall short |
| react-native-webgpu + TypeGPU | Yes | Separate browser-WebGPU path; none before iOS 26 | Not documented (**unverified**) | Dawn | High: own 2D renderer, sprites, text-free UI glue | Reserve for compute effects |
| expo-gl | Yes | Yes | No Node renderer (**unverified**) | Small | High: raw WebGL, experimental worklets, crash on bad args | No |
| Godot (LibGodot, RN wrapper) | Embedded view; z-order **unverified** | No (iframe export only) | Godot headless, separate pipeline | Whole engine | High | No |
| Unity as a Library | Full-screen only on mobile | Separate build | Separate | Whole engine, 80–180 MB retained after unload | Very high | No |
| Defold | WebView only | Yes, standalone | Separate | Whole engine | Very high | No |
| Bevy | Custom bridge | Yes, standalone | Separate | Rust toolchain + engine | Very high | No |

## 8. What this would supersede on the map

- **[Which tools can render hand-drawn, hand-animated surfaces?](https://github.com/shrujancheruku/look-together/issues/63)** Skia stays, but "painted raster layers, one shared shader layer for boil, water and ripples" and "`BackdropFilter` glass" give way to indexed art-resolution layers, palette textures, a per-art-pixel shader and shader-drawn frost. Line boil goes away.
- **[What is the hand-drawn art direction?](https://github.com/shrujancheruku/look-together/issues/64)** "Watercolour on cold-press paper", paper grain and line boil are replaced by hi-bit pixel art. "AI-made art ships at launch" becomes hand-authored hero sprites and palettes plus procedural environment; AI only for reference. The 30 fps motion list becomes stepped art frames (8–12 ambient, up to 30 for cues).
- **[Which AI image tool paints the pond best?](https://github.com/shrujancheruku/look-together/issues/67)** Its purpose shrinks to reference and concept images; its blind read no longer picks shipping art.
- **[Does a hand-drawn Skia pond scene run smoothly on a mid-range Android?](https://github.com/shrujancheruku/look-together/issues/65)** The question becomes: does the art-resolution offscreen pipeline hold its frame rate on a mid-range Android and on web, and does v2 suffice?
- **The hand-drawn asset spec** (open item on the map): becomes an indexed asset spec (index layers, sprite sheet, palette rows, `scene.json`, `growthVersion`).
- **[How does a Recap look and read?](https://github.com/shrujancheruku/look-together/issues/60)** "Tinted frosted glass" cards become pixel-frost cards; the drop every 5 s becomes a pixel drop (and stops on Still water).
- **[What do Look Together's look and the voice of its copy feel like?](https://github.com/shrujancheruku/look-together/issues/54)** The pond, the lily as an Inquiry, seasons and Still water all stay; only the rendering style changes. Additive: screens are camera framings of one world.
- **[What are the app's screens?](https://github.com/shrujancheruku/look-together/issues/47)** Additive only: each route has a camera target; navigation is unchanged.
- **[What typography does Look Together use?](https://github.com/shrujancheruku/look-together/issues/58)** Fonts stay; the "soft halo on the sky and water" may become panels only, if halos read poorly on pixel art (a design call).

## 9. Rough effort for a solo founder

A guess, in focused weeks, assuming the founder is not yet a practised pixel artist. Not measured.

| Work | Image-asset approach (watercolour, #64) | Own pixel scene |
|:--|:--|:--|
| Renderer (layers, shader, glass, scaling) | 1–2 (mostly built in the prototype) | 1–2 (offscreen pass, palette shader, frost) |
| Scene model, director, camera through one world | 1–2 (simpler: per-screen layers) | 2–3 |
| Environment art | 1–2 (AI generation, curation, layer splitting) | 2–4 (procedural water, sky, mist, foliage; palettes) |
| Hero sprites (lotus, boat, pads, flowers, stages) | 1 (AI + curation) | 2–4 (Aseprite, by hand) |
| Seeded lily growth | 1 (pick from pre-made stages) | 1–2 (generator, versioning, goldens) |
| Tooling and CI (import, contrast, goldens) | 0.5–1 | 1 |
| **Total** | **about 5–9 weeks** | **about 9–16 weeks** |

The pixel route costs roughly twice as much, mostly in art. It buys: no recurring AI-art curation or copyright questions on shipping art, tiny asset sizes, palette-driven seasons and states for free, truly per-Inquiry lilies, and a scene that reacts to the Inquiry rather than swapping images. Hiring a pixel artist for hero sprites would cut the hand-art weeks but adds cost (**unverified**).

## 10. Open questions

1. **Web offscreen cost:** does per-frame snapshot of a 214×384 offscreen surface in CanvasKit hold 30 fps on a mid-range laptop and on iOS Safari? If not, is per-screen-pixel shading acceptable on web only?
2. **Index fidelity:** does a greyscale index PNG reach the SkSL shader as exact 0–255 values on iOS, Android and web?
3. **v2 enough?** Frame time of the art-resolution pipeline on the Galaxy A16 5G / A36 5G (via `tools/testlab.sh`), v2 against v3.
4. **World size and crop:** how wide is the world, and what is the safe area for key art across 19.5:9 phones, 4:3 tablets and wide web?
5. **Who draws the hero sprites:** the founder in Aseprite, or a hired pixel artist? This drives most of the estimate.
6. **Halo or panels:** does the soft halo survive on pixel art, or does all text move onto frost panels?
7. **Reading mode trigger:** what exactly puts the scene into "reading" (route, keyboard, scroll idle), and is it noticed or just felt?
8. **Mobile LibGodot in Godot 4.7:** not needed for this recommendation, but unconfirmed; only relevant if an engine is reconsidered.
9. **Pixel-size setting:** offer one, as *A Short Hike* does, or not?
