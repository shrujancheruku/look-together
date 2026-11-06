# What art-pixel size should each sprite be for our target screens, before we pay to generate them?

Research for [What art-pixel size should each sprite be for our target screens, before we pay to generate them?](https://github.com/shrujancheruku/look-together/issues/85). Sources read on 2026-11-04. Anything marked **unverified** was not confirmed in a primary source and must not be read as fact. Nothing was generated and nothing was spent.

Fixed inputs, from earlier tickets:

- **Density:** 320 art px across a phone, on every device class ([#70](https://github.com/shrujancheruku/look-together/issues/70)).
- **Scaling:** phones use k = round(device width ÷ 320) device px per art px. Tablets and web use k = ceil(dpr × 1.25), bumped so a view is never wider than the world ([#71](https://github.com/shrujancheruku/look-together/issues/71)). The world is now about 3354 × 1180 art px ([#83](https://github.com/shrujancheruku/look-together/issues/83)).
- **Sprite list:** the lily kit (6 pads, open and closed flower, "Add it?" bud, unfurl and opening frames), the New Inquiry pad (flowering and dry), the rowboat, stones and the skimming stone, the drop and its splash, the koi and the dragonfly ([#75](https://github.com/shrujancheruku/look-together/issues/75), [#74](https://github.com/shrujancheruku/look-together/issues/74), [#73](https://github.com/shrujancheruku/look-together/issues/73)).
- **Tools:** Retro Diffusion RD Pro, img2img from a code-drawn blockout at the exact size, with the ramps plus the water key colour forced. RD animation comes from one finished frame. PixelLab is the fallback ([#79](https://github.com/shrujancheruku/look-together/issues/79)).

## Short answer

- **Generate every sprite at its exact art-pixel size. Never generate large and downscale.** Both tools draw at the size asked. RD prices a still the same at any size, and PixelLab's price barely moves with size, so a bigger canvas saves nothing. Downscaling is what wrecked the koi and the dragonfly in the Gemini arm of #79.
- **Minimum readable size: 16 × 12 art px for anything that must be recognised by its shape, and at least 20 px on the long side for a creature.** Elongated forms need more length: the koi only reads at 32 × 16. Motion-carried effects (drop, skimming stone) can be smaller, but they are hand-drawn, not generated. On a current iPhone one art px is 0.22 mm, so 16 px is about 3.5 mm.
- **Touch is a code-drawn hit area, not sprite size.** Pad every touchable sprite's hit area to **at least 48 × 48 art px**. That covers 44 pt on an iPhone SE (44 art px) and 48 dp on a 2× Android phone such as the Galaxy A06 (48 art px).
- **Islets are code-drawn landscape, not sprites.** #75 has code draw "the whole landscape … banks", and the #83 prototype draws every islet in code into the land layer (`mound()`, `dress()`, about 169 art px wide). They need no size from this ticket and cost nothing to generate.
- **Cost of the whole kit:** about **$11 on RD** (RD Pro stills at $0.18, animations at $0.25), with 4 candidates per still and 2 tries per animation. Allow about $22 with retries. On PixelLab's pay-per-call API the same plan costs **under $1**, or it fits in one $12 month on the subscription.

## 1. Target screens

One art px is k device px. Its physical size is k × 25.4 ÷ ppi mm, and in CSS px (pt on iOS, dp on Android) it is k ÷ dpr. The "44 pt" column is the number of art px that make Apple's 44 pt default control size.

### Phones: k = round(width ÷ 320)

| Device | Width px | ppi | dpr | k | Art px across | 1 art px (mm) | 1 art px (pt/dp) | 44 pt in art px |
|---|---|---|---|---|---|---|---|---|
| iPhone SE (3rd gen) | 750 | 326 | 2 | 2 | 375 | 0.156 | 1.00 | 44 |
| iPhone 16 | 1179 | 460 | 3 | 4 | 295 | 0.221 | 1.33 | 33 |
| iPhone 17e | 1170 | 460 | 3 | 4 | 292 | 0.221 | 1.33 | 33 |
| iPhone 17 / 18 Pro | 1206 | 460 | 3 | 4 | 302 | 0.221 | 1.33 | 33 |
| iPhone Air | 1260 | 460 | 3 | 4 | 315 | 0.221 | 1.33 | 33 |
| iPhone 18 Pro Max | 1320 | 460 | 3 | 4 | 330 | 0.221 | 1.33 | 33 |
| iPhone Duo, outer | 1398 | 460 | **unverified** | 4 | 350 | 0.221 | **unverified** | — |
| iPhone Duo, inner | 1878 | 430 | **unverified** | 6 | 313 | 0.354 | **unverified** | — |
| Pixel 8 Pro (Full res) | 1344 | 489 | **unverified** | 4 | 336 | 0.208 | **unverified** | — |
| Pixel 8 Pro (High res) | 1008 | 367 (scaled) | **unverified** | 3 | 336 | 0.208 | **unverified** | — |
| Galaxy A06 | 720 | 262 (derived) | 2 (**unverified**) | 2 | 360 | 0.194 | 1.00 if dpr 2 | 48 dp → 48 |

Sources: iPhone resolutions and ppi from [Apple's compare page](https://www.apple.com/iphone/compare/), which lists the iPhone 18 Pro, 17, 17e, 16, Air, Duo and SE (3rd generation). The Pixel 8 Pro's "1344 x 2992 … at 489 PPI" is from [Google's Pixel tech specs](https://support.google.com/pixelphone/answer/7158570?hl=en). The Galaxy A06's "720 x 1600 (HD+)" and 6.7" are from [Samsung](https://www.samsung.com/levant/smartphones/galaxy-a/galaxy-a06-light-blue-128gb-sm-a065flbhmea/). Its ppi is derived (√(720² + 1600²) ÷ 6.7 = 262), because Samsung doesn't list one.

Notes:

- **iOS scale 3** for the 460 ppi iPhones and **2** for the SE follow from width ÷ pt width. Apple's HIG device table (in the [layout](https://developer.apple.com/design/human-interface-guidelines/layout) page) could not be read as text, so scale factors are inferred from the resolutions, not quoted.
- **The Pixel 8 Pro shows 336 art px across at either resolution setting,** and one art px stays 0.208 mm. The default setting and its dp width are **unverified**: only third-party guides say High resolution is the default.
- **Galaxy A06 dpr:** StatCounter's second most common mobile size is 360 × 800 CSS px ([StatCounter mobile, Oct 2026](https://gs.statcounter.com/screen-resolution-stats/mobile/worldwide)), which is 720 × 1600 at dpr 2. The A06's own density is **unverified**. If it were 1.75, 48 dp would be 42 art px.
- **The iPhone Duo's inner screen** gets k = 6 under the phone rule, making one art px 0.35 mm, the largest of any device. Whether the inner screen counts as a phone or a tablet in #71's rule is an open question (see the end).
- The phone range is 292–375 art px, which matches #71's "about 293–375".

### Tablets: k = ceil(dpr × 1.25)

| Device | Px (landscape) | ppi | dpr | k | View (art px) | 1 art px (mm) | 1 art px (pt) | 44 pt in art px |
|---|---|---|---|---|---|---|---|---|
| iPad (A16), iPad Air 11" | 2360 × 1640 | 264 | 2 | 3 | 787 × 547 | 0.289 | 1.5 | 29 |
| iPad Pro 13" (M5) | 2752 × 2064 | 264 | 2 | 3 | 917 × 688 | 0.289 | 1.5 | 29 |
| iPad mini (A20 Pro) | 2316 × 1512 | 326 | 2 | 3 | 772 × 504 | 0.234 | 1.5 | 29 |

Sources: resolutions and ppi from [Apple's iPad compare page](https://www.apple.com/ipad/compare/). The dpr of 2 is inferred: 820 × 1180 CSS px, which is 1640 × 2360 at dpr 2, is the fourth most common tablet size on [StatCounter tablet, Oct 2026](https://gs.statcounter.com/screen-resolution-stats/tablet/worldwide). No tablet view comes near the 3354 × 1180 world, so the "bump" never triggers.

### Web: k = ceil(dpr × 1.25)

| Viewport (CSS px) | Share (StatCounter desktop, Oct 2026) | dpr | k | 1 art px (CSS px) | View (art px) |
|---|---|---|---|---|---|
| 1920 × 1080 | 27.8% | 1 | 2 | 2.0 | 960 × 540 |
| 1536 × 864 | 9.1% | 1.25 (**unverified**, typical 1920-px laptop) | 2 | 1.6 | 960 × 540 |
| 1366 × 768 | 7.5% | 1 | 2 | 2.0 | 683 × 384 |
| 1280 × 720 | 4.4% | 1 | 2 | 2.0 | 640 × 360 |
| 2560 × 1440 | 3.8% | 1 | 2 | 2.0 | 1280 × 720 |
| 1440 × 900 (a Mac at dpr 2) | not in top 6 | 2 | 3 | 1.5 | 960 × 600 |

Source: [StatCounter desktop, Oct 2026](https://gs.statcounter.com/screen-resolution-stats/desktop/worldwide). StatCounter gives CSS sizes, not dpr, so the dpr column is assumed except where it's 1. Physical size depends on the monitor. On a 24" 1920 × 1080 monitor (92 ppi), one art px is 0.55 mm. At an assumed 60 cm that is 3.2 arcmin, against 2.5 arcmin for an iPhone at an assumed 30 cm, so an art px looks about the same size, as #71 intended. Viewing distances are assumptions, not sourced.

## 2. Readability

**Touch targets** (primary):

- Apple HIG: iOS and iPadOS "Default control size 44x44 pt, Minimum control size 28x28 pt" ([Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- Android: "each interactive UI element have a focusable area, or touch target size, of at least 48dp x 48dp". Its example gives a small element a larger touch target with `sizeIn(minWidth = 48.dp, minHeight = 48.dp)` around it, so **the target may be larger than what's drawn** ([Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps)).
- WCAG 2.2 SC 2.5.8: targets are "at least 24 by 24 CSS pixels", or spaced to match ([Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). On web at 2 CSS px per art px that is 12 art px, so phones set the bound.

The worst cases are 44 art px (iPhone SE, 44 pt at 1 pt per art px) and 48 art px (a 2× Android phone, 48 dp). **Recommended: every touchable sprite gets a code-drawn hit rect of at least 48 × 48 art px, centred on its anchor.** That is 15% of a phone's width. Neighbouring touchable things then need about 48 art px between centres, or a shared hit area. This matters most for Recap flowers on home, and it is a layout constraint for [#78](https://github.com/shrujancheruku/look-together/issues/78). For visual size, Apple's 28 pt minimum control size is 21 art px on current iPhones and 28 on the SE. Touchable sprites below that rely on their padded hit rect.

**Recognition.** No primary source was found that gives a minimum readable size for pixel-art sprites, and no first-party figures were found for games at a similar density. The evidence here is this project's own:

- The koi did not read at 18 × 8 or 24 × 12 on any tool, and does at 32 × 16 ([#79](https://github.com/shrujancheruku/look-together/issues/79)).
- The dragonfly reads at 20 × 14 ([#79](https://github.com/shrujancheruku/look-together/issues/79)).
- The `prototype/shoreline-guide` dragonfly (6 × 5) and skimming stone (2 × 2) were too small to notice ([#85](https://github.com/shrujancheruku/look-together/issues/85)).
- The lily kit's pads read at 17–27 px wide in the Lily Generator ([#74](https://github.com/shrujancheruku/look-together/issues/74)).

From that: **16 × 12 art px is the floor for anything recognised by shape** (about 3.5 × 2.7 mm and 40 × 30 arcmin on a current iPhone). Creatures need **20 px or more on the long side**, and long thin shapes like the koi need about 32. Effects carried by motion and code-drawn rings may be as small as 3 px on their short side.

## 3. Tool limits and pricing

### Retro Diffusion

All facts are from the official [Retro-Diffusion/api-examples README](https://github.com/Retro-Diffusion/api-examples).

- **Sizes:** "12–512 overall; each style enforces tighter limits". The general RD Pro styles, including `rd_pro__default`, run **12–256 px**, batch ≤ 16. Advanced animations run **32–256 px**, batch 1. The live per-style limits are at `GET /v2/styles/selector` (it needs a key, so it wasn't read).
- **Price:** "image styles are flat per image at any size". RD Pro is `0.18 * num_images`. Advanced animations cost `0.14`, but `custom_action` and `subtle_motion` cost **`0.25`**. A `num_images` outside the range is clamped and priced at the clamped count. `check_cost: true` is a free dry run that returns the price.
- **Frames:** `frames_duration` takes 4, 6, 8, 10, 12 or 16. The price formula doesn't change with frames. Output is a GIF unless you pass `return_spritesheet: true`. The #79 run of 4 frames at 32 × 32 came back as a 64 × 64 sheet, that is 2 × 2 cells.
- **Animation rules from RD itself:** "Send the native-resolution frame" (upscaled copies get rejected by the 32–256 range), and "Give motion room": a sprite that touches the canvas edge animates badly, so pad it onto a larger canvas.
- **Billing:** prepaid USD balance, refunded on failure. Credits can't be bought through the API.

### PixelLab

Sizes are from the [OpenAPI spec](https://api.pixellab.ai/v2/openapi.json) and prices from the [API page](https://www.pixellab.ai/pixellab-api).

- **Bitforge** (style image, init image, forced palette): sides 16–200.
- **Pixflux:** sides 16–400 in the schema, but its description says "Minimum area 32x32" (the docs conflict).
- **Pixen:** min side 16, max area 512 × 512, "must be divisible by 4", and "must be square when either side is below 32". It takes no palette.
- **Animate with text v3:** frames 32–256 px, width × height × frames ≤ 524,288, up to 16 frames.
- **Price per call (USD):** Bitforge $0.0071 at 32 × 32 and $0.00797 at 128 × 128. Pixen $0.007 at 32 × 32. Animate v3 $0.0221 for 32 × 32 × 4 frames. These are "estimates that vary with GPU processing time".
- **Billing:** the account holds both "USD credits and remaining subscription generations" (`/balance`). Plan allowances aren't public: the pricing page loads client-side. #79 recorded Tier 1 at $12 a month, and the trial account has 24 generations left. Whether USD credits can be bought without a subscription is **unverified**.

### Exact size, or large then downscale?

**Exact.** A larger canvas saves nothing on RD (flat price) and almost nothing on PixelLab (+12% from 32 to 128 px). A non-integer downscale blends colours off the ramps and breaks the grid. Even an integer 2× downscale has to choose one of four pixels per output pixel by hand. #79 saw this directly: Gemini sprites shrunk to target lost the koi and the dragonfly. The one place a bigger canvas is right is animation, as padding. That is not upscaling: the sprite stays at its true size and is cropped back afterwards.

## 4. Sprite table

Sizes are the sprite's own content box and the canvas every frame shares, in art px. "Gen canvas" is the size sent to the tool. "Code" means code already does it: a 1 art px bob at 3 fps, ageing and seasons by palette ramps, rise, sink and dissolve by dither, glints by palette cycling ([#70](https://github.com/shrujancheruku/look-together/issues/70), [#75](https://github.com/shrujancheruku/look-together/issues/75)). Prototype sizes come from `prototype/lily` (pads 27 × 13, 21 × 9, 17 × 7; flower 11 × 6; bud 3 × 5), `prototype/shoreline-scenery` and `prototype/shoreline-guide` (boat 22 × 7, New Inquiry pad 35 × 15 with an 11 × 8 flower, dragonfly 6 × 5, skim stone 2 × 2, drop 1 × 2) and `prototype/sprite-bakeoff` (koi 32 × 16, dragonfly 20 × 14, flower 11 × 9 on 12 × 12).

| Sprite | Content (art px) | Shared frame canvas | Frames | Source | Gen canvas | RD est. | PixelLab est. |
|---|---|---|---|---|---|---|---|
| Large pad, 2 notch variants | 27 × 13 | 27 × 13 | 1 each | RD Pro | 27 × 13 | 2 × 4 imgs = $1.44 | 8 × $0.007 = $0.06 |
| Medium pad, 2 variants | 21 × 9 | 21 × 9 | 1 each | RD Pro | 21 × 12 (pad to 12 tall) | $1.44 | $0.06 (21 × 16) |
| Small pad, 2 variants | 17 × 7 | 17 × 7 | 1 each | Code-drawn oval (#79) | — | $0 | $0 |
| Pad unfurl, per large and medium variant | ≤ pad box | the pad's own canvas | 5 (4 + final) | RD `custom_action` from the final pad | 32 × 32, crop back | 4 × 2 tries × $0.25 = $2.00 | 8 × $0.022 = $0.18 |
| Small pad unfurl | ≤ 17 × 7 | 17 × 7 | 5 | Code (grow the oval) | — | $0 | $0 |
| Lily flower, open | 15 × 11 | 16 × 16 | 1 | RD Pro, PixelLab Pixen fallback | 16 × 16 | $0.72 | $0.03 |
| Flower opening (closed → open) | ≤ 15 × 11 | 16 × 16 | 5; frame 1 is the closed flower | RD `custom_action` | 32 × 32, crop to 16 × 16 | 2 × $0.25 = $0.50 | $0.04 |
| "Add it?" bud | 5 × 7 | 16 × 16 (flower canvas) | 1 | Hand (Aseprite) | — | $0 | $0 |
| New Inquiry pad, flowering | 35 × 15 pad + flower → 35 × 20 | 36 × 20 | 1 | RD Pro | 36 × 20 | $0.72 | $0.03 |
| New Inquiry pad, dry | same | 36 × 20 | 1 | Palette ramp, flower layer off | — | $0 (or $0.72 if redrawn) | $0 |
| Rowboat, moored | 24 × 8 | 28 × 12 | 1 (bob is code) | RD Pro | 28 × 12 | $0.72 | $0.03 |
| Rowboat, rowing ("Row home") | ≤ 28 × 12 | 28 × 12 | 4 | RD `custom_action` | 32 × 32, crop | $0.50 | $0.04 |
| Skimming stone | 5 × 3 | 6 × 4 | 1 (hops and rings code) | Hand | — | $0 | $0 |
| Shore and step stones | — | — | — | Code-drawn landscape (#83) | — | $0 | $0 |
| Drop | 2 × 4 | 3 × 5 | 1 (fall is code) | Hand | — | $0 | $0 |
| Splash | 7 × 5 | 8 × 6 | 3 (rings are code) | Hand | — | $0 | $0 |
| Koi | 32 × 16 | 36 × 20 | 1 still + 4 hold (tail sway); rise and sink are code | RD Pro still, then RD `custom_action` | still 32 × 16; anim 48 × 32 (or 48 × 48), crop to 36 × 20 | $0.72 + $0.50 | $0.05 |
| Dragonfly, flying | 20 × 14 | 24 × 18 | 4 wing-beat frames, body held | RD Pro still, then RD `custom_action` | still 20 × 14; anim 32 × 32, crop to 24 × 18 | $0.72 + $0.50 | $0.05 |
| Dragonfly, perched | 20 × 12 | 24 × 18 (same) | 1 (wing glint is code) | RD Pro | 20 × 14 | $0.72 | $0.01 |
| Islets (11 themes) | about 169 wide | — | — | Code-drawn landscape (#75, #83) | — | $0 | $0 |
| **Total** | | | | | | **≈ $11.20** (≈ $22 with retries) | **≈ $0.60** (or one $12 month) |

Assumptions behind the estimate: 4 candidates per still (one batch) and 2 tries per animation, as #79's bake-off needed. Running the whole RD plan twice would cost about $22. The RD balance stands at $2.77 (#79), so a top-up is needed before the sprite work. Run `check_cost` free before each batch. PixelLab figures use the smallest listed price per call; sizes under 32 aren't listed, so those are **unverified**.

Not sized here: a walker or light along the bridge, which is [#84](https://github.com/shrujancheruku/look-together/issues/84)'s question.

## 5. Waste traps

1. **Tool minimums.** RD Pro is 12, PixelLab 16 (Pixen also needs sides divisible by 4 and a square canvas under 32), and animation is 32 on both. A sprite below the minimum goes on a bigger canvas filled with the water key colour (a magenta key gets repainted when the palette is forced, #79), then gets cropped. Pick the crop rect before generating, not after.
2. **All frames of one sprite share one canvas and one anchor.** Size the canvas to the union of every frame plus a margin before the first generation (the "Shared frame canvas" column). RD wants the subject clear of the edge. At 32 wide, the koi would touch a 32 × 32 animation canvas, so use 48 wide. Crop every frame with the same rect so the manifest's per-sprite origin and waterline anchor hold. A still generated on a different canvas from its animation has to be re-registered by hand.
3. **Mirroring flips the light.** #74's plans can be mirrored, but the light always comes from the upper left. Mirror slot positions, never sprites: that is what the two notch variants per pad size are for. Generate one variant, then mirror it and re-shade it in Aseprite, which is cheaper than a second generation. Odd widths (27, 21, 17) keep a centre column through any mirror.
4. **Generating large and downscaling** (see §3). Never.
5. **The indexed spec.** Every pixel has to be a step of that sprite's ramps in the master index (#75). Force `input_palette` with exactly those ramps plus the water key colour, keep RD's `remove_bg` off (it eats pale wings and fins and leaves soft alpha), and snap the result. Pixen takes no palette, so its output always needs snapping and can lose ramp steps. Keep each sprite's ramps small enough that its outline step is the ramp's darkest.
6. **Paying for frames code already makes.** Bob, ageing, season, Still water and Step-out rows, reflections, glints, the koi's rise and sink, and Reduce Motion dissolves are all code. #75's "rowboat, 2 bob frames" becomes 1 still, because bob is a 1 art px offset (#70). Generate only shape changes: unfurl, opening, oars, tail, wings.
7. **Changing density later.** Every size here follows from 320 art px across. If [#65](https://github.com/shrujancheruku/look-together/issues/65) ever reopens and density changes, the whole kit has to be redrawn. Settle that before any paid batch.
8. **RD specifics:** free-usage outputs are public, so use paid balance only. An out-of-range `num_images` is clamped and priced at the clamped count. Animation returns a GIF unless `return_spritesheet` is set, and the sheet is a grid (4 frames come back as 2 × 2), so slice it by cell.

## Open questions

1. Does the iPhone Duo's inner screen use the phone rule (k = 6, 313 art px across, 0.35 mm pixels) or the tablet rule? #71 doesn't say how to treat a foldable.
2. The Galaxy A06's and Pixel 8 Pro's dp widths, and the Pixel's default resolution setting, aren't in a primary source. Measure them on the devices or in Firebase Test Lab.
3. Should Recap flowers on home share one hit area per lily, so that 48 art px hit rects don't collide? That belongs to #78.
4. Is the dry New Inquiry pad only a palette ramp with the flower off, or a different drawing?
5. Do the pad unfurls come from RD animation ($0.25 each, with a risk of drift between frames) or from code growing a mask over the final pad (free, and matching the small pad)? Try one large pad first.
