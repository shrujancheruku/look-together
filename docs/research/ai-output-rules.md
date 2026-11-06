# What Google Play, the App Store, the EU AI Act and the US chatbot laws require of AI-generated replies

Research for [#42](https://github.com/shrujancheruku/look-together/issues/42). Feeds [#43](https://github.com/shrujancheruku/look-together/issues/43) (how a person reports a harmful or judging reply). Sources were read on 3 November 2026. This is not legal advice; the open points are listed under [Pre-launch legal checks](#pre-launch-legal-checks).

## Answer

- **Reporting is a store rule, not a legal one.** Google Play requires an **in-app** way to report or flag offensive AI output **to the developer**, without leaving the app. Apple's guideline 1.2 now names "AI content creation apps" and asks for a report mechanism with timely responses. Neither text says the report has to carry the content. A **content-free report sent from inside the app meets the wording of both rules**. A report the person chooses to send with the exchange attached (with consent) also meets it, but it is not required, and it would be the first time Inquiry content stays on our servers, so it needs its own ADR.
- **No law we build to requires content to leave the device.** The EU AI Act has no reporting duty for a system like this. CA SB 243's annual report (from 1 July 2027) holds only referral counts and protocol descriptions, and must not include "any identifiers or personal information about users". NY GBL Art. 47 has no reporting or logging duty.
- **The AI disclosure needs more than onboarding.** Article 50 has applied since **2 August 2026**. The Commission's guidelines say the notice should come "at least … once at the start of an interactive session", and in contexts where people "may express or experience emotional distress", periodic reminders "are likely to be necessary". So the disclosure belongs at the start of every Inquiry, ideally with a persistent label near the input. A label on every reply is not required.
- **There is a second AI Act duty we hadn't planned for: machine-readable marking (Art. 50(2)).** As the provider of a text-generating AI system, Look Together has to make sure its outputs are marked and detectable as AI-generated, "as far as … technically feasible". Logging is an optional extra and is never enough on its own, so the duty doesn't conflict with ADR 0003. Under the Code of Practice, short Dialogue replies (under 200 tokens) are exempt from watermarking. Exported Recaps and long Breakdowns are not exempt.

## Google Play: AI-Generated Content policy

Source: [AI-Generated Content policy](https://support.google.com/googleplay/android-developer/answer/13985936) (Restricted Content), [Understanding Google Play's AI-Generated Content policy](https://support.google.com/googleplay/android-developer/answer/14094294), [Best Practices to Safeguard AI-Generated Content](https://support.google.com/googleplay/android-developer/answer/16353813).

- **Scope: it reaches Look Together.** The policy covers "Text–to-text conversational generative AI chatbots, in which interacting with the chatbot is a central feature of the app". The explainer excludes only limited-scope AI: hosting-only apps, summarising non-AI content as the only feature, and productivity add-ons. The Breakdown and Dialogue are the app's central feature, so none of those exclusions apply.
- **The reporting rule, verbatim:** "Apps that generate content using AI must contain in-app user reporting or flagging features that allow users to report or flag offensive content to developers without needing to exit the app. Developers should utilize user reports to inform content filtering and moderation in their apps."
- **What counts as compliant.** The policy fixes three things: the control is **in-app**, the report **reaches the developer**, and the person **doesn't exit the app**. It doesn't prescribe a button on every reply, a menu or a form. It also doesn't say the report must include the content. Inferences from that wording:
  - A `mailto:` link or "email us" fails, because it opens another app.
  - An in-app form that sends to our backend passes, whatever its fields.
  - A content-free report (a reason category plus non-content context) is in-app and reaches the developer, so it meets the wording.
  - The second sentence ("should utilize user reports to inform content filtering") is a "should". Reason counts per prompt or model version are a defensible way to use reports. Our filtering happens at the prompt and classifier level, not by moderating individual posts.
- **What Play counts as violative AI content** includes "Content generated to encourage harmful behavior (for example, dangerous activities, self harm)". The distress design and the Step-out cover this, and the evaluation set should test for it.
- **Date:** in force now. The current page carries no transition date.

## App Store Review Guidelines

Source: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), last updated **16 October 2026**; [news post of 16 October 2026](https://developer.apple.com/news/?id=vvzx6cul).

- **1.2 User-Generated Content now names AI apps:** "Apps that enable users to create, generate, upload, share, or otherwise contribute content … This includes social media, user-generated content platforms, and AI content creation apps. To prevent abuse, such apps must include:
  - A method for filtering objectionable material from being posted to the app
  - A mechanism to report offensive content and timely responses to concerns
  - The ability to block abusive users from the service
  - Published contact information so users can easily reach you"
- **How it applies.** Whether a private reflection app is an "AI content creation app" is arguable, so build as if it is. Filtering means the model's safety settings plus the distress classifier. The report mechanism is the #43 control. Timely responses means an in-app acknowledgement plus a stated process. Published contact means the support email in the listing and in the app. Blocking abusive users has no meaning when nobody else is present, so there's nothing to build; note why in the App Review notes. Apple doesn't say the report must carry content.
- **4.7 (chatbots offered as software not in the binary)** asks for the same filter, report and block set. It is aimed at third-party chatbots and mini apps hosted in an app, not at an app's own built-in feature, so it adds nothing new here.
- **5.1.2(i)** "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so." This covers sending Reflections to Gemini, not reports to us. It is listed here because the privacy screen has to carry it.
- No guideline requires a label on each AI reply.

## EU AI Act, Article 50

Sources: Regulation (EU) 2024/1689 as consolidated after the Digital Omnibus on AI (OJ L 2026/1744), read via the Commission's [AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50) because EUR-Lex wouldn't serve to the tools used here; [Art. 111](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-111), [Art. 113](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113); Commission [Guidelines on the transparency obligations under Article 50](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems), C(2026) 5054 final, 20 July 2026 (cited by paragraph number); [Code of Practice on Transparency of AI-generated Content](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content), final 10 June 2026, confirmed adequate by the Commission and AI Board; [Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act).

**Dates.** Article 50 applies from **2 August 2026** (Art. 113). The only transition, new Art. 111(4) from the Omnibus, gives systems "placed on the market before 2 August 2026" until **2 December 2026** to meet Art. 50(2). Look Together launches after August 2026, so it gets no grace period.

**We are the provider.** Guidelines para. 11: a company that offers a chatbot "on the Union market under its own name or trademark to consumers … is a provider responsible for compliance with the transparency obligations in Article 50(1) and/or (2) AI Act, regardless of whether the AI system is provided for free … and regardless of whether the provider is established … in a third country". Google is the upstream model provider.

**Art. 50(1): telling people they're talking to an AI.** The text: providers "shall ensure that AI systems intended to interact directly with natural persons are designed and developed in such a way that the natural persons concerned are informed that they are interacting with an AI system, unless this is obvious". Art. 50(5) requires the notice to be "clear and distinguishable … at the latest at the time of the first interaction".
- **Per session, not just once.** Guidelines para. 143: "the information should, at least, be provided once at the start of an interactive session". An Inquiry is the interactive session, so a notice shown only at onboarding doesn't meet this.
- **Our context counts as "riskier".** Para. 40: "A single, prominent notification before the first interaction … is likely to suffice in most instances … However, in certain riskier contexts, periodic reminders and context-aware disclosures are likely to be necessary … sustained and evolving interactions in sensitive or immersive contexts (e.g. where users may express or experience emotional distress or vulnerability …)". Para. 40 also requires the system to disclose that it is an AI whenever it is asked about its nature, or whenever the person seems confused about it.
- **What a good notice looks like.** Para. 37 suggests "first-turn greetings in chatbots that may be combined, as appropriate, with persistent badges or labels visible throughout the interaction", placed "close to the interaction interface (e.g. near the input/output field)". Para. 38: a notice only in the terms, or only in machine-readable marks, is not enough. "Generic references to 'assistant'" are not enough either.
- **The obviousness exception is construed narrowly.** It also can't be relied on where some users might find the interaction less obvious (para. 45). Don't rely on it.
- **Answer to the ticket:** an onboarding disclosure alone probably doesn't satisfy Art. 50(1). Show the AI notice at the start of each Inquiry, keep a small persistent "AI" label by the Reflection box, and make sure the prompts admit to being an AI when asked. A label on every reply isn't required.

**Art. 50(2): machine-readable marking of AI-generated text.** "Providers of AI systems … generating synthetic audio, image, video or text content, shall ensure that the outputs of the AI system are marked in a machine-readable format and detectable as artificially generated or manipulated", "as far as this is technically feasible".
- **Look Together is in scope.** The exceptions cover standard editing, outputs that don't substantially alter the input, short strings and UI labels, code, and machine-to-machine output (guidelines paras. 67–68, 90–92). The Breakdown and Dialogue are new text, so none of these apply.
- **The ephemeral-content exemption doesn't fit.** Para. 88 exempts "Real-time content generation that is ephemeral and consumed immediately, without being recorded, stored or disseminated further". Native stores the Breakdown and Recap on the device, and the Recap can be exported, so the exemption can't be relied on.
- **We can rely on Google's marking.** Para. 74: providers "may rely on the marking solution implemented by an upstream model provider … to the extent that the marking solution is compliant". It remains our job to show it is compliant.
- **What the Code of Practice asks for in text:**
  - Sub-measure 1.1.2: an imperceptible watermark "with the exception of very short text", defined as fewer than 200 tokens. A one-question Dialogue turn will usually fall under that threshold.
  - "Given that free-form text cannot transport metadata", a watermark on its own is enough for free-form text.
  - Sub-measure 1.1.1: text exported in a container format (a Recap exported as a PDF or file) gets digitally signed metadata.
  - Sub-measure 1.1.3: "fingerprinting or logging (optional)", and "relying on fingerprinting or logging alone is not considered sufficient". So no part of Art. 50(2) pushes content onto our servers, and ADR 0003 holds.
- **Whether Gemini marks its text is unconfirmed.** No first-party Google page found states that **Gemini text output on Vertex AI** carries SynthID. Google documents SynthID text for the consumer Gemini app, and image and audio for Vertex. A developer-forum thread on exactly this question contradicts itself. This is the main open item.
- Art. 50(4), labelling text published to inform the public, doesn't apply. Private replies aren't "published".

**No reporting duty.** Article 50 is the only AI Act duty for a system that isn't high-risk, and it includes no user-reporting, logging or content-retention duty.

## California SB 243 (Bus. & Prof. Code §§ 22601–22605)

Source: chaptered text, Stats. 2025 ch. 677. The official leginfo site refused automated access, so it was read via [CalMatters Digital Democracy](https://calmatters.digitaldemocracy.org/bills/CA_202520260SB243) (chaptered version, 13 October 2025). In force **1 January 2026**. Reporting starts **1 July 2027**.

- **Is Look Together a "companion chatbot"?** The definition (§ 22601(b)) is an AI system that "provides adaptive, human-like responses to user inputs and is capable of meeting a user's social needs, including by exhibiting anthropomorphic features and being able to sustain a relationship across multiple interactions". Each Inquiry starts fresh and never reads past ones, which argues against coverage. This is already on the lawyer list, and we build to the law regardless.
- **§ 22603, the annual report to the Office of Suicide Prevention:**
  - (a)(1) the number of crisis-referral notifications in the preceding calendar year;
  - (a)(2) and (a)(3) the protocols for detecting and responding to suicidal ideation;
  - (b) "shall include only the information listed in subdivision (a) and shall not include any identifiers or personal information about users".
  - The crisis-referral counts with no identifiers, already on the closed metadata list, are exactly what this needs. **No content leaves the device.**
- **§ 22603(d):** "An operator shall use evidence-based methods for measuring suicidal ideation." This bears on how the distress classifier is chosen and documented.
- **§ 22602:**
  - (a) a "clear and conspicuous notification" that it's AI, required where a reasonable person could be misled;
  - (b) a published crisis protocol;
  - (c) for known minors only, the 3-hour reminder. Look Together is 18+, so (c) doesn't apply.
- No duty anywhere in the chapter to log, keep or send conversation content. § 22605 gives a private right of action, with damages of the greater of actual damages or $1,000 per violation.

## New York GBL Article 47 (§§ 1700–1704)

Source: [NY Senate Open Legislation](https://www.nysenate.gov/legislation/laws/GBS/A47). In force **5 November 2025** ([Governor's notice](https://www.governor.ny.gov/news/governor-hochul-pens-letter-ai-companion-companies-notifying-them-safeguard-requirements-are)).

- **Is Look Together an "AI companion"?** § 1700(4) says a system "designed to simulate a sustained human or human-like relationship" by **all three** of:
  - (i) "retaining information on prior interactions or user sessions … to personalize the interaction";
  - (ii) "asking unprompted or unsolicited emotion-based questions";
  - (iii) "sustaining an ongoing dialogue concerning matters personal to the user".
  - Look Together keeps no memory across Inquiries, so it arguably fails (i). Give this to the lawyer.
- **§ 1701:** a protocol for detecting suicidal ideation and self-harm, with referral to 988 or another crisis service.
- **§ 1702:** a notice "at the beginning of any AI companion interaction which need not exceed once per day and at least every three hours for continuing … interactions", saying the user is not communicating with a human.
- **§ 1703:** enforced by the AG only, with penalties up to $15,000 a day.
- **No reporting, logging or record-keeping duty.**

## What this means for #43

| Report option | Play AI-Generated Content | Apple 1.2 | Laws | ADR 0003 |
|---|---|---|---|---|
| In-app report, reasons only (judged, led, preachy, unsafe, other), no content | Meets the wording: in-app, reaches the developer | Meets it, with an acknowledgement and published contact | Nothing required | Fits: add the reason counts to the closed metadata list |
| In-app report with the exchange attached by explicit choice, with a preview | Meets it, and more useful for "inform content filtering" | Meets it | Not required. It is special-category data: GDPR Art. 9(2)(a) explicit consent, MHMDA consent | Breaks "never stays on our servers" for that one exchange. Needs a new ADR (region, retention, who reads it, no join to the Account) |
| "Email us" link that opens the mail app | **Fails**: the person has to exit the app | Doesn't count as the in-app mechanism (it covers the contact item only) | — | Fits |
| In-app free-text box the person writes, sent to us | Meets it | Meets it | Same consent questions if they paste content | The person chose what to write, but it's still Inquiry-adjacent content on our servers |

Points for the #43 grilling:
- **A content-free report is enough for compliance.** Content-included reports are a product choice, made for learning, not to satisfy the stores.
- **What a report can carry without content:** the reason, the stage (Breakdown, Probe or Dialogue turn), prompt and model versions, `us`/`eu` routing, and whether a Step-out followed. All of it can be device-computed.
- **Placement.** Play's "without needing to exit the app" suggests a control within reach of each reply or Probe, but any in-app path passes. A control on the Step-out screen is not required. The fixed handoff text isn't model output.
- **Responding.** Since reports aren't tied to an Account (ADR 0006), "timely responses" can only be an in-app acknowledgement and published contact, not a personal follow-up. Note this in the App Review notes.

## Pre-launch legal checks

New items for the map's list:
1. **Art. 50(2) marking:** confirm with Google, in writing, whether Gemini 3.8 Flash text output on Vertex AI is SynthID-watermarked, and how third parties can detect it. If it isn't, decide how we mark long Breakdowns and exported Recaps (watermark plus signed metadata on exports), and have counsel confirm we're in scope and that short Dialogue turns are exempt.
2. **Art. 50(1) disclosure:** show the AI notice at the start of each Inquiry, plus a persistent label near the input, and check whether a periodic reminder is needed. This replaces "AI disclosure re-shown only in Utah", and also covers NY § 1702 if it applies. Have counsel review the wording, and confirm that "AI" plus not-therapy wording isn't a "generic reference to 'assistant'".
3. **Store reporting:** have counsel or App Review confirm that a content-free in-app report satisfies Play's AI-Generated Content policy and Apple 1.2. Prepare App Review notes explaining why "block abusive users" doesn't apply.
4. **If #43 adopts content-included reports:** review the GDPR Art. 9 explicit-consent and MHMDA consent wording, the retention period and the storage region. Update the privacy screen.
5. **SB 243 § 22603(d):** check that the distress classifier's selection and testing count as "evidence-based methods for measuring suicidal ideation". The first report is due 1 July 2027 if the law applies.
6. Add the NY § 1700(4) three-part test (memory across sessions) to the existing companion-chatbot question for the lawyer.

## Not covered

- The DSA's notice-and-action rules weren't researched. Look Together hosts no content for others, so they likely don't apply.
- Utah's mental-health chatbot law and the UK Online Safety Act are covered elsewhere on the map.
- The Code of Practice text above was extracted from its PDF. Its Section 1 detail on free-form text detection access ("verified expert users") wasn't read closely.
