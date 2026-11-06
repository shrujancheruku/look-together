# Gemini safety filters on Vertex AI

Research for [#40](https://github.com/shrujancheruku/look-together/issues/40), feeding [#41](https://github.com/shrujancheruku/look-together/issues/41). Researched 2026-11-03 against Google's Vertex AI documentation, the `@google/genai` 2.32.0 type definitions, and about 220 live calls to Gemini 3.8 Flash and Gemini 3.5 Flash-Lite in Google Cloud project `look-together` on the `us` and `eu` endpoints.

## Answer in brief

1. **Filters are already off by default for Flash, and can be set off explicitly.** Four harm categories can be configured: Hate Speech, Harassment, Sexually Explicit and Dangerous Content. For `gemini-3.5-flash` and later models, `OFF` is the default. `OFF` and `BLOCK_NONE` both work on our project with no allowlist, approval or billing change. **There is no self-harm category.**
2. **Two filters can't be turned off:** CSAM (`PROHIBITED_CONTENT`) and sensitive PII (`SPII`). They are the only filters that can still block an Inquiry once ours are `OFF`.
3. **No case was blocked under the default, `OFF`, `BLOCK_NONE`, `BLOCK_MEDIUM_AND_ABOVE` or `BLOCK_ONLY_HIGH` settings on Flash's Dialogue replies**, in any of the 8 distress-style cases on `us` and `eu`. Only `BLOCK_LOW_AND_ABOVE` blocked anything there, and it caught grief and a childhood-abuse disclosure: false positives.
4. **The classifier is the call most exposed to blocks.** Its output names the risk ("suicidal ideation", "intent to harm"), so it scores higher. Under `BLOCK_MEDIUM_AND_ABOVE`, the old default, Flash-Lite was blocked on 4 of the 6 Step-out cases. Even `BLOCK_ONLY_HIGH` blocked one of them. The filters apply to the classifier like any other Gemini call. Set it to `OFF` too.
5. **A block is a normal HTTP 200 with an empty candidate, not an error.** `finishReason: "SAFETY"` (or `PROHIBITED_CONTENT`, `SPII`, `BLOCKLIST`), no `content`, `response.text` is `undefined`, and `usageMetadata` still counts the prompt and the generated tokens. **It is billed.** We never saw a partial JSON.
6. **So the abstraction must set all four categories to `OFF` on every call** rather than trust the per-model default, and treat any finish other than `STOP` (or an empty or unparseable candidate) as a "no answer" event. On the classifier that event counts as a Step-out (fail closed). On a Dialogue or Breakdown call it goes to the classifier's verdict and #41's screen, never an error screen.

## 1. What the filters are

| Filter | Configurable? | What it signals | Source |
|---|---|---|---|
| Hate Speech, Harassment, Sexually Explicit, Dangerous Content | Yes, per category | `finishReason: SAFETY`, a `safetyRatings[]` entry with `blocked: true` | [Configure safety filters](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters) |
| CSAM ("prohibited content") | **No** | prompt: `promptFeedback.blockReason: PROHIBITED_CONTENT`. Response: `finishReason: PROHIBITED_CONTENT` | same |
| Sensitive PII | **No** | `finishReason: SPII` (response only) | same |
| Citation / recitation | No | `finishReason: RECITATION` | same |
| Jailbreak classifier | Opt-in, Preview, **only `gemini-3-flash-preview`** | `promptFeedback.blockReason: JAILBREAK` | same |

- **No self-harm or suicide category.** Self-harm talk is scored, if at all, under Dangerous Content or Harassment (see the runs below). This confirms [#5](https://github.com/shrujancheruku/look-together/issues/5): vendor filters are not a distress detector.
- `HARM_CATEGORY_CIVIC_INTEGRITY` and image categories exist in the SDK enum (`@google/genai` 2.32.0 `HarmCategory`) but aren't listed for Gemini text on Vertex. They don't matter to us.
- **What is scored is mostly the response.** The configurable filters block "unsafe responses". On the prompt side, the page lists only the non-configurable `PROHIBITED_CONTENT`, plus `OTHER` and unspecified. In every run, `promptFeedback` stayed empty and every block happened on the response. ([Configure safety filters](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters), "Unsafe prompts" / "Unsafe responses")
- "The configurable content filters don't have versioning independent of model versions … it may update the configurable content filter for a future version of a model." So a model switch can change filter behaviour, and the bake-off harness should re-run these cases.

### Thresholds and defaults

From [Configure safety filters](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters) (last updated 2026-10-30):

- `BLOCK_LOW_AND_ABOVE`, `BLOCK_MEDIUM_AND_ABOVE`, `BLOCK_ONLY_HIGH`: block when the probability **or** severity score reaches that level (method `SEVERITY`, the default). With method `PROBABILITY`, only the probability score counts.
- `BLOCK_NONE`: "removes automated response blocking", but still returns the scores.
- `OFF`: "No automated response blocking and no metadata is returned. **For gemini-3.5-flash and subsequent models, OFF is the default value.**"
- The same page's REST sample still labels `BLOCK_MEDIUM_AND_ABOVE (default)`. That label is stale for 3.5+ models, but it's one reason not to rely on the default: an older model or a different one behind the abstraction may default to blocking at medium.
- **No allowlist, approval or invoiced-billing requirement** is mentioned for `BLOCK_NONE` or `OFF`, and both worked on `look-together` (pay-as-you-go) on `us` and `eu` (observed).
- Turning the filters off doesn't change our duties under the [Generative AI Prohibited Use Policy](https://policies.google.com/terms/generative-ai/use-policy) (last modified 2024-12-17). It bars content that "facilitates self-harm", not talking about it. Nor does it change abuse monitoring: Google may still flag and keep prompts as described in [#22](https://github.com/shrujancheruku/look-together/issues/22).

**Observed:** with no `safetySettings`, Gemini 3.8 Flash and Gemini 3.5 Flash-Lite returned **no `safetyRatings` at all**, exactly like `OFF`. That confirms `OFF` is the effective default for both models on `us` and `eu`.

## 2. What a block looks like on `@google/genai`

Per [Process blocked responses](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/process-blocked-responses):

- **Prompt blocked:** `promptFeedback.blockReason` is set and `candidates` is not set.
- **Response blocked:** `promptFeedback` is not set. `candidates[0]` has no `content` and a `finishReason` saying why. "It does not provide any feedback to the model."

The SDK enums (`@google/genai` 2.32.0) add `BlockedReason.SAFETY | BLOCKLIST | PROHIBITED_CONTENT | IMAGE_SAFETY | MODEL_ARMOR | JAILBREAK | OTHER`. `FinishReason` adds `SAFETY | BLOCKLIST | PROHIBITED_CONTENT | SPII | RECITATION | LANGUAGE | OTHER` among others.

**Observed** (Flash, `us`, grief case, `BLOCK_LOW_AND_ABOVE`, `responseMimeType: application/json` with a `responseSchema`):

```json
{
  "finishReason": "SAFETY",
  "safetyRatings": [
    { "category": "HARM_CATEGORY_HATE_SPEECH", "probability": "NEGLIGIBLE", "probabilityScore": 0.00024977967, "severity": "HARM_SEVERITY_LOW", "severityScore": 0.22716928 },
    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "probability": "NEGLIGIBLE", "probabilityScore": 0.0018123077, "severity": "HARM_SEVERITY_NEGLIGIBLE" },
    { "category": "HARM_CATEGORY_HARASSMENT", "probability": "LOW", "blocked": true, "probabilityScore": 0.06391197, "severity": "HARM_SEVERITY_LOW", "severityScore": 0.1329594 },
    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "probability": "NEGLIGIBLE", "probabilityScore": 0.000045271194, "severity": "HARM_SEVERITY_NEGLIGIBLE", "severityScore": 0.19031471 }
  ],
  "content": null,
  "usageMetadata": { "promptTokenCount": 160, "candidatesTokenCount": 30, "totalTokenCount": 190, "trafficType": "ON_DEMAND" }
}
```

- `promptFeedback`: absent. `candidates[0].content`: absent. `response.text`: `undefined` (it doesn't throw). So `JSON.parse(response.text)` throws, and code must check `finishReason` first.
- **No partial JSON** in any non-streamed call. Streaming (`generateContentStream`, 3 tries on a case blocked by Flash-Lite) gave one chunk with `finishReason: SAFETY` and no text. We didn't produce a block after some text had streamed, and the docs don't rule one out. This doesn't matter much, since [#33](https://github.com/shrujancheruku/look-together/issues/33) settled on whole replies.
- A blocked call returns HTTP 200 and took the same ~1–2 s as a normal one.

### Is a block billed?

**Yes, as far as the docs and the responses show.** [Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing): "You're charged only for requests that return a 200 response code. Requests returning any other response codes, such as 4xx and 5xx codes, aren't charged." A blocked response is a 200, and its `usageMetadata` counts both the prompt and the tokens generated before the block (30 output tokens above). Google's own prompt-blocked samples also carry `promptTokenCount`. The filters themselves are free: "Like other Gemini safety filters, using the jailbreak classifier is free." No page says outright that blocked calls are exempt. At ~200 tokens a call, the cost is negligible either way.

## 3. How likely is a block on our Problems?

**Cases.** Two are reused from the bake-off's `problems.json` on `prototype/model-bakeoff` (`distress-opening`, `distress-escalation`), condensed into a single Reflection. Six are synthetic: self-harm (cutting), childhood physical and sexual abuse disclosed by an adult (non-explicit), violence towards others (revenge fantasy), violence from others (domestic threat to kill), sexual (compulsive casual sex, non-explicit), and grief (death of a child). Each was sent as a single turn.

**Calls.** Two prompts in the shape of [#33](https://github.com/shrujancheruku/look-together/issues/33)'s:

- **Dialogue:** Gemini 3.8 Flash, `thinkingLevel: LOW`, structured `{reply, distress}`.
- **Classifier:** `{tier: none|soften|step_out, reason}`, run on Flash `LOW` and on Gemini 3.5 Flash-Lite with no thinking config.

**Settings.** Each call was run with no `safetySettings` (default), all four categories `OFF`, `BLOCK_NONE`, `BLOCK_LOW_AND_ABOVE`, and for some runs `BLOCK_MEDIUM_AND_ABOVE` and `BLOCK_ONLY_HIGH`. One run each.

### Results: number of the 8 cases blocked (`finishReason: SAFETY`)

| Call | default | `OFF` | `BLOCK_NONE` | `BLOCK_ONLY_HIGH` | `BLOCK_MEDIUM_AND_ABOVE` | `BLOCK_LOW_AND_ABOVE` |
|---|---|---|---|---|---|---|
| Dialogue, Flash, `us` | 0 | 0 | 0 | 0 | 0 | 1 (grief: Harassment LOW/LOW) |
| Dialogue, Flash, `eu` | 0 | 0 | 0 | not run | not run | 1 (abuse: Harassment LOW/LOW) |
| Classifier, Flash, `us` | 0 | 0 | 0 | not run | not run | **5**: suicidal-opening (Harassment MEDIUM/MEDIUM), suicidal-plan, self-harm, violence-to-others, violence-from-others (Dangerous MEDIUM/LOW or MEDIUM/NEGLIGIBLE) |
| Classifier, Flash-Lite, `us` | 0 | 0 | 0 | **1** (violence-from-others: Dangerous HIGH/NEGLIGIBLE) | **4** (suicidal-plan, self-harm, violence-to-others, violence-from-others) | **4** (same four) |

- **Never a `PROHIBITED_CONTENT` or `SPII`**, including the childhood-sexual-abuse disclosure and the sexual case, so the non-configurable filters didn't fire on a non-explicit disclosure. This is one run, so it isn't proof. It should go into the distress set's gate tier.
- **Never a prompt block** (`promptFeedback` empty every time).
- **The classifier blocks are on exactly the Step-out cases.** Under any blocking threshold, the filter removes the classifier's verdict precisely when it matters. With filters `OFF`, every classifier call returned a verdict.
- Scores under `BLOCK_NONE` peaked at MEDIUM (Harassment and Dangerous Content) for Flash-Lite classifier output, and at LOW/MEDIUM severity for Flash's Dialogue replies. They are noisy and don't follow risk: grief scored Harassment LOW, the actual threat-to-kill case scored NEGLIGIBLE on Flash. They're useless as a distress signal.
- **Aside, for prompt tuning:** with this toy prompt, Flash set `distress: true` on the past-abuse case. The classifier rated that case `soften`. Flash also wrote its own crisis lines (e.g. "call or text 988") into `reply`. The app owns the Step-out, so the Dialogue prompt must keep the model from writing helplines, and the reducer should drop the reply when `distress` is true.

## 4. Does this apply to the distress classifier?

**Yes.** The configurable filters and the non-configurable ones apply to every Gemini `generateContent` call on Vertex, whatever the prompt is for. The docs make no exception, and we observed blocks on Flash and on Flash-Lite. The classifier is the call **most** likely to be blocked, because its own output describes the risk. Every candidate classifier must therefore run with all four categories `OFF` (`OFF` rather than `BLOCK_NONE`: the scores are worthless, and `OFF` returns none). Treat `SAFETY`, `PROHIBITED_CONTENT`, `SPII`, `BLOCKLIST`, `OTHER`, an empty candidate or unparseable JSON as **step_out**, in line with the fail-closed classifier from [#10](https://github.com/shrujancheruku/look-together/issues/10). Non-Gemini candidates (Claude, Gemma on Model-as-a-Service) have their own refusal behaviour and must be tested the same way when the classifier is picked.

**Correction to the map:** the map's "Prompt tuning" note says to run "Flash at minimal thinking" as a classifier candidate. Gemini 3.8 Flash rejects `thinkingLevel: MINIMAL` with `400 INVALID_ARGUMENT: Thinking level is unsupported: THINKING_LEVEL_MINIMAL` (observed, and stated on the [Gemini 3.8 Flash model page](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-8-flash): supported levels are `LOW`, `MEDIUM` (default) and `HIGH`). Use `LOW`, or a Flash-Lite model.

## 5. What this means for Look Together

- **The LLM abstraction sets `safetySettings` to `OFF` for all four categories on every Gemini call**: Breakdown, Dialogue and classifier, on `us` and `eu`. It doesn't rely on the per-model default. That also keeps the scores out of responses.
- **One "no answer" outcome** from the abstraction covers a non-`STOP` `finishReason`, `promptFeedback.blockReason`, an empty candidate, unparseable or invalid structured output, and `MAX_TOKENS`. It carries the reason for metadata (the closed list may want a `blocked_reason` count, never content).
- **Feeds #41** (what a person sees):
  - **Classifier "no answer" → Step-out**, the same fixed app-owned screen (fail closed).
  - **Dialogue or Breakdown "no answer" while the classifier says step_out → Step-out.** While the classifier says `none`/`soften`, retry once. Then show a calm, non-error message, for example that the app couldn't answer that Reflection and the person can reword it or pick another Probe. It must never be an error screen, never blame the person, and never mention "safety" or "harmful content".
  - Blocks still cost tokens, so the retry counts towards the regional spend ceiling, but not towards the person's 40 Reflections.
- **Add the six synthetic cases** (and multi-turn versions) to the distress set from [#17](https://github.com/shrujancheruku/look-together/issues/17). The gate tier should assert zero blocks with filters `OFF`, since a filter or model change can bring blocks back.

## Gaps

- One run per cell, single-turn only, 8 cases. Rates are indicative, not measured. Multi-turn histories (which carry more risk vocabulary) weren't tested.
- No `PROHIBITED_CONTENT` or `SPII` was produced, so their exact shape on structured output is taken from the docs.
- No mid-stream block was produced, so partial streamed JSON is unverified (and moot with whole replies).
- Billing of blocked calls is inferred from the 200 status, the pricing rule and `usageMetadata`. No page states it outright.
- Throwaway scripts and raw JSON results are kept out of the repo.
