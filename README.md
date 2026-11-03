# Look Together

An app for examining your own understanding of life. There are no lessons, courses or set path. You bring a **Problem**, the app draws out the **Assumptions** underneath it as a **Breakdown** of **Probes**, and then you look at them together in a **Dialogue**, one **Path** at a time. At each step you write or dictate a **Reflection** and submit it when you're done thinking. An Inquiry ends on a **Recap** of what was looked at, never a verdict on what is true.

Inspired by the way J. Krishnamurti asked questions. Knowing anything about him is not needed.

> Look Together is independent. It is not affiliated with or endorsed by the Krishnamurti Foundations.

## Status

Planning. Nothing is built yet beyond throwaway prototypes. The route to an MVP spec is charted on the [Map: Look Together MVP](https://github.com/shrujancheruku/look-together/issues/1), whose decision tickets are worked one at a time.

## Principles

- **Never judges an Assumption.** It questions. It never declares a belief true or false ([ADR 0001](docs/adr/0001-never-judge-assumptions.md)).
- **Never speaks as Krishnamurti.** No imitating him, no attributing words to him, and his texts stay out of prompts, retrieval and training without permission ([ADR 0002](docs/adr/0002-never-speak-as-krishnamurti.md)).
- **Not therapy, and never claims to be.** It recognises distress, steps out of inquiry and points to real help.
- **We know who you are, never what you said.** Inquiries stay on your device and never stay on our servers ([ADR 0003](docs/adr/0003-inquiry-content-never-on-our-servers.md)). Your Account knows nothing of your Inquiries ([ADR 0006](docs/adr/0006-sign-in-is-required-and-knows-nothing-of-inquiries.md)). Each Inquiry starts fresh and never reads past Inquiries.
- **Room to think.** Voice is dictation, not conversation: nothing counts until you submit it, and replies are read aloud only when you tap "listen" ([ADR 0005](docs/adr/0005-voice-is-dictation-not-conversation.md)).
- **Concise and direct.** Short questions, no praise, no lectures.

## MVP scope

- Expo app for iOS, Android and web, backed by Google Cloud
- Typed or dictated Reflections, with text replies you can listen to
- Sign-in (Apple, Google or an emailed code) before the first Inquiry
- Free with per-person usage limits
- English only, adults (18+)

## Repo guide

```text
GLOSSARY.md       # domain language: Problem, Inquiry, Assumption, Breakdown, Probe, Path, Reflection, Recap...
docs/
├── adr/          # decisions that are hard to reverse
├── agents/       # how agent skills use the issue tracker, labels and domain docs
└── privacy/      # the closed list: everything we keep, count or let others see
prototypes/       # throwaway prototypes that answered design questions
```

Issues are tracked in [GitHub Issues](https://github.com/shrujancheruku/look-together/issues). Use the glossary's terms in issues, code and copy.
