# Voice stacks for a spoken Dialogue in Expo (iOS, Android, web)

Research for [#4](https://github.com/shrujancheruku/look-together/issues/4). Sources were read on 2026-10-29. Prices are list prices in USD and change often, so check them again before relying on them.

## Answer in short

- There are three families of options:
  1. **Speech-to-speech realtime models.** Gemini Live, OpenAI Realtime.
  2. **A cascade.** Speech-to-Text, then a text model, then Text-to-Speech. Google Cloud STT and TTS, or OpenAI's equivalents.
  3. **On-device speech.** The OS recognisers and voices, through `expo-speech-recognition` and `expo-speech`.
- **The hard part on Expo is moving audio, not choosing a provider.** Expo's own audio module captures raw PCM on all three platforms. It documents no way to play streamed PCM back, and no echo cancellation for the capture stream. A spoken Dialogue needs both, so the person can interrupt (barge-in) without the app hearing its own voice. WebRTC handles both, and LiveKit has an Expo SDK (native, needs a dev build) and a JS SDK (web).
- **Leading candidate:** an Expo client on LiveKit (WebRTC), with a LiveKit Agents worker that we host on Google Cloud. The worker calls Vertex AI, either:
  - **(a) Gemini 3.8 Live**, speech to speech, for the lowest latency and the most natural turn-taking; or
  - **(b) a cascade**: Cloud STT (Chirp), then any Vertex model (Gemini or Claude), then Cloud TTS (Chirp 3 HD or Gemini TTS). This keeps the choice of model open (#11).
- Both run under Google Cloud terms: no training on customer data, and zero data retention is reachable if configured. They are also the cheapest options with good voice quality.
- **On-device speech** is the most private and costs nothing. It falls short on web: recognition is server-based by default, and Firefox has none. Its voices are system voices. It works well as a fallback and for text mode, but not as the main path.
- **OpenAI Realtime** works technically (WebRTC, ephemeral keys). Its audio costs several times more than Gemini Live, it keeps abuse-monitoring logs for 30 days by default, and it is not Google.

## 1. Options compared

| | Gemini Live (Vertex AI) | Google cascade (Cloud STT + model + Cloud TTS) | OpenAI Realtime | ElevenLabs Agents | On-device (OS) |
|---|---|---|---|---|---|
| Expo native | Through LiveKit RN SDK (dev build), or a raw WebSocket with PCM | Through LiveKit RN SDK; Cloud STT/TTS called from the server | WebRTC with ephemeral key, or LiveKit | `@elevenlabs/react-native` on LiveKit (dev build) | `expo-speech-recognition` (dev build), `expo-speech` (Expo Go) |
| Expo web | `livekit-client`, or a WebSocket through a backend proxy | `livekit-client` | Browser WebRTC (first-party) | Web React SDK | Web Speech API, which varies by browser |
| Latency | Lowest: one model hop, native audio, built-in VAD and barge-in. No figures published. | Three hops (STT, model, TTS). Streaming at every hop is needed. | Low, one hop. No figures published. | Low. No figures checked. | Recognition is fast. Turn-taking is up to us. |
| Cost per minute | ~$0.005 audio in, ~$0.018 audio out, but the context is billed again every turn (see §3) | STT $0.024/min (no logging) + model + TTS ~$30/1M chars | Audio tokens $32/$64 per 1M (gpt-realtime), $10/$20 (mini) | Not checked | $0 |
| Voice quality | Native audio, affective dialog | Chirp 3 HD or Gemini TTS: high | High | High (their core product) | System voices, vary by device |
| Data use | No training. ZDR possible (§4). | No training. STT logs nothing by default. | No training. 30-day abuse logs by default, ZDR for eligible customers. | ZRM is enterprise-only and needs approval | Stays on the device only with on-device mode |
| Google Cloud | Yes | Yes | No | No | n/a |

## 2. Each option

### 2.1 Gemini Live API

- **Models on Vertex AI:** `gemini-3.8-live` (GA, recommended) and `gemini-live-2.5-flash-native-audio` (GA). Both do native audio, transcriptions, voice activity detection, affective dialog, proactive audio and tool use. [Vertex Live API overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api)
- **Models on the Gemini Developer API:** `gemini-3.8-live` is stable. `gemini-3.1-flash-live-preview` is legacy. [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- **Protocol:** a stateful WebSocket (WSS).
- **Audio formats:** in, raw 16-bit PCM at 16 kHz, little-endian. Out, raw 16-bit PCM at 24 kHz. [Vertex Live API overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api), [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
- **WebRTC partners:** Google lists Daily, LiveKit, Twilio and Voximplant. [Vertex Live API overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api)
- **Connecting a client:**
  - The Gemini Developer API offers ephemeral tokens for direct client-to-server connections. A token can be locked to a model and config (`liveConnectConstraints`), which keeps system instructions on the server. By default it allows 1 minute to start a session and lasts 30 minutes. It works only with `v1beta`. [Ephemeral tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
  - Google says client-to-server "generally offers better performance" because it skips the backend hop. [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
  - On Vertex AI, the documented pattern is a backend that handles authentication and proxies the WebSocket. The endpoint takes OAuth bearer tokens, and browsers can't set headers on a WebSocket. We found no Vertex ephemeral-token mechanism. [Get started with WebSockets](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api/get-started-websocket)
- **Session limits:**
  - Audio-only sessions are limited to 15 minutes without context-window compression. With compression they can run indefinitely.
  - A connection lasts about 10 minutes. Session resumption carries a session across connections, and resumption tokens stay valid for 2 hours. [Session management](https://ai.google.dev/gemini-api/docs/live-session)
- **Conflict with privacy:** session resumption stores session data for up to 24 hours, and Google says not to enable it if you want zero data retention (§4). A Dialogue longer than about 10 minutes has to choose:
  - enable resumption and accept 24-hour storage, or
  - rebuild a fresh session from our own state when the connection drops.
- **Model lock-in:** Live ties the Dialogue to a Gemini model. Using Claude, or a Gemini text model chosen in #11, means using the cascade.

### 2.2 Google cascade: Cloud Speech-to-Text, a model, Cloud Text-to-Speech

- **STT prices**, standard models, which include `chirp` on V2. [STT pricing](https://cloud.google.com/speech-to-text/pricing)
  - First 60 minutes a month are free.
  - Without data logging: $0.024/min.
  - With data logging opted in: $0.016/min.
  - Dynamic batch costs $0.003/min, but it isn't for live use.
- **STT data logging:** off by default, and with it off, Google "does not log customer audio data or transcripts".
  - Opting in lets Google use the audio to improve its models.
  - Logged data is not deleted when the project is deleted.
  - **We should not opt in.** [STT data logging](https://docs.cloud.google.com/speech-to-text/docs/data-logging)
- **TTS prices:** [TTS pricing](https://cloud.google.com/text-to-speech/pricing)

  | Voice | Price | Free tier |
  |---|---|---|
  | Chirp 3 HD | $30 per 1M characters | First 1M characters |
  | Neural2 | $16 per 1M characters | First 1M characters |
  | Gemini 3.8 Flash TTS (preview) | $0.50 per 1M text tokens in, $9 per 1M audio tokens out, until 2026-12-31 | none |
  | Gemini 3.8 Flash TTS (preview) | Doubles to $1 / $18 from 2027-01-01 | none |

  Gemini 3.8 Flash TTS works out to about $0.00225 per 10 s of audio before the rise. [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- **The model in the middle can be any Vertex model**, Gemini or Claude, which keeps #11 open.
- **Trade-off:** there are more hops, so latency depends on streaming STT partials, streaming model tokens, and starting TTS early. We have to build turn-taking and barge-in ourselves, or get them from a framework (LiveKit Agents provides both).

### 2.3 OpenAI Realtime

- **Model:** `gpt-realtime-2.1`.
- **Transports:** WebRTC for browsers and WebSocket for servers.
- **Client auth:** the server mints a short-lived client secret (`POST /v1/realtime/client_secrets`) for browser or mobile clients. [Realtime guide](https://developers.openai.com/api/docs/guides/realtime)
- **Audio prices:** [OpenAI pricing](https://developers.openai.com/api/docs/pricing)

  | Model | Audio in (per 1M tokens) | Audio out (per 1M tokens) | Cached input (per 1M tokens) |
  |---|---|---|---|
  | `gpt-realtime` | $32 | $64 | $0.40 |
  | `gpt-realtime-mini` / `gpt-realtime-2.1-mini` | $10 | $20 | $0.30 |

- **Data use:** API data is not used for training.
  - `/v1/realtime` keeps abuse-monitoring logs for 30 days by default.
  - It is eligible for Zero Data Retention, but only for "eligible customers". [Your data](https://developers.openai.com/api/docs/guides/your-data)

### 2.4 ElevenLabs Agents

- **Expo:** `@elevenlabs/react-native` is "designed and built for use with the Expo framework". It runs on LiveKit WebRTC, needs a dev build (not Expo Go), and has the same API as the web React SDK. [React Native SDK](https://elevenlabs.io/docs/agents-platform/libraries/react-native)
- **Data use:** Zero Retention Mode is an enterprise feature, and Safety has to approve the use case manually. [Zero Retention Mode](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode)
- **Fit:** this is a strong voice vendor, but it adds a non-Google processor of very personal audio. We did not take it further.

### 2.5 On-device speech

- **TTS:** `expo-speech` works on iOS, Android and web, and runs in Expo Go. Voices depend on the device, and iOS is silent in silent mode. [expo-speech](https://docs.expo.dev/versions/latest/sdk/speech/)
- **STT:** `expo-speech-recognition` is a community library. It has published versions for SDK 53 to 57 and needs a dev build. [expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition)
  - **On device:** `requiresOnDeviceRecognition` keeps audio on the device where the device supports it. Android needs a downloaded language model.
  - **Android limits:** on Android 12 and below there is no continuous mode and no on-device recognition.
  - **Web:** it uses the Web Speech API. Chrome desktop, Safari 16+ and Chrome Android work. Chrome on iOS did not work as of the library's last test (2023). Firefox and Brave lack the API.
- **Web Speech API:** recognition is server-based by default ("your audio is sent to a web service"). `processLocally = true` keeps it on the device after a language-pack download, in browsers that implement it. [MDN: Using the Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)

## 3. Cost per Dialogue: a rough model

These are our own arithmetic on the cited prices, not provider figures. Check them in a prototype.

- **Gemini 3.8 Live on Vertex:**
  - **Prices:** audio input $3 per 1M tokens, audio output $12 per 1M tokens. Audio counts as 25 tokens per second, which is 1,500 tokens a minute.
  - **The catch:** "Tokens from past turns are re-processed and billed in every new turn, up to the configured context window size." There is no cached-input rate for Live. [Vertex pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
  - **Without the re-billing:** about $0.0045/min for audio in and $0.018/min for audio out. The Gemini API page lists $0.005/min and $0.018/min. [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
  - **Example:** a 10-minute Dialogue with 20 turns and about 15k audio tokens in total.
    - Re-billed input: about 20 × 7.5k on average, so 150k tokens, about $0.45.
    - Output: about 5 minutes, about $0.09.
    - **Total: roughly $0.50 per 10 minutes**, and it grows faster than linearly with length.
  - **Ways to bound it:** context-window compression, and limits on Dialogue length.
- **Google cascade**, same Dialogue, with STT streaming only while the person speaks:
  - STT: 5 min × $0.024, about $0.12.
  - TTS: about 5 min of speech at roughly 900 chars/min, so 4.5k chars × $30/1M, about $0.14.
  - The text model on top costs a few cents.
  - **Total: roughly $0.25 to $0.30 per 10 minutes**, growing about linearly.
- **OpenAI `gpt-realtime`:** its audio rates are about 10× Gemini Live's per token. The mini models are about 3× for input and 1.7× for output.
- **Transport:** LiveKit Cloud includes 1,000 agent-session minutes and 5,000 WebRTC minutes free. On paid plans, agent minutes cost $0.01/min after the included allowance. The server and the Agents framework are open source and can be self-hosted. [LiveKit pricing](https://livekit.com/pricing)

## 4. Privacy terms (Google Cloud)

- **No training:** "Google won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction." [Vertex AI zero data retention](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/vertex-ai-zero-data-retention)
- **Default retention:**
  - Implicit caching is on by default, and cached data is deleted within 24 hours. Caching can be turned off.
  - Prompts may be logged for abuse monitoring under the GCP terms.
- **What zero data retention requires** (same source):
  - no request-response logging;
  - caching off;
  - **no Live session resumption** (it stores audio, video, text and outputs for up to 24 hours);
  - no Search or Maps grounding (their storage can't be turned off).
- **Cloud STT:** logs nothing unless we opt in to data logging. Don't opt in. [STT data logging](https://docs.cloud.google.com/speech-to-text/docs/data-logging)
- **Paid tier only:** on the Gemini Developer API, free-tier content *is* used to improve Google's products, and paid-tier content is not. Production should use Vertex AI or the paid tier. [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

## 5. Expo-specific constraints

- **Capture:** `expo-audio` has `useAudioStream` / `AudioStream`, documented in the SDK 58 reference. It captures real-time microphone PCM (`float32` or `int16`) on Android, iOS and web, at a configurable sample rate (default 48 kHz, "may differ if the hardware cannot deliver it"). [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/)
- **What it lacks:** the docs describe no API to play streamed PCM chunks (players take URIs or assets) and no echo-cancellation option on the stream.
  - So a raw-WebSocket client to Gemini Live needs extra native work for gapless 24 kHz playback and for AEC.
  - Without AEC, the model hears itself on speakerphone, and barge-in breaks.
- **WebRTC route:**
  - **Native:** LiveKit's React Native SDK, with the Expo config plugins. It needs a dev build: "not compatible with the Expo Go app due to the native code required". [LiveKit Expo](https://docs.livekit.io/transport/sdk-platforms/expo/)
  - **Web:** the same code uses `livekit-client`.
  - **Gemini:** LiveKit Agents has a Google plugin that talks to Gemini Live on Vertex AI (`vertexai=True`, with project and location). It supports `gemini-3.8-live`, and the docs' example uses `location="eu"`. [LiveKit Gemini plugin](https://docs.livekit.io/agents/models/realtime/plugins/gemini/)
- **The on-screen Breakdown** can be fed from Live's input and output transcriptions, or from the cascade's STT and model text, sent to the client over the LiveKit data channel.

## 6. Open points to settle in a prototype

- **Latency:** none of the providers publishes first-audio latency figures. We need to measure Gemini Live against the Google cascade end to end from an Expo dev build and from a browser.
- **Dialogues longer than about 10 minutes** under zero data retention: rebuilding the session from our own state versus enabling resumption.
- **Live billing in practice:** whether Live re-bills past turns as audio tokens or as their transcripts, which decides the real cost per Dialogue.
- **Data residency and hosting:** which Vertex region the Live and Claude models are offered in, and where the LiveKit worker and server run (LiveKit Cloud or self-hosted on GCP). These belong with #6 and #9.
