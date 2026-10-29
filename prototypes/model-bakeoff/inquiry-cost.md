# What an Inquiry costs on Gemini 3.8 Flash

Measured 2026-10-30 for [Measure what an Inquiry costs on Gemini 3.8 Flash](https://github.com/shrujancheruku/look-together/issues/29).

**Setup:** the bake-off harness (`run.py`, candidate `gemini-3.8-flash-us`). Google Cloud project `look-together`, pinned `us` endpoint (`aiplatform.us.rep.googleapis.com`). High thinking until the Breakdown appears, low after it. DURABLE caching on (`cacheConfig` → `retentionType: DURABLE`). All 8 Problems in `problems.json`, 3 runs each, results in `results-cost-{1,2,3}/`. Priced by `inquiry_cost.py`; raw output in `inquiry-cost-output.txt`.

**Prices** (Vertex pricing page, read 2026-10-30): `us` and `eu` are **Non-global**, 10% above global. From 2027-01-01: **$1.65 in, $0.165 cached in, $8.25 out** (thinking counts as output), per 1M tokens. Until then the introductory prices are half.

## Text Inquiry

Over 18 ordinary Inquiries (distress Problems excluded) averaging 6.8 turns:

- **Mean $0.0227, median $0.0217, max $0.0295.** That's a little over half of Sonnet 5.5's ~$0.04.
- The **Breakdown turn** (high thinking, ~780 thought tokens) is **$0.0084, about 37%** of the Inquiry.
- Each **Dialogue turn** (low thinking: 0 thought tokens in every run) is **$0.0019–0.0033**, mostly input. Input grows about 50 tokens a turn.

| Turn | Thinking | Input tokens | Output tokens | of which thinking | Cost |
|---|---|---|---|---|---|
| 1 | high | 868 | 845 | 778 | $0.0084 |
| 2 | high or low | 946 | 179 | 153 | $0.0030 |
| 3 | low | 991 | 28 | 0 | $0.0019 |
| 4 | low | 1,032 | 22 | 0 | $0.0019 |
| 5 | low | 1,062 | 59 | 0 | $0.0022 |
| 6 | low | 1,125 | 108 | 0 | $0.0028 |
| 7 | low | 1,244 | 122 | 0 | $0.0031 |

Turn 2 is high when the model asked a clarifying question before giving the Breakdown.

**Distress Problems:** a distress opening on high thinking cost $0.020–0.073. One run thought for over 8,000 tokens before replying. In the app the classifier's Step-out should usually come before this; if not, cap `maxOutputTokens` (or the thinking budget) on the Breakdown call.

## Caching: no discount at this size

**No turn in any run hit the cache.** Vertex's context-caching docs give a **6,144-token minimum** for implicit caching on Gemini 3.8 Flash. Our largest prompt was 1,446 tokens. A spot check with a 12,392-token prompt on `us` hit the cache in 2 of 5 calls (8,166 tokens cached), so caching works, just not at our size. The real prompts (distress and voice addenda, Recap instructions) will be bigger but are unlikely to pass 6K. So the costs above are effectively uncached, and **DURABLE caching currently buys no discount**.

## Voice, per 10 minutes (modelled)

Modelled from the measured per-turn figures plus list prices, not measured end to end. That needs the LiveKit native prototype.

Assumed 10-minute rhythm: the person speaks ~20 s, waits ~5 s, the app speaks one Dialogue turn (mean 226 characters, ~15 s at ~15 chars/s). That makes about 15 turns.

| Part | Basis | Per 10 min |
|---|---|---|
| Cloud STT v2 `long` | $0.016/min. Stream open all 10 min for barge-in (VAD gating to the person's ~5 min: $0.08) | **$0.16** |
| Chirp 3 HD TTS | $30/1M chars × ~15 × 226 ≈ 3,400 chars (first 1M chars/month free) | **$0.10** |
| Flash | ~32K input (system + voice addendum ~1,150, growing ~125/turn), ~1,750 output incl. Breakdown | **$0.07** |
| **Total** | | **≈ $0.33** (≈ $0.25 with VAD-gated STT) |

**STT is the biggest single line.** Gating it to the person's speech (LiveKit's VAD) saves about a quarter of the total.

## Not counted

- The **per-turn distress classifier** (model not yet picked; see Prompt tuning on the map). If it's Flash at low thinking with a ~300-token prompt, that's about $0.0006 a turn, so ~$0.004 per text Inquiry.
- The **Recap** turn, if it's longer than a normal Dialogue turn. About $0.002–0.003.
- **Fixed infrastructure:** Cloud Run, the LiveKit VM and egress are monthly costs, not per-Inquiry ones.

**Planning figures:** ~$0.03 per text Inquiry with classifier and Recap, ~$0.35 per 10 minutes of voice.
