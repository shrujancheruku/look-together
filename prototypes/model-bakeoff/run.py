"""PROTOTYPE, throwaway. Runs every Problem in problems.json through every candidate model.

Usage: python3 run.py [candidate-id ...]   (results are cached in results/; delete a file to rerun it)
"""
import json, os, re, subprocess, sys, tempfile, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).parent
PROJECT = "look-together"  # the only Google Cloud project for this app
SYSTEM = (HERE / "system-prompt.md").read_text()
PROBLEMS = json.loads((HERE / "problems.json").read_text())
RESULTS = HERE / os.environ.get("BAKEOFF_RESULTS", "results")

CANDIDATES = [
    {"id": "claude-opus-5-5", "via": "claude-cli"},
    {"id": "claude-sonnet-5-5", "via": "claude-cli"},
    {"id": "claude-haiku-5-5", "via": "claude-cli"},
    {"id": "gemini-4-argon", "via": "vertex-gemini"},
    {"id": "gemini-3.8-flash", "via": "vertex-gemini"},
    {"id": "gemini-3.1-pro-preview", "via": "vertex-gemini"},
    {"id": "gemma-4-26b-a4b-it-maas", "via": "vertex-openai"},  # reference point for on-device Gemma
    # Hybrids: the first model answers until the Breakdown appears, the second holds the Dialogue
    {"id": "hybrid-pro-breakdown-flash-dialogue", "via": "vertex-gemini", "breakdown": "gemini-3.1-pro-preview", "dialogue": "gemini-3.8-flash"},
    {"id": "hybrid-flash-breakdown-pro-dialogue", "via": "vertex-gemini", "breakdown": "gemini-3.8-flash", "dialogue": "gemini-3.1-pro-preview"},
    # The launch setup: pinned us endpoint, high thinking until the Breakdown appears, low for the Dialogue
    {"id": "gemini-3.8-flash-us", "via": "vertex-gemini", "model": "gemini-3.8-flash", "location": "us", "thinking": ("high", "low")},
]
NUMBERED = re.compile(r"^\s*\**(\d+)[.)]\s+(.*)$", re.M)

_token = {"value": None, "at": 0}


def token():
    if time.time() - _token["at"] > 1800:
        _token["value"] = subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()
        _token["at"] = time.time()
    return _token["value"]


def post(url, body, tries=8):
    for i in range(tries):
        req = urllib.request.Request(url, json.dumps(body).encode(), {
            "Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
        try:
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=300) as r:
                # Time only the successful attempt, so retry backoff doesn't count as model latency
                return {**json.load(r), "_seconds": round(time.time() - t0, 1), "_retries": i}
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and i < tries - 1:
                time.sleep(min(60, 4 * 2 ** i))
                continue
            raise RuntimeError(f"{e.code} {e.read()[:300]!r}")


def gemini_turn(model, history, location="global", thinking=None):
    contents = [{"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["text"]}]} for m in history]
    host = "aiplatform.googleapis.com" if location == "global" else f"aiplatform.{location}.rep.googleapis.com"
    body = {"systemInstruction": {"parts": [{"text": SYSTEM}]}, "contents": contents}
    if thinking:
        body["generationConfig"] = {"thinkingConfig": {"thinkingLevel": thinking}}
    d = post(f"https://{host}/v1/projects/{PROJECT}/locations/{location}/publishers/google/models/{model}:generateContent", body)
    parts = d["candidates"][0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts if not p.get("thought")), {
        **d.get("usageMetadata", {}), "api_seconds": d["_seconds"], "retries": d["_retries"]}


def openai_turn(model, history):
    msgs = [{"role": "system", "content": SYSTEM}] + [
        {"role": m["role"], "content": m["text"]} for m in history]
    d = post(f"https://aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/global/endpoints/openapi/chat/completions",
             {"model": f"google/{model}", "messages": msgs})
    return d["choices"][0]["message"]["content"], {**d.get("usage", {}), "api_seconds": d["_seconds"], "retries": d["_retries"]}


class ClaudeCli:
    """Uses the person's Claude subscription via headless Claude Code, isolated from tools, MCP, settings and CLAUDE.md."""

    def __init__(self, model):
        self.model, self.session, self.api_ms = model, None, 0
        self.cwd = tempfile.mkdtemp(prefix="bakeoff-")
        (Path(self.cwd) / "mcp.json").write_text('{"mcpServers":{}}')

    def turn(self, history):
        cmd = ["claude", "-p", "--model", self.model, "--system-prompt", SYSTEM, "--tools", "",
               "--strict-mcp-config", "--mcp-config", "mcp.json", "--setting-sources", "",
               "--output-format", "json"]
        if self.session:
            cmd += ["--resume", self.session]
        for i in range(4):
            p = subprocess.run(cmd + [history[-1]["text"]], cwd=self.cwd, capture_output=True, text=True)
            try:
                d = json.loads(p.stdout)
            except json.JSONDecodeError:
                d = {"is_error": True, "result": p.stderr[:300]}
            if not d.get("is_error"):
                self.session = d["session_id"]
                # duration_api_ms is cumulative across a resumed session, so take the difference
                api_s = (d.get("duration_api_ms", 0) - self.api_ms) / 1000
                self.api_ms = d.get("duration_api_ms", 0)
                return d["result"], {**d.get("usage", {}), "total_cost_usd": d.get("total_cost_usd"), "api_seconds": round(api_s, 1)}
            time.sleep(10 * (i + 1))
        raise RuntimeError(d.get("result"))


def run_one(cand, prob):
    out = RESULTS / cand["id"] / f"{prob['id']}.json"
    if out.exists():
        return f"cached  {cand['id']} / {prob['id']}"
    cli = ClaudeCli(cand["id"]) if cand["via"] == "claude-cli" else None
    history, breakdown = [], None
    try:
        for turn in prob["turns"]:
            user = {"role": "user"}
            if isinstance(turn, dict):
                # Pick by content, not position, and record where (or whether) that Assumption appeared
                hit = next((int(n) for n, line in NUMBERED.findall(breakdown or "") if re.search(turn["match"], line, re.I)), None)
                user.update(text=f"The one about {turn['pick']}.", pick={"label": turn["pick"], "position": hit})
            else:
                user["text"] = turn
            history.append(user)
            model = cand.get("model", cand["id"])
            if "breakdown" in cand:
                model = cand["dialogue"] if breakdown else cand["breakdown"]
            t0 = time.time()
            if cli:
                reply, usage = cli.turn(history)
            elif cand["via"] == "vertex-gemini":
                thinking = cand.get("thinking") and cand["thinking"][1 if breakdown else 0]
                reply, usage = gemini_turn(model, history, cand.get("location", "global"), thinking)
            else:
                reply, usage = openai_turn(model, history)
            if breakdown is None and len(NUMBERED.findall(reply)) >= 3:
                breakdown = reply
            history.append({"role": "assistant", "model": model, "text": reply, "usage": usage,
                            "seconds": (usage or {}).get("api_seconds") or round(time.time() - t0, 1)})
    except Exception as e:
        return f"FAILED  {cand['id']} / {prob['id']}: {e}"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"candidate": cand["id"], "via": cand["via"], "problem": prob["id"], "history": history}, indent=2))
    return f"done    {cand['id']} / {prob['id']}"


if __name__ == "__main__":
    only = set(sys.argv[1:])
    jobs = [(c, p) for c in CANDIDATES if not only or c["id"] in only for p in PROBLEMS]
    with ThreadPoolExecutor(int(os.environ.get("BAKEOFF_WORKERS", 6))) as pool:
        for line in pool.map(lambda j: run_one(*j), jobs):
            print(line, flush=True)
