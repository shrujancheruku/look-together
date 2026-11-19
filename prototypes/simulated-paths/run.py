"""PROTOTYPE, throwaway. A model plays the person through whole Paths against draft prompts.

Usage:
  python3 run.py [runs]          run every problem x persona `runs` times (default 2), then build report.html
  python3 run.py report          rebuild report.html from results/

Results are cached in results/ (delete a file to rerun it). The app side is Gemini 3.8 Flash on the
pinned us endpoint (high thinking for the Breakdown, low for a turn), as the decisions sheet has it.
The person is played by Claude through headless `claude -p` on the founder's subscription.
"""
import json, os, re, subprocess, sys, tempfile, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).parent
PROJECT = "look-together"  # the only Google Cloud project for this app
APP_MODEL = "gemini-3.8-flash"
SIM_MODEL = os.environ.get("SIM_MODEL", "claude-sonnet-5-5")
RESULTS = HERE / os.environ.get("SIM_RESULTS", "results")
MAX_REFLECTIONS = 12  # the prototype's own stop, not a rule of the app
PRICE = {"in": 1.50, "out": 7.50}  # Gemini 3.8 Flash, USD per 1M tokens, as in the model bake-off

PEOPLE = json.loads((HERE / "people.json").read_text())
strip_note = lambda name: (HERE / name).read_text().split("\n", 2)[2]  # drop the PROTOTYPE line
BREAKDOWN_PROMPT, TURN_PROMPT, PERSON_PROMPT = (strip_note(n) for n in ("breakdown-prompt.md", "turn-prompt.md", "person-prompt.md"))

# The second pass: the person is told outright how this Path goes for them. The rate is ours, not a measurement.
FATES = os.environ.get("SIM_FATES") and {
    "reject": "From your Reflection number {k} on, you are sure the app has you wrong: whatever it seems to think you believe isn't yours, and you say so flatly. If it shows you a guess, you tell it that's not you at all.",
    "ask_to_stop": "At your Reflection number {k}, you've had enough for tonight and you say you want to stop there, in your own way.",
    "set_down": "At your Reflection number {k}, you put the phone down without a word: write exactly SET_DOWN.",
}
ANGLES = ["name", "narrow", "slow", "analogy", "reveal"]
BREAKDOWN_SCHEMA = {"type": "object", "required": ["title", "assumptions"], "properties": {
    "title": {"type": "string"},
    "assumptions": {"type": "array", "items": {"type": "object", "required": ["premise", "probe", "keyWords"], "properties": {
        "premise": {"type": "string"}, "probe": {"type": "string"}, "keyWords": {"type": "array", "items": {"type": "string"}}}}}}}
TURN_SCHEMA = {"type": "object", "required": ["reply", "events"], "properties": {
    "reply": {"type": "string"},
    "events": {"type": "array", "items": {"type": "object", "required": ["type"], "properties": {
        "type": {"type": "string", "enum": ["angle", "reword", "reject", "done"]},
        "kind": {"type": "string", "enum": ANGLES},
        "premise": {"type": "string"}, "resetAngles": {"type": "boolean"}, "openQuestion": {"type": "string"}}}}}}

_token = {"value": None, "at": 0}


def token():
    if time.time() - _token["at"] > 1800:
        _token["value"] = subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()
        _token["at"] = time.time()
    return _token["value"]


def gemini(system, text, schema, thinking):
    body = {"systemInstruction": {"parts": [{"text": system}]}, "contents": [{"role": "user", "parts": [{"text": text}]}],
            "generationConfig": {"thinkingConfig": {"thinkingLevel": thinking}, "responseMimeType": "application/json", "responseJsonSchema": schema}}
    url = f"https://aiplatform.us.rep.googleapis.com/v1/projects/{PROJECT}/locations/us/publishers/google/models/{APP_MODEL}:generateContent"
    for i in range(6):
        req = urllib.request.Request(url, json.dumps(body).encode(), {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
        try:
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
            parts = d["candidates"][0].get("content", {}).get("parts", [])
            out = json.loads("".join(p.get("text", "") for p in parts if not p.get("thought")))
            u = d.get("usageMetadata", {})
            tin, tout = u.get("promptTokenCount", 0), u.get("candidatesTokenCount", 0) + u.get("thoughtsTokenCount", 0)
            return out, {"in": tin, "out": tout, "usd": (tin * PRICE["in"] + tout * PRICE["out"]) / 1e6, "seconds": round(time.time() - t0, 1)}
        except (urllib.error.HTTPError, json.JSONDecodeError, KeyError, IndexError) as e:
            if i == 5:
                raise RuntimeError(f"gemini: {e}")
            time.sleep(min(60, 4 * 2 ** i))


def person(system, text):
    """One stateless call: the whole Path so far goes in each time."""
    cwd = tempfile.mkdtemp(prefix="simpaths-")
    (Path(cwd) / "mcp.json").write_text('{"mcpServers":{}}')
    cmd = ["claude", "-p", "--model", SIM_MODEL, "--system-prompt", system, "--tools", "", "--strict-mcp-config",
           "--mcp-config", "mcp.json", "--setting-sources", "", "--output-format", "json", text]
    for i in range(4):
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        try:
            d = json.loads(p.stdout)
        except json.JSONDecodeError:
            d = {"is_error": True, "result": p.stderr[:300]}
        if not d.get("is_error"):
            return d["result"].strip(), {"usd": d.get("total_cost_usd") or 0, "seconds": round(d.get("duration_api_ms", 0) / 1000, 1)}
        time.sleep(10 * (i + 1))
    raise RuntimeError(f"claude: {d.get('result')}")


def breakdown(prob):
    out = RESULTS / "breakdowns" / f"{prob['id']}.json"
    if not out.exists():
        b, usage = gemini(BREAKDOWN_PROMPT, prob["problem"], BREAKDOWN_SCHEMA, "high")
        for a in b["assumptions"]:
            a["anchored"] = any(k.lower() in prob["problem"].lower() for k in a["keyWords"])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({**b, "usage": usage}, indent=2))
    return json.loads(out.read_text())


def turn_text(prob, a, pairs, note=None):
    lines = [f"Problem: {prob['problem']}", "", "This Path's Assumption:", f"  premise (our working guess): {a['premise']}",
             f"  premise shown to the person: {'yes' if a['premiseShown'] else 'no'}",
             f"  angles used: {', '.join(a['angles']) or 'none'} ({len(a['angles'])} of 3)", "", "The Path so far:", f"Probe: {a['probe']}"]
    for p in pairs:
        lines.append(f"Reflection: {p['reflection']}")
        if p.get("reply"):
            lines.append(f"Reply: {p['reply']}")
    if note:
        lines += ["", note]
    return "\n".join(lines)


def check(a, ev):
    """The slice of the reducer this prototype needs: the angle cap, and reveal of a shown premise."""
    if ev["type"] != "angle":
        return None
    kind = ev.get("kind")
    if kind not in ANGLES:
        return "an angle event needs a kind"
    if len(a["angles"]) >= 3:
        return "the 3 angles for this Assumption are used"
    if kind in a["angles"]:
        return f"the {kind} angle was already used"
    if kind == "reveal" and a["premiseShown"]:
        return "the premise is already shown"
    return None


def flags(reply):
    f = []
    if reply.count("?") != 1:
        f.append(f"{reply.count('?')} question marks")
    if re.search(r"\bI\b|\bI'", reply):
        f.append('says "I"')
    if re.search(r"\b(right|do you see|you understand|make sense)\?", reply, re.I):
        f.append("checks for assent")
    return f


def run_path(prob, persona, run):
    out = RESULTS / "paths" / f"{prob['id']}--{persona['id']}--{run}.json"
    if out.exists():
        return f"cached  {out.stem}"
    try:
        b = breakdown(prob)
        system = PERSON_PROMPT.replace("{profile}", prob["profile"]).replace("{problem}", prob["problem"]).replace("{how}", persona["how"])
        fate = None
        if FATES:
            i = PEOPLE["problems"].index(prob) + PEOPLE["personas"].index(persona) + run
            fate = {"kind": list(FATES)[i % 3], "at": 2 + (i * 7) % 4}
            system += "\n\n## How tonight goes\n\n" + FATES[fate["kind"]].replace("{k}", str(fate["at"])) + " This overrides anything above that conflicts with it."
        probes = "\n".join(f"{i + 1}. {x['probe']}" for i, x in enumerate(b["assumptions"]))
        pick, u = person(system, f"The app shows you these questions:\n\n{probes}\n\nWhich one do you tap? Answer with the number only.")
        usd_person, usd_app, secs = u["usd"], 0, u["seconds"]
        n = int((re.search(r"\d", pick) or [1])[0]) - 1
        a = {**b["assumptions"][min(n, len(b["assumptions"]) - 1)], "premiseShown": False, "angles": []}
        pairs, ending, refused = [], None, []
        while ending is None:
            said = "\n".join(f"You: {p['reflection']}\nApp: {p['reply']}" for p in pairs)
            r, u = person(system, f"You tapped: {a['probe']}\n\n{said}\n\nWrite your Reflection number {len(pairs) + 1}.".replace("\n\n\n\n", "\n\n"))
            usd_person += u["usd"]; secs += u["seconds"]
            if r.startswith("SET_DOWN"):
                ending = "set_down"
                break
            if len(pairs) == MAX_REFLECTIONS:
                ending = "step_cap"
                break
            pair = {"reflection": r}
            pairs.append(pair)
            m, u = gemini(TURN_PROMPT, turn_text(prob, a, pairs), TURN_SCHEMA, "low")
            usd_app += u["usd"]; secs += u["seconds"]
            ev = (m["events"] or [None])[0]
            why = ev and check(a, ev)
            if why:  # the hold-back call: one retry, then keep the reply and drop the event
                refused.append({"at": len(pairs), "event": ev, "why": why})
                m, u = gemini(TURN_PROMPT, turn_text(prob, a, pairs, f"The app refused your last event: {why}. End the Path or ask whether to stop."), TURN_SCHEMA, "low")
                usd_app += u["usd"]; secs += u["seconds"]
                ev = (m["events"] or [None])[0]
                if ev and check(a, ev):
                    ev = None
            pair.update(reply=m["reply"], event=ev, flags=flags(m["reply"]), appIn=u["in"])
            if ev:
                if ev["type"] == "angle":
                    a["angles"].append(ev["kind"])
                    a["premiseShown"] = a["premiseShown"] or ev["kind"] == "reveal"
                elif ev["type"] == "reword":
                    a["premise"] = ev.get("premise") or a["premise"]
                    if ev.get("resetAngles"):
                        a["angles"] = []
                elif ev["type"] == "reject":
                    ending = "rejected"
                elif ev["type"] == "done":
                    ending = "done_at_angle_cap" if len(a["angles"]) == 3 else "done_open_question" if ev.get("openQuestion") else "done"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({"problem": prob["id"], "persona": persona["id"], "run": run, "fate": fate, "simModel": SIM_MODEL, "probe": a["probe"],
                                   "premise": a["premise"], "pairs": pairs, "ending": ending, "angles": a["angles"], "refused": refused,
                                   "usdApp": round(usd_app, 5), "usdPerson": round(usd_person, 5), "seconds": round(secs)}, indent=2))
        return f"done    {out.stem}: {ending} after {len(pairs)}"
    except Exception as e:
        return f"FAILED  {out.stem}: {e}"


def report():
    data = {"people": PEOPLE, "breakdowns": {p.stem: json.loads(p.read_text()) for p in sorted((RESULTS / "breakdowns").glob("*.json"))},
            "paths": [json.loads(p.read_text()) for p in sorted((RESULTS / "paths").glob("*.json"))], "maxReflections": MAX_REFLECTIONS}
    html = (HERE / "report-template.html").read_text().replace("/*DATA*/null", json.dumps(data).replace("</", "<\\/"))
    name = "report-fates.html" if FATES else "report.html"
    (HERE / name).write_text(html)
    print(f"{name}: {len(data['paths'])} Paths")


if __name__ == "__main__":
    if sys.argv[1:] != ["report"]:
        runs = int(sys.argv[1]) if sys.argv[1:] else 2
        for prob in PEOPLE["problems"]:
            breakdown(prob)  # before the pool, so every Path of a problem shares one Breakdown
        jobs = [(prob, persona, r) for r in range(1, runs + 1) for prob in PEOPLE["problems"] for persona in PEOPLE["personas"]]
        with ThreadPoolExecutor(int(os.environ.get("SIM_WORKERS", 6))) as pool:
            for line in pool.map(lambda j: run_path(*j), jobs):
                print(line, flush=True)
    report()
