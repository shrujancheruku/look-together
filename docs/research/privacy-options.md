# Privacy options for Inquiries on Expo and Google Cloud

Research for [#6](https://github.com/shrujancheruku/look-together/issues/6) (parent map [#1](https://github.com/shrujancheruku/look-together/issues/1)). Sources were read on 2026-10-29. Vendor docs and terms change, so check them again before relying on any of this.

> **Not legal advice.** This is a technical and regulatory survey for planning. Before launch, get advice from a qualified privacy lawyer for whichever launch region is chosen.

## Short answer

- **No architecture makes an Inquiry fully end-to-end private from us.** The Problem, the Dialogue and any voice audio have to reach a model in plaintext. Client-side encryption can protect what is **stored** (Inquiries and Patterns at rest). It can't protect what is **processed** by Gemini or Claude on Vertex AI.
- **The strongest honest claim** is a combination of three things: (1) Inquiries are kept on the device by default; (2) model calls go through Vertex AI with every retention feature off, so prompts aren't used for training and aren't stored beyond the request; (3) anything synced for Patterns is encrypted on the client with a key we don't hold.
- **Model choice affects this.** On Vertex AI, Gemini can be configured for zero data retention, and Google's terms forbid training on the data. Claude Fable and Mythos models are different: Google logs every prompt and response for up to 30 days, the data is shared with Anthropic for abuse monitoring, and there's no opt-out. Older or non-"Advanced AI" Claude models aren't subject to that rule.
- **Legally, treat Inquiry content as special-category / health data.** Under GDPR/UK GDPR, talking through personal Problems will often reveal mental health, beliefs or sex life, and Patterns are inferences, which count too. That likely means explicit consent (Art. 9(2)(a)), a DPIA, and full Art. 13 disclosures. In the US, Washington's My Health My Data Act covers "psychological ... interventions" and inferred health data.

## (a) Keeping data on the device only

### Expo native (iOS / Android)

Expo's storage guide lists four options ([Expo: Store data](https://docs.expo.dev/develop/user-interface/store-data/)):

| Option | What it is | Fit for Inquiries |
|---|---|---|
| `expo-secure-store` | Encrypted key/value storage: Keychain on iOS, Keystore-encrypted SharedPreferences on Android. "Intended for small values such as tokens, keys, and other secrets." | Holds the **encryption key**, not the Inquiries themselves. |
| `expo-sqlite` | Persistent SQLite database. Supports **SQLCipher** on Android/iOS/macOS. | The main store for Inquiries, Breakdowns and Patterns, encrypted with SQLCipher. |
| `expo-file-system` | Local files. | Audio, if audio is kept at all. |
| AsyncStorage | "asynchronous, unencrypted" key/value storage. | Not for Inquiry content. |

Details:

- **SecureStore** ([docs](https://docs.expo.dev/versions/latest/sdk/securestore/)) has no enforced size limit, but some older iOS versions rejected values over about 2 KB. The `*_THIS_DEVICE_ONLY` accessibility options stop an item migrating to a new device through a backup. Android Auto Backup excludes SecureStore by default. Data doesn't survive an uninstall on Android, and survival on iOS "is not guaranteed". Expo advises against using it as "a single source of truth for irreplaceable, critical data". For us that's partly a feature: losing the device means losing the Inquiries, which matches "on-device only". It needs to be explained to the person.
- **SQLCipher** ([expo-sqlite docs](https://docs.expo.dev/versions/latest/sdk/sqlite/)): enabled with `useSQLCipher` in the config plugin, followed by `npx expo prebuild`. It isn't available in Expo Go. **There's a silent-failure trap:** "If the app binary does not include SQLCipher, `PRAGMA key` has no effect and does not throw an error." The app should check `PRAGMA cipher_version` at startup and refuse to store anything if it returns no row.
- The recommended native pattern: generate a random database key, keep it in SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, and open the SQLCipher database with that key.

### Expo web

- **SecureStore doesn't support web.** Its docs list Android, iOS and tvOS only ([docs](https://docs.expo.dev/versions/latest/sdk/securestore/)).
- **`expo-sqlite` works on web** through WebAssembly. It needs Metro wasm config plus `Cross-Origin-Embedder-Policy` / `Cross-Origin-Opener-Policy` headers on the host, and the default web build has no full-text search ([docs](https://docs.expo.dev/versions/latest/sdk/sqlite/)). The docs list SQLCipher for Android/iOS/macOS only, **not web**, so on web, encryption at rest is up to us (for example, WebCrypto on rows before they're written). The browser has no equivalent of a hardware-backed keystore that Expo exposes.
- **Safari deletes browser storage.** WebKit ITP removes "all of a website's script-writable storage after seven days of Safari use without user interaction on the site". That covers IndexedDB, localStorage and service-worker caches. Home-screen web apps have their own counter and aren't expected to lose data ([WebKit blog](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). **So on Safari, "on-device only" on web means Inquiries can disappear after a week away.** Either accept that and disclose it ("web Inquiries are temporary"), or push people towards the native app or an account.

### Trade-offs of on-device only

- Strongest storage privacy, nothing to breach on our side, and the simplest disclosure.
- The first Inquiry needs no account, which this satisfies naturally.
- No cross-device Patterns without sync, which is what the account is for.
- Data loss on uninstall or device loss, and on Safari web after 7 days of inactivity.
- **Doesn't remove the model call.** Content still goes to Vertex AI while each turn is processed (see (c)). The disclosure has to say "stored only on your device", not "never leaves your device".

## (b) Encrypted cloud storage on Google Cloud

There are three tiers, from weakest to strongest control:

1. **Default encryption at rest.** Google encrypts "all Google customer content at rest, without any action required by you", using AES-256 with a DEK/KEK hierarchy, and "We own and manage the keys" ([Google: Default encryption](https://docs.cloud.google.com/docs/security/encryption/default-encryption)). This protects against stolen disks, not against us or anyone with project access.
2. **CMEK (customer-managed encryption keys).** For example, Firestore with a Cloud KMS key that we can rotate, disable or destroy. It covers data at rest including indexes and backups, but **not data in memory or in transit, or database metadata**. Limits: CMEK can't be added to an existing database, the key can't be changed later, and "Don't let your key become unavailable for longer than seven days" or the database may be deleted. Firestore adds no fee, but KMS operations cost money ([Firestore CMEK](https://docs.cloud.google.com/firestore/native/docs/cmek)). Destroying a key is a useful crypto-shredding tool for bulk deletion. **The server can still read everything**, so this is about control and auditability, not privacy from the operator.
3. **Client-side encryption.** Defined as "any encryption performed prior to sending your data to the cloud"; you're responsible for "creating and managing your encryption keys". Google suggests Tink for envelope encryption ([Cloud KMS: Client-side encryption](https://docs.cloud.google.com/kms/docs/client-side-encryption)). Google's examples use Cloud KMS as the key-wrapping key, which still puts the key in our project. **For real end-to-end protection, the key has to come from the person** (a passphrase-derived key or a device keypair), so the server stores only ciphertext.

### End-to-end / client-side encryption for Patterns: trade-offs

- **Gain:** we can honestly say we can't read synced Inquiries or Patterns. A server breach exposes ciphertext only.
- **Cost 1: Pattern building has to happen somewhere that holds the key.** Patterns are derived by a model, so either (i) the device sends the plaintext Inquiry to the model, gets Assumptions back, encrypts them and syncs them, or (ii) the server does it, which means the server sees plaintext and defeats E2E. Option (i) fits "Patterns are built afterwards" if the Pattern pass runs at the end of an Inquiry, while the plaintext is already on the device.
- **Cost 2: key recovery.** If the person forgets their passphrase or loses every device, their Patterns are gone. Recovery keys, or passkey-wrapped keys, add complexity.
- **Cost 3: no server-side search or analytics** on content. Usage limits have to count metadata, not content.
- **Deletion:** with per-person keys, deleting the key destroys every copy, backups included. That gives a strong answer to "deletable with their Inquiry".

## (c) Model-provider data handling on Vertex AI

### Gemini (Google models)

From [Vertex AI data governance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance):

- **No training:** Google "won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction", for all managed models.
- **For zero data retention, turn off every default-on or optional store:**
  - **Implicit caching is on by default.** It has an in-memory tier and a durable tier stored at rest, both deleted within 24 hours. Disable it with a project-level `cacheConfig` PATCH (`disableCache: true`). Alternatively, `retentionType: EPHEMERAL` keeps only the in-memory tier.
  - **Request-response logging** to BigQuery is off by default. Keep it off ([docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/request-response-logging)).
  - **Live API session resumption** (relevant to voice) is off by default. When enabled, it caches text, audio, video and outputs for up to 24 hours. Keep it off, or disclose it.
  - **Interactions API** `store` defaults to `true`. Set `store = false`.
  - **Grounding with Google Search** keeps derived queries for 3 days, and that can't be disabled. Don't use it, or use Web Grounding for Enterprise.
- **Abuse monitoring** ([docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/abuse-monitoring)): for standard Google models, Google logs only **flagged** prompts, for up to 90 days, and authorised staff may review them. **Customers with a Google Cloud Master Agreement are exempt by default.** Online-terms customers can request an exception. Google "Frontier" models log all prompts and responses for up to 30 days.

### Claude on Vertex AI

- **Who processes the data depends on the offering.** Anthropic's docs say that for "Claude Models on Google Cloud (Google managed)", **Google is the data processor**, so Google's terms apply. The separate "Anthropic managed" offering on Google Cloud follows Anthropic's first-party policy: no default retention of conversation content, with ZDR on request ([Anthropic: API and data retention](https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention)).
- **Google-managed partner models:** "Customer prompts and model responses are not shared with third-parties", and data at rest stays in the chosen region or multi-region. The regionalisation of *processing* "may vary", and the global endpoint may serve requests "from any region" ([Partner models](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-partner-models)). Request-response logging supports Claude, and it's off by default.
- **Covered Models / Advanced AI models change this.** Claude **Fable 5/5.1 and Mythos 5/5.1** are "Covered Models" that "require 30-day data retention", and ZDR isn't available for them "unless expressly authorized by Anthropic". On Google Cloud the retained data "stays within your cloud provider's environment" (Anthropic doc above). Google's abuse-monitoring page says that for these "Non-Google Advanced AI models", "All prompts and responses will be logged and securely stored for up to 30 days". Authorised Google staff may review flagged prompts. The customer must consent, once per project, to share this data with Anthropic for abuse monitoring, and "It may not be possible to opt-out". Claude Opus 4.7+ / Sonnet 5+ fall into scope only when `advanced_ai_enabled` is set for the Cyber Verification Program.
- **Not found in primary docs:** whether the Master Agreement abuse-logging exemption also covers non-Advanced Claude models. Confirm with Google before relying on it.

### What this means for model choice

| | Training on prompts | Achievable retention | Human review possible |
|---|---|---|---|
| Gemini (standard, configured) | No | ZDR (caching off, no Search grounding, no session resumption) | Flagged prompts only, and none for Master Agreement customers |
| Claude, non-Covered (e.g. Sonnet/Opus without Advanced AI) on Vertex | No (Google terms) | Not shared with third parties. Logging off by default. Check abuse-logging scope. | Unconfirmed |
| Claude Fable / Mythos on Vertex | No | **30 days, mandatory** | Yes, on flagged prompts. Shared with Anthropic. |

## (d) What GDPR-style laws treat as sensitive

- **EU/UK GDPR Art. 9** prohibits processing data "revealing ... religious or philosophical beliefs", "data concerning health or ... sex life or sexual orientation", among other categories, unless an exception applies. The most likely exception is **explicit consent** for specified purposes, Art. 9(2)(a) ([GDPR text, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)).
- **The ICO includes mental health** ("personal data related to the physical or mental health"), calls it "likely to be much more sensitive", and says **inferences count**: profiling that infers health, beliefs or sex life is special-category processing "regardless of how confident you are that the inference is correct" ([ICO: What is special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)). **Patterns, as recurring Assumptions inferred across Inquiries, are a textbook case.**
- **DPIA:** mandatory for large-scale special-category processing (Art. 35(3)(b)) and likely-high-risk processing. The ICO names AI as an "innovative technology" risk criterion ([ICO: When do we need a DPIA?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/)). Plan for one.
- **US, Washington MHMDA:** "consumer health data" covers mental health status, including "Social, psychological, behavioral, and medical interventions", and data "derived or extrapolated from nonhealth information", including inferences from ML ([RCW 19.373.010](https://app.leg.wa.gov/RCW/default.aspx?cite=19.373.010)). It's broad and applies outside healthcare.
- **US, FTC Health Breach Notification Rule:** covers non-HIPAA health apps that are "vendors of personal health records". A "breach" includes disclosure "without a person's authorization", not just hacks ([FTC guidance](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0)). Whether look-together counts as a PHR vendor is unclear. The FTC page doesn't address reflective or mental-wellness apps directly, so this needs a lawyer.

## (e) What must be disclosed upfront

**GDPR Art. 13**, at the time of collection ([EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)): controller identity and contact; DPO if any; purposes and legal basis; recipients (**Google as processor; Anthropic where Claude Covered Models share data**); international transfers and safeguards; retention periods; rights (access, erasure, portability and so on); the right to withdraw consent; the right to complain to a regulator; and any automated decision-making or profiling, with meaningful information about the logic. **Patterns probably count as profiling.**

**App stores:**

- **Apple 5.1.2(i):** "You must clearly disclose where personal data will be shared with third parties, **including with third-party AI**, and obtain explicit permission before doing so." Under 5.1.1(i), the privacy policy must cover retention/deletion and how to revoke consent. Under 5.1.1(v), apps that support accounts must offer in-app account deletion, and apps without significant account-based features must work without login ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)). Privacy nutrition labels must include third-party partners' collection. Relevant categories are Health, Sensitive Info ("religious or philosophical beliefs"...), Audio Data and Other User Content ([App privacy details](https://developer.apple.com/app-store/app-privacy-details/)).
- **Google Play Data safety:** "Collect" means "transmitting data from your app off a user's device", so sending a turn to Vertex AI is collection even if nothing is stored. The form defines "ephemeral" processing (kept in memory only, for no longer than the real-time request), asks about encryption in transit, and asks whether people can request deletion ([Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)).

### Suggested upfront disclosure shape (to be refined with counsel)

1. Your Inquiries are stored only on this device (and, on web, may be cleared by your browser).
2. To respond, what you say or type is sent to [Gemini/Claude] on Google Cloud. It isn't used to train models and isn't kept after the response [true only with ZDR config and a non-Covered model].
3. Patterns are built from your Inquiries. If you create an account, they're encrypted on your device before syncing, and we can't read them. Delete an Inquiry and its Patterns go with it.
4. This isn't therapy. [Ties to distress handling.]
5. An explicit-consent checkbox before the first Inquiry (Art. 9(2)(a), Apple 5.1.2(i)).

## Open points

- Whether the Google Master Agreement abuse-logging exemption covers non-Advanced Claude models. Ask the Google account team.
- Whether the Anthropic-managed Claude on Google Cloud offering (Anthropic as processor, ZDR on request) is preferable to the Google-managed one.
- Voice: if speech-to-text or text-to-speech runs outside the Live API (for example Cloud Speech-to-Text), check its own logging and retention settings. Not covered here.
- On-device models (which would remove the plaintext model hop) weren't researched.
- Launch region drives which regime applies, and whether to pin a regional or EU multi-region endpoint instead of the global one.
