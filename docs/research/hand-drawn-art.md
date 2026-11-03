# Which tools can render hand-drawn, hand-animated surfaces in Expo?

Research for [Which tools can render hand-drawn, hand-animated surfaces in Expo on iOS, Android and web?](https://github.com/shrujancheruku/look-together/issues/63). Sources read on 2026-11-03. Package versions and dates come from the npm registry on that day. Wasm sizes were measured from the published npm tarballs.

Setup in question: Expo SDK 58 (`expo@58.0.22`, React Native 0.88.1), a dev build (no Expo Go), one TypeScript codebase for iOS, Android and web. Surfaces: sky, water, trees, lily pads and flowers, the brook, ripples and drops, frosted-glass cards, the rowboat. Two seasons (spring morning, autumn evening). Still water / Reduce Motion turns motion off. Only the prototypes' layout carries over.

Added constraint (from the founder): the final set is made by a human illustrator/animator. AI-generated art is fine as a stand-in for the closed beta, and gets replaced later. The renderer has to suit both.

## Short answer

- **Use React Native Skia as the one surface renderer, with hand-drawn raster textures and a shader layer for line boil, ripples and seasons.** Skia is in Expo SDK 58's bundled modules (`@shopify/react-native-skia` 2.14.0). The same SkSL shaders run on iOS, Android and web (CanvasKit). It can draw sprite-sheet frames (Atlas), Lottie files (Skottie) and video frames inside the same canvas. It also does the frosted glass (`BackdropFilter`) over the moving scene, and it can render a scene headless in Node for the CI contrast check.
- **Rive is the strong second, and the better pick for character-like animation such as the rowboat** (bones, meshes on raster, state machines, data binding, a documented Reduced Motion pattern). Its drawback is that the new React Native runtime (`@rive-app/react-native` 0.5.10) has no web build. Web needs a separate `.web.tsx` that uses `@rive-app/react-webgl2`, which means two APIs to keep in step. It also can't blur RN views over itself, and it has no documented headless render.
- **Lottie is the weakest fit for "hand-drawn".** Line boil and texture need frame-by-frame vectors or image layers (big files). After Effects texture effects (Roughen Edges, Turbulent Displace) don't export, and layer effects are mostly unsupported on mobile. `lottie-react-native` uses different renderers on iOS, Android and web. `@lottiefiles/dotlottie-react-native` uses one renderer everywhere and has themes (seasons) and state machines, so if Lottie is used, use that one.
- **Sprite sheets are the most faithful to real hand animation, but they cost memory.** Use them for small elements (drops, a flower opening, leaves), not full-screen surfaces. Draw them through Skia's Atlas.
- **Video loops are cheap to make (AI or human) but the hardest to drive by state.** Use them only for opaque, full-bleed layers, if at all. Transparent video isn't reliable across iOS, Android and web.
- **Text never goes into the art.** It's native text over the canvas, on a halo whose inner colour is a per-scene, per-season design token. The 4.5:1 check is then token arithmetic, plus a CI render that checks the halo still reads over the art underneath.
- **Mid-range Android frame rate isn't published for any candidate.** It has to be measured on a device (see §8).
- **The swap path from AI stand-ins to human art:** fix the renderer (Skia), the asset format (layered PNG/WebP textures + sprite atlases + one JSON manifest per scene/season), the layer names, and a spec sheet. Then the human set mostly replaces files. Code may still change (new layers, sprite boil in place of shader boil, tuning), but the swap stays small.

## 1. Candidates at a glance

| | Same on dev build and web? | App size added | Driven by state? | Reduce Motion / Still water |
|:--|:--|:--|:--|:--|
| **React Native Skia** (2.14.0, SDK 58 bundled) | Yes, one API. Native uses Skia's GPU backends, web uses CanvasKit/WebGL. Same SkSL shaders. | iOS ~6 MB, Android ~4 MB download; web 2.9 MB gzipped wasm, loaded async | Fully: everything is uniforms/props from JS or Reanimated shared values | Stop the clock (freeze the frame); app code |
| **Rive** (`@rive-app/react-native` 0.5.10, 2026-11-02; web `@rive-app/react-webgl2` 4.38.0) | Same `.riv` file, but **two runtimes**: Nitro native module on iOS/Android, wasm on web | iOS ~1.67 MB download / 4.66 MB install; Android arm64 2.40 MB / 7.03 MB; web webgl2 wasm 648 KB brotli | Fully: state machines + data binding (View Models), image binding | Documented pattern: pass a `prefersReducedMotion` bound property; the file chooses a still path or speed 0 |
| **Lottie** (`lottie-react-native` 7.5.0, SDK 58 bundled; or `@lottiefiles/dotlottie-react-native` 0.12.1) | `lottie-react-native`: three different renderers (Airbnb Android, Airbnb iOS, dotLottie web). dotLottie RN: one renderer (ThorVG) on all three | Small native libs; web dotLottie wasm 1.2 MB raw / ~0.49 MB gzipped | Partly: segments, markers, speed, color keypaths. dotLottie adds themes and state machines | `pause()` / show a still frame; app code |
| **Sprite sheets** (via Skia Atlas, or a View with offset) | Yes if drawn through Skia | Only the images; memory is the cost | Choose sheet / frame range per state | Show frame 0 |
| **Video loops** (`expo-video` 58.0.13) | Mostly; codecs and transparency differ by platform | Only the video files | Poorly: switch clips or crossfade | Pause, or swap for a still poster |

Sources for the table are in the sections below.

## 2. React Native Skia

**Versions.** Expo SDK 58 bundles `@shopify/react-native-skia` **2.14.0** (2026-10-01) [Expo bundledNativeModules.json, sdk-58](https://github.com/expo/expo/blob/sdk-58/packages/expo/bundledNativeModules.json). A **v3** line ships separately on npm as `react-native-skia` (3.9.1, 2026-11-03). It renders with Skia Graphite, needs Android API 26 with Vulkan 1.1, and declares Vulkan as a required Play feature. "On the Web, Skia renders with WebGL: Graphite and the WebGPU interop are only available on native platforms." [Installation (v3)](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/getting-started/installation.md), [Web](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/getting-started/web.mdx). **Stay on the SDK-bundled v2** until Expo bundles v3. v2 also renders on Android devices without Vulkan.

**Same on dev build and web.** Web runs through CanvasKit, "a WebAssembly (WASM) build of Skia", which "is 2.9MB when gzipped, is loaded asynchronously". You wrap Skia screens in `<WithSkiaWeb>` or call `LoadSkiaWeb()` before the root renders. Expo has a `setup-skia-web` script that copies `canvaskit.wasm` to `public/`. [Web](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/getting-started/web.mdx) The API and shader language (SkSL `RuntimeEffect`) are the same on every platform. Expect small pixel differences between GPU backends (anti-aliasing, blur), not different features. Measured: `canvaskit.wasm` in `canvaskit-wasm@0.42.0` is 7.3 MB raw and 2.93 MB at gzip -9, which matches the docs.

**App size.** "iOS 6 MB, Android 4 MB, Web 2.9 MB", measured on a bare app (Android via App Bundle for arm64) [v2 installation](https://wcandillon.github.io/react-native-skia/v2/docs/getting-started/installation/), [Bundle size](https://shopify.github.io/react-native-skia/docs/getting-started/bundle-size).

**How hand-drawn looks are made in Skia.**
- **Textures:** the illustrator's painted layers become `Image`s or image shaders. They're tiled or stretched, and tinted per season with colour filters or a shader uniform.
- **Line boil:** a `RuntimeEffect` that shifts the texture's sample position by a small noise field, with the noise seed **stepped** at 8–12 steps a second (the classic "on twos/threes" boil). Skia ships Perlin noise shaders ([shaders docs](https://github.com/Shopify/react-native-skia/tree/main/apps/docs/docs/shaders)). An alternative is a 3-frame boil sprite (see §5), which is cheaper on the GPU and closer to real hand animation.
- **Water and ripples:** displacement shaders over the water texture; drops as Atlas sprites or a ring shader.
- **Brook along a Path:** a Skia `Path` that comes from the screen's layout, stroked with an image shader or with a path effect, so the brook follows the real Path geometry. This is the one surface that has to be generated from layout, and only Skia (or Rive with data-bound path points) does that well.
- **Frosted glass:** `BackdropFilter` with a blur over the canvas behind the card. That blurs the moving scene itself, which a native blur view over a GL surface may not do. `expo-blur` on Android needs a `BlurTargetView` wrapper and API 31+ for an efficient blur, and its docs say nothing about blurring GL/Texture views [expo-blur SDK 58](https://docs.expo.dev/versions/latest/sdk/blur-view/). That's unverified either way, so drawing the glass in Skia is the safer default.
- **Lottie inside Skia:** Skottie, "a Lottie animation renderer built on Skia", is available as a `<Skottie>` component with frame control from Reanimated [Skottie](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/skottie.md). This lets a vendor's Lottie files run inside the same canvas without a second renderer.

**Driven by state.** Everything is a prop or uniform, so it's all state: `stillness` (0 on Help), `season` (a mix value 0..1 between the spring and autumn texture sets and palettes), the brook `Path`, drop frequency.

**Reduce Motion / Still water.** App code: when `AccessibilityInfo.isReduceMotionEnabled()` (RN; on web RN-web reads `(prefers-reduced-motion: reduce)`, [source](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web/src/exports/AccessibilityInfo/index.js)), Reanimated's `useReducedMotion`, or the app's Still water toggle is on, stop the clock and set boil amplitude to 0. The scene stays and shows one hand-drawn frame.

**Headless.** "React Native Skia can run on Node", via CanvasKit and `makeOffscreenSurface` / `drawOffscreen`, which returns an image you can encode [Headless](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/getting-started/headless.md). So CI can render each scene in each season without a browser.

**Costs.** Shader work is per pixel on full-screen surfaces. A full-screen boil + water shader on a mid-range Android GPU is the main performance risk. Keep shaders cheap, render the sky at reduced resolution, and step boil time so frames can be reused. Not measured.

## 3. Rive

**Versions.** `@rive-app/react-native` **0.5.10** (2026-11-02) is "the recommended Rive runtime for React Native" and "replaces the legacy `rive-react-native` package" (still published, 9.8.6, 2026-10-15) [Rive RN docs](https://rive.app/docs/runtimes/react-native/react-native). It's built on Nitro Modules and needs RN 0.78+ and Expo SDK 53+. Its README warns that RN 0.87+ needs `react-native-nitro-modules` ≥0.36.2, so check the pin against RN 0.88.1. It bundles Rive iOS 6.29.0 and Android 11.14.3 (`package.json` `runtimeVersions`).

**Same on dev build and web: no, not from one package.** The package's source has no web implementation (checked in the 0.5.10 tarball: no `.web` files and no import of `@rive-app/canvas`, only an optional peer dependency). Web needs `@rive-app/react-webgl2` (4.38.0). That is "recommended for most React projects. Uses the Rive Renderer, so it supports every Rive Editor feature, including vector feathering", whereas the Canvas packages use the browser's Canvas2D [Feature support](https://rive.app/docs/feature-support.md). Same `.riv` file, same renderer family, different JS API. We'd write a `RiveSurface.tsx` / `RiveSurface.web.tsx` pair.

**App size.** iOS universal ~1.67 MB download / ~4.66 MB install; Android ARM-v8a 2.40 MB download / 7.03 MB install. Web wasm: webgl2 2179 KB raw / 648 KB brotli ("Last updated: January 2026") [Runtime sizes](https://rive.app/docs/runtimes/runtime-sizes.md). Measured: `@rive-app/webgl2@2.49.1` `rive.wasm` is 2.4 MB raw, 0.99 MB at gzip -9. Plus the `.riv` files: "Image, audio, and font assets are often the biggest source of bloat"; use WebP [Best practices](https://rive.app/docs/getting-started/best-practices.md).

**Hand-drawn in Rive.** Raster images deformed with meshes and bones ("natural, organic deformations to raster graphics" [Meshes](https://rive.app/docs/editor/manipulating-shapes/meshes.md)), image swaps for frame-by-frame, vector feathering for soft edges. Rive now has Luau scripting and **WGSL shaders** that render to a GPU canvas [WGSL shaders](https://rive.app/docs/scripting/wgsl-shaders.md). On React Native, GPU Canvas needs 0.5.3+ and is off by default (`RiveRuntime.setGPUCanvasEnabled(true)`), and Layer Masks need GPU Canvas and aren't supported in iOS simulators [Feature support](https://rive.app/docs/feature-support.md). Warning from Rive: "Be especially careful when importing vectors that were generated with AI, converted from raster images, or were created in drawing apps" (vertex count), and blend modes are "particularly expensive on the web" [Best practices](https://rive.app/docs/getting-started/best-practices.md).

**Driven by state.** Best of the five: state machines plus data binding with View Models (`useViewModelInstance`, number/boolean/enum/color/trigger hooks in the RN package), image data binding and referenced (out-of-band) assets [Loading assets](https://rive.app/docs/runtimes/web/loading-assets.md). Seasons can be an enum. Water stilling is a number. A brook along a layout-driven Path is harder: Rive's paths are authored, so the brook would have to be bound point by point or built with a script.

**Reduce Motion.** Documented: "pass the user's motion preference into your Rive file with a data binding property, such as `prefersReducedMotion`", then use a separate still state-machine path or bind speeds to 0 with converters. "In the future, runtimes may expose a built-in reduced motion value" [Reduced Motion](https://rive.app/docs/editor/accessibility/reduced-motion.md).

**Text and blur.** Text can be Rive text (inside the file) or RN text over the view. We keep it in RN (see §7). Blur over a Rive view is the same open question as for any GL view.

**Headless / CI.** No Node renderer is documented. CI would render the web build in headless Chrome (WebGL via SwiftShader) and screenshot it.

**Cost.** Editor: Free exports "play a Rive splash screen. Upgrade to remove it"; Cadet $9/seat/month (≤3 seats), Voyager $32 [Pricing](https://rive.app/pricing). The animator needs a paid seat. The in-editor AI Agent needs a paid plan and is billed in AI credits [AI Agent](https://rive.app/docs/editor/ai-agent/ai-agent.md).

## 4. Lottie

**Versions.** Expo SDK 58 bundles `lottie-react-native` **~7.5.0** (2026-08-22). Its README's web setup adds `@lottiefiles/dotlottie-react` [README](https://github.com/lottie-react-native/lottie-react-native). So iOS uses lottie-ios, Android uses lottie-android, and web uses the dotLottie (ThorVG) player: **three renderers**, with different feature tables.

`@lottiefiles/dotlottie-react-native` **0.12.1** (2026-08-04) wraps dotlottie-ios, dotlottie-android and dotlottie-web, one ThorVG-based player family. It has an Expo config plugin (dev build only) and supports `themeId`/`setTheme`, `stateMachineId`, and `stateMachineSetNumericInput`/`SetBooleanInput`/`SetStringInput` [README](https://github.com/LottieFiles/dotlottie-react-native). Measured: `@lottiefiles/dotlottie-web@0.82.1` `dotlottie-player.wasm` is 1.23 MB raw, 0.49 MB at gzip -9.

**Hand-drawn in Lottie: poor.**
- Layer effects (Fill, Stroke, Tint, Tritone, Levels) are ⛔ on Android and iOS. Gaussian blur works only on Android 4.1+. Expressions are ⛔ on mobile [Supported features](https://github.com/airbnb/lottie/blob/master/supported-features.md). AE's texture effects don't exist in Lottie at all.
- So hand-drawn motion means frame-by-frame vector drawings (large JSON) or image layers (raster sequences, which are sprite sheets with extra overhead).
- On Android, "Masks and mattes on android have the largest performance hit", and hardware acceleration is off by default [Lottie Android](https://github.com/airbnb/lottie/blob/master/android.md).

**Driven by state.** Segments, markers, speed and dynamic colour keypaths with `lottie-react-native`. Themes (seasons) and state machines with dotLottie. A layout-driven brook isn't practical.

**Reduce Motion.** App code: pause and show a chosen still frame.

**Where it fits.** Small accent loops a vendor already delivers as Lottie, played through Skia's Skottie so they share the scene's canvas. Not the surfaces.

## 5. Frame-by-frame sprite sheets

**What it is.** The animator draws each frame (often on twos, 12 fps). Frames are packed into an atlas PNG/WebP and a JSON frame map (TexturePacker or Aseprite format).

**Renders the same?** Yes when drawn through Skia's `Atlas` (one draw call for many sprites) on all three platforms. Plain RN (a clipped `View` with a translated `Image`) also works but each instance is a separate view.

**Cost is memory, not CPU.** A decoded frame costs width × height × 4 bytes on the GPU. A full-screen 1080 × 2400 frame is ~10 MB, so a 12-frame full-screen loop is ~120 MB. Small elements are cheap: a 256 × 256 drop is 0.26 MB per frame. (Arithmetic, not a measurement.)

**State.** Pick a sheet or frame range per state (spring vs autumn sheets, "opening" vs "open"). No interpolation between states.

**Reduce Motion.** Show one frame.

**Fit.** The most authentic hand animation, and the easiest format for both an illustrator and an AI pipeline to deliver. Use it for drops, leaves, flowers opening, the boil frames of small elements, and maybe the rowboat. Use textures + shaders for the big surfaces.

## 6. Video loops

**What it is.** `expo-video` 58.0.13 with `loop`, or Skia's video support drawing frames into the canvas (v2 docs: video needs Android API 26+ [v2 installation](https://wcandillon.github.io/react-native-skia/v2/docs/getting-started/installation/)).

**Renders the same?** Opaque H.264/HEVC MP4 plays everywhere. **Transparency is not portable**: HEVC-with-alpha is Apple-only, WebM VP8/VP9 alpha works in Chrome and Firefox and not Safari, and Android's player path for alpha is unverified. So video only works for opaque full-bleed layers (the sky, maybe the water).

**State.** Poor: switching season or stilling the water means switching clips or crossfading. A layout-driven brook is impossible.

**Size.** Seconds of 1080p at a few Mbps each. A sky and water loop per season adds several MB per scene. Not measured.

**Reduce Motion.** Pause on a poster frame.

**Fit.** Mainly useful for AI stand-ins (Veo can make a seamless loop, see §9), as a fallback for the sky. Not the long-term format.

## 7. Text over the art and the CI contrast check

[How does the app work for screen readers, large text and contrast?](https://github.com/shrujancheruku/look-together/issues/56) settled that "A firm halo passes if the text is ≥4.5:1 against the halo's inner colour" (≥3:1 for large text), checked per scene in both seasons, with a solid backing under Increase Contrast / Reduce Transparency / `prefers-contrast: more`.

That works with every candidate, as long as:
1. **Text is never baked into the art.** It's RN `Text` laid over the canvas, so it can be measured, scaled for large text and read by screen readers.
2. **The halo's inner colour is a design token per scene × season**, not sampled from the art. Then the 4.5:1 check is pure token maths (text colour vs halo inner colour) and can run as a unit test.
3. **A render test checks the halo still holds over the art.** If the halo or glass card is translucent, its effective inner colour depends on what's beneath. CI renders each scene in each season at a fixed frame (clock frozen, boil seed fixed), composites the halo, samples the pixels under each text box, and checks the worst-case pixel against the text colour.
   - Skia: render in Node with CanvasKit `drawOffscreen` [Headless](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/getting-started/headless.md), no browser.
   - Rive, Lottie, video: render the web build in headless Chrome with Playwright, pause at a fixed time, screenshot. This tests the web renderer only, not iOS/Android pixels.
   - Text boxes come from the layout (on web, `getBoundingClientRect`; in Node, a fixed layout per scene).

Frozen frames make the test deterministic, which is easiest when time is a uniform we control (Skia) or a scrub value (Rive `advance`, Lottie `frame`).

## 8. Frame rate on a mid-range Android

Neither Shopify, Rive nor LottieFiles publishes a frame-rate figure for a mid-range Android device, and we found no primary benchmark. **Unverified for all five.** What the docs do say:
- Skia: shader cost is per pixel, so full-screen effects scale with resolution. Reanimated drives uniforms on the UI thread.
- Rive: "poorly optimized animations can consume significant resources and cause poor performance, particularly on low-end devices" [Best practices](https://rive.app/docs/getting-started/best-practices.md).
- Lottie: masks and mattes are the biggest cost on Android [Lottie Android](https://github.com/airbnb/lottie/blob/master/android.md).

**What to measure** (a later prototype): one full scene (sky + water + boil + 3 drops + glass card) at 60 fps on a mid-range Android (e.g. a Pixel 7a or Galaxy A5x), in a release build, with Android GPU profiling. Compare Skia shaders vs Skia sprite boil, and Rive for the rowboat. Hand-drawn boil only needs 8–12 distinct images a second, so a steady 30 fps is visually enough for the art. Scrolling and gestures still need 60.

## 9. AI-generated stand-ins for the closed beta

### Tools by output

| Need | Tools (examples) | Output | How close to hand-drawn |
|:--|:--|:--|:--|
| Painted stills: sky, water, trees, lily pads, flowers, rowboat, paper/grain textures | Gemini image models / Imagen on Vertex AI (in our `look-together` project), Midjourney, OpenAI image models, Adobe Firefly | PNG/WebP raster | Good for watercolour/gouache stills. Weak at consistency across a set and at clean separate layers |
| Seamless motion loops (water, sky) | Veo 3.1 on Vertex AI: first-and-last-frame generation (`veo-3.1-generate-001`, `veo-3.1-fast-generate-001`), 4/6/8 s, 720p/1080p, 16:9 or 9:16 [Vertex docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-first-and-last-frames) | MP4 | Smooth "camera" motion, not frame-by-frame boil. Fine as a video stand-in, or extract 8–12 frames for a sprite sheet |
| Line boil frames | Any image model's edit/variation mode on one still, 2–3 times at low strength | 2–3 near-identical PNGs → atlas | Close to real boil if the variations are small. Easier: a procedural boil shader, which works the same on AI and human stills |
| Lottie | LottieFiles Lottie Creator: Motion Copilot 2.0 (2026-07-22), Prompt to Vector, AI theming, Prompt to State Machines (vendor claims, untested) [blog](https://lottiefiles.com/blog/working-with-lottie-animations/introducing-motion-copilot-on-lottie-creator) | `.lottie` / JSON | Keyframed vector motion, a flat look. Not hand-drawn |
| Rive | Rive's in-editor AI Agent (paid plans) and Rive MCP (desktop editor): creates shapes, bones, state machines, view models, scripts, WGSL shaders [AI Agent](https://rive.app/docs/editor/ai-agent/ai-agent.md), [MCP](https://rive.app/docs/editor/ai/mcp.md) | `.riv` | Builds rigs and logic around imported raster art. It doesn't paint |
| Vector from raster | Vectorizers (Recraft, Illustrator Image Trace, potrace) | SVG | Traced paint has thousands of vertices, which Rive warns against. Avoid |

**Practical stand-in pipeline:** generate layered stills per scene and season (sky, far bank, water, trees, pads, flowers, boat as separate transparent PNGs, cleaned up by hand in an editor), plus small sprite sheets for drops and leaves. Let the shared shader layer supply boil, ripples and water motion. Video only if a scene needs it quickly.

### State-driven or baked?

- **Stills + shaders + sprites:** state-driven in exactly the same way as the human set. Season is a texture set and palette; stilling is a uniform; the brook is a layout path stroked with a generated texture. This is why the stand-ins should be stills, not videos.
- **Video loops (Veo etc.):** baked. One clip per state, with crossfades.
- **AI Lottie / Rive:** state-driven only to the extent the tool's state machine output is (vendor claims, unverified).

### Licensing for a beta via TestFlight, Play testing and web

- **Vertex AI (Gemini image, Imagen, Veo):** "Generated Output is Customer Data. As between Customer and Google, Google does not assert any ownership rights in any new intellectual property created in the Generated Output." Google's IP indemnity covers *unmodified* output from paid services on its [indemnified list](https://cloud.google.com/terms/generative-ai-indemnified-services) (we didn't confirm which image/video models are on it). It excludes output the customer "knew or should have known was likely infringing". Section 20(d) bars using a Generative AI Service "as part of a website, Customer Application, or other online service that is directed towards or is likely to be accessed by individuals under the age of 18". That clause is about the app *calling* the service. Pre-generated assets used offline are arguably outside it, but this is unverified [Service Specific Terms](https://cloud.google.com/terms/service-terms). This route keeps everything in the existing `look-together` project.
- **Midjourney:** the user owns assets "to the fullest extent possible under applicable law". Companies with more than $1M/year gross revenue need Pro or Mega [Terms](https://docs.midjourney.com/docs/terms-of-service). We read this through mirrored copies, because the official page returned 403 to our fetch.
- **OpenAI:** its terms assign output to the user (not re-fetched: the page returned 403).
- **Copyright:** the US Copyright Office's January 2025 report (Part 2, Copyrightability) says purely AI-generated material without sufficient human authorship isn't protected. So stand-ins can be copied by others, which doesn't matter for a beta and is one more reason to replace them.
- **Disclosure:** we found no App Store, TestFlight or Google Play rule requiring disclosure of AI-made *static art assets*. Play's AI-generated content policy is about apps that generate content for users. EU AI Act Art. 50 transparency duties (from 2026-08-02) cover deepfakes and AI-generated text published to inform the public. Stylised painted landscapes aren't deepfakes. See [What do Google Play, the App Store and the EU AI Act require of AI-generated replies?](https://github.com/shrujancheruku/look-together/issues/42). Unverified for art specifically. A one-line credit ("Beta artwork is AI-generated placeholder art") costs nothing and fits the app's honesty about where things come from.
- Not legal advice.

## 10. The swap path: what to fix now

Fix these before any art is made. Code may still change when the human set arrives, but these keep the swap small:

1. **Renderer:** Skia for surfaces. If Rive is used for the rowboat, it's one isolated component with a stable View Model contract.
2. **Asset format:** per scene × season, one folder of transparent **WebP** layers at fixed pixel sizes (@1x/@2x/@3x or one 3x master), sprite atlases in one format (TexturePacker JSON-hash or Aseprite JSON), and a `scene.json` manifest. The manifest lists layer order, parallax depth, blend, which shader each layer gets (boil amplitude, water displacement), and the palette tokens, including **halo inner colours**.
3. **Names:** fixed layer and asset names (`sky`, `far-bank`, `water`, `reeds`, `lily-pad-*`, `flower-*`, `drop`, `leaf-*`, `boat`), and fixed state names (`season: spring-morning | autumn-evening`, `stillness: 0..1`, `reducedMotion: bool`). Code depends on names, never on pixels.
4. **Boil and water motion live in code (shaders),** not in the art, so AI stills and human stills move the same way. If the illustrator wants hand-drawn boil, they deliver 3 boil frames per layer and the manifest switches that layer from shader boil to sprite boil.
5. **The brook** is a texture strip (tileable along its length) plus a width profile, stroked along the layout's Path. Specify the tile length and edge treatment.
6. **Spec sheet for the illustrator:** canvas sizes and safe areas for phone and web, layer list, tileable edges, palette per season, halo-zone rules (where text sits, and that its halo inner colour must hit 4.5:1 with the text colour), frame rate (12 fps, on twos), max frames per sprite, file format, naming, and a Reduce Motion still frame per animated element.
7. **The CI check** runs on whatever assets are in the folder, so swapping assets re-runs contrast for free.

## 11. Commissioning the human set

**Workflow (usual):** style frames (2–3 options, one scene) → approved style → layered stills for each scene and season → motion tests (boil, water, boat) → full animation → delivery and fixes. The illustrator paints in Procreate, Photoshop, Krita or Rebelle. Frame-by-frame animators use TVPaint, Toon Boom Harmony or Procreate Dreams. Rive-native animators work in the Rive editor. Lottie animators work in After Effects + Bodymovin or Lottie Creator.

**What they deliver:** layered PSD/TIFF or per-layer PNG; PNG sequences for frame-by-frame (packed into atlases on our side, or by them with TexturePacker); `.riv` from a Rive animator; `.json`/`.lottie` from a Lottie animator; MP4/ProRes for video. Ask for **layered sources plus PNG/WebP exports to our spec**, plus `.riv` for the rowboat if Rive is used.

**Rough cost (unverified estimate, no primary source found):** for ~4–6 scene layouts × 2 seasons of layered painted backgrounds, a dozen small sprite animations and one rigged boat, freelance rates put it around **US$8k–25k**. Style development ~$1–3k, backgrounds ~$300–1,000 each, frame-by-frame animation ~$50–150 per drawn frame or day rates of ~$300–700. Studios cost 2–3× more. Get 2–3 quotes against the spec sheet. Delivery: 6–12 weeks.

## Recommendation

1. **Skia as the single surface renderer** on all three platforms (SDK-bundled `@shopify/react-native-skia` 2.14.0), with painted raster layers, an SkSL boil/water shader layer driven by `season`, `stillness` and `reducedMotion`, Atlas sprites for small frame-by-frame elements, and `BackdropFilter` for the frosted glass.
2. **Rive only if the rowboat (or another character) needs rigging**, behind one component with `.web.tsx` using `@rive-app/react-webgl2`. Otherwise do the boat as sprites too, and avoid a second runtime.
3. **Not Lottie or video for surfaces.** Lottie only for accents a vendor already has, via Skottie. Video only as a quick beta stand-in for an opaque sky.
4. **Beta stand-ins:** layered stills from Vertex AI image models (or Midjourney Pro), cleaned up into the same layer spec, animated by the same shaders. Small sprite sheets made from image-model variations. Credit them as placeholder art.
5. **Fix the asset spec, names, manifest and CI contrast render first**, then prototype one scene on a mid-range Android to get real frame rates.

## Open or unclear

- **Frame rate on a mid-range Android** for a full Skia scene with shaders. No published numbers. Needs a device test.
- **Does a native blur (expo-blur on Android, iOS `UIVisualEffectView`) blur a Skia or Rive GL surface beneath it?** Not documented. Drawing the glass in Skia avoids the question.
- **When does Expo bundle Skia v3,** and does Vulkan-required v3 cut off devices we care about?
- **Rive RN 0.5.x on RN 0.88.1:** the Nitro version pin (`>=0.35.10 <0.37`) vs the README's RN 0.87+ note. Not tested.
- **Which Vertex image/video models are on Google's indemnified list,** and whether §20(d) (under-18 services) touches pre-generated assets.
- **Commissioning cost** is an estimate. Get quotes.
