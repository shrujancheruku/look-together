"""PROTOTYPE, throwaway. Prices the launch setup (Gemini 3.8 Flash, us endpoint, high thinking until the Breakdown, then low)
per turn and per Inquiry, from the runs in results-cost-*/, and adds the voice cascade per 10 minutes.

Prices in USD, read 2026-10-30 from the Vertex AI, Speech-to-Text and Text-to-Speech pricing pages. The us/eu endpoints are
"Non-global", 10% above global. Standard prices start 2027-01-01; the introductory prices until then are half.
"""
import glob, json, statistics as st, sys
from pathlib import Path

HERE = Path(__file__).parent
FLASH = {"in": 1.65, "cached": 0.165, "out": 8.25}   # per 1M tokens, Non-global, from 2027-01-01
STT_PER_MIN, TTS_PER_CHAR = 0.016, 30 / 1e6          # Cloud STT v2 standard (incl. `long`); Chirp 3 HD
DISTRESS = {"distress-opening", "distress-escalation"}


def price(u):
    cached = u.get("cachedContentTokenCount", 0)
    i, o = u["promptTokenCount"], u.get("candidatesTokenCount", 0) + u.get("thoughtsTokenCount", 0)
    return {"in": i, "cached": cached, "out": o, "thoughts": u.get("thoughtsTokenCount", 0),
            "cost": ((i - cached) * FLASH["in"] + cached * FLASH["cached"] + o * FLASH["out"]) / 1e6,
            "cost_uncached": (i * FLASH["in"] + o * FLASH["out"]) / 1e6}


def load():
    runs = []
    for f in sorted(glob.glob(str(HERE / "results-cost-*/gemini-3.8-flash-us/*.json"))):
        d = json.loads(Path(f).read_text())
        turns, seen = [], False
        for k, m in enumerate(m for m in d["history"] if m["role"] == "assistant"):
            t = price(m["usage"]) | {"n": k + 1, "level": "low" if seen else "high", "chars": len(m["text"]), "seconds": m["seconds"]}
            seen = seen or ("1." in m["text"] and "2." in m["text"] and "3." in m["text"])
            turns.append(t)
        runs.append({"problem": d["problem"], "rep": Path(f).parts[-3], "turns": turns})
    return runs


if __name__ == "__main__":
    runs = load()
    ordinary = [r for r in runs if r["problem"] not in DISTRESS]
    print("per turn (ordinary Inquiries, all reps)")
    print(f"{'turn':>4} {'n':>3} {'level':>5} {'in':>6} {'cached':>6} {'out':>5} {'think':>5} {'$':>8}")
    for n in range(1, 10):
        ts = [r["turns"][n - 1] for r in ordinary if len(r["turns"]) >= n]
        if not ts:
            break
        lv = "/".join(sorted({t["level"] for t in ts}))
        print(f"{n:4} {len(ts):3} {lv:>5} {st.mean(t['in'] for t in ts):6.0f} {st.mean(t['cached'] for t in ts):6.0f} "
              f"{st.mean(t['out'] for t in ts):5.0f} {st.mean(t['thoughts'] for t in ts):5.0f} {st.mean(t['cost'] for t in ts):8.5f}")
    print("\nper Inquiry")
    for r in runs:
        T = r["turns"]
        print(f"{r['problem']:20} {r['rep']:14} turns {len(T)}  in {sum(t['in'] for t in T):6} cached {sum(t['cached'] for t in T):5} "
              f"out {sum(t['out'] for t in T):5}  ${sum(t['cost'] for t in T):.4f} (uncached ${sum(t['cost_uncached'] for t in T):.4f})")
    per = [sum(t["cost"] for t in r["turns"]) for r in ordinary]
    unc = [sum(t["cost_uncached"] for t in r["turns"]) for r in ordinary]
    nt = [len(r["turns"]) for r in ordinary]
    cached = sum(t["cached"] for r in ordinary for t in r["turns"]) / sum(t["in"] for r in ordinary for t in r["turns"])
    print(f"\nordinary: {len(ordinary)} Inquiries, mean {st.mean(nt):.1f} turns, mean ${st.mean(per):.4f}, median ${st.median(per):.4f}, "
          f"max ${max(per):.4f}; uncached mean ${st.mean(unc):.4f}; {cached:.0%} of input tokens served from cache")
    # Voice per 10 minutes: STT bills the person's streamed audio, TTS every character spoken; the Breakdown is never read out
    lows = [t for r in ordinary for t in r["turns"] if t["level"] == "low"]
    tts_chars = st.mean(t["chars"] for t in lows)
    print(f"Dialogue turn (low): mean {tts_chars:.0f} chars, ${st.mean(t['cost'] for t in lows):.5f}, median {st.median(t['seconds'] for t in lows):.1f} s")
