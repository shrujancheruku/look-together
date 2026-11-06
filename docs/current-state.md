# Current state of the MVP decisions

What the MVP map ([Look Together MVP][1]) has decided, once every "partly supersedes" is applied. `/to-spec` reads this sheet instead of the decision tickets, which overwrite one another. Each rule links the ticket it comes from. Open a ticket for the detail; this sheet gives only the rule that stands now.

Where two tickets disagree, the later one wins, and the sheet states only the later rule. [Leftovers from dropped ideas](#leftovers-from-dropped-ideas) lists what no longer holds, so a stale line in an older ticket isn't mistaken for a rule. The rules settled while writing this sheet are tagged [Reconcile][82]. The rules settled by the architecture review of the MVP tickets are tagged [Architecture review][88].

Words follow [`GLOSSARY.md`](../GLOSSARY.md). Standing rules are also in the ADRs in [`docs/adr/`](adr/) and the closed list in [`docs/privacy/closed-list.md`](privacy/closed-list.md).

## Standing rules

- Never judge an Assumption true or false. When stuck, try another angle, else leave an Open Question ([ADR 0001](adr/0001-never-judge-assumptions.md)).
- Never speak as Krishnamurti, imitate him or attribute words to him. His texts stay out of prompts, retrieval and training without the Foundations' permission ([ADR 0002](adr/0002-never-speak-as-krishnamurti.md), [Foundations][3]).
- Not therapy, and never claims to be. One not-therapy wording list covers app copy, the store listing and model replies ([Distress][10]).
- Inquiry content stays on the person's devices and in their own encrypted backups and exports, never on our servers ([ADR 0003](adr/0003-inquiry-content-never-on-our-servers.md), [ADR 0008](adr/0008-inquiries-travel-only-in-the-persons-own-encrypted-backups-and-exports.md)). The one exception is an exchange the person chooses to send with a Report ([ADR 0007](adr/0007-a-report-may-carry-one-exchange-by-choice.md)).
- Each Inquiry starts fresh and never reads past Inquiries. Patterns are post-MVP.
- Built for newcomers, English only, adults (18+), free with per-Account limits ([Launch][14]).
- Model-agnostic: every model call goes through one abstraction, and the app, not the model, owns the Step-out ([Model choice][11]).

## Inquiry

- **App-owned state machine:** the device holds the Inquiry and its Assumption records. Each model call returns `{reply, distress, events}`, and one pure shared reducer, `step(inquiry, input)`, checks every event before applying it. It returns `{ inquiry, applied, refused }` and never throws on a model's event; each refusal carries its reason and whether it holds the reply back ([Architecture review][88]). It runs on the device for app-only moves ([ADR 0004](adr/0004-inquiry-is-an-app-owned-state-machine.md), [Inquiry driver][33]). For model turns, each `vN` splits the check from the apply: the backend runs `check(context, modelOut)` on the turn context it was sent and returns the applied events only, and the device re-runs them through `step` (which is `check(turnContext(inquiry), …)` then apply) and saves before showing. A property test pins that the two agree; if the device refuses an event the backend applied, the turn is `no_answer` and Sentry gets a report without content ([Turn wire contract][143]).
- **One turn module on the backend** owns the whole sequence of a turn (classifier, model, reducer, hold-back retry, Step-out precedence, charging) and returns exactly one of `breakdown | clarify | decline | reply | step_out | no_answer | busy | limited | update_required`. HTTP only maps that result to a response, and the device switches on the same set. The classifier and the model run in parallel, and the reply is discarded on a Step-out ([Architecture review][88]). Auth failures (`unauthenticated`, `account_deleted`) never reach it: one shared auth-failure response on every authenticated endpoint, handled by the device's session layer ([Turn wire contract][143]).
- **Turn context:** `POST /turn` carries what one pure `vN/turnContext` builds, never the whole Inquiry. A Breakdown sends the Problem and the clarify Q&A if there was one. A Dialogue turn sends the Problem, this Path's pairs plus the new Reflection, every Assumption's id, premise, `premiseShown`, angles used and outcome, the additions count, the open offer and the soften flag. Never the Inquiry id, the lily seed, region, dates, other Paths' pairs or the draft ([Turn wire contract][143]).
- **Wire shapes:** requests `{ v, kind: 'breakdown', problem, clarify? }` or `{ v, kind: 'turn', context }`. Each response is one turn result: `breakdown` (title, Assumptions, `nextAt`), `clarify` (question), `decline`, `reply` (reply and the applied events), `step_out`, `no_answer`, `busy`, `limited` (`nextAt`) or `update_required`. The device's `step` mints Assumption ids in order (`a1`…`a8`), never the backend ([Turn wire contract][143]).
- **Opening:** the Problem is written or dictated in the composer and sent with **Begin** ([Wording][61]). At most one clarifying question. A non-Problem (homework, a factual question, "write me X") gets a `decline` the app words, and it doesn't use the day ([No answer][41]).
- **Breakdown:** a flat list of 3–5 Assumptions, each a hidden premise shown as a **Probe** with highlighted key words. It runs on high thinking and also returns a **title** of 10 words or fewer ([Inquiry driver][33], [Recap][60]).
- **Pushback** reveals the premise, then rewords, rejects or adds. Nothing is deleted, and earlier wordings are kept with the person's quote. The model sets `resetAngles` only when the premise really changed ([Inquiry driver][33], [Awkward cases][34]).
- **Outcomes per Assumption:** `rejected`, `challenged` (with a quote checked word for word), `unchallenged`, `left` (set down part-way) or `not_looked_at`. They are judged on the person's words, never on truth ([Awkward cases][34]).
- **Angles:** `name | narrow | slow | analogy | reveal`, at most 3 per Assumption. The app counts them, and a 4th is refused. An Open Question is optional ([Inquiry driver][33], [Awkward cases][34]).
- **Paths:** tapping a Probe opens its Path, a one-way run of app question → Reflection. Picking is by tap only. Several Paths can be in progress at once, and a finished Path can be read but not continued. A Dialogue call sees the Problem, this Path's pairs and every premise with the outcomes of ended Paths ([Dictation][36]). A Path's turn only touches that Path: an event naming another Path's Assumption, or a quote from another Path's Reflections, is refused ([Turn wire contract][143]).
- **Tone:** plain, direct and kind, one question per turn, no small talk. Blunter only to hold the person to the question asked, and never under distress. The voice warms further along a Path and when the model softens ([Inquiry shape][7], [Look and voice][54]).
- **Offers:** one open offer at a time: "Add it?" for a new Assumption, or a rewritten Problem. Picking a Probe declines an open offer. The person can add their own Assumption (`own_added`) ([Awkward cases][34]).
- **At most 3 additions** ("Add it?" or own) per Inquiry. After that the model makes no offer and "add your own" is disabled. That fits the lily's 9 slots: the Problem, 5 Probes and 3 additions ([Lily][74], [Reconcile][82]).
- **A refused state-changing event** holds the reply back for one more call. If the retry is refused too, the reply is kept and the event dropped ([Awkward cases][34]).
- **Finishing:** "Finish Inquiry" sits on the Probes screen once one Path has ended, and is offered when all have. It is the only way to the Recap. A Path's end always goes back to the Probes ([Dictation][36], [Reconcile][82]).
- **The Shelf** (one pure module over all of a device's Inquiries, the clock and today's allowance) decides whether today's Inquiry can begin, which Inquiries end by expiry, and which fill home's lily slots. The driver, import, home and the boat all read it ([Architecture review][88]).
- **Unfinished Inquiries:** at most **3 at once**. A fourth can't begin until the person finishes or deletes one, and the boat says so ([Reconcile][82]). Each ends by itself 7 days after `lastActiveAt`: into a Recap if a Path finished, otherwise it quietly goes ([Awkward cases][34], [Recap][60]).
- **Recap** is a view of the stored records, never a model call. Order: the Problem (with "First put as"), how it ended if not on Finish, Open Questions, one card per Assumption looked at (`left` included), Not looked at yet (as Probes), "Was this worth your time?", Share. A card shows no outcome cue except one line just after Finish ([Recap][60]).
- **Recap after a Step-out:** only if a Path finished. It says "This Inquiry stopped early…" and has no "worth" question ([Recap][60], [Awkward cases][34]).

## Storage on the device

- **Two store seams on the device:** an Inquiry store (Inquiries and their drafts) and a settings store (settings, walker, last known country, sent reports), each with an on-device adapter for native and a tab-memory adapter for web, which tests also use. The Inquiry driver's interface is `begin · submit · pick · pause · finish · delete` ([Architecture review][88]). Each Inquiry is kept as one JSON record with its own `schemaVersion`, and both adapters read it back through the protocol package's one `load` (migrate forward, then parse). A record that fails `load` is kept untouched, hidden from the Shelf and counted to Sentry ([Schema owner][145]).
- **Native:** SQLCipher `expo-sqlite`, with one database and one key per Account. Finished Inquiries keep their full transcript. Drafts are kept with a live Inquiry and deleted when it ends. A stepped-out Inquiry stores only `ending: 'step_out'`, never the kind of risk ([On-device keeping][46], [Inquiry driver][33]).
- **Backups allowed, end-to-end encrypted:** the key travels in iCloud Keychain on iOS and in Google Block Store on Android, and Android cloud backup happens only when it's end-to-end encrypted. Backups that come back without their key get a Try again / Delete them screen ([ADR 0008](adr/0008-inquiries-travel-only-in-the-persons-own-encrypted-backups-and-exports.md), [On-device keeping][46]).
- **Web keeps nothing past the tab.** Closing or reloading the tab loses an unfinished Inquiry and its draft. JSON import loads into the tab only, and "Sent reports" lasts only for the tab. A `beforeunload` prompt guards a live Inquiry. The 7-day rule doesn't arise on web ([On-device keeping][46], [No answer][41], [Inquiry driver][33], [Reconcile][82]).
- **Export:** PDF (pdf-lib, "Made with Look Together", an "Include the Paths" toggle), Text or JSON. The JSON is the stored records themselves in an unversioned envelope `{ format, note, inquiries }` carrying the "Anyone with this file can read it" note, for one Recap and for Export all alike ([Schema owner][145]). Settings → Export all gives one JSON file and one text file ([On-device keeping][46], [Wording][61]).
- **Import:** JSON on native and web, each Inquiry run through the same `load` as the store; one that fails is skipped with a calm notice and the rest import ([Schema owner][145]). An unfinished Inquiry continues if it's within 7 days, and stepped-out ones come back locked ([On-device keeping][46], [Versioning][48]). Import never drops an Inquiry to keep the cap: it may leave more than 3 unfinished, and today's Inquiry can't begin until fewer than 3 are ([Architecture review][88]).
- **Deletion:** one Inquiry, Delete everything (per Account, offering Export all first), Delete account (wipes this device's Inquiries by default) ([On-device keeping][46]).
- **No cross-platform sync.** A second device starts empty, and moving between platforms goes through JSON ([On-device keeping][46]).

## Accounts and region

- **Sign-in is required before the first Inquiry**, with Apple, Google or an emailed code. No passwords. The Account is a closed record (id, email or relay, provider, created, region, platform, marketing consent) and knows nothing of Inquiries ([ADR 0006](adr/0006-sign-in-is-required-and-knows-nothing-of-inquiries.md), [Sign-in][37]).
- **Auth on our own backend:** Apple and Google tokens are verified against their keys, and the backend issues its own session. No Firebase Auth (US-only). Email codes go through an email provider in the person's region ([Sign-in][37]).
- **Same verified email means the same Account.** An Apple relay address is a separate Account ([Sign-in][37]).
- **Region is chosen once, never switched.** Sign in first, then the device asks both regions whether they hold the identity. Only a new Account chooses, defaulting to the faster region by median `GET /ping`. To change region: export, delete the Account, join again and import ([ADR 0011](adr/0011-an-accounts-region-is-chosen-once-and-found-by-asking-every-region.md), [Region][66]).
- **Everything follows the Account's region:** backend, Vertex, STT/TTS, Sentry org, log bucket, counters, email. Web keeps the region only in memory for the session ([Region][66]).
- **Marketing email** only with an unticked opt-in. Accounts with no authenticated request for 24 months are deleted ([Sign-in][37], [On-device keeping][46]).
- **Account deleted elsewhere:** the device shows "This Account was deleted…" with Export all / Delete them and no default, on every launch until the person chooses ([On-device keeping][46]).
- **Apple fallback:** if App Review rejects required sign-in under 5.1.1(v), allow one Inquiry before sign-in ([Sign-in][37]).

## Limits and abuse

- **One Inquiry a day per Account**, counted only when the backend returns its Breakdown, on a rolling 24 h. A Step-out after the Breakdown doesn't give the day back ([Usage limits][30], [No answer][41]).
- **Inside an Inquiry:** 20 dictation minutes and 40 Reflections, with a quiet heads-up before either, both counted on the device. A failed or blocked Reflection doesn't count ([Dictation][36], [No answer][41], [Architecture review][88]).
- **Meters** (generic name / window / limit in server config, keyed by Account id, 48 h TTL): `inquiries` 1 / 24 h, Breakdown calls 6 / 24 h, model calls 100 / 24 h (including `/speak`), dictation minutes 60 / 24 h, reports 20 / 24 h, content reports 5 / 24 h. No meter is keyed by an Inquiry id ([closed list](privacy/closed-list.md), [No answer][41], [Architecture review][88]).
- **One admission module** decides every gate (meters, sign-up meters, spend ceiling, pause switch, version window) through `admit` and `charge`, and is the one place that keeps Help, the Step-out and contacts ungated. `GET /allowance` returns `{ canBegin, nextAt }` with no counts, and each result that charges the day returns `nextAt` ([Architecture review][88]).
- **Never gated:** Help, the Step-out and crisis contacts. The classifier's calls are never counted against the person ([Usage limits][30]).
- **Native guard:** App Attest / Play Integrity (Play nonce hashed), at most 2 new Accounts per attested install per 30 days ([Sign-in][37], [Telemetry][44]).
- **Web guard, now:** sign-in plus the Account meters, plus three meters on a salted IP hash: new Accounts (2 / 30 days), email codes sent (also per address), and web Inquiries (~3 / 24 h for shared networks). Plus the regional spend ceiling. **No App Check or reCAPTCHA** ([Telemetry][44], [Sign-in][37], [closed list](privacy/closed-list.md), [Reconcile][82]).
- **Size caps on `POST /turn`:** body ≤ `vN.turnBodyBytes` (1 MB, fitted by a test of the worst-case turn context; a 413 is a device bug shown as "no answer") ([Turn wire contract][143]), then the whole body is parsed with the declared version's request schema, which carries Problem ≤ 2,000 characters and Reflection ≤ 4,000 (a 400). Every cap is a `vN/limits` constant read by the schemas, the composer and `step`; changing one bumps the protocol version. The 40 Reflections and 20 dictation minutes are counted on the device only ([Schema owner][145]). The device's copy is trusted, with no signed state ([No answer][41], [Inquiry driver][33]).
- **Spend ceiling** per region per day, estimated by the backend from each call's usage × a price table. It gates new Breakdowns only, behind a monthly billing budget and a lowered Vertex quota. No automatic billing shut-off ([Running it alone][59], [No answer][41]).
- **Pause switch:** `newInquiries: paused` per region in server config shows the "busy" line, and Dialogues underway finish ([Running it alone][59]).

## Distress

- **Two tiers on current risk, not topic:** Step-out (suicidal ideation, self-harm, harm to others, danger right now) or soften (acute distress without risk) ([Distress][10]).
- **Detection is layered:** a fail-closed per-turn classifier on submitted Reflections and the Problem (never drafts), the model's `distress` flag, and the Help control. No reply is shown until the classifier passes it. A classifier blocked by a safety filter is a Step-out, while a classifier error or timeout is an outage ([Distress][10], [Dictation][36], [No answer][41]).
- **Step-out:** fixed app-owned text that names the risk gently, one sentence per trigger, then the "deserve" line and the contacts. Locked for good. A new Inquiry can start at once, and there is no report control on that screen ([Distress][10], [Wording][61], [Reports][43]).
- **Soften:** bluntness off, a slower pace, one check-in per Inquiry, Help stays highlighted. It never becomes a Step-out by repetition ([Distress][10]).
- **Help control:** top right on Inquiry screens only (the composer, Probes, Path, Recap), never on home, settings or About. Tapping it pauses the Inquiry with "Back to my Inquiry" and never locks it ([Screens][47], [Home backdrop][86]).
- **Contacts:** a bundled, hand-verified table (US, UK, Ireland, India, Australia), else the emergency number plus findahelpline.com. The country comes from an in-memory IP lookup at the start of each Inquiry, and the device keeps the last known one (falling back to the device region offline). "Change country" stays ([Distress][10], [Wording][61]).
- **Referral counts** for CA SB 243 are bare device increments by trigger and region. The crisis protocol is published on the website ([Distress][10], [closed list](privacy/closed-list.md)).

## AI notice and legal framing

- **AI notice at the start of every Inquiry**, as one line above the composer: "You're writing to an AI, not a person. This isn't therapy or a crisis service." No persistent label and no re-show on softening ([AI-output rules][42], [Look and voice][54], [Wording][61]).
- **The Utah check is moot:** the notice now shows on every Inquiry everywhere, so the IP lookup only returns the country for Help contacts ([AI-output rules][42], [Wording][61], [Reconcile][82]).
- **18+:** an 18+ store rating, platform age signals where available, and a self-declaration folded into the intro's AI notice: "I understand" also confirms "I'm 18 or older" ([Launch][14], [Reconcile][82]).
- **Launch footprint:** worldwide in English except OFAC-sanctioned countries and mainland China, from a US LLC, built to the strictest rules (GDPR, EU AI Act, CA SB 243 / NY Art. 47, MHMDA) ([Launch][14]).
- **Origin:** "Inspired by the way J. Krishnamurti asked questions." on the welcome's last step. About holds the signed founder's story, the independence line and plain links to the Foundations. He appears in the store description body only ([Origin story][8], [Guided first Inquiry][55]).
- **Machine-readable marking (EU AI Act Art. 50(2))** waits on Google confirming SynthID for Flash text, else we add our own marking ([AI-output rules][42]).

## Reports

- **What can be reported:** each Probe and each Path reply, through a quiet "…" / long-press menu, never the Recap or app copy. Multi-select reasons are counted in aggregate ([Reports][43]).
- **Sending the exchange:** opt-in, asked every time. Names are masked by a stateless `POST /mask`, the preview is read-only, and the exchange is kept 30 days in-region, founder-only, with no Account id. It can be deleted from the device. Never offered for a stepped-out Inquiry ([ADR 0007](adr/0007-a-report-may-carry-one-exchange-by-choice.md), [Reports][43]).

## Telemetry

- **The closed list is the source of truth** for everything kept, counted or shared. Any PR that adds a field, counter or party updates [`docs/privacy/closed-list.md`](privacy/closed-list.md) ([Telemetry][44]). In code it is one typed, platform-free package that the logger allowlist, counters, Firestore record types and Sentry scrubber are typed from; CI regenerates the markdown tables from it ([Architecture review][88]).
- **No analytics SDK, no push, no stable id for analytics.** Aggregate counters only, in regional Firestore. Return rate comes from the device-side `returning` bucket ([Telemetry][44]).
- **Sentry:** a US and an EU org, on by default with an off switch, stripped of ids and content ([Telemetry][44]). A device crash before the region is known waits in memory until it is, or is dropped ([Architecture review][88]).
- **Logs:** one typed allowlisted logger into regional buckets for 30 days. Cloud Run request logs are excluded and Error Reporting is off ([Telemetry][44]).
- **No OTA updates in store builds.** Beta builds keep EAS Update, which the beta invite discloses ([Telemetry][44]).
- **Reminder:** an opt-in local notification on native ("Today's Inquiry is open."), never naming a Problem ([Telemetry][44], [Wording][61]).
- **Monitoring:** log-based metrics from allowlisted fields. Urgent alerts go by Google Cloud app push, notices by email. A daily phone dashboard, a weekly review via `pnpm stats`. Alerts are tested on staging before launch ([Running it alone][59]).

## Voice

- **Dictation, not conversation:** speech only fills an editable Reflection, sent on a Submit tap. Replies are text, read aloud only on a "listen" tap. No barge-in, turn-ending or spoken Dialogue ([ADR 0005](adr/0005-voice-is-dictation-not-conversation.md), [Dictation][36]).
- **Stack:** Cloud STT v2 streaming over a `/dictate` WebSocket on the regional backend, reconnecting every 5 minutes. `POST /speak` returns Cloud TTS audio. Both on `us`/`eu` endpoints with data logging off, so nothing is stored ([Dictation][36], [STT/TTS retention][27]).
- **On native**, `expo-audio` streaming. **On web**, our own `AudioWorklet` ([Expo libraries][45]).
- Dictation works in every composer. Starting it stops playback ([Accessibility][56], [Dictation][36]).

## Infrastructure and model

- **Per region (`us`, `eu`):** one Cloud Run backend in Node/TypeScript on Hono, with `@google/genai` behind the LLM abstraction. Firestore holds Accounts, meters, counters and content Reports. Web is on Firebase Hosting. Pulumi in TypeScript, all in Google Cloud project `look-together` ([Backend language][26], [Regional layout][28], [Dictation][36]).
- **LLM interface:** `call(kind: breakdown | turn | classify, prompt, input, outputSchema)` returns the output typed by that schema with provider-neutral usage, or `blocked`, or `failed`. The caller passes the schema (`vN`'s model output, or the classifier's backend-owned one) and the adapter never imports `versions`. Thinking level and every Vertex setting live in the adapter; the turn module decides what `blocked` means. The evaluation judge is outside it ([Architecture review][88], [Schema owner][145]).
- **Vertex schema:** the adapter converts the schema with `z.toJSONSchema` plus a Gemini override (`const` → one-value `enum`, no `$schema`), sends it as `responseJsonSchema`, and re-parses every reply with the same schema, since Gemini ignores length keywords; a parse failure is `failed`. A test fails on any keyword outside Vertex's supported list ([Schema source][144], [Schema owner][145]).
- **Region config:** each backend builds one region value at boot and passes it into every adapter; nothing else reads the environment for it ([Architecture review][88]).
- **Model:** Gemini 3.8 Flash in both regions, on pinned `us`/`eu` endpoints, never `global`. The Breakdown runs on high thinking, the Dialogue turn on low. Two prompts plus the distress classifier, and no Recap prompt ([Launch][14], [Inquiry driver][33]).
- **Vertex settings:** caching off (`disableCache: true`, enforced by infra), request-response logging off, no grounding, all four safety filters `OFF` on every call. A block is a billed 200 with an empty candidate and maps to "no answer". Google may keep flagged prompts up to 90 days in-region, which we disclose, and we promise no "zero retention" ([Caching][32], [Abuse logging][22], [Safety filters][40]).
- **Cost:** about $0.03 per text Inquiry including the classifier ([Inquiry cost][29]).
- **Failures:** one calm "no answer". The backend retries once, the Inquiry is left untouched and the Reflection goes back in the draft box. Deadlines are 60 s for the Breakdown and 30 s for a turn. No queued sends offline ([No answer][41]).
- **Model switch:** a deploy only, through the gate check, with no runtime fallback model ([Versioning][48]).

## Evaluation and launch

- **Evaluation set:** synthetic, ~30 ordinary and ~30 distress cases plus injection and non-Problem cases, each a `vN` request body run through the turn module ([Turn wire contract][143]). A fast tier runs on PRs and a gate tier (5 runs each) before launch or any model or prompt change. Code checks what's countable, by running the model's output through the reducer and failing on any refusal, plus the text checks (no "I", no Krishnamurti), and an Opus 5.5 judge the rest; the founder's blind read decides. Zero tolerance on hard lines. The distress classifier is picked on 100% Step-out recall ([Evaluation][17], [No answer][41]).
- **Gate records:** one pass per (prompt hash, model id, protocol version), in the repo. The prompt hash covers the prompt text plus the generated Vertex schema ([Schema owner][145]). A deploy that lacks one fails ([Versioning][48]).
- **Order:** friends test (15–20 known adults) → closed beta (~100 strangers by link) → public launch. Nobody but the founder sees the app before the whole pixel world is built. The beta opens only after the full gate, the LLC and the lawyer and clinician reviews ([Beta][81]).

## Versioning

- **One protocol version** covers the stored `schemaVersion`, the event set and the reducer rules. The backend serves N and N-1 side by side and retires N-1 at <2% of turns or after 90 days, or at once for a hard-line break ([ADR 0009](adr/0009-the-backend-serves-two-protocol-versions-side-by-side.md), [Versioning][48]).
- **Below the window**, only new turns are blocked, with a calm update screen. Web offers "Export, then reload" ([Versioning][48]).
- **Release order:** backend → web → stores. Forward-only migrations run on the device and on import, tested against golden fixtures ([Versioning][48]).
- **Versions as folders:** each protocol version is a frozen `vN/` folder in the protocol package (types, schema, reducer) behind one `versions` index, with migrations outside the folders. Prompts are backend-only, as `prompts/vN`. The app imports only the current version. Only a change to the stored schema, the event set or the reducer's rules bumps the version; a prompt change alone goes through the gate record ([Architecture review][88]).
- **One schema source per version:** every `vN` is written with `zod/mini` (plain `zod` is banned in the package and the app) and satisfies one `Protocol` interface: `{ v, limits, schemas: { inquiry, turnRequest, turnResponse, modelOutput }, turnContext, check, step }`. Types, the Vertex schema and import validation all come from it, and schemas carry no descriptions for the model. Migrations import old versions' types only. An unknown or future `v` is a 400 reported to Sentry, and the device parses every `/turn` response, showing "no answer" on a failure ([Schema source][144], [Schema owner][145]).

## Screens and flow

- **Intro**, all on the landing and before any model call: a 6-step welcome (its lily grows, the camera stays still), then the AI notice with the 18+ confirmation, then privacy (short, plus a "How your words are handled" page), then sign-in, then the region choice for new Accounts only. Sign-in pans right to home, which is the arrival ([Guided first Inquiry][55], [Shoreline welcome][80], [Region][66], [Wording][61], [Reconcile][82]).
- **Guided first Inquiry:** **leaf notes** (plain frost with a "Guide" caption, the Guide palette row dimming everything else, "Got it"). Skip appears on the first note. Settings → "Show the guide again". The first home note points at the **boat** ([Guided first Inquiry][55], [Shoreline welcome][80], [Reconcile][82]).
- **Home** is the pond (see [Home](#home)). Settings is the boathouse and About the signpost, both on the landing to the left. Opening either pans left ([Frames][78], [Walker][84]).
- **Inquiry screens:** Probes, Path and Recap are frost columns over scenery that can't be touched. Back is a mid-height **‹** on the left. A **›** on the right shows only over steps already reached, and an answered step shows its Reflection under "You reflected" ([Frames][78], [Home backdrop][86]).
- **The composer** grows with the text and can expand to a full-screen editor, the default at AX sizes. It shows a count near the cap ([Screens][47], [Accessibility][56]).
- **Wide web:** panes open to the right (Inquiry list | Probes | Path), with one camera behind them. Below the breakpoint, web falls back to the phone stack ([Screens][47], [Shoreline][71]).
- **Sheets** only for short tasks: Report, Share (PDF | Text | JSON) and the Help pause ([Screens][47], [Wording][61]).
- **Settings:** walker, season, Still water, crash reports, reminder (native), the region (read-only), export, import, Sent reports, "Show the guide again", Delete everything, sign out, Delete account ([Screens][47], [Walker][84], [Region][66], [Accessibility][56], [Inquiry moments][73]).

## Look and the pixel world

### Rendering

- **We render our own pixel art, with no game engine and no watercolour.** React Native Skia v2 draws the world at art resolution offscreen and upscales it by a whole number, under native text, on iOS, Android and web ([ADR 0010](adr/0010-we-render-our-own-pixel-art-world-without-a-game-engine.md), [Pixel scene][68], [Pixel art][69]).
- **Plain TypeScript:** a pure `sceneFromState` over the Inquiry's records, plus a director that plays **cues** and never writes back. The director reads `(prev, next)` of a world view (the records, what the driver has in flight, and one-off moments such as a lily tap or a season flip) and returns each cue with its duration; when the next question appears, the later of the walker sitting and the reply landing, is worked out there too ([Architecture review][88]). Screens are camera framings of one world, and the clock runs only while something moves. Seeded choices use integer maths, checked byte for byte in CI ([Pixel scene][68], [Lily][74]).
- **Indexed colour:** one master index, and one palette PNG with a row per season × mode: **Normal, Still water, Step-out, Guide**, each with its reflection twin. It also holds the coat, skin, paint and fur rows ([Asset spec][75], [Shoreline welcome][80], [Walker][84], [Home backdrop][86]).

### Style

- **Soft hi-bit at 320 art px across** on every device class, with 12-step full-colour ramps and Luminous light (shafts, haze, glows). Selective edges on trees and coloured outlines on touchable pieces, never black. Ordered dithering only in light, mist and water depth. Calm, soft and somewhat nostalgic; never a retro-game homage ([Pixel style][70], [Pixel art][69]).
- **Motion:** water at 8 fps (a ripple takes ~3 s), palette-cycled glints at 5 fps, a 3 fps bob, no easing on pixel moves, and a world clock that never runs backwards ([Pixel style][70], [Home backdrop][86]).
- **Season follows the system appearance:** light is spring morning, dark is autumn evening. Settings offers Auto / Spring morning / Autumn evening ([Inquiry moments][73]).
- **Reduce Motion** stops all movement except slow cycling, and moves become an 8-step dither dissolve. **Still water** (Settings: System / On / Off) freezes the frame on the Still water row ([Pixel style][70], [Accessibility][56]).
- **Never:** CRT, chiptune, HUD frames, screen shake, counters, cute characters. Nothing in the world rewards, counts or compares ([Pixel style][70], [ADR 0010](adr/0010-we-render-our-own-pixel-art-world-without-a-game-engine.md)).

### The Shoreline

- **One wide world, a horizontal loop**, about 3354 × 1180 art px. From left to right: the landing (signpost, boathouse, Recap spot), home's pond in the forest, today's lily with its pier, then eight islets across a lake under mountains, then a jetty ashore at the landing. Opening a screen pans right, Back pans left, and the words travel with the world ([Shoreline][71], [Scenery][83], [Home backdrop][86]).
- **Scaling:** whole numbers only. Phones use round(width ÷ 320); tablets and web use ceil(dpr × 1.25). Extra height on tablets and wide views goes to the sky ([Shoreline][71], [Frames][78]).
- **Waterline shares:** Probes ~60%, Path ~44%, Recap ~76% with the boat low on the water ([Frames][78], [Walker][84]).
- **Help and the Step-out never move the camera.** They only switch to the Still water or Step-out row ([Shoreline][71], [Inquiry moments][73]).

### Home

- **The style kit's forest, three rows deep** (the back row in the far ramp), with light shafts and cattails and no hills. One or two of **twelve small scenes** are picked at random on every visit, with equal odds, never tied to an Inquiry ([Home backdrop][86]).
- **The boat begins an Inquiry.** The walker sits in the moored rowboat, labelled "Begin today's Inquiry", and tapping it rows to today's lily. When today's Inquiry is used, the label reads "Next at 15:40" (dimmed, still focusable). At 3 unfinished it says to finish or delete one. **The New Inquiry lily pad is gone**, along with its dry state and sprite ([Walker][84], [Reconcile][82]).
- **At most three lilies:** unfinished Inquiries fill the slots first, each ageing green → yellow → brown and tagged with days left and the Problem's first words. Recap lilies fill the rest: one finished within 24 h is flowered with its title, older ones are smaller and paler ([Walker][84], [Lily][74], [Reconcile][82]).
- **Older Recaps:** the trailing older lily carries an "Older Recaps" tag that opens a quiet month-grouped list (flower, title, date). The tag shows whenever a Recap is off the pond ([Recap][60], [Reconcile][82]).
- **Tapping a lily** opens its Inquiry or Recap. Labels are always shown ([Walker][84]).

### The lily

- **Composed from a kit:** 6 pad sprites, an open and a closed flower, and the "Add it?" bud, on 4 hand-composed plans of 9 slots each. A random 32-bit seed made at Begin, kept only on the device, picks the plan, mirror and sprites ([Lily][74]).
- **One pad unfurls per Probe** when the Breakdown lands, plus one per accepted addition. Pads never change when a Path ends. Ageing runs on days since last activity and stops at the Recap ([Lily][74], [Inquiry moments][73]).

### The Path and the walker

- **The walker** is the person: a small figure (figure, jacket and skin tone set in Settings, kept on the device) that never speaks or leads ([Walker][84]).
- **A Path walks eight themed islets**, drawn in a fresh order from the seed and the Path's number out of eleven. A second Path starts again at the front. Eight steps is the cap, and a longer Path stays on the last islet ([Scenery][83]).
- **The walk is the wait:** Submit walks the walker over the next bridge to the islet's seat. The next question fades in when it sits, or when the reply lands if that's later. Back (‹) walks it back, and › walks forward over reached steps with no wait ([Walker][84], [Home backdrop][86]).
- **Waiting:** the koi under the water and the dragonfly above it, only if the reply is still out. They appear at no other time ([Inquiry moments][73], [Walker][84]).
- **Finish Inquiry** on the Probes sends the camera along the rest of the chain and ashore to the landing, where the walker sits in the boat below the Recap. The Recap has no Back. The labelled boat, "Row home", rows back to the mooring, and today's lily flowers as it comes in ([Scenery][83], [Walker][84], [Reconcile][82]).

### Cues

- **A closed list:** Begin (a drop on the pond), waiting (koi, dragonfly), the Breakdown landing (pads unfurl), "Add it?" (a bud, then a pad), Submit (the walk), Finish (the walk ashore and the flower opening on Row home), a tap on a Recap lily (a ripple), and palette dissolves for Help, the Step-out and a season flip ([Inquiry moments][73], [Walker][84]).
- **Each cue** lasts ≤ 2 s, never blocks text, is never replayed, and passes the no-reward checklist. Outcomes, Open Questions, "worth", "no answer" and offline are never shown in the world ([Inquiry moments][73]).

### Text over the world

- **Frost panels:** one pane per group of words, made of 3-art-px cells averaged from the art, tinted sky or water by side of the waterline, with notched corners and a lit top edge. No halo. 55% tint at rest, 72% in reading mode, a solid plate under contrast settings ([Frost panels][72]).
- **Reading mode** starts on opening the Probes, a Path or a Recap, on the keyboard or on scrolling. The world runs at half speed with the palette unchanged ([Frost panels][72]).
- **Raise the evening sky tint at rest** until it passes 4.5:1 on its own ([Frost panels][72]).
- **Recap cards** are frost cards in art pixels, with the Probe and Assumption above their waterline and the quote below. Tapping a card opens its Path ([Recap][60], [Frost panels][72]).
- **The keyboard** covers the scene and never moves it. The composer grows up from it, no higher than just under the waterline ([Frost panels][72]).

### Type

- **Fraunces** (static `SOFT` 100 cuts on native) for the app's words and the wordmark. **Nunito** for the person's words and controls. Six steps: 12/14/16/18/22/28, following the system text size ([Typography][58]).

### Art assets

- **Code draws the whole landscape and the islets.** AI plus cleanup makes a short sprite list: the lily kit and its frames, the rowboat (~68 × 13), the walker (walk, seated on a ledge, seated on the ground, rowing), the koi, the dragonfly, the drop, the twelve home scenes. Snapped to the master index, touched up in Aseprite, shipped with no credit ([Asset spec][75], [Walker][84], [Home backdrop][86]).
- **The tool is Retro Diffusion RD Pro**, starting from code-drawn blockouts at the exact size, paid balance only. PixelLab is the fallback ([Sprite tool][79]).
- **Each sprite is generated at its exact size.** A creature is at least 20 px on its long side, and every touchable sprite gets a code-drawn hit area of at least 48 art px ([Sprite sizes][85]).
- **Spec:** indexed `.aseprite` sources, greyscale index PNG sheets plus a JSON manifest, checked in CI ([Asset spec][75]).

## Copy

- **Every fixed string has a first wording** in the [copy deck prototype][61]. The app speaks as "we", never "I", and "it" is only ever the AI. Buttons stay short. Lines tagged legal are locked only after review ([Wording][61]).
- **One "busy" line** for the ceiling, the turn meter and the pause switch: "Look Together is busy right now. Your words are kept; try again in a little while." ([Wording][61]).
- **Still to draft:** the boat's label at 3 unfinished, and the 18+ wording on the AI notice ([Reconcile][82]).

## Accessibility

- **WCAG 2.2 AA** on all three platforms. The scene is hidden from screen readers, and controls are named in glossary words, never by metaphor. The boat is "Begin today's Inquiry" or "Row home", the boathouse is "Settings" ([Accessibility][56], [Reconcile][82]).
- **Large text:** a Path step that doesn't fit lets go of the fixed waterline and scrolls as one column ([Accessibility][56]).
- **Focus** moves to each new heading and to the new question. Help comes straight after Back. The ‹ › arrows replace swipe ([Accessibility][56]).
- **Checks:** CI runs axe, React Native lint and a headless contrast render of every frost pane per scene, season and mode. A manual screen-reader pass, and a screen-reader user in the beta ([Accessibility][56], [Frost panels][72]).

## Leftovers from dropped ideas

These lines still sit in older tickets but no longer hold:

- **"No accounts"** ([Storage][9]) → sign-in is required ([Sign-in][37]).
- **"Per install or browser", the install token, the random browser id** ([Usage limits][30]) → meters keyed by Account id ([Sign-in][37]).
- **"A lost device loses its Inquiries", backups excluded** ([Storage][9], [Expo libraries][45]) → encrypted backups allowed ([On-device keeping][46]).
- **"Transcript only while the Inquiry is live"** ([Storage][9], [Inquiry driver][33]) → finished Inquiries keep it ([On-device keeping][46]).
- **App Check and reCAPTCHA on web** ([Usage limits][30], [Expo libraries][45]) → dropped ([Telemetry][44]).
- **Country table and region switch in Settings, "closer region"** ([Regional layout][28], [Launch][14]) → chosen once by latency ([Region][66]).
- **Crisis contacts from the device region setting** ([Distress][10]) → IP-derived country, last known on the device ([Wording][61]).
- **AI disclosure re-shown only in Utah; the "AI · not therapy" label** ([Distress][10], [Screens][47]) → one notice at every Inquiry's start ([AI-output rules][42], [Look and voice][54]).
- **"Need help now?" on every screen** ([Distress][10]) → Inquiry screens only ([Screens][47]).
- **LiveKit, the voice worker, the per-region VM, Gemini Live, barge-in, the Done button, "let me think", `pick` by speech** ([Voice stacks][4], [Voice feel][12], [Backend language][26], [Regional layout][28], [LiveKit latency][31], [Inquiry driver][33]) → dictation only ([Dictation][36]).
- **Claude Sonnet 5.5** ([Model choice][11]) → Gemini 3.8 Flash ([Launch][14]).
- **Caching up to 24 h** → off ([Caching][32]).
- **The soft and firm halo, blurred / `BackdropFilter` glass** ([Typography][58], [Rendering tools][63], [Recap][60]) → frost panels ([Frost panels][72]).
- **Watercolour, painted layers, WebP, Rive, Gemini image tools** ([Art direction][64], [Rendering tools][63]) → self-rendered pixel art ([Pixel art][69]).
- **The clock stopping while reading** ([Pixel scene][68]) → half speed in reading mode ([Frost panels][72]).
- **The brook, the pool and the waterfall; home under the mountains** ([Look and voice][54], [Shoreline][71], [Scenery][83]) → islets, the landing, the forest home ([Scenery][83], [Home backdrop][86]).
- **The stone skim; the rowboat as Settings; the "Row home" button** ([Look and voice][54], [Inquiry moments][73], [Frames][78], [Scenery][83]) → the walker, the boathouse, the labelled boat ([Walker][84]).
- **The New Inquiry and Finish Inquiry lily pads** ([Look and voice][54], [Sprite sizes][85]) → the boat begins, and Finish Inquiry is a frost control on the Probes ([Walker][84], [Reconcile][82]).
- **Recap flowers as a pond of 3–4, the closed-lily cluster** ([Recap][60], [Frames][78]) → at most three lilies plus the Older Recaps tag ([Walker][84], [Reconcile][82]).
- **"Several unfinished Inquiries, about 7"; "Starting today's Inquiry never asks you to finish another first"** ([Screens][47]) → at most 3 unfinished ([Reconcile][82]).
- **Back at the top left; swipe between steps** ([Screens][47], [Look and voice][54]) → mid-height ‹ ›, swipe off with screen readers ([Home backdrop][86], [Accessibility][56]).
- **Mirrored question/answer pairs; the "In your words" label and outcome tags on Recap cards** ([Look and voice][54], [Guided first Inquiry][55]) → frost cards with no outcome cue ([Recap][60]).
- **Season by the clock** ([Look and voice][54]) → by system appearance ([Inquiry moments][73]).
- **At most 3 Breakdown calls per Inquiry id** ([No answer][41]) → Breakdown calls 6 / 24 h per Account, so no Inquiry id reaches the server ([Architecture review][88]).
- **The device sends the Inquiry and gets the new Inquiry back; body ≤ 64 KB** ([Architecture review][88]) → a turn context out, the reply and applied events back, body ≤ 1 MB ([Turn wire contract][143]).
- **The adapter picks the output schema by `kind`; a separate JSON export schema** ([Architecture review][88]) → the caller passes `vN`'s schema into `call`, and the export is the stored record in an envelope ([Schema owner][145]).

## Out of scope for the spec

Carried as build or launch work, not decisions: prompt tuning, the Skia v2 / v3 choice and mid-range Android frame rate ([Skia measurements][140]), visual polish, pixel-art branding and store art, home spacing, dictation and Path UX tuning, the pre-launch legal list, and acting on post-launch signals. Patterns, cloud storage, paid plans, other languages and on-device models are post-MVP. All are listed on the [map][1] under **Out of scope**.

[1]: https://github.com/shrujancheruku/look-together/issues/1
[3]: https://github.com/shrujancheruku/look-together/issues/3
[4]: https://github.com/shrujancheruku/look-together/issues/4
[7]: https://github.com/shrujancheruku/look-together/issues/7
[8]: https://github.com/shrujancheruku/look-together/issues/8
[9]: https://github.com/shrujancheruku/look-together/issues/9
[10]: https://github.com/shrujancheruku/look-together/issues/10
[11]: https://github.com/shrujancheruku/look-together/issues/11
[12]: https://github.com/shrujancheruku/look-together/issues/12
[14]: https://github.com/shrujancheruku/look-together/issues/14
[17]: https://github.com/shrujancheruku/look-together/issues/17
[22]: https://github.com/shrujancheruku/look-together/issues/22
[26]: https://github.com/shrujancheruku/look-together/issues/26
[27]: https://github.com/shrujancheruku/look-together/issues/27
[28]: https://github.com/shrujancheruku/look-together/issues/28
[29]: https://github.com/shrujancheruku/look-together/issues/29
[30]: https://github.com/shrujancheruku/look-together/issues/30
[31]: https://github.com/shrujancheruku/look-together/issues/31
[32]: https://github.com/shrujancheruku/look-together/issues/32
[33]: https://github.com/shrujancheruku/look-together/issues/33
[34]: https://github.com/shrujancheruku/look-together/issues/34
[36]: https://github.com/shrujancheruku/look-together/issues/36
[37]: https://github.com/shrujancheruku/look-together/issues/37
[40]: https://github.com/shrujancheruku/look-together/issues/40
[41]: https://github.com/shrujancheruku/look-together/issues/41
[42]: https://github.com/shrujancheruku/look-together/issues/42
[43]: https://github.com/shrujancheruku/look-together/issues/43
[44]: https://github.com/shrujancheruku/look-together/issues/44
[45]: https://github.com/shrujancheruku/look-together/issues/45
[46]: https://github.com/shrujancheruku/look-together/issues/46
[47]: https://github.com/shrujancheruku/look-together/issues/47
[48]: https://github.com/shrujancheruku/look-together/issues/48
[54]: https://github.com/shrujancheruku/look-together/issues/54
[55]: https://github.com/shrujancheruku/look-together/issues/55
[56]: https://github.com/shrujancheruku/look-together/issues/56
[58]: https://github.com/shrujancheruku/look-together/issues/58
[59]: https://github.com/shrujancheruku/look-together/issues/59
[60]: https://github.com/shrujancheruku/look-together/issues/60
[61]: https://github.com/shrujancheruku/look-together/issues/61
[63]: https://github.com/shrujancheruku/look-together/issues/63
[64]: https://github.com/shrujancheruku/look-together/issues/64
[66]: https://github.com/shrujancheruku/look-together/issues/66
[68]: https://github.com/shrujancheruku/look-together/issues/68
[69]: https://github.com/shrujancheruku/look-together/issues/69
[70]: https://github.com/shrujancheruku/look-together/issues/70
[71]: https://github.com/shrujancheruku/look-together/issues/71
[72]: https://github.com/shrujancheruku/look-together/issues/72
[73]: https://github.com/shrujancheruku/look-together/issues/73
[74]: https://github.com/shrujancheruku/look-together/issues/74
[75]: https://github.com/shrujancheruku/look-together/issues/75
[78]: https://github.com/shrujancheruku/look-together/issues/78
[79]: https://github.com/shrujancheruku/look-together/issues/79
[80]: https://github.com/shrujancheruku/look-together/issues/80
[81]: https://github.com/shrujancheruku/look-together/issues/81
[82]: https://github.com/shrujancheruku/look-together/issues/82
[83]: https://github.com/shrujancheruku/look-together/issues/83
[84]: https://github.com/shrujancheruku/look-together/issues/84
[85]: https://github.com/shrujancheruku/look-together/issues/85
[86]: https://github.com/shrujancheruku/look-together/issues/86
[88]: https://github.com/shrujancheruku/look-together/issues/88
[140]: https://github.com/shrujancheruku/look-together/issues/140
[143]: https://github.com/shrujancheruku/look-together/issues/143
[144]: https://github.com/shrujancheruku/look-together/issues/144
[145]: https://github.com/shrujancheruku/look-together/issues/145
