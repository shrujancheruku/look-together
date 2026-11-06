# The closed list

Everything Look Together keeps, counts or lets someone else see. The privacy disclosure is written from this list, and nothing goes in it by accident: a change that stores a new field, adds a counter or sends something to a new party updates this file in the same PR.

Inquiry content (Problems, Breakdowns, Reflections, replies, Recaps, drafts) is never on this list. It stays on the person's devices and in their own encrypted OS backup ([ADR 0003](../adr/0003-inquiry-content-never-on-our-servers.md), [ADR 0008](../adr/0008-inquiries-travel-only-in-the-persons-own-encrypted-backups-and-exports.md)). The one exception is an exchange the person chooses to send with a Report ([ADR 0007](../adr/0007-a-report-may-carry-one-exchange-by-choice.md)).

Unless a line says otherwise, everything is kept in the person's region (`us` or `eu`).

## What we keep

| Store | Fields | Kept for |
|---|---|---|
| **Account** (Firestore) | account id, email or Apple relay, linked identities (provider + the provider's subject id, one per Apple, Google or email sign-in), created date, region, platform, marketing consent (yes/no + timestamp), `lastSeenMonth` (`YYYY-MM`, written at most once a month) | Until the person deletes it, or 24 months past `lastSeenMonth`; gone from backups within 30 days ([ADR 0006](../adr/0006-sign-in-is-required-and-knows-nothing-of-inquiries.md)) |
| **Meters** (Firestore), keyed by account id | `inquiries` (1 / 24 h), Breakdown calls (6 / 24 h), model calls (100 / 24 h, including `/speak`), dictation minutes (60 / 24 h), reports (20 / 24 h), content reports (5 / 24 h), `device_counts` (20 / 24 h, one shared budget for every device increment, never which counter was sent): counts and window starts only, plus on `inquiries` the SHA-256 of the device's begin key that used the day (never the key itself), so a lost Breakdown can be retried without a second charge. No meter is keyed by an Inquiry id | 48 h TTL |
| **Sign-up and sign-in meters** (Firestore) | new Accounts per attested install and per salted IP hash (2 / 30 days); email codes sent per salted IP hash and per address; email lookups ("does a region hold this email?") per salted IP hash (10 / 24 h); web Inquiries per salted IP hash (~3 / 24 h) | 30-day TTL for sign-up meters, 48 h for the rest |
| **Content Reports** (Firestore, apart from Accounts) | the masked exchange, encrypted with the region's Cloud KMS `reports` key; reasons, stage, prompt version, model id, region, platform, app version, date. The document id is the SHA-256 of a delete token only the sending device holds; no Account or Inquiry id, and the token itself is never stored | 30-day TTL, or until the device deletes it. Only the founder can decrypt, so every read is a logged KMS decrypt |
| **Aggregate counters** (Firestore) | see [What we count](#what-we-count) | Kept as aggregates |
| **Operational logs** (Cloud Logging, regional buckets) | only the allowlisted fields below | 30 days |
| **Monitoring metrics** (Cloud Monitoring, **global**) | log-based counts and latencies by allowlisted log fields only, uptime-check results for `/healthz`; alerts on them reach only the founder (Google Cloud mobile app, email) as metric names and values | 24 months (Google's fixed retention) |
| **Crash reports** (Sentry, US or EU org by region) | exception type, stack trace, the message for our own error classes only, app version, OS, device model, region | 30 days (Developer plan) |

**Allowlisted log fields:** route, status, latency, outcome kind, region, call type, model id, prompt version, app version, platform. Never request or response bodies, account id, email, IP, user agent or Inquiry id, and never an upstream error body. One logger with a typed field list enforces this, with a test that fails on any other field. Cloud Run's built-in request logs (which carry IP and user agent) and the load balancer's (`http_load_balancer`, whose request logging also stays off) are excluded on the `_Default` sink, and `_Default` is routed to the regional buckets. Error Reporting is turned off (it is global).

**Admin audit logs** (`_Required`, global, 400 days, fixed by Google) record only the founder's and service accounts' actions on the project. Data Access audit logs stay off, except for **Cloud KMS**, which logs each encrypt and decrypt on the `reports` key with the principal and time and no user data, into the regional buckets for 30 days. Firestore's stay off, because they would log Account ids in document paths.

**Crash reports** are on by default with an off switch in settings. They carry no breadcrumbs, screenshots, view hierarchy, replay, URLs, request data, user id or session tracking. `beforeSend` overwrites the user, and Sentry is set server-side to prevent storing IPs and to drop geo data. On the device, a crash before the Account's region is known is held in memory and sent once the region is known, or dropped if the app closes first; it never goes to the other region's org.

## What we count

Aggregate counters, no Account id, Inquiry id or content in any of them. The backend sums increments in memory and writes them to the region's Firestore every 60 s.

| Counter | Dimensions | Counted by |
|---|---|---|
| Signups | region, platform, day | Backend, on Account creation |
| Daily active Accounts | region, platform, day | Backend, a distinct count of today's meter keys, stored as a number |
| Inquiries started (Breakdown returned) | `returning` (`first` / `within_7d` / `within_30d` / `older`, from the device's own records), region, platform, app version, day | Backend, with the bucket from the device |
| Recap reached / abandoned | region, platform, app version, day | Device, a bare increment |
| Change in understanding (yes / no) | region, platform, app version, day | Device, from the records |
| "Was this worth your time?" (yes / not sure / no) | region, platform, app version, day | Device |
| Step-out referrals | source (classifier / model / help), region | Backend's turn module for `classifier` and `model`; device, a bare increment on each Help open, for `help` |
| Soften | region, platform, app version, day | Backend's turn module, on a result carrying `soften` |
| Failures | outcome kind, region, call type | Backend |
| Dropped events | region, call type | Backend |
| Estimated spend | region, day, call type | Backend, from each call's token, audio-second and character counts × the server-config price table; gates new Breakdowns at the regional ceiling |
| Reports | reason, stage, prompt version, model id, region, platform, app version, day | Backend |

Device increments go over an authenticated request, a list of up to 4 at a time, and the backend never stores who sent them. Each costs 1 against the Account's `device_counts` meter (20 / 24 h), which holds only a number. A request the remaining budget can't cover counts nothing and still returns 204. A failed increment is dropped, never queued or retried, so device counts undercount offline. The `help` referral is counted per Help open and reported as device-reported, apart from the server-counted `classifier` and `model` referrals.

## Who else sees what

| Party | What | Where, and for how long |
|---|---|---|
| **Google, Vertex AI** (Gemini 3.8 Flash) | Each turn's content: the Inquiry so far, the Reflection, classifier windows; `POST /mask` exchanges | `us` / `eu` endpoints. Request-response logging and caching off. Google may keep flagged prompts up to 90 days in-region for abuse, with possible human review |
| **Google, Cloud STT v2 and TTS** | Dictation audio, text to read aloud | `us` / `eu` endpoints, data logging off, not stored |
| **Google, Play Integrity** (Android) | Hashed nonce, package, version, signing certificate, device attestation | Deleted after Google's fixed period |
| **Apple, App Attest** (iOS) | Attestation of the app install | Apple |
| **Apple / Google sign-in** | Identity tokens, verified on our backend | Apple, Google |
| **Email provider** (in the person's region; to be chosen) | Email address, one-time code, account notices; marketing email only with opt-in | Per the provider |
| **Sentry** | Crash reports as above. Its own account and settings data is always in the US | US (Iowa) or EU (Frankfurt) org |
| **Google, Firebase Hosting** (web) | Web visitors' IP addresses, for abuse detection and usage analysis. Hosting request logs are never linked to our Cloud Logging | Global, "a few months" (Google's own retention) |
| **Expo, beta builds only** | `EAS-Client-ID`, IP, platform, runtime version, on each update check from `development` / `preview` builds; told in the beta invite | US. Store builds have updates disabled and send nothing |
| **Apple iCloud / Google backup** | The person's encrypted Inquiries, with the key carried end-to-end encrypted (iCloud Keychain, Block Store), unreadable to Apple or Google ([ADR 0008](../adr/0008-inquiries-travel-only-in-the-persons-own-encrypted-backups-and-exports.md)) | The person's own backup |

## Not collected

- No session store: the session token is signed and checked against the Account, so nothing is kept per session. On the device it is kept only in the secure store, this device only (native), or the tab's memory (web).
- No analytics or attribution SDK, and no stable install or user id sent for analytics.
- No push notifications or push tokens. A reminder that the next Inquiry has opened, if any, is a local notification scheduled on the device.
- No reCAPTCHA or App Check on web.
- No over-the-air updates in store builds, and no `expo-insights` or EAS Observe.
- No IP-derived location stored: the load balancer resolves the country from the IP in transit, `GET /country` returns only the country, and it is never stored or logged server-side. No state or city is looked up. On the device the last looked-up country and any manual pick are kept in the settings store.

## Still to check

- Apple's App Attest data handling, from Apple's own pages.
