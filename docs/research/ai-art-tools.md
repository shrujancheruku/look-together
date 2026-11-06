# AI image tools for Look Together's hand-drawn art

Researched 2026-11-03. This is a throwaway research note. It is not an ADR.

## Question

Which AI image tool gives the best-quality hand-drawn art for Look Together's scenes? The art may ship at launch, and a human illustrator is only a possible later swap.

**Target look:** watercolour on cold-press paper with visible grain. Foreground interactive pieces (lily pads, rowboat, stones, bud) get a thin, wobbly pencil line. Trees and the far bank are soft washes with no line.

**Scenes:** a forest pond (opening, home, Probe list, Path with a meandering brook, Recap pool), each in spring morning and autumn evening.

**Sprites:** drop, leaf, stone, bud to flower, lily pad in three ageing states, boat, Recap flower, closed lily. Also a lily logo and app icons.

**Delivery:** painted raster layers (WebP and Atlas sprite sheets, described by `scene.json`), drawn with React Native Skia under a shared SkSL shader for line boil, shimmer and ripples.

## Short answer

No primary source settles criterion 1, watercolour fidelity. No vendor or benchmark publishes a controlled watercolour test. The public leaderboards measure general preference, and Midjourney is not on them. Everything else (consistency tools, layers, terms, price, API) can be checked, and on those criteria the ranking is:

1. **Google Gemini 3 Pro Image ("Nano Banana Pro") on Vertex AI**, project `look-together`. Use it for scenes and season variants. It has style references, up to 14 input images, 4K output, multi-turn editing, Google's output indemnity and no training on your data. Its catch is that every output carries SynthID, and it has no documented transparency.
2. **OpenAI GPT Image 2.5 (Sunburst)**. Use it for sprites and masked edits. It has native transparent backgrounds, mask edits and the top arena score. It also carries output indemnity. C2PA and SynthID are always on.
3. **Midjourney V8.2**. Use it only to explore the look and make style-bible keyframes. Its painterly reputation is strong but unverified here. It has no API, automation is banned, it has no alpha and no indemnity, and Midjourney gets a perpetual licence to what you make.
4. **FLUX (Black Forest Labs): FLUX 3 Image, plus FLUX 3 Image Klein with a style LoRA**. This is the fallback if references alone drift. You train a LoRA on 20 to 40 approved frames and lock the style. The API terms train on inputs and outputs unless you opt out, and there is no indemnity.
5. **Recraft V4 Styles**. A cheap, API-first style lock from 1 to 10 references, with background removal at $0.01 and crisp upscale at $0.004. It sits lower on the leaderboard, so it serves as a utility rather than the main painter.
6. **Ideogram 4.x** for the logo and icon only, if lettering is ever needed. It is not a watercolour tool.
7. **Adobe Firefly Image 5**. It is "commercially safe", but custom models are still beta and the API is an enterprise product. It is not worth the overhead for a solo founder now.

**Run a small bake-off before committing** (see the end of this note). It costs less than $50 and about a day.

## What the leaderboards say (general preference, not watercolour)

| Board (snapshot) | Top entries | Others relevant here |
| - | - | - |
| LMArena / arena.ai text-to-image, 2026-10-26 ([board](https://lmarena.ai/leaderboard/text-to-image)) | GPT-Image-2.5 Sunburst 1427, Flare 1401, GPT-Image-2 1381, MAI-Image-2.6 1329, Nano Banana 2.1 1325 | Qwen-Image-3.0-Pro is 12th |
| Artificial Analysis AA-Image-T2I v2.1 ([board](https://artificialanalysis.ai/image/leaderboard/text-to-image)) | GPT Image 2.5 Sunburst 1223, Flare 1207, GPT Image 2 1189, Nano Banana 2.1 1176 | FLUX 3 Image 11th (1119), Nano Banana Pro 13th (1118), FLUX 3 Klein 22nd (1043), Recraft V4.1 Utility 31st, Ideogram 4.0 Quality 32nd; Midjourney and Firefly not listed |

Artificial Analysis shows only an "Overall" category, with no art or illustration split. The LMArena figures come from a search-result snapshot that was not re-read on the live page. Treat both boards as weak evidence for this style.

Secondary comparisons are mostly SEO blogs. Their consistent theme, which is not verified, is that Midjourney leads on aesthetics, GPT Image and FLUX lean painterly, and Nano Banana leans precise and literal ([magichour FLUX.2 vs Nano Banana Pro](https://magichour.ai/blog/flux2-vs-nano-banana-pro), [gradually.ai](https://www.gradually.ai/en/ai-image-model-comparison/nano-banana-pro-vs-midjourney-v8-1/)). None of them is a controlled watercolour test.

## Tool by tool

### Google on Vertex AI (use project `look-together`)

- **Imagen is retired.** All Imagen 3 and 4 endpoints (`imagen-4.0-generate-001`, `-ultra-`, `-fast-`, `imagen-3.0-capability-*`, `imagegeneration@00x`) were listed for discontinuation by **June 30 2026**, migrating to `gemini-2.5-flash-image` ([Vertex image overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/overview), [generate-images](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images)). Do not build on Imagen. Its style-customisation and subject-reference features go with it.
- **Current Gemini image models (GA on Vertex)** are Nano Banana 2.1 (`gemini-nano-banana-2.1`), Gemini 3.1 Flash Image ("Nano Banana 2"), 3.1 Flash-Lite Image, Gemini 3 Pro Image (`gemini-3-pro-image`, "Nano Banana Pro") and the legacy 2.5 Flash Image ([Vertex models](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models)). The Gemini API pricing page says 2.5 Flash Image shuts down on 2027-03-15 ([pricing](https://aistudio.google.com/docs/pricing)).
- **Aspect ratios and resolution (3 Pro Image and NB 2.1):** 14 ratios from 1:8 to 8:1, including 9:16 and 21:9, at 1K, 2K or 4K ([3 Pro Image](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image), [NB 2.1](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/nano-banana-2-1)). The exact pixel size of 4K at 9:16 was not found in the pages read.
- **Consistency tools:** up to 14 input images. Nano Banana Pro takes up to 6 object, 5 character and **3 style reference** images. NB 2 and 2.1 take 10 object and 4 character images, and **style references are documented only for Pro** ([image-generation guide](https://aistudio.google.com/docs/image-generation)). Multi-turn editing is supported, which suits "same pond, now autumn dusk with a moon". Seeds were not documented for Gemini image models in the pages read. On Imagen, a seed was deterministic only with the watermark off ([generate-images](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images)).
- **Layers:** no transparent or alpha output is documented. Forum users report JPEG output from NB 2 and Pro with no alpha ([forum](https://discuss.ai.google.dev/t/nano-banana-2-pro-output-jpeg/135955), [forum](https://discuss.ai.google.dev/t/how-can-i-make-the-background-transparent/111698)). These are user reports, not docs. Editing is "mask-free" (instruction-based), and Vertex no longer documents mask inpainting for Gemini.
- **Terms:** Google "won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction" ([data governance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance)). Prompts may be logged for abuse monitoring. Output indemnity covers the Vertex AI API with GA Gemini and Imagen models ([indemnified services, archived 2026-04-22](https://cloud.google.com/archive/terms/generative-ai-indemnified-services-20260422)). The current page could not be read, and the exact indemnity conditions sit in the Service Specific Terms, which were not read.
- **Disclosure:** "All generated images include a SynthID watermark" ([guide](https://aistudio.google.com/docs/image-generation)). The Vertex model cards list C2PA Content Credentials as supported. The Imagen-era `addWatermark: false` switch does not appear for Gemini models.
- **Price (Gemini API standard paid tier, per image)** ([pricing](https://aistudio.google.com/docs/pricing)):

  | Model | 1K | 2K | 4K |
  | - | - | - | - |
  | 3 Pro Image | $0.134 | $0.134 | $0.24 |
  | NB 2.1 | $0.0336 | $0.0504 | $0.113 |

  NB 2.1 batch runs about half that. Vertex pricing could not be read. It is assumed similar but not verified.

### OpenAI (GPT Image 2.5 Sunburst and Flare)

- **Models:** `gpt-image-2.5-sunburst` ("where editing precision matters most") and `gpt-image-2.5-flare` (fast everyday). `gpt-image-1` shut down 2026-10-23 ([image guide](https://developers.openai.com/api/docs/guides/image-generation)).
- **Sizes:** any multiple of 16, aspect between 1:3 and 3:1, longest edge up to 3840 px, total 655,360 to 8,294,400 px. Anything above 2560x1440 is "experimental". Quality runs from `low` up to `max`.
- **Layers:** `background: "transparent"` is supported on both 2.5 models, with PNG or WebP output. The edits endpoint takes several input images and an alpha-channel mask, but "the model uses the mask as guidance, but may not follow its exact shape." Note that the API reference says `gpt-image-2` does *not* support transparency, so use 2.5.
- **Consistency:** no seeds and no style-reference feature. Consistency comes from passing reference images to edits. The guide itself warns that the model "may occasionally struggle to maintain visual consistency for recurring characters or brand elements."
- **Terms:** the customer owns output. OpenAI's API indemnity covers third-party IP claims on output, but excludes beta services, cases where you knew or should have known of infringement, and cases where safety features were disabled ([services agreement](https://openai.com/policies/services-agreement/), [service terms](https://openai.com/policies/service-terms/), read via search snippets because the pages returned 403). There is no training on API data by default ([gpt-image API post](https://openai.com/index/image-generation-api/)).
- **Disclosure:** API images carry both C2PA metadata and a SynthID watermark ([OpenAI help](https://help.openai.com/en/articles/8912793-c2pa-and-synthid-in-openai-generated-images), from a search snippet). Editing or converting a file can drop the metadata ([provenance guide](https://developers.openai.com/api/docs/guides/content-provenance)).
- **Price:** image output is $30 per 1M tokens, input $8 per 1M tokens, and batch is half that ([pricing](https://developers.openai.com/api/docs/pricing)). Per-image cost depends on tokens, and OpenAI points to a calculator. Exact per-image figures were not found.

### Midjourney (V8.2)

- V8.2 has been the default since 2026-07-24. Style references (`--sref`, weighted, with codes and the Style Creator), moodboards and personalisation all work on V8.x ([Style Reference](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference)). The **Edit Model** (2026-08-27) replaces Omni and Character Reference. It takes up to 4 image references and does inpainting and outpainting ([Edit Model for V8](https://updates.midjourney.com/edit-model-for-v8/)). `--hd` renders 2K natively. Inpaint and outpaint on HD images fall back to SD, then you upscale again (from a docs search snippet).
- **No transparency is documented.** There is **no API**, and automated access is prohibited by the Terms and the Community Guidelines ([ToS](https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service), [guidelines](https://docs.midjourney.com/hc/en-us/articles/32013696484109-Community-Guidelines)).
- **Terms:** you own your assets, but a company with more than $1M a year in revenue needs Pro or Mega. You grant Midjourney a perpetual, irrevocable licence to your inputs and outputs. You indemnify Midjourney, not the other way round. Stealth (private) mode needs Pro, at $60 a month or $48 billed annually ([plans](https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans)).
- Watermark and C2PA behaviour was not found in Midjourney's docs, so it is unverified. The docs site blocked direct fetches, so the points above come from official-domain search snippets.

### Black Forest Labs FLUX

- **FLUX 3 Image** is the latest family: text-to-image, instruction edits, up to 10 references (for example "Turn Image 1 in the Style of Image 2") and bounding-box layouts. Its 15 aspect ratios run from 21:9 to 9:21. An exact `width`/`height` can be 256 to 6256 px per side, up to 16.8 MP, or 4 MP when reference images are used ([FLUX 3 Image](https://docs.bfl.ml/flux_3/flux3_image_overview.md), [technical parameters](https://docs.bfl.ml/guides/prompting_unified_technical.md)). The API schema has no transparency or output-format field and no seed ([API ref](https://docs.bfl.ml/api-reference/utility/generate-an-image-with-flux-3.md)).
- **FLUX 3 Image Klein** is the open-weights editing model, up to 4K, with a **Base** variant for LoRA training. BFL publishes a style-LoRA guide. It runs on a consumer GPU down to an RTX 3090, and is licensed under the "FLUX Kommunity License" ([Klein](https://docs.bfl.ml/flux_3/flux3_image_klein.md), [LoRA guide](https://docs.bfl.ml/flux_3/flux3_image_klein_lora_guide.md)). FLUX.2 [klein] fine-tuned endpoints are in public beta at base price. FLUX.1 Kontext is legacy, and BFL says "for new projects, we recommend FLUX.2" ([Kontext](https://docs.bfl.ml/kontext/kontext_overview.md)). The Kommunity License's terms for commercial use of outputs were **not read**. Check them before shipping LoRA outputs.
- **Terms (bfl.ai ToS):** BFL claims no ownership of your content, and you may use output for your own purposes. BFL gets a licence to use Inputs and Outputs "to provide, develop, train and improve", with an **opt-out by email** to legal@blackforestlabs.ai that applies only going forward. There is no indemnity clause. **§1.3(p) forbids removing "AI content marking or labelling or transparency metadata"** unless the law permits it ([ToS](https://bfl.ai/legal/terms-of-service)). Whether separate API terms override this was not confirmed.
- **Price:** 1 credit = $0.01, and the pricing pages render prices client-side, so the figures were not captured ([pricing](https://docs.bfl.ml/quick_start/pricing.md)). Every response returns its `cost`.

### Recraft (V4.1, V4 Styles)

- **V4 Styles** (released 2026-08) "always require a style": 1 to 10 reference images, or a saved `style_id`, with "no training step". It costs $0.035 (1K raster), $0.10 (Pro, 2K) or $0.05 to $0.12 (SVG vector), plus $0.005 per new style ([V4 Styles](https://www.recraft.ai/docs/api-reference/models/recraft-v4-styles.md)).
- **Tools:** remove background $0.01, crisp upscale $0.004, creative upscale $0.25, and inpaint, outpaint and image-to-image $0.04 to $0.08 (V3 only for inpaint and outpaint). Vectorize costs $0.01. Limits are up to 16 MP, longest side 4096 px. Output is lossless WebP or PNG ([pricing](https://www.recraft.ai/docs/api-reference/pricing.md), [limits](https://www.recraft.ai/docs/api-reference/appendix.md), [remove background](https://www.recraft.ai/docs/api-reference/tools/remove-background.md)).
- **Terms:** a paid plan gives ownership and commercial rights. Free-plan images belong to Recraft. The Developer Terms say API assets are not used to train Recraft models ([ownership](https://www.recraft.ai/docs/trust-and-security/ownership), [developer terms](https://www.recraft.ai/legal/developer-terms), from search snippets). No indemnity or watermark information was found.

### Ideogram (4.0 and 4.5)

- 4.5 has a `background` enum that includes `transparent`. The 4.0 and 3.0 "Transparent" endpoints return alpha but take no style settings or references. Style references live on 3.0 and 4.5. API prices for 4.0 are $0.03, $0.06 or $0.10 per image, and the background remover costs $0.01 ([API reference](https://developer.ideogram.ai/api-reference/images/generate/ideogram-4-5), [4.0 page](https://ideogram.ai/models/4.0/)). Its strength is typography and layout, not painted media.
- **Terms:** Ideogram claims no ownership of output. Its API agreement says it will not train on API inputs or outputs, except content flagged for abuse ([API ToS](https://ideogram.ai/legal/api-tos/)). No indemnity was found.

### Adobe Firefly (Image Model 5)

- Image Model 5 has been GA since March 2026 and renders natively at 4 MP. Custom Models are still **beta** as of the October 2026 "What's new". "Layered Image Editing" was announced at MAX 2025 and has no evidence of shipping ([Adobe blog 2026-03](https://blog.adobe.com/en/publish/2026/03/19/adobe-firefly-expands-video-image-creation-with-new-ai-capabilities-custom-models), [what's new](https://helpx.adobe.com/firefly/web/whats-new/new-features/whats-new.html)).
- IP indemnity needs an enterprise entitlement through a new contract, and it is void if you modify the output ([legal FAQ](https://business.adobe.com/assets/pdfs/products/firefly-business/firefly-legal-faqs-enterprise-customers-2024-06-11.pdf)). Content Credentials are attached automatically. The Firefly Services API is aimed at enterprise customers. Its main draw is the licensed training data, which matters less for a solo app.

### Other contenders

- **Qwen-Image-Layered** (Alibaba, Apache 2.0, open weights) decomposes an existing image into 3 to 8 RGBA layers, but "text-to-layer generation is weaker" ([GitHub](https://github.com/QwenLM/Qwen-Image-Layered)). It is the only tool found that targets layer separation directly. It is worth testing for splitting a finished scene into far bank, trees, water and foreground.
- **MAI-Image-2.6 (Microsoft)** and **Grok Imagine Image 2.0** rank high on general boards. They were not researched further, because their access and terms add little to the options above.

## Cross-cutting findings

**Line and wash on separate layers.** No tool generates separate line and wash layers natively. Three workable routes:

1. **Generate in two passes.** Produce the washed piece, then edit it with an instruction like "same piece, pencil line only, on white paper". Use Gemini, GPT Image Sunburst or FLUX 3 for this, then key out the white. Register drift between the passes is likely, so test it.
2. **Unmultiply the paper.** Watercolour and graphite are both darker than the paper, so generate on flat white paper and derive alpha from the paper colour ("colour to alpha"). This is ordinary image processing. It keeps the soft wet edges that background removers tend to cut off.
3. **Decompose a finished image** with Qwen-Image-Layered.

**Paper grain** is better as one shared texture in the SkSL shader than baked into each layer. Then every scene and sprite sits on identical paper, and generated grain won't fight across layers. This is a design suggestion, not a sourced fact.

**Transparency.** Only GPT Image 2.5 and Ideogram 4.5 offer native alpha from text. Recraft and Ideogram offer $0.01 background removal. Gemini, Midjourney and FLUX 3 need one of the routes above.

**Resolution.** A 3x phone background, for example 1290x2796 on a 6.7-inch iPhone, is about 3.6 MP. That fits GPT Image (but above 2560x1440 counts as experimental), FLUX 3 (up to 16.8 MP) and the Gemini 4K tier. Midjourney (2K) and Recraft Styles Pro (2K) need an upscale. Recraft's $0.004 crisp upscale works on any source.

**Provenance and disclosure.** Google and OpenAI outputs carry SynthID, an invisible pixel watermark. It is meant to survive edits, so assume it survives the WebP and Atlas pipeline. C2PA metadata, by contrast, will likely be stripped when files are re-encoded into WebP and atlases ([OpenAI provenance guide](https://developers.openai.com/api/docs/guides/content-provenance)). BFL's ToS forbids removing such metadata unless the law permits it. Decide on purpose whether to keep C2PA on shipped files or to disclose AI art in-app or in store copy. Store and legal disclosure rules (app stores, the EU AI Act) were **not researched**.

**Copyright.** Every vendor's "you own the output" sits beside the US Copyright Office position that purely AI-generated material is not protectable without sufficient human authorship ([USCO AI report, Part 2](https://www.copyright.gov/ai/)). This is from prior knowledge and was not re-read for this note. Hand compositing, line work and painting over the art strengthen a claim. The lily logo matters most here, because it is the asset a trademark would rest on.

## Not verified from sources

- Watercolour fidelity and "AI sheen" for any tool. The only evidence is general leaderboards and blogs.
- Vertex AI per-image prices (only Gemini API prices were read), and the current Google indemnity page and its conditions.
- Exact Gemini 4K pixel sizes per ratio, seed support, and output format (PNG or JPEG) on Vertex.
- Midjourney's watermark and C2PA behaviour, and its exact current plan prices (pages not fetchable).
- FLUX 3 and FLUX.2 prices, the Kommunity License's terms on output use, and whether separate BFL API terms exist.
- OpenAI per-image cost at each quality and size, and the exact wording of the indemnity (403 on the policy pages).
- Recraft indemnity and watermarking. Firefly API pricing.

## Recommended workflow

1. **Style bible (1 day).** Make 6 to 10 hero frames of the pond in both seasons, plus 2 sprites, in Gemini 3 Pro Image. Optionally do the same in Midjourney by hand to see whether it is clearly better. Pick 3 frames as the canonical style references.
2. **Scenes (Gemini 3 Pro Image on Vertex, project `look-together`).** For each scene, generate the spring morning at 4K in the target ratio, with the 3 style references attached. Make the autumn evening as a multi-turn edit of the spring frame, so the composition holds. Split into layers with Qwen-Image-Layered, or by regenerating far bank, trees, water and foreground as separate passes on white paper and unmultiplying.
3. **Sprites (GPT Image 2.5 Sunburst).** Generate with `background: "transparent"`, passing the style-bible frames as edit inputs. Lily-pad ageing states and bud to flower are sequential edits of the previous state. Produce pencil-line layers as a second pass of the same sprite, and pack them with the tool used for the Atlas sheets.
4. **Edits and fixes.** Use GPT Image Sunburst for masked fixes on any asset, Gemini for whole-image instruction edits, and Recraft crisp upscale ($0.004) where a source is below 3x.
5. **If consistency drifts** across 10 scenes and about 15 sprites, train a FLUX 3 Klein Base style LoRA on the approved outputs and regenerate the stragglers. Opt out of BFL training first.
6. **Logo and icons.** Paint them like the sprites, then hand-finish them, since they carry the brand and the copyright question. Recraft vectorize ($0.01) can make a clean SVG lily for small icon sizes.

**Rough cost.** 10 scene variants plus about 15 sprites, with about 10 tries each, comes to roughly 250 generations. At $0.13 to $0.24 each, that is under $100. Add $30 to $60 if a Midjourney month is used.

## Is a bake-off worth it?

Yes. Fidelity is the top criterion and no source answers it, while a bake-off is cheap. Keep it small and blind.

- **Brief:** three fixed prompts, each with the same written style spec (cold-press grain, transparent washes, granulation, a wobbly graphite line on the foreground only, no line on trees). Prompt A is the home pond on a spring morning, wide. Prompt B is the same pond on an autumn evening with a moon. Prompt C is a lily pad sprite in three ageing states.
- **Contenders:** Gemini 3 Pro Image, GPT Image 2.5 Sunburst, FLUX 3 Image, Recraft V4 Styles (with the same 3 references), and Midjourney V8.2 by hand. Optionally add NB 2.1 as the cheap Google option.
- **Rules:** 4 generations per prompt per tool, with the best kept. Give each tool the same reference images where it takes them. Run everything at final resolution.
- **Judging:** shuffle the outputs without labels, view them on a real phone through the Skia shader, and score them 1 to 5 on watercolour fidelity (paper, edges, blooms, no sheen), A-to-B consistency, sprite-to-scene match, and how cleanly each one becomes layers.
- **Cost:** under $50 and a day. Script it in a throwaway `prototypes/art-bakeoff/`, calling the APIs directly. Use only the `look-together` GCP project. Midjourney is done manually.
