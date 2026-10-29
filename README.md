# Look Together

An app for examining your own understanding of life. There are no lessons, courses or set path. You bring a **Problem**, the app draws out the **Assumptions** underneath it as a **Breakdown**, and then you look at them together in a **Dialogue**, spoken or typed. An Inquiry ends on a **Recap** of what was looked at, never a verdict on what is true.

Inspired by the way J. Krishnamurti asked questions. Knowing anything about him is not needed.

> Look Together is independent. It is not affiliated with or endorsed by the Krishnamurti Foundations.

## Status

Planning. Nothing is built yet. The route to an MVP spec is charted on the [Map: Look Together MVP](https://github.com/shrujancheruku/look-together/issues/1), whose decision tickets are worked one at a time.

## Principles

- **Never judges an Assumption.** It questions. It never declares a belief true or false ([ADR 0001](docs/adr/0001-never-judge-assumptions.md)).
- **Never speaks as Krishnamurti.** No imitating him, no attributing words to him, and his texts stay out of prompts, retrieval and training without permission ([ADR 0002](docs/adr/0002-never-speak-as-krishnamurti.md)).
- **Not therapy, and never claims to be.** It recognises distress, steps out of inquiry and points to real help.
- **Private by default.** Each Inquiry starts fresh and never reads past Inquiries. Patterns across Inquiries are shown only in a long-term view and are deleted with their Inquiry.
- **Concise and direct.** Short questions, no praise, no lectures.

## MVP scope

- Expo app for iOS, Android and web, backed by Google Cloud
- Voice and text Dialogue, with the Breakdown always on screen
- First Inquiry needs no account
- Free with per-person usage limits
- English only, adults (18+)

## Repo guide

```text
GLOSSARY.md       # domain language: Problem, Inquiry, Assumption, Breakdown, Dialogue, Recap...
docs/
├── adr/          # decisions that are hard to reverse
└── agents/       # how agent skills use the issue tracker, labels and domain docs
```

Issues are tracked in [GitHub Issues](https://github.com/shrujancheruku/look-together/issues). Use the glossary's terms in issues, code and copy.
