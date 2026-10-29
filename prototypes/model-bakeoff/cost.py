"""PROTOTYPE, throwaway. Prices the measured token usage in results-usage/ per Inquiry.

List prices in USD per 1M tokens, read 2026-10-29 (Gemini API pricing page; Anthropic pricing page).
Gemini is priced without caching, since the privacy decision turns implicit caching off.
"""
import glob, json, statistics as st
from pathlib import Path

HERE = Path(__file__).parent
PRICES = {
    "gemini-3.1-pro-preview": {"in": 2.00, "out": 12.00},
    "gemini-3.8-flash": {"in": 1.50, "out": 7.50},  # from 2027-01-01; $0.75 / $3.75 until 2026-12-31
    "claude-opus-5-5": {"in": 4.00, "out": 20.00, "cache_write": 5.00, "cache_read": 0.20},
}
DISTRESS = {"distress-opening", "distress-escalation"}


def turn_cost(model, u):
    p = PRICES[model]
    if model.startswith("gemini"):
        inp, out = u.get("promptTokenCount", 0), u.get("candidatesTokenCount", 0) + u.get("thoughtsTokenCount", 0)
        return {"in": inp, "out": out, "cost": (inp * p["in"] + out * p["out"]) / 1e6, "cost_nocache": None}
    i, cw, cr, o = (u.get(k, 0) for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"))
    cached = (i * p["in"] + cw * p["cache_write"] + cr * p["cache_read"] + o * p["out"]) / 1e6
    nocache = ((i + cw + cr) * p["in"] + o * p["out"]) / 1e6
    return {"in": i + cw + cr, "out": o, "cost": cached, "cost_nocache": nocache}


rows = {}
for f in glob.glob(str(HERE / "results-usage/*/*.json")):
    d = json.loads(Path(f).read_text())
    if d["problem"] in DISTRESS or d["candidate"] not in PRICES:
        continue
    turns = [turn_cost(d["candidate"], m["usage"]) for m in d["history"] if m["role"] == "assistant"]
    rows.setdefault(d["candidate"], []).append({
        "turns": len(turns),
        "in": sum(t["in"] for t in turns), "out": sum(t["out"] for t in turns),
        "cost": sum(t["cost"] for t in turns),
        "cost_nocache": sum(t["cost_nocache"] or t["cost"] for t in turns),
        "sec": st.median(m["seconds"] for m in d["history"] if m["role"] == "assistant"),
    })

print(f"{'model':24} {'Inq':>3} {'turns':>5} {'in tok':>7} {'out tok':>7} {'$ / Inquiry':>11} {'$ no cache':>10} {'$ / turn':>8} {'med s':>5}")
for m, r in sorted(rows.items()):
    n = len(r)
    avg = lambda k: sum(x[k] for x in r) / n
    print(f"{m:24} {n:3} {avg('turns'):5.1f} {avg('in'):7.0f} {avg('out'):7.0f} {avg('cost'):11.4f} {avg('cost_nocache'):10.4f} "
          f"{avg('cost') / avg('turns'):8.4f} {st.median(x['sec'] for x in r):5.1f}")
