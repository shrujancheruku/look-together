# What does Gemini tuning on Vertex offer for Flash, and where could training examples lawfully come from?

Research for [#238](https://github.com/shrujancheruku/look-together/issues/238), under map [#236](https://github.com/shrujancheruku/look-together/issues/236). Sources read on 2026-11-19. This feeds what consent the friends test asks for.

## Short answer

- **Gemini 3.8 Flash, the model we serve, cannot be tuned.** Its model page lists "Tuning ... Not supported". The newest Flash with supervised fine-tuning (SFT) is **Gemini 3.5 Flash**. Tuning it means moving to a different base model, and our gate (`gateKey`) and Evaluation would run again on that model.
- **Where it exists, tuning works in `us` and `eu`.** For Gemini 3.x, tuning and serving both run on the `us` and `eu` multi-region endpoints. Stored data and the tuned model stay in the tuning job's region.
- **Size is not the hard part.** Google suggests starting with 100 examples and says quality matters far more than quantity. A JSONL file of `contents` turns is the whole format.
- **Tuned models are told to think little.** Google says to set thinking to `MINIMAL` for tuned Gemini 3.x tasks and not to use controlled generation (our `responseJsonSchema`) at inference. Both clash with how the adapter works today: Breakdown on high thinking, structured output on every call. Google points to reinforcement learning fine-tuning (RLFT) for multi-step reasoning at high thinking.
- **Training examples can lawfully come from three places, in this order of ease:** (1) the founder's own writing and synthetic Paths, which are not a person's personal data and need no consent; (2) Inquiries a person donates, which need explicit consent under GDPR Art. 9(2)(a), a notice, and an exception to ADR 0003; (3) nothing from Krishnamurti, by ADR 0002.
- **Donated Inquiries are the costly source.** They are likely special-category data, need explicit, separate, withdrawable consent, and would put Inquiry content on our servers, which ADR 0003 forbids except for a Report ([ADR 0007](../adr/0007-a-report-may-carry-one-exchange-by-choice.md)). Withdrawal after training is unresolved in the sources.

## 1. What Vertex AI offers

### Which Flash models can be tuned

| Model | SFT | Other tuning |
|---|---|---|
| Gemini 3.5 Flash | yes | RLFT, checkpoints, continuous tuning |
| Gemini 3.5 Flash-Lite, 3.1 Flash-Lite | yes (3.5 Flash-Lite only on the pricing page, not the SFT page) | 3.1 Flash-Lite: RLFT |
| Gemini 2.5 Flash, Flash-Lite, Pro | yes | preference tuning |
| **Gemini 3.8 Flash** | **no** | none |

- The SFT page lists Gemini 3.5 Flash, 3.5 Flash-Lite and 3.1 Flash-Lite among 3.x models, plus 2.5 Pro, Flash and Flash-Lite. [About SFT for Gemini](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning), [Tuning overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/tune-gemini-overview)
- The Gemini 3.8 Flash page: "Tuning ... Not supported". Structured output is supported, and the thinking levels are `LOW`, `MEDIUM` (default) and `HIGH`, with no `MINIMAL`. [Gemini 3.8 Flash](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-8-flash)
- The same page lists the `us` and `eu` multi-regions for serving 3.8 Flash.
- Not confirmed: whether Google plans tuning for 3.8 Flash. No page says so. The pricing page also lists Gemini 3.5 Flash-Lite SFT while the SFT page does not, so the docs disagree on that model.

### Regions

- Gemini 3.x tuning uses the `us` and `eu` multi-region endpoints only. Serving uses `us`, `eu` and `global`. Gemini 2.5 and earlier use a single region such as `us-central1`. [About SFT](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning), [Run SFT](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-use-supervised-tuning)
- The data residency page marks tuning as supported in the `us` and `eu` multi-regions, but its tuning rows name only Gemini 2.5 Flash, Flash-Lite and Pro, not 3.5 Flash. The 3.x SFT page, though, says the dataset and tuned model are stored in the tuning job region. [Data residency](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency)
- "During tuning, computation could be offloaded to other `US` or `EU` regions for available accelerators." It is transparent to users. This is a weaker promise than "stays in one region": an `eu` job may run on any EU region, and the page does not say which. (About SFT)
- The `global` endpoint has no CMEK and no data residency. Adapters for global models are stored in the US, so a tuned model for `eu` must not be copied to `global`. (About SFT, Run SFT)
- The EU multi-region covers EU member states only, not the UK or Switzerland. (Data residency)

### Data format and size

- JSONL, one example per line, uploaded to Cloud Storage. Each line has an optional `systemInstruction` and `contents` with `user` and `model` turns. [Prepare data](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning-prepare)
- Google: "we recommend that you start with 100 examples", and the run guide says to use at least 100 to 500 for best results. "The quality of the dataset is far more important than the quantity." No minimum is stated; the page that lists limits gives none.
- Limits for Gemini 3.x: up to 1 GB, 131,072 tokens per example, up to 10M text-only examples, a validation set of up to 5,000 examples, adapter sizes 1, 2, 4, 8 or 16. (About SFT)
- A validation set is "strongly recommended". Production prompts should match the dataset's formatting. (Prepare data)

### Cost

- Training: the pricing page lists Gemini 3.5 Flash at **$0.01 per 1,000 "count"**, and 3.1 Flash-Lite at $0.003. "Training tokens are calculated by the total number of tokens in your training dataset, multiplied by your number of epochs." [Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- The unit "count" is not defined on the page. Read as tokens it is about $10 per million training tokens. Not confirmed.
- A 500-example set of 3,000 tokens each, 3 epochs, is 4.5M tokens, so about $45 under that reading.
- Serving: the pricing page says that from Gemini 3, "tuned model endpoint prediction price will be 1.5 times of the base model in non-global region", and the same as base in `global`. The SFT page says tuned inference is billed "at the same rate as the base stable version". The pricing page is the more specific statement, so budget 1.5 times in `us` and `eu`. The two pages disagree and this is not resolved.
- Evaluations run during tuning are billed as batch prediction jobs. (About SFT)

### Serving, latency, features

- A tuned model is called by its endpoint through `generateContent` on the same multi-region host, for example `aiplatform.us.rep.googleapis.com`. [Run SFT](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-use-supervised-tuning)
- Latency: not documented. Nothing says a tuned adapter is slower or faster than the base model. We would have to measure it.
- Structured output: "SFT teaches the tuned model to generate structured output. Don't apply controlled generation at inference, because it can reduce quality on tuned models." The adapter's re-parse with the same schema would still be needed. (About SFT)
- Thinking: set the level to `MINIMAL` for tuned Gemini 3 and later tasks. For multi-step reasoning at `HIGH`, Google recommends RLFT. (About SFT, Run SFT) Whether a tuned model accepts `LOW` to `HIGH` is not stated.
- Function calling, caching (we have it off), safety settings and system instructions on tuned models: not addressed on the pages read.
- SFT "is not a Covered Service and is excluded from the SLO of any Service Level Agreement." (About SFT)
- Concurrent jobs are limited by a global quota, at least one per project.
- The console does not support 3.x tuning; jobs run by SDK or REST. (Run SFT)

### What Google does with the training data

- "User data, such as the transformed dataset and the tuned model, is stored in the tuning job region." (About SFT)
- Google commits to not use our data to train or fine-tune models without permission or instruction. [Data governance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance)
- Not confirmed from the pages read: a retention period for the dataset copy, whether prompt logging for abuse monitoring covers tuning jobs, and whether a tuned model is deleted with its dataset. The data governance page says nothing on tuning data. Deleting a model is a `DELETE` on the model resource, and the page does not say if the endpoint goes with it. (Run SFT)
- Our Cloud Storage bucket holds the JSONL. Its location "doesn't matter" to Vertex, so we choose it, in `us` or `eu` to match.

## 2. Where training examples could lawfully come from

### Sources

| Source | Personal data? | Consent needed? | Fit with the ADRs |
|---|---|---|---|
| Synthetic Paths written by us or a model | No, if built from no real Inquiry | No | Fine. The evaluation set is already synthetic |
| The founder's own writing | The founder's, by their own choice | The founder's own | Fine. Not Krishnamurti's words |
| Inquiries a person donates | Yes, likely special category | Yes, explicit | Breaks ADR 0003 unless an exception is added |
| Krishnamurti's texts | Not personal data, but the Foundations' permission applies | The Foundations' | Barred by ADR 0002 |
| Reports with an exchange (ADR 0007) | Yes | Given for a different purpose | Using them to train is a new purpose, see below |

- Synthetic Paths and the founder's writing are outside GDPR's consent rules unless they copy a real person's Inquiry. Two cautions: a model-written Path must not repeat a real Inquiry from memory, and any text we write must pass the not-therapy wording list and the "we, never I" rule before it becomes a model's example.
- Reports are the one place content already reaches us, by choice. Apple 5.1.2(ii): "Data collected for one purpose may not be repurposed without further consent unless otherwise explicitly permitted by law." GDPR Art. 5(1)(b) is the same rule. So a person's consent to send a Report does not cover training.

### GDPR for donated Inquiries

EUR-Lex refused automated fetching, so the Article quotes below come from the gdpr-info.eu reproduction of the Regulation and should be checked against the Official Journal text before a notice is written. The EDPB documents were read at edpb.europa.eu.

- **Special category.** Art. 9(1) prohibits processing "personal data revealing ... religious or philosophical beliefs" and "data concerning health". An Inquiry examining a person's own life may reveal both, which is what ADR 0003 already assumes. [Art. 9](https://gdpr-info.eu/art-9-gdpr/)
- **The basis is explicit consent.** Art. 9(2)(a): "the data subject has given explicit consent to the processing of those personal data for one or more specified purposes". The research exception, Art. 9(2)(j), needs law and safeguards under Art. 89(1), and a product feature is a poor fit. We would lean on 9(2)(a), with Art. 6(1)(a) beside it.
- **What consent is.** Art. 4(11): "freely given, specific, informed and unambiguous", by "a statement or by a clear affirmative action". [Art. 4](https://gdpr-info.eu/art-4-gdpr/)
- **Explicit.** The EDPB says the person "must give an express statement of consent", and that in the online context this can be an electronic form or an email (paragraphs 93 to 94). [EDPB Guidelines 05/2020](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf)
- **Specific and separate.** Consent for a separate purpose must be separate (paragraph 60 on granularity). So the donation is its own choice, not folded into "I understand" at the intro, and not a condition of using the app: Art. 7(4) asks whether "the provision of a service, is conditional on consent" to data that is not necessary for it. [Art. 7](https://gdpr-info.eu/art-7-gdpr/)
- **Informed.** At least (EDPB paragraph 64): the controller's identity, the purpose of each operation, what type of data is used, the right to withdraw, and transfer risks where there is no adequacy decision or safeguards. We would add what Art. 13 lists: recipients (Google as processor), where it is stored, how long, and the right to complain. [Art. 13](https://gdpr-info.eu/art-13-gdpr/)
- **Withdrawal.** Art. 7(3): "It shall be as easy to withdraw as to give consent." The EDPB says that once consent is withdrawn the controller "must stop the processing actions concerned" and delete the data unless another basis applies (paragraph 117). Past processing stays lawful.
- **Proof.** Art. 7(1): the controller must "be able to demonstrate" consent. That means a record of the consent, which is itself something we would keep, so the closed list changes.
- **Minimisation and storage.** Art. 5(1)(c) and (e): only what is necessary, kept no longer than needed. Donating one Inquiry and deleting the file after the tuning job fits this. [Art. 5](https://gdpr-info.eu/art-5-gdpr/)
- **Impact assessment.** Art. 35(3)(b) makes a data protection impact assessment mandatory for "processing on a large scale of special categories of data". A small friends-test donation is probably not large scale, but this is a legal judgment we could not confirm. [Art. 35](https://gdpr-info.eu/art-35-gdpr/)
- **Withdrawal after training is the open problem.** The EDPB's Opinion 28/2024 says AI models trained with personal data "cannot, in all cases, be considered anonymous", and that anonymity needs the chance of extracting personal data, directly or by queries, to be "insignificant". [EDPB Opinion 28/2024](https://www.edpb.europa.eu/system/files/2024-12/edpb_opinion_202428_ai-models_en.pdf) So a tuned adapter might itself hold personal data, and a person who withdraws could have a claim to its removal. The sources read do not settle that, and neither does Google's documentation. Options: tell the person a donation cannot be taken back out of a trained model (which sits uneasily with "as easy to withdraw"), train only on text we can show carries no one's data, or retrain without a withdrawn person's examples.
- **Pseudonymised is still personal.** Art. 4(5) pseudonymisation does not take data out of the Regulation. Removing names does not make an Inquiry anonymous, since the content itself can identify.

### App-store rules

- **Apple 5.1.2(i):** "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so." Sending donated Inquiries to Google for tuning is third-party AI. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **Apple 5.1.1(ii):** consent must be secured even if the data seems anonymous, and "Paid functionality must not be dependent on" it. Withdrawal must be "easily accessible and understandable". Our app is free, but the donation still cannot gate any feature.
- **Apple 5.1.1(i):** the privacy policy must explain "data retention/deletion policies" and how to "revoke consent and/or request deletion".
- **Apple 5.1.2(ii):** repurposing needs further consent. See Reports above.
- **Google Play User Data policy:** where use may be outside what a person expects, consent must be "immediately preceded by an in-app disclosure", not only in a policy, and navigating away is not consent. The privacy policy must say what data is collected, used, shared and with whom, plus retention and deletion. The Data safety section must match, and "these requirements also apply to third-party AI integrations". [Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- Not confirmed: how the Play Data safety form or Apple's privacy label would classify a donated Inquiry (the pages read do not define "collected" or "shared"), and whether either store has a rule about training a model on user content. Neither page read mentions model training. The last 14,000 characters of Apple's guidelines page were not read.

## 3. What this means for the friends test

- Asking for donated Inquiries needs a separate screen, an affirmative act, plain words on what is sent, where, who holds it, for how long, and what withdrawal can and cannot do. It cannot be a condition of the test.
- The cheapest course that needs no consent: train only on synthetic Paths and the founder's writing, and keep the friends test's consent to what it already asks.
- Either way, ADR 0003 and the closed list change before a donated Inquiry exists: a new field we keep, and a new party (Google as processor for tuning).

## Not confirmed

- Whether Google will make 3.8 Flash tunable, or whether a tuned 3.5 Flash is an acceptable swap for Evaluation.
- The unit "count" in tuning pricing, and which of the two serving prices (1.0 or 1.5 times) applies.
- Tuned-model latency, function-calling, caching and safety-setting behaviour, and whether `LOW` to `HIGH` thinking works on a tuned 3.5 Flash.
- Retention and abuse-monitoring treatment of tuning datasets, and what deletion removes.
- Which EU region runs an `eu` tuning job.
- Whether a tuned adapter counts as personal data, and so whether withdrawal reaches it.
- The Official Journal text of the articles quoted (read from a reproduction), and a lawyer's view on the impact assessment.
