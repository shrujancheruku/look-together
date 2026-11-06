## Where the rules live

- `docs/current-state.md` is the one sheet of the decisions that stand. Where a ticket or the spec disagrees with it, the sheet wins.
- `docs/adr/` holds the decisions that are hard to reverse; `docs/privacy/closed-list.md` everything we keep, count or share; `docs/research/` the research the decisions cite; `prototypes/` the throwaway prototypes the tickets build on.
- `GLOSSARY.md` is the vocabulary. Use its terms in code, tests, issues and copy, and never the words it says to avoid.

## Standing rules for code

Every PR keeps these. Where a lint rule or test is named, add it with the first code it governs.

- Schemas are `zod/mini`. Plain `zod` is banned in the protocol, records and app packages (lint).
- Nothing reads the environment, the clock (`Date.now`, `new Date()`) or randomness outside the composition root. Modules take them as dependencies (lint).
- Only `requestOrigin` reads origin headers, and nothing reads `X-Forwarded-For` (lint).
- Only the session module reads the region table or holds a token. Every backend call goes through its `client` (lint).
- Only the logger logs, with fields typed from the closed-list package, and only the crash module reports errors (test).
- A PR that adds a field we keep, a counter, a meter or a party changes the closed-list package, and CI regenerates `docs/privacy/closed-list.md` from it.
- Every fixed string comes from the copy deck. The app says "we", never "I". The not-therapy wording list is a test over the deck and the store listing.
- Shared files are registries: one file per entry plus an index (closed-list entries, copy-deck sections, Settings rows, Hono routes, Pulumi resources). Add a file rather than editing a hand-maintained list.
- App state on the device lives in Zustand stores, created with `createStore` in the composition root and read with `useStore(store, selector)`. The bare `create()` import and the `persist` middleware are banned (lint). A store's `setState` is called only by its owning module after the pure logic has run; screens never set app state. Per-frame animation values stay in Reanimated shared values.
- Tests go through the public seams (`step`, the turn and admission modules, `worldView`, `sceneFromState`, the director) and name things in glossary words.
- Commits and PR titles follow Conventional Commits, with no attribution lines or trailers.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (shrujancheruku/look-together) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
