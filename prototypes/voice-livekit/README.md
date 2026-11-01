# PROTOTYPE: voice over LiveKit on native (throwaway)

Answers [How fast is a spoken turn over LiveKit on native, and does barge-in work on speakerphone?](https://github.com/shrujancheruku/look-together/issues/31). Not production code; never merge.

One VM in `us-central1` (project `look-together`) runs self-hosted LiveKit, a LiveKit Agents for Node worker and a stub turn API, behind Caddy at `https://<ip>.sslip.io`. The worker gates a Cloud STT v2 `long` stream with Silero VAD (800 ms of silence, like the browser prototype), asks the turn API for a Gemini 3.8 Flash reply on `us` (high thinking for the Breakdown, low after), and speaks it with Chirp 3 HD per sentence on the `us` endpoint. Card and Recap lines go to the phone as data, never spoken.

| Path | What |
|---|---|
| `infra/up.sh`, `infra/down.sh` | Create / delete the VM, IP, firewall rule and service account |
| `server/turn.mjs` | Turn API (`POST /turn`) and phone tokens (`GET /token`) |
| `worker/agent.mjs` | The voice worker; logs and sends each turn's timings |
| `loadtest/load.mjs` | N bots speaking at once from this Mac; times end of speech to audible reply |
| `app/` | Expo app (Android APK via EAS): talk, toggle speakerphone, read timings |

## Run

```sh
./infra/up.sh                                  # prints https://<ip>.sslip.io
pnpm i && pnpm load https://<ip>.sslip.io 1 5 10 20
cd app && npx eas-cli build -p android --profile proto   # install the APK from the link
./infra/down.sh                                # when done
```

## Status (2026-11-01): built, not yet run

Paused before any measurement; to be picked up before implementation starts. Nothing is deployed and no Google Cloud resources exist beyond the enabled Compute Engine API.

Learned while building:

- **No Cloud STT/TTS in the Node Google plugin.** `@livekit/agents-plugin-google` 1.9.5 has only the LLM and realtime models, so the worker overrides `sttNode`, `llmNode` and `ttsNode` itself (about 150 lines). Turn detection is `stt`, with endpointing delay 0 and interruption mode `vad`. Production would wrap these as proper STT/TTS plugins.
- **Two Silero VADs per Dialogue.** The session runs one for barge-in, and `sttNode` runs one to open and half-close the Cloud STT stream. That doubles VAD CPU, so the load numbers will be slightly pessimistic.
- **The worker refuses jobs above 0.7 CPU by default** (`loadThreshold`). The stub raises it to 0.95 so the load test can see turns slow down. Production should pick the threshold from those results.
- **Android release builds need R8 keep rules for LiveKit's WebRTC** (`livekit.org.webrtc.**`, `livekit.org.jni_zero.**`); without them `minifyReleaseWithR8` fails on `JniZeroJni`. They are in `app.json` through `expo-build-properties`.
- **The APK is built on EAS** (no local Android SDK) as a standalone release build, not a dev build. Latest good build: `d00811fc-ce48-494a-b671-443507c044e5` on the `look-together-voice-proto` Expo project.
- **Creating the VM and IAM bindings is a step for the founder to run** (`infra/up.sh`); the agent's permission mode blocks it.

To resume: run `./infra/up.sh`, then `pnpm load <url> 1 5 10 20`, install the APK, hold turns on speakerphone and on the earpiece, and run `./infra/down.sh` afterwards.
