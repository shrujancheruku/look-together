# Do Cloud STT and TTS log or keep a person's audio?

Research for [#27](https://github.com/shrujancheruku/look-together/issues/27). Sources read on 2026-10-30. Most Google pages say "Last updated 2026-10-26" or later.

Setup in question: Cloud Speech-to-Text **v2**, `long` model, streaming, plus Cloud Text-to-Speech with **Chirp 3 HD** voices. Both run in project `look-together`, with one deployment in `us` and one in `eu`.

## Short answer

- **STT keeps nothing for streaming requests.** Audio is processed in memory and not stored, and audio and transcripts are not logged unless the project opts in to data logging. Opting in is a per-project console switch, and it is off by default.
- **TTS logs no text or audio.** It has no data logging program.
- **No model training** on our data in either service, unless we opt in to STT data logging.
- **No abuse prompt logging is documented** for either service. Abuse monitoring is documented for Vertex AI "Generative AI Services", and STT and TTS are listed as AI/ML Services instead. One gap: the terms count "any generative AI features or functionality of a Service" as Generative AI Services, and Google doesn't say whether Chirp 3 HD falls under that.
- **The us and eu endpoints keep data in region, by contract.** Both services are on Google's AI/ML Data Location list, which covers data at rest and ML processing in the chosen multi-region. Resource names and other metadata are not covered.
- **What remains:** Google keeps request metadata for a short time, and Cloud Audit Logs record metadata (not content) for STT v2. Neither holds the person's words. We don't need to add a disclosure line about Google keeping audio or text. "Your voice is turned into text by Google in [region] and isn't kept" is accurate.

## 1. Cloud Speech-to-Text

### What is stored

- Streaming and sync requests: "Google processes it in memory and does not store any customer data." [Data usage FAQ](https://docs.cloud.google.com/speech-to-text/docs/data-usage-faq)
- Async (batch) requests only: "the resulting transcript is stored for a period of approximately 5 days to give you time to retrieve the transcript", and the input audio is not stored. We use streaming, so this doesn't apply. (Same source.)
- Metadata: "Google temporarily logs some metadata about your Cloud Speech-to-Text API requests ... in order to improve our service and combat abuse." No retention period is given, and the page doesn't say what the metadata is. (Same source.)
- "Data from customers who have not opted in to data logging is not stored or used by Google." (Same source.)

### Data logging program (opt-in, off by default)

- "By default, Cloud Speech-to-Text does not log customer audio data or transcripts." [Data logging](https://docs.cloud.google.com/speech-to-text/docs/data-logging)
- If a project opts in, Google uses the logged data "solely to train and improve Google products and services". [Data logging](https://docs.cloud.google.com/speech-to-text/docs/data-logging)
- The opt-in terms say "Google may retain the Customer Training Data indefinitely." Turning it off stops new logging only, and data already logged "will continue to be retained by Google". Deleting the project doesn't delete logged data either. Google may share the data with "affiliates, third party vendors and contractors". [Data logging terms](https://docs.cloud.google.com/speech-to-text/docs/data-logging-terms)
- Opt-in and opt-out are a per-project console switch: APIs & Services, Cloud Speech API, **Data logging** tab, **Enable** or **Disable data logging**. No API or per-request setting is documented. [Enable data logging](https://docs.cloud.google.com/speech-to-text/docs/enable-data-logging)

**v1 vs v2 (unclear).** All the data logging pages are v1 docs, with a banner saying new users should use v2. They don't say whether the program applies to v2. On the [pricing page](https://cloud.google.com/speech-to-text/pricing), only v1 has separate "with data logging" ($0.016/min) and "without data logging" ($0.024/min) SKUs. v2 has a single "Recognition" SKU at $0.016/min with no data logging split.

- So the "$0.024/min without logging" in the [voice-stacks findings](https://github.com/shrujancheruku/look-together/blob/research/voice-stacks/docs/research/voice-stacks.md) is the v1 price.
- On v2 we pay $0.016/min without opting in. That matches the prototype's `sttPerMin: 0.016`.
- The safe reading is that v2 has no data logging tier. Even so, the project-level switch should be confirmed off in the console for each serving project, because the docs don't say it is ignored for v2.

### Training and abuse

- Training: "Google will not use Customer Data to train or fine-tune any AI/ML models without Customer's prior permission or instruction." [Service Specific Terms §18](https://cloud.google.com/terms/service-terms) Opting in to data logging counts as that permission.
- Abuse: the STT docs mention abuse only in the metadata sentence above. They say nothing about logging audio or transcripts for abuse review.

### Region

- The v1 FAQ says data "is processed globally" unless you use a US or EU endpoint, and that "Limiting processing to a single Google Cloud region is not supported." [Data usage FAQ](https://docs.cloud.google.com/speech-to-text/docs/data-usage-faq) The v2 migration guide says v2 is a "fully regionalized service" and that setting a location helps "meet data residency requirements". [Migration](https://docs.cloud.google.com/speech-to-text/docs/migration)
- The contractual commitment is on Google's [data residency list](https://cloud.google.com/terms/data-residency) (Cloud Speech-to-Text is listed under AI/ML Data Location). Under [Service Specific Terms §16](https://cloud.google.com/terms/service-terms), Google will "store Customer Data at rest" and "perform machine learning processing of Customer Data" only in the chosen multi-region. "Customer Data does not include resource identifiers, attributes, or other data labels."
- Checked with the v2 Locations API on project `look-together`: the `long` model is available for `en-US` in both `us` and `eu`.
- The prototype already uses `us-speech.googleapis.com` with `locations/us`. The eu deployment needs `eu-speech.googleapis.com` with `locations/eu`.

### Customer-managed encryption keys

v2 "supports Customer-managed encryption keys for all resources as well as batch transcription". [Migration](https://docs.cloud.google.com/speech-to-text/docs/migration) This doesn't matter for streaming with the default `_` recognizer, since nothing is stored.

## 2. Cloud Text-to-Speech

- "Google does not log any customer Cloud TTS text or audio data." The service is "both stateless and resourceless", so Data Access and System Event audit logs "don't apply". [TTS data logging](https://docs.cloud.google.com/text-to-speech/docs/data-logging)
- TTS has no opt-in logging program, and none of its pages give a retention period. That fits it storing nothing.
- Training is covered by the same rule as STT ([Service Specific Terms §18](https://cloud.google.com/terms/service-terms)).
- Region:
  - Endpoints: `us-texttospeech.googleapis.com` and `eu-texttospeech.googleapis.com`. With these, "your data at-rest and in-use stay within the regional or continental boundaries of Europe or the USA". The request's `parent` must name the matching `us` or `eu` location. Chirp 3 HD is listed on both. [TTS endpoints](https://docs.cloud.google.com/text-to-speech/docs/endpoints), [Chirp 3 HD](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)
  - Cloud Text-to-Speech is also on the AI/ML Data Location list. [Data residency](https://cloud.google.com/terms/data-residency)
  - **The prototype calls the global `texttospeech.googleapis.com`.** That endpoint has no region promise, so it needs to change to the regional endpoints.
  - A [forum post from 2026-08-28](https://discuss.google.dev/t/text-to-speech-regional-endpoints-not/393036) says the `eu-` hostname resolves to a US IP. It has no replies. This proves little: Google's API hostnames resolve to front-end servers close to the caller, and processing happens behind them. It isn't evidence that the contract is broken.
- Abuse:
  - The TTS data logging page doesn't mention abuse monitoring.
  - **Gemini-TTS** (not used) is different. It runs Vertex AI safety filters, and when it refuses, it says the text "violates Vertex AI's usage guidelines". [Gemini-TTS](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts) That makes it likely to fall under Generative AI abuse monitoring. If we ever switch to Gemini-TTS, check this again.

## 3. Abuse monitoring: what applies

- Vertex AI abuse monitoring covers Google's "Generative AI Services":
  - For standard Google models, prompts are logged only "If automated safety classifiers detect suspicious activity that requires further investigation". The data is "stored securely for up to 90 days in the same region or multi-region".
  - "customers with a Google Cloud Master Agreement are exempt from prompt logging".
  - [Abuse monitoring](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/abuse-monitoring)
- The [Services Summary](https://cloud.google.com/terms/services) lists Speech-to-Text and Text-to-Speech under **AI/ML Services**, not Generative AI Services. It also says: "Generative AI Services also includes any generative AI features or functionality of a Service."
  - Chirp 3 HD is a generative voice model, but nothing Google publishes calls it a generative AI feature.
  - We found no documentation that STT or TTS logs prompts for abuse review. This is the one open point to confirm with Google (see below).
- **This affects the Gemini wording too.** #9 planned the fallback line "Google may keep it up to 30 days only to detect abuse". The current abuse monitoring page says **up to 90 days** for standard Google models like Gemini 3.8 Flash, and **30 days** only for Frontier and Advanced AI models. The page also says Cloud Master Agreement customers are exempt by default. That may be the route for [#22](https://github.com/shrujancheruku/look-together/issues/22), since the [zero data retention page](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/vertex-ai-zero-data-retention) (updated 2026-10-28) no longer mentions an exemption form.

## 4. Cloud Audit Logs and other logs in our project

- STT v2 `Recognize`, `StreamingRecognize` and `BatchRecognize` are `DATA_READ` and write **Data Access** audit logs. v1 methods write none. [STT audit logging](https://docs.cloud.google.com/speech-to-text/docs/audit-logging)
- Data Access audit logs are **off by default** (BigQuery is the only exception). [Cloud Audit Logs](https://docs.cloud.google.com/logging/docs/audit) We should leave them off for Speech-to-Text. Admin Activity logs, for example from creating a recognizer, are always on.
- Audit log contents: the `request` and `response` fields "should never include user-generated data, such as file contents". [AuditLog type](https://docs.cloud.google.com/logging/docs/reference/audit/auditlog/rest/Shared.Types/AuditLog) So these logs hold metadata (caller, method, recognizer name, time), not audio or transcripts.
- Retention and location:
  - The `_Required` bucket keeps logs for 400 days, and this can't be changed. The `_Default` bucket keeps them for 30 days, configurable per project from 1 to 3650 days. [Logging quotas](https://docs.cloud.google.com/logging/quotas)
  - Both buckets are in the `global` location, and an existing bucket can't be moved. An org-level default storage location only affects buckets created later. [Regionalized logs](https://docs.cloud.google.com/logging/docs/regionalized-logs)
  - For EU projects, set that default before creating the projects. This matters only for metadata.
- TTS writes no Data Access or System Event audit logs. [TTS data logging](https://docs.cloud.google.com/text-to-speech/docs/data-logging)
- Our own logs (the voice worker and LiveKit) are ours to control. #9 already requires that content be scrubbed from them by construction.

## 5. Cloud Data Processing Addendum

- Google processes Customer Data only on our Instructions: to provide, secure and monitor the Services, and as set by our use of them (§5.2). [Cloud DPA](https://cloud.google.com/terms/data-processing-addendum)
- Opting a project in to STT data logging is the kind of "use of the Services" that would widen those Instructions. That's one more reason to keep it off.
- Deletion: Google deletes Customer Data within at most 180 days of our deletion instruction (§6.1). This barely matters here, since streaming STT and TTS store nothing.

## 6. What the app has to disclose

No extra retention line is needed for STT or TTS, as long as:

1. STT data logging is off in every serving project (check the Data logging tab in each one), and
2. both services are called on the regional `us` or `eu` endpoint, and
3. Data Access audit logs stay off for Speech-to-Text, and
4. we keep Chirp 3 HD, not Gemini-TTS.

Then this onboarding bullet is accurate: *"When you speak, Google turns your voice into text, and your reply back into speech, in [region]. Neither the audio nor the text is kept or used for training."* Gemini's abuse line stays as its own bullet, and its wording should change from 30 to 90 days if no exemption is in place (see §3).

## Open or unclear

- **Does the v1 data logging switch do anything for v2?** The docs don't say, and v2 pricing has no data logging tier. Check that it is off in the console anyway.
- **Does Chirp 3 HD count as a "generative AI feature"** under the Services Summary, which would bring it under abuse prompt logging? Nothing published says so. Ask the Google account team in the same request as #22.
- **What request metadata does STT keep, and for how long?** The FAQ says only "temporarily", and it's not content.
- The forum claim about EU TTS routing has no answer from Google.

Not legal advice.
