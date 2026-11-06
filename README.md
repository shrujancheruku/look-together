# Look Together

An app for examining your own understanding of life. There are no lessons, courses or set path. You bring a **Problem**, the app draws out the **Assumptions** underneath it as a **Breakdown** of **Probes**, and then you look at them together in a **Dialogue**, one **Path** at a time. At each step you write or dictate a **Reflection** and submit it when you're done thinking. An Inquiry ends on a **Recap** of what was looked at, never a verdict on what is true.

Inspired by the way J. Krishnamurti asked questions. Knowing anything about him is not needed.

> Look Together is independent. It is not affiliated with or endorsed by the Krishnamurti Foundations.

## Status

Building. The decisions were made on the [Map: Look Together MVP](https://github.com/shrujancheruku/look-together/issues/1) and stand in [`docs/current-state.md`](docs/current-state.md); the MVP is built from the [spec](https://github.com/shrujancheruku/look-together/issues/88) and its tickets. Nothing runs yet beyond throwaway prototypes.

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
├── current-state.md  # every decision that stands, once each "partly supersedes" is applied
├── adr/          # decisions that are hard to reverse
├── agents/       # how agent skills use the issue tracker, labels and domain docs
├── privacy/      # the closed list: everything we keep, count or let others see
└── research/     # the research the decisions cite
prototypes/       # throwaway prototypes that answered design questions, kept as references for the build
scripts/
├── provision.sh      # the wizard that sets up the accounts, projects and credentials (#194)
└── provisioned.env   # the public ids it saved, which workers and CI read: never a secret
```

To set up or change an account, project or credential, run `scripts/provision.sh` (`--list` shows the stages, `scripts/provision.sh <stage>` redoes one) rather than doing it by hand.

Issues are tracked in [GitHub Issues](https://github.com/shrujancheruku/look-together/issues). Use the glossary's terms in issues, code and copy.
