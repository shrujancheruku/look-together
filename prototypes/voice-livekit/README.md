# PROTOTYPE: voice over LiveKit on native (throwaway)

Answers [How fast is a spoken turn over LiveKit on native, and does barge-in work on speakerphone?](https://github.com/shrujancheruku/look-together/issues/31). Not production code; never merge.

One VM in `us-central1` (project `look-together`) runs self-hosted LiveKit, a LiveKit Agents for Node worker and a stub turn API, behind Caddy at `https://<ip>.sslip.io`. Since [Who drives an Inquiry…](https://github.com/shrujancheruku/look-together/issues/33), the person ends their own turn: Silero VAD opens a Cloud STT v2 `long` stream at the first speech, pauses don't close it, and a **Done** tap (a data message) half-closes it. The worker then asks the turn API for one whole `{reply, distress, events}` from Gemini 3.8 Flash on `us` (high thinking for the Breakdown, low after; prompt in `server/structured-addendum.md`), sends the events to the phone as cards, and speaks `reply` with Chirp 3 HD, every sentence synthesized at once, on the `us` endpoint. All timings run from Done; `model first→whole` shows what waiting for the whole reply costs over streaming. VAD still drives barge-in.

| Path | What |
|---|---|
| `infra/up.sh`, `infra/down.sh` | Create / delete the VM, IP, firewall rule and service account |
| `server/turn.mjs` | Turn API (`POST /turn`) and phone tokens (`GET /token`) |
| `worker/agent.mjs` | The voice worker; logs and sends each turn's timings |
| `loadtest/load.mjs` | N bots speaking at once from this Mac, each sending Done 300 ms after its line; times Done to audible reply |
| `app/` | Expo app (Android APK via EAS): talk, tap Done, toggle speakerphone, read timings |

## Run

```sh
./infra/up.sh                                  # prints https://<ip>.sslip.io
pnpm i && pnpm load https://<ip>.sslip.io 1 5 10 20
cd app && npx eas-cli build -p android --profile proto   # install the APK from the link
./infra/down.sh                                # when done
```

## Status (2026-11-02): updated for Done and whole replies, not yet run on the VM

Paused before any measurement; to be picked up before implementation starts. Nothing is deployed and no Google Cloud resources exist beyond the enabled Compute Engine API.

Smoke test of the turn shape from a Mac (one sample each, straight to Vertex on `us`): the Breakdown came back as `breakdown_item` events in 12.4 s on high thinking; a Dialogue turn came back whole (`pick` + reply) in 3.2 s on low. The APK needs rebuilding for the Done button.

Learned while building:

- **No Cloud STT/TTS in the Node Google plugin.** `@livekit/agents-plugin-google` 1.9.5 has only the LLM and realtime models, so the worker overrides `sttNode`, `llmNode` and `ttsNode` itself (about 150 lines). Turn detection is `stt`, with endpointing delay 0 and interruption mode `vad`. Production would wrap these as proper STT/TTS plugins.
- **Two Silero VADs per Dialogue.** The session runs one for barge-in, and `sttNode` runs one to open and half-close the Cloud STT stream. That doubles VAD CPU, so the load numbers will be slightly pessimistic.
- **The worker refuses jobs above 0.7 CPU by default** (`loadThreshold`). The stub raises it to 0.95 so the load test can see turns slow down. Production should pick the threshold from those results.
- **Android release builds need R8 keep rules for LiveKit's WebRTC** (`livekit.org.webrtc.**`, `livekit.org.jni_zero.**`); without them `minifyReleaseWithR8` fails on `JniZeroJni`. They are in `app.json` through `expo-build-properties`.
- **The APK is built on EAS** (no local Android SDK) as a standalone release build, not a dev build. Latest good build: `d00811fc-ce48-494a-b671-443507c044e5` on the `look-together-voice-proto` Expo project.
- **Creating the VM and IAM bindings is a step for the founder to run** (`infra/up.sh`); the agent's permission mode blocks it.

To resume: run `./infra/up.sh`, then `pnpm load <url> 1 5 10 20`, install the APK, hold turns on speakerphone and on the earpiece, and run `./infra/down.sh` afterwards.
