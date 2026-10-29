"""PROTOTYPE, throwaway. Prices measured token usage per turn and summarises cost and timing per candidate.

List prices in USD per 1M tokens, read 2026-10-29, at the price that will apply at launch:
Gemini API pricing page (Gemini 3.8 Flash from 2027-01-01, Gemini 4 Argon from 2026-12-01), Anthropic pricing page.
Gemma 4 on Vertex has no official price; third-party trackers say $0.07–0.15 in, $0.34–0.60 out, so the upper figure is used.
The headline cost is uncached for every model: the privacy decision turns Gemini's implicit caching off, and Claude's
prompt cache isn't cleared against the zero-retention claim yet. Claude's cached cost is reported alongside.
"""
import glob, json, re, statistics as st
from pathlib import Path

HERE = Path(__file__).parent
PRICES = {
    "gemini-3.1-pro-preview": {"in": 2.00, "out": 12.00},
    "gemini-3.8-flash": {"in": 1.50, "out": 7.50},
    "gemini-4-argon": {"in": 4.00, "out": 20.00},
    "gemma-4-26b-a4b-it-maas": {"in": 0.15, "out": 0.60},
    "claude-opus-5-5": {"in": 4.00, "out": 20.00, "cache_write": 5.00, "cache_read": 0.20},
    "claude-sonnet-5-5": {"in": 2.00, "out": 10.00, "cache_write": 2.50, "cache_read": 0.10},
    "claude-haiku-5-5": {"in": 0.10, "out": 0.50, "cache_write": 0.125, "cache_read": 0.01},
}
# Claude Code's own context around each headless call, measured with a one-character system prompt
CLAUDE_OVERHEAD_FIRST, CLAUDE_OVERHEAD_PER_TURN = 560, 10
DISTRESS = {"distress-opening", "distress-escalation"}
NUMBERED = re.compile(r"^\s*\**(\d+)[.)]\s+(.*)$", re.M)


def price_turns(history):
    """Adds in/out tokens and cost (and Claude's cached cost) to each assistant turn, in place."""
    prev_in = 0
    turns = [m for m in history if m["role"] == "assistant"]
    for k, m in enumerate(turns):
        u, p = m.get("usage") or {}, PRICES[m["model"]]
        if "promptTokenCount" in u:
            i, o = u["promptTokenCount"], u.get("candidatesTokenCount", 0) + u.get("thoughtsTokenCount", 0)
        elif "prompt_tokens" in u:
            i, o = u["prompt_tokens"], u.get("completion_tokens", 0)
        else:
            i = u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0)
            i -= CLAUDE_OVERHEAD_FIRST + CLAUDE_OVERHEAD_PER_TURN * k
            o = u.get("output_tokens", 0)
            new = i - prev_in if k else i
            m["cost_cached"] = (new * p["cache_write"] + (i - new) * p["cache_read"] + o * p["out"]) / 1e6
            prev_in = i
        m.update(tokens_in=i, tokens_out=o, cost=(i * p["in"] + o * p["out"]) / 1e6)
    return turns


def load():
    runs = []
    for f in sorted(glob.glob(str(HERE / "results/*/*.json"))):
        d = json.loads(Path(f).read_text())
        seen = False
        for m in d["history"]:
            if m["role"] == "assistant":
                m.setdefault("model", d["candidate"])
                if not seen and len(NUMBERED.findall(m["text"])) >= 3:
                    m["breakdown"] = seen = True
        price_turns(d["history"])
        runs.append(d)
    return runs


def summary(runs):
    out = {}
    for c in sorted({d["candidate"] for d in runs}):
        mine = [d for d in runs if d["candidate"] == c and d["problem"] not in DISTRESS]
        turns = [m for d in mine for m in d["history"] if m["role"] == "assistant"]
        bd = [next((m for m in d["history"] if m["role"] == "assistant" and m.get("breakdown")), None) for d in mine]
        secs = sorted(m["seconds"] for m in turns)
        picks = [m["pick"]["position"] for d in runs if d["candidate"] == c for m in d["history"] if m.get("pick")]
        cached = [sum(m.get("cost_cached", m["cost"]) for m in d["history"] if m["role"] == "assistant") for d in mine]
        out[c] = {
            "inquiries": len(mine),
            "turns": st.mean(len([m for m in d["history"] if m["role"] == "assistant"]) for d in mine),
            "cost": st.mean(sum(m["cost"] for m in d["history"] if m["role"] == "assistant") for d in mine),
            "cost_cached": st.mean(cached) if c.startswith("claude") else None,
            "cost_per_turn": st.mean(m["cost"] for m in turns),
            "sec_median": st.median(secs),
            "sec_p90": secs[int(0.9 * (len(secs) - 1))],
            "sec_breakdown": st.median([m["seconds"] for m in bd if m] or [float("nan")]),
            "tokens_out_per_turn": st.mean(m["tokens_out"] for m in turns),
            "picks_found": f"{sum(p is not None for p in picks)}/{len(picks)}",
        }
    return out


if __name__ == "__main__":
    s = summary(load())
    print(f"{'candidate':38} {'$/Inq':>7} {'cached':>7} {'$/turn':>7} {'out/turn':>8} {'med s':>6} {'p90 s':>6} {'BD s':>5} {'picks':>5}")
    for c, r in s.items():
        cc = f"{r['cost_cached']:.4f}" if r["cost_cached"] is not None else ""
        print(f"{c:38} {r['cost']:7.4f} {cc:>7} {r['cost_per_turn']:7.4f} {r['tokens_out_per_turn']:8.0f} {r['sec_median']:6.1f} {r['sec_p90']:6.1f} {r['sec_breakdown']:5.1f} {r['picks_found']:>5}")
