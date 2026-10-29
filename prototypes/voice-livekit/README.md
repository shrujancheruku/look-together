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
