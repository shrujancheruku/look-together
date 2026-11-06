# On-device models for an Inquiry

Research for [#15](https://github.com/shrujancheruku/look-together/issues/15) (parent map [#1](https://github.com/shrujancheruku/look-together/issues/1)). It follows [#6](https://github.com/shrujancheruku/look-together/issues/6), which found that every cloud turn reaches the model in plaintext. Sources were read on 2026-10-29. On-device AI is moving fast: OS releases change models, device lists and limits, so check again before relying on any of this.

## Short answer

- **Not as the only path for the MVP.** No on-device option covers iOS, Android and web at once. The built-in system models (Apple Foundation Models, Gemini Nano through ML Kit, Chrome's Prompt API) each run on one platform only, only on recent high-end hardware, and with a **~4K-token context**. The one cross-platform option is to ship an open model ourselves (Gemma 4 E2B/E4B through LiteRT-LM or llama.cpp), but that means a 2.6–3.7 GB download and only flagship phones run it well.
- **Quality is unproven for a Dialogue, and probably not good enough.** Apple says its ~3B model is "not designed to be a chatbot for general world knowledge" and is aimed at summarising, extraction and "short dialog". In Apple's own human evaluations it is roughly on par with Gemma-3-4B and Qwen-3-4B in English. Nobody publishes evidence on the thing we need: drawing out Assumptions without judging them. That has to be measured in [#11](https://github.com/shrujancheruku/look-together/issues/11).
- **Safety filters work against us.** Apple's on-device guardrails "aim to block harmful or sensitive content, such as self-harm", and the model "may refuse to discuss sensitive subjects". The Problems people bring are exactly that kind of content. A guardrail throws an error mid-Inquiry, so it can't be the distress-handling path.
- **Partial on-device use is realistic:** deriving Patterns at the end of an Inquiry (summarising and extracting, which fits in 4K and is what these models are built for), and possibly a first-pass distress screen with a small classifier. Both line up with #6's plan to derive Patterns on the device.
- **New and relevant: Apple Private Cloud Compute (PCC) for third-party apps (iOS 27).** It's one line of code to switch from the on-device model, gives a 32K context and reasoning, and uses Apple's privacy-preserving server. But it's Apple-only, it needs a managed entitlement, each person gets a daily quota (with more through iCloud+), and its guardrails can't be configured. It's worth a follow-up ticket as a privacy upgrade for iOS. It can't be the architecture on its own.

## The options

### 1. Apple Foundation Models (iOS, iPadOS, macOS, visionOS)

| | Detail |
|---|---|
| Model | ~3B parameters, 2-bit quantisation-aware weights, 8-bit KV cache ([Apple ML Research, 2025 tech report](https://machinelearning.apple.com/research/apple-foundation-models-2025-updates)) |
| OS | iOS/iPadOS/macOS/visionOS 26.0+. Model versions are tied to 26.0–26.3, 26.4 and 27.0, and Apple "periodically updates" the model in OS updates ([SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)) |
| Devices | Apple Intelligence devices only: iPhone 15 Pro/Pro Max, iPhone 16 and later, iPhone Air, iPad/Mac with M1 or later, iPad mini (A17 Pro). Apple Intelligence must be turned on, the device and Siri language must match, and it doesn't work in mainland China. Uses up to 8–14 GB of storage, shared with the OS ([Apple Support 121115](https://support.apple.com/en-us/121115)) |
| Context | **4,096 tokens per session**, counting instructions, prompts, tool schemas, Generable schemas and every response. Apple suggests splitting work across new sessions ([TN3193](https://developer.apple.com/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window)) |
| Fit | "Not designed to be a chatbot for general world knowledge". Meant for summarisation, extraction, text understanding, refinement, "short dialog", and creative content. Known to hallucinate and to be open to prompt injection ([tech report](https://machinelearning.apple.com/research/apple-foundation-models-2025-updates)) |
| Quality | Human evaluations: "performs favorably against" Qwen-2.5-3B, and is competitive with Qwen-3-4B and Gemma-3-4B in English ([tech report](https://machinelearning.apple.com/research/apple-foundation-models-2025-updates)) |
| Safety | Guardrails check input and output and "aim to block harmful or sensitive content, such as self-harm, violence, and adult materials". A failure throws `guardrailViolation`. The model may also refuse sensitive subjects with "Sorry, I can't help with that…" ([Improving the safety of generative model output](https://developer.apple.com/documentation/foundationmodels/improving-the-safety-of-generative-model-output)). One guardrail mode is configurable (`permissiveContentTransformations`), but it covers transforming content the person supplies, not open dialogue ([Guardrails](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/guardrails)) |
| Cost / limits | No per-request cost. On-device use is "Unlimited" ([PCC article](https://developer.apple.com/documentation/foundationmodels/adding-server-side-intelligence-with-private-cloud-compute)) |
| From Expo | Swift-only framework. `@react-native-ai/apple` wraps it for React Native as a Vercel AI SDK provider. It needs the New Architecture, iOS 26 and Apple Intelligence turned on, so it means a dev build, not Expo Go ([react-native-ai docs](https://www.react-native-ai.dev/docs/apple/getting-started)). It's a third-party library, not an Apple or Expo one |

**Private Cloud Compute, iOS 27+** ([Adding server-side intelligence with Private Cloud Compute](https://developer.apple.com/documentation/foundationmodels/adding-server-side-intelligence-with-private-cloud-compute)):

- `PrivateCloudComputeLanguageModel` uses the same `LanguageModelSession` API. Apple's comparison table shows it with a **32K context** (against 4K on the device), reasoning levels (light, moderate, deep), "Preserves privacy ✅", no offline use, and "Limit per day".
- Apps don't handle API keys or authentication. Each person gets a daily request quota they can raise through iCloud+. The app has to show quota status and handle `quotaLimitReached`.
- It needs the `com.apple.developer.private-cloud-compute` managed entitlement, and "you must meet certain eligibility requirements" ([entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.private-cloud-compute)).
- The PCC models have guardrails "with different policies that you can't directly configure".
- For us: on iOS this is the strongest privacy story available for a full Dialogue, and stronger than Vertex AI. But it's Apple-only, it uses Apple's model rather than one we choose for how well it inquires, and its quota belongs to the person rather than to us. It is not Google Cloud.

### 2. Gemini Nano through ML Kit GenAI Prompt API (Android)

| | Detail |
|---|---|
| Status | "Offered in beta, and is not subject to any SLA or deprecation policy" ([Prompt API](https://developers.google.com/ml-kit/genai/prompt/android)) |
| Devices | A curated list of recent flagships across three Nano versions. nano-v2: e.g. OnePlus 13, Xiaomi 15, Galaxy Z Fold7. nano-v3: Pixel 9/10, Galaxy S26, OnePlus 15, OPPO Find X8/X9. nano-v4: Pixel 11, Galaxy Z Flip8/Fold8 only. Not supported with an unlocked bootloader ([ML Kit GenAI](https://developers.google.com/ml-kit/genai), [get started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)) |
| OS | Android API 26+, plus the AICore system app. The model may have to download first (`DOWNLOADABLE` / `DOWNLOADING` states) ([get started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)) |
| Context | "Under 4000 tokens, or approximately 3000 English words". Long output (more than 4K tokens) "should be avoided" ([get started](https://developers.google.com/ml-kit/genai/prompt/android/get-started)) |
| Limits | A per-app inference quota (`BUSY`), a longer per-app battery quota such as a daily one (`PER_APP_BATTERY_USE_QUOTA_EXCEEDED`), and foreground-only use (`BACKGROUND_USE_BLOCKED`) ([ML Kit GenAI](https://developers.google.com/ml-kit/genai)) |
| Multi-turn | Yes. History is managed by the client as a `List<Content>` ([Prompt API](https://developers.google.com/ml-kit/genai/prompt/android)) |
| Privacy | "Input, inference, and output data are processed locally". AICore "isolates requests" ([ML Kit GenAI](https://developers.google.com/ml-kit/genai)) |
| From Expo | Kotlin-only. No first-party Expo module, so it would need a custom Expo native module |

The foreground-only rule and the battery quota are the risk here: a spoken Dialogue that runs for minutes could hit the daily quota, and the Inquiry would stop partway.

### 3. Chrome built-in AI Prompt API (web)

- **Desktop Chrome only:** Windows 10/11, macOS 13+, Linux, ChromeOS on Chromebook Plus. "Not supported on Chrome for Android or iOS". It needs 22 GB free disk, more than 4 GB of VRAM, 16 GB RAM, 4+ cores, and an unmetered connection to download the model ([Prompt API](https://developer.chrome.com/docs/ai/prompt-api)).
- Multi-turn sessions with `initialPrompts`, `append()` and `clone()`. Context is per-session and reported as `contextWindow`. On overflow, the oldest turns are dropped, except the system prompt.
- Chrome only. Other browsers aren't covered. **Chrome on phones is out**, and phones are where most people would use Expo web.

### 4. Shipping an open model ourselves (Gemma 4 and others)

- **Gemma 4 E2B / E4B** are "specifically designed for efficient local execution on laptops and mobile devices". They have 2.3B / 4.5B effective parameters, a **128K context**, text, image and **audio** input, and an **Apache 2.0** licence ([Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)). Instruction-tuned MMLU Pro: 60.0% (E2B) and 69.4% (E4B).
- **LiteRT-LM** is Google's production runtime. It runs on Android, iOS, macOS, Windows, Linux and the web. The Kotlin/C++ APIs are stable, and Swift and JavaScript are early preview ([LiteRT-LM overview](https://developers.google.com/edge/litert-lm/overview)). The MediaPipe LLM Inference API is now "maintenance-only", and Google points people to LiteRT-LM ([LLM Inference](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference)). Google's published numbers ([LiteRT-LM overview](https://developers.google.com/edge/litert-lm/overview)):

| Model | Download | Device | GPU prefill / decode (tokens/s) |
|---|---|---|---|
| Gemma 4 E2B | 2,583 MB | Galaxy S26 Ultra | 3,808 / 52 |
| Gemma 4 E2B | | iPhone 17 Pro | 2,878 / 57 |
| Gemma 4 E4B | 3,654 MB | Galaxy S26 Ultra | 1,293 / 22 |
| Gemma 4 E4B | | iPhone 17 Pro | 1,189 / 25 |

  E2B on the S26 Ultra: time to first token 0.3 s on GPU, with peak memory of 676 MB on GPU and 1,733 MB on CPU. These are current-flagship numbers. Google publishes none for mid-range or older phones. At ~20–50 tokens/s, a concise turn of 60–100 words comes out in a few seconds, which is fine for text and borderline for voice once speech-to-text and text-to-speech are added.

- **React Native runtimes:** `llama.rn` (llama.cpp, GGUF models) has an Expo config plugin. It supports iOS and Android (arm64-v8a, x86_64), with Metal on iOS, OpenCL on Adreno 700+ and an experimental Hexagon NPU path. It needs the New Architecture and has no web support ([llama.rn](https://github.com/mybigday/llama.rn)). React Native ExecuTorch (Software Mansion) runs Llama, Phi and other open LLMs, plus Whisper and Kokoro for speech, on iOS and Android through Expo. Gemma 4 support is only announced as "soon" ([React Native ExecuTorch](https://executorch.swmansion.com/)). Neither one is first-party from Google, Apple or Expo.
- **Web:** WebLLM runs models in the browser through WebGPU ([WebLLM docs](https://webllm.mlc.ai/docs/)). WebGPU now ships in Safari 26 on iOS, iPadOS, macOS and visionOS ([WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). LiteRT-LM's web API is in early preview. Asking someone to download 2.5 GB or more before a first Inquiry on the web works against "first Inquiry needs no account" and a newcomer-friendly start, and Safari may evict that storage (see #6).
- **ShieldGemma 2** exists as a small safety classifier for model inputs and outputs ([Gemma docs](https://ai.google.dev/gemma/docs)). It could back an on-device distress pre-screen. Whether it fits distress (rather than harmful content) is untested.

## Against what an Inquiry needs

| Need | On-device verdict |
|---|---|
| **Breakdown** (Problem → Assumptions, structured) | Technically possible: guided generation (Apple) and structured output (ML Kit, LiteRT-LM) exist. Whether a 2–4B model finds non-obvious Assumptions is unknown. Test it in #11. |
| **Dialogue** (multi-turn, concise, never judges, tries another angle) | Weakest fit. A 4K context (Apple on-device, Gemini Nano) holds the instructions plus the Breakdown plus a handful of turns, and then needs rolling summaries. Gemma 4's 128K removes the limit but costs a large download. Not judging and reframing are subtle instruction-following skills where small models lag. Unproven. |
| **Voice** | The model is only the text step. On-device speech-to-text and text-to-speech exist (Apple speech via `@react-native-ai/apple`; Whisper and Kokoro via ExecuTorch), but that's a separate question for the voice-stack research. |
| **Distress handling** (critical) | Don't rely on on-device. Apple's guardrails throw on self-harm, mid-turn. Small models are less reliable classifiers. A local pre-screen (ShieldGemma or a keyword/classifier layer) could run as an *extra* layer on top of the main path, never in place of it. |
| **Pattern derivation** (after the Inquiry) | Good fit. Summarising and extracting is what these models are built for, it can be chunked to fit 4K, and nothing needs to leave the device. That matches #6's plan of deriving Patterns on the device and encrypting them before sync. |
| **Coverage** | Poor for the system models: Apple Intelligence iPhones (15 Pro and newer), a flagship-only Android list, desktop Chrome. Bundled Gemma covers more but runs well only on recent flagships. |

## What this means for the map

1. **The MVP Dialogue stays in the cloud** (Vertex AI, configured as in #6). On-device can't hold an Inquiry across iOS, Android and web for newcomers on ordinary phones.
2. **Patterns are derived on the device** where a model is available (Apple Foundation Models / Gemini Nano, falling back to bundled Gemma or to cloud derivation with explicit consent). This is worth carrying into the Pattern-view work.
3. **Keep an "on-device mode" open as a later privacy tier:** Gemma 4 E4B via LiteRT-LM on capable phones, and Apple PCC on iOS 27. Model choice in #11 should include Gemma 4 E2B/E4B (and Apple's on-device model) as candidates so we know the quality gap.
4. **Any on-device mode needs its own distress path.** Guardrail errors and refusals have to be caught and routed to the same distress handling as the cloud path, never shown as a bare error.
