"""PROTOTYPE, throwaway. Runs every Problem in problems.json through every candidate model.

Usage: python3 run.py [candidate-id ...]   (results are cached in results/; delete a file to rerun it)
"""
import json, subprocess, sys, tempfile, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).parent
PROJECT = "issho-dev-512213"
SYSTEM = (HERE / "system-prompt.md").read_text()
PROBLEMS = json.loads((HERE / "problems.json").read_text())
RESULTS = HERE / "results"

CANDIDATES = [
    {"id": "claude-opus-5-5", "via": "claude-cli"},
    {"id": "claude-sonnet-5-5", "via": "claude-cli"},
    {"id": "claude-haiku-5-5", "via": "claude-cli"},
    {"id": "gemini-4-argon", "via": "vertex-gemini"},
    {"id": "gemini-3.8-flash", "via": "vertex-gemini"},
    {"id": "gemini-3.1-pro-preview", "via": "vertex-gemini"},
    {"id": "gemma-4-26b-a4b-it-maas", "via": "vertex-openai"},  # reference point for on-device Gemma
]

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
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and i < tries - 1:
                time.sleep(min(60, 4 * 2 ** i))
                continue
            raise RuntimeError(f"{e.code} {e.read()[:300]!r}")


def gemini_turn(model, history):
    contents = [{"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["text"]}]} for m in history]
    d = post(f"https://aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/global/publishers/google/models/{model}:generateContent",
             {"systemInstruction": {"parts": [{"text": SYSTEM}]}, "contents": contents})
    parts = d["candidates"][0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts if not p.get("thought"))


def openai_turn(model, history):
    msgs = [{"role": "system", "content": SYSTEM}] + [
        {"role": m["role"], "content": m["text"]} for m in history]
    d = post(f"https://aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/global/endpoints/openapi/chat/completions",
             {"model": f"google/{model}", "messages": msgs})
    return d["choices"][0]["message"]["content"]


class ClaudeCli:
    """Uses the person's Claude subscription via headless Claude Code, isolated from tools, MCP, settings and CLAUDE.md."""

    def __init__(self, model):
        self.model, self.session = model, None
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
                return d["result"]
            time.sleep(10 * (i + 1))
        raise RuntimeError(d.get("result"))


def run_one(cand, prob):
    out = RESULTS / cand["id"] / f"{prob['id']}.json"
    if out.exists():
        return f"cached  {cand['id']} / {prob['id']}"
    cli = ClaudeCli(cand["id"]) if cand["via"] == "claude-cli" else None
    history = []
    try:
        for text in prob["turns"]:
            history.append({"role": "user", "text": text})
            t0 = time.time()
            if cli:
                reply = cli.turn(history)
            elif cand["via"] == "vertex-gemini":
                reply = gemini_turn(cand["id"], history)
            else:
                reply = openai_turn(cand["id"], history)
            history.append({"role": "assistant", "text": reply, "seconds": round(time.time() - t0, 1)})
    except Exception as e:
        return f"FAILED  {cand['id']} / {prob['id']}: {e}"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"candidate": cand["id"], "via": cand["via"], "problem": prob["id"], "history": history}, indent=2))
    return f"done    {cand['id']} / {prob['id']}"


if __name__ == "__main__":
    only = set(sys.argv[1:])
    jobs = [(c, p) for c in CANDIDATES if not only or c["id"] in only for p in PROBLEMS]
    with ThreadPoolExecutor(6) as pool:
        for line in pool.map(lambda j: run_one(*j), jobs):
            print(line, flush=True)
