# How reliably model judges and simulated people measure the quality of open-ended questions

Research, 2026-11-19. Informs a decision the founder makes; it decides nothing. Ticket [#239][239], a child of map [#236][236].

**Question:** What do published methods say about (a) using a model as a judge of open-ended conversational quality, such as the relevance and depth of a question (agreement with human raters, pairwise against absolute scores, known biases), and (b) using a model to play the person across a multi-step conversation (how close simulated behaviour is to real behaviour, how personas are written, where simulation misleads)? Includes Socratic and coaching evaluation and motivational-interviewing fidelity scales. It ends with what this implies for scoring Probes and Path questions with a Claude Opus judge and for simulated Paths.

## Read this first: how far the sources were verified

- Every paper below was opened at its arXiv, ACL or journal abstract page. **No full text was read.** The fetch tool returns a small model's summary of a page, so numbers below are the ones the abstract page gave. Check a figure against the paper before quoting it elsewhere.
- Marked **(snippet)** means the claim rests on a search-result snippet only, not an opened page. The JMIR AI counselling paper (Cardozo et al.) is the main one: its page returned empty twice.
- The MITI 4.2.1 manual itself was not reached. What is said about it comes from search results over translated copies and a secondary summary **(snippet)**. Sources disagree on its version label and year.
- Padesky's Socratic-questioning papers were not readable, as [coaching-questioning.md](coaching-questioning.md) already records. No peer-reviewed fidelity scale for Socratic questioning was found.
- Nothing here measures what the ticket most needs: how well a model judge agrees with people on **Probes or Path questions of this app**. No published study does. Everything is by analogy, from chat quality, counselling, tutoring and agent benchmarks.
- Several results are 2026 preprints. Their dates and venues are as the pages showed them. Treat a preprint as a claim, not a finding.

## Sources

| Source | URL | Status |
|---|---|---|
| Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", NeurIPS 2023 D&B | https://arxiv.org/abs/2306.05685 | abstract page |
| Wang et al., "Large Language Models are not Fair Evaluators" (arXiv 2023) | https://arxiv.org/abs/2305.17926 | abstract page |
| Panickssery, Bowman, Feng, "LLM Evaluators Recognize and Favor Their Own Generations" (arXiv 2024) | https://arxiv.org/abs/2404.13076 | abstract page |
| Bavaresco et al., "LLMs instead of Human Judges?" JUDGE-BENCH, ACL 2025 | https://arxiv.org/abs/2406.18403 | abstract page |
| Thakur et al., "Judging the Judges", GEM2 2025 | https://arxiv.org/abs/2406.12624 | abstract page |
| Tripathi et al., "Pairwise or Pointwise?", COLM 2025 | https://arxiv.org/abs/2504.14716 | abstract page |
| Jeong et al., "The Comparative Trap" (arXiv, v4 2025) | https://arxiv.org/abs/2406.12319 | abstract page |
| Gao et al., "Re-evaluating Automatic LLM System Ranking", Findings of NAACL 2025 | https://arxiv.org/abs/2501.00560 | abstract page |
| Soumik, "Judging the Judges: bias mitigation in LLM-as-a-Judge pipelines", TMLR 2026 | https://arxiv.org/abs/2604.23178 | abstract page |
| Dunivin, "Scalable Qualitative Coding with LLMs" (arXiv 2024) | https://arxiv.org/abs/2401.15170 | abstract page |
| Brown et al., "Generation, Distillation and Evaluation of MI-Style Reflections", EACL 2024 | https://arxiv.org/abs/2402.01051 | abstract page |
| Kiuchi et al., "Distinct Profiles of Run-to-Run Score Reliability and Expert-Panel Alignment Across Four LLM Evaluators of Simulated Japanese-Language AI-to-AI Counseling" (arXiv, v4 2026) | https://arxiv.org/abs/2507.02950 | abstract page |
| Cardozo et al., GPT-4.1 against trained human coders of MI technique, JMIR AI 2026 | https://ai.jmir.org/2026/1/e95964 | **(snippet)** page returned empty |
| Jha et al., "Benchmarking Motivational Interviewing Competence of LLMs" (arXiv 2026) | https://arxiv.org/abs/2603.03846 | abstract page |
| MITI 4.2.1 (Moyers et al.) | https://motivationalinterviewing.org/library/MITI | library listing only; contents **(snippet)** |
| Zhou et al., "Mind the Sim2Real Gap in User Simulation for Agentic Tasks", COLM 2026 | https://arxiv.org/abs/2603.11245 | abstract page |
| Dou et al., "SimulatorArena", EMNLP 2025 | https://arxiv.org/abs/2510.05444 | abstract page |
| Liu et al., "Synthetic Users, Real Differences" (arXiv 2026) | https://arxiv.org/abs/2605.02624 | abstract page |
| Laban et al., "LLMs Get Lost In Multi-Turn Conversation" (arXiv 2025) | https://arxiv.org/abs/2505.06120 | abstract page |
| Park et al., "AI Simulations Grounded in Rich Self-Reports Increase Accuracy and Reduce Distortion" (arXiv) | https://arxiv.org/abs/2411.10109 | abstract page |
| Hu and Collier, "Quantifying the Persona Effect in LLM Simulations", ACL 2024 | https://arxiv.org/abs/2402.10811 | abstract page |
| Cheng, Durmus, Jurafsky, "Marked Personas", ACL 2023 | https://arxiv.org/abs/2305.18189 | abstract page |
| Wang et al., "Towards a Client-Centered Assessment of LLM Therapists by Client Simulation" (ClientCAST, arXiv 2024) | https://arxiv.org/abs/2406.12266 | abstract page |
| Wang et al., CARE-Bench (arXiv 2025) | https://arxiv.org/abs/2511.09407 | abstract page |
| Al-Hossami and Bunescu, Socratic debugging trajectories (arXiv, v2 2026) | https://arxiv.org/abs/2511.00371 | abstract page; the 96.6% judge-agreement figure is **(snippet)** |
| Socratic-style tutoring scorers against humans, AIME-Con 2026 | https://aclanthology.org/2026.aimecon-main.69.pdf | **(snippet)** only |
| PsyCLIENT (arXiv 2601.07312), Evoke-Sim (arXiv 2608.07499) | https://arxiv.org/abs/2601.07312, https://arxiv.org/abs/2608.07499 | **(snippet)** only |

## 1. How well a model judge agrees with people

- **The headline figure is for chat preference, not for question quality.** GPT-4 as judge reached over 80% agreement with controlled and crowdsourced human preferences, which the authors call comparable to agreement between humans ([Zheng][zheng]). That is pairwise preference between whole chat answers in 2023. It says nothing about whether a judge can tell a question that points at an unexamined word from one that doesn't.
- **Agreement depends on the property judged.** Across 20 datasets and 11 models, reliability varied by model, dataset, the property rated, the experts' level and whether the text was human or model written. The authors' conclusion is that judges "should be carefully validated against human judgments before being used" ([Bavaresco][bavaresco]).
- **Percent agreement hides disagreement.** Even the best and largest judges trail inter-human agreement, can differ from human scores by up to 5 points, lean lenient, and judges with high percent agreement can still assign very different scores. The authors say to measure alignment with more than percent agreement ([Thakur][thakur]). Use a chance-corrected statistic.
- **Coded categories fare better when they are concrete and the judge reasons first.** GPT-4 reached kappa of at least 0.79 on 3 of 9 qualitative codes and at least 0.6 on 8 of 9, GPT-3.5 averaged 0.34, and asking for a rationale improved fidelity ([Dunivin][dunivin]). That is one humanities coding task.
- **Counselling is where the judge is weakest on the subtle part.**
  - GPT-4 as a zero-shot classifier of MI reflections reached kappa 0.66 against triple human review ([Brown][brown]). The search snippet of the same paper gave 0.671 for simple and 0.429 for complex reflections **(snippet)**.
  - Cardozo et al. report GPT-4.1 at kappa 0.67 with one human coder against 0.53 between the two humans, but kappa 0.00 on complex reflections **(snippet)**.
  - Four LLM evaluators scored simulated counselling sessions above a 15-expert panel on softening sustain talk and overall quality. Single-run reliability (ICC) ranged from .33 to .96, and "high run-to-run reliability did not ensure closer expert-panel alignment". Claude Opus 4.8 was closest to the experts ([Kiuchi][kiuchi]). A judge can be steady and wrong.
- **Socratic questioning:** the evidence is thin. A Socratic-debugging paper reports 96.6% judge agreement on Socratic turn quality **(snippet)**, and a tutoring paper reports agreement stronger for more observable features **(snippet)**. Neither is peer-verified here, and both are about code or tutoring, where a turn has a right answer to steer toward. Our Probes have none.

## 2. Known biases

- **Position:** swapping the order of two candidates can flip the verdict. Vicuna-13B beat ChatGPT on 66 of 80 queries when ChatGPT judged. Averaging both orders helps ([Wang][wang]). A 2026 TMLR paper measures position bias at 0.04 or less across five current judges, far smaller than style bias ([Soumik][soumik]).
- **Style and length:** style bias (markdown over prose) measured 0.10 to 0.76 across judges. Length bias varied by judge: Gemini and Llama preferred longer answers (+0.24 to +0.44), Claude preferred concise (-0.12), GPT-4o was neutral ([Soumik][soumik]). Earlier work finds judges prefer verbose and authoritative-sounding answers, worse in pairwise judging ([Jeong][jeong]). One judge's profile is not another's, so measure the chosen one.
- **Self-preference:** a model can recognise its own output, and the strength of its self-preference tracks that ability ([Panickssery][panickssery]). The app writes with Gemini 3.8 Flash and the judge is Opus, so the judge is not scoring its own family. The same does not hold for any simulator or revision step run on Opus.
- **Leniency:** judges overrate. All four evaluators in Kiuchi scored overall quality above the experts, and Thakur finds a tendency toward leniency. A mean score from a judge is a ceiling, not a level.

## 3. Pairwise against absolute scores: mixed

- **For absolute scores:** with distractor features added, pairwise preferences flipped in about 35% of cases and absolute scores in about 9% ([Tripathi][tripathi]). Pairwise amplifies verbosity and authority bias; pointwise reasoning inside a pairwise frame (PRePair) reduced it ([Jeong][jeong]).
- **For pairwise:** the 80% figure is a pairwise one ([Zheng][zheng]). With a fixed query budget, pointwise is slightly better for strong LLMs and pairwise considerably better for weaker ones, and any bencher degrades when the systems compared are close in capability ([Gao][gao]).
- **The reading:** neither wins. Absolute scores resist being gamed by a surface feature and suit a fixed rubric over one prompt version. Pairwise suits "is v2 better than v1" but needs both orders and a length check. Both degrade when the two versions are close, which is the usual case for a prompt tweak.

## 4. Simulated people across a conversation

- **Simulators are easier than people.** Across 451 human participants, 165 tasks and 31 simulators, simulators were overly cooperative and stylistically uniform, lacked realistic frustration or ambiguity, created an "easy mode" that inflated agent success above the human baseline, and gave uniformly more positive feedback than humans' nuanced ratings across eight dimensions. Higher model capability did not mean a more faithful simulation ([Zhou][zhou]).
- **Friction goes missing.** Against 1,000 real chatbot dialogues in 16 domains, simulated users struggled to reproduce communication frictions, which makes simulation-based evaluation look overly optimistic, and realism varied by domain ([Liu][liu]).
- **A good simulator can rank assistants.** On 909 annotated conversations in math tutoring and document creation, simulators conditioned on a user profile (background and message style) matched human judgments best, reaching Spearman 0.7 for the best ones ([Dou][dou]). Ranking assistants is not the same as predicting how a person feels about one reply, and both tasks have a goal. An Inquiry has none.
- **Rich self-reports beat labels.** Simulations of 1,052 people built from two-hour interviews and surveys reached 69 to 73% on a survey of attitudes, against 60% from demographics alone and 79.5% for the people's own retest. Both interview and survey simulations still distorted results and did not lower hyper-rationality in economic games ([Park][park]).
- **Persona variables explain little.** Demographic and social persona variables explain under 10% of annotation variance, and prompting with them gives modest gains, best where annotators already disagree ([Hu][hu]). Model-written personas carry more stereotypes than human-written ones from the same prompt ([Cheng][cheng]). Write personas from what a person said and did, not from a category.
- **Counselling clients.** Simulated clients stayed consistent with their assigned problem but were less accurate on personality traits, and could tell high from low quality sessions ([ClientCAST][clientcast]). CARE-Bench builds clients from real cases and expert principles but its abstract gives no fidelity numbers ([CARE-Bench][care]). Two more (PsyCLIENT, Evoke-Sim) claim realism from real session data **(snippet)**. Most counselling checks are automatic metrics or small expert panels, not comparison with real clients.
- **Simulation exposes real failure.** Over 200,000 simulated conversations, models lost 39% on average from single-turn to multi-turn, mostly through unreliability, and did not recover from a wrong turn ([Laban][laban]). It is a result about the assistant, found by simulation, and is what simulated Paths are good for.

## 5. Fidelity scales for MI, Socratic and coaching

- **MITI** rates a conversation by trained human coders in two parts: four global scores (Cultivating Change Talk, Softening Sustain Talk, Partnership, Empathy), each 1 to 5 starting from 3, and counts of behaviours such as reflections and questions **(snippet)**. It rates the counsellor across a session (it uses a sampled excerpt), not one question.
- **LLMs on MITI-style codes:** a benchmark scored 10 models with MITI 4.2 on 96 handcrafted and 34 real transcripts, with all showing good competence. Its abstract does not say who coded or report agreement, and its complex-reflection figures are ambiguous ([Jha][jha]). It cannot be used as evidence that a model judge matches human coders.
- **Socratic and coaching:** no validated fidelity scale for Socratic or coaching questions was reached. ICF markers, Padesky and Kline were not readable ([coaching-questioning.md](coaching-questioning.md)). Treat every scale as a source of rubric ideas, not a validated instrument.
- **What transfers:** MI's split between rated global impressions and counted behaviours. Counts are cheap to code and the checkable parts of our `Never` list already are. The global impression is the high-inference part where LLM agreement fell (complex reflection at 0.00 to 0.43 above).

## 6. What it implies

For the four qualities in [#236][236] and for the Probes and Path questions the app writes.

1. **Only two of the four are the judge's to read.**
   - *Relevant* is only the person's to say, so no judge replaces the in-app ask or the friends test. A judge's proxy for it is not Relevant.
   - *How Paths end* is a count, so no judge is involved.
   - *Insightful* is a property of the question and the judge can read it, but "points at something in their own words they hadn't examined" is a high-inference call, where agreement is lowest. Split it into checks the judge answers yes or no with a quoted phrase: which of the person's words does it anchor on, is that phrase one the person put weight on, does it state a view (the `Never` list).
   - *Thought-provoking* is read from the next Reflection. The judge needs a real next Reflection. A simulated one will be too cooperative, so the score inflates.
2. **Validate Opus against the founder's read before trusting any score.** Score a set of Probes and Path questions twice, in two orders where pairwise, and report chance-corrected agreement per quality, not one overall figure, plus run-to-run spread over the 5 runs already planned. Put the first 30 to 60 cases blind to the founder. Low agreement on a quality means the judge does not measure it, whatever its steadiness. Agreement on counselling-like tasks ranged from 0 to 0.67 here, so there is no safe prior.
3. **Prefer absolute rubric scores with a stated reason, and pairwise only to compare versions.** Absolute scoring per quality resists a prompt that merely sounds more probing. For v1 against v2, use both orders, control or report length, and expect near-ties. This fits "scores advise and compare; they do not gate a deploy".
4. **Expect lenient and style-sensitive scores.** Read the distribution, not the mean. Compare versions on the same cases and the same judge. Opus's length lean (concise) means a longer, more probing question may be marked down. Check that on a few paired cases.
5. **The Opus judge is cross-family for Gemini output, which helps.** Use a different model, or no model, to play the person if the judge is Opus.
6. **Simulated Paths find breakage, not quality.**
   - Use them for stalls, loops, the angle cap, a Reflection that gets two questions, a refused event, and distress. This is what simulation reliably surfaced ([Laban][laban]).
   - Do not use them for how often Paths end on `done`, how a person feels, or whether a question is thought-provoking. Simulators are cooperative and give uniformly positive feedback ([Zhou][zhou]).
   - Instruct difficulty explicitly (vague, repeats itself, "I don't know", wanders, pushes back), since a default simulator will not supply friction ([Liu][liu]).
   - Write personas from the founder's own cases and, with opt-in only (ADR 0003), real Reflections, not demographic labels ([Hu][hu], [Park][park]).
7. **Check the simulator against real Paths once they exist.** Compare Reflection length, stall rate and Paths per Inquiry from the friends test with the simulated set. Until then the simulated numbers stay uncalibrated.

## What could not be confirmed

- Any measurement of a model judge on Probes or Path questions of this kind. None found.
- The Cardozo et al. figures, the MITI manual's contents and the Socratic judge-agreement figures: snippets only.
- Whether pairwise or absolute scoring is better for **open-ended questions** specifically. The studies are on answers.
- Whether Opus has a length or style lean on short questions. Soumik's Claude figure (Claude Sonnet 4) is for long answers.
- Padesky, the ICF markers and the MITI manual in primary text.

[236]: https://github.com/shrujancheruku/look-together/issues/236
[239]: https://github.com/shrujancheruku/look-together/issues/239
[zheng]: https://arxiv.org/abs/2306.05685
[wang]: https://arxiv.org/abs/2305.17926
[panickssery]: https://arxiv.org/abs/2404.13076
[bavaresco]: https://arxiv.org/abs/2406.18403
[thakur]: https://arxiv.org/abs/2406.12624
[tripathi]: https://arxiv.org/abs/2504.14716
[jeong]: https://arxiv.org/abs/2406.12319
[gao]: https://arxiv.org/abs/2501.00560
[soumik]: https://arxiv.org/abs/2604.23178
[dunivin]: https://arxiv.org/abs/2401.15170
[brown]: https://arxiv.org/abs/2402.01051
[kiuchi]: https://arxiv.org/abs/2507.02950
[jha]: https://arxiv.org/abs/2603.03846
[zhou]: https://arxiv.org/abs/2603.11245
[dou]: https://arxiv.org/abs/2510.05444
[liu]: https://arxiv.org/abs/2605.02624
[laban]: https://arxiv.org/abs/2505.06120
[park]: https://arxiv.org/abs/2411.10109
[hu]: https://arxiv.org/abs/2402.10811
[cheng]: https://arxiv.org/abs/2305.18189
[clientcast]: https://arxiv.org/abs/2406.12266
[care]: https://arxiv.org/abs/2511.09407
