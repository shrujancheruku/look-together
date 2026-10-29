"""PROTOTYPE, throwaway. Builds results.html from results/ so a person can read every model side by side and score it."""
import json, random
from pathlib import Path

HERE = Path(__file__).parent
problems = json.loads((HERE / "problems.json").read_text())
runs = {}
for f in sorted((HERE / "results").glob("*/*.json")):
    d = json.loads(f.read_text())
    runs.setdefault(d["problem"], {})[d["candidate"]] = d["history"]

candidates = sorted({c for r in runs.values() for c in r})
order = {}
for p in problems:
    cs = [c for c in candidates if c in runs.get(p["id"], {})]
    random.Random(p["id"]).shuffle(cs)
    order[p["id"]] = cs

data = {"problems": problems, "runs": runs, "order": order, "candidates": candidates}
html = (HERE / "report-template.html").read_text().replace("/*DATA*/null", json.dumps(data))
(HERE / "results.html").write_text(html)
print(f"wrote results.html: {len(candidates)} candidates, {sum(len(r) for r in runs.values())} runs")
