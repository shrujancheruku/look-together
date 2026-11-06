# Distress detection, safe handoff and "not therapy" positioning

Research for [#5](https://github.com/shrujancheruku/look-together/issues/5). Researched 2026-10-29 against primary sources where they could be reached; anything taken from a secondary source is marked as such.

> **Not legal advice.** This is a product-research summary of public rules and guidance, written to shape design. Laws here are new, changing fast, and in places only partly verified (see [Gaps](#gaps-and-unverified-points)). Before launch, a lawyer in the launch region should review the positioning, the store listing and the crisis protocol.

## Answer in brief

1. **Detection is layered everywhere it is done well.** The model's own trained behaviour, plus a separate classifier watching the conversation, plus an always-visible way out that the person controls. No single layer is reliable: published evals show models are weaker in multi-turn conversations and at *intermediate* risk, and safeguards erode in long conversations.
2. **Handoff means stopping the method, not just appending a hotline.** Leave the inquiry (look-together must not keep examining Assumptions with someone in crisis), say plainly that it is an AI and not a crisis service, show resources for the person's country, and never give method information.
3. **Several US state laws now require exactly this** for some AI chat products (California SB 243, New York GBL Art. 47): a crisis protocol, referral to crisis lines when suicidal ideation or self-harm is expressed, AI disclosure, and (California) publishing the protocol and reporting referral counts from July 2027. Whether look-together falls in their definitions is arguable, so **build to them anyway.** It is cheap and it is the right behaviour.
4. **"Not therapy" is mostly about claims.** Illinois and Nevada bar AI that provides or is *represented* as providing therapy or professional mental health care. Utah regulates AI that a reasonable person would believe helps "manage or treat mental health conditions". FDA, MHRA and TGA all decide device status from intended purpose and claims. So avoid therapy, treatment, condition and clinician vocabulary everywhere: listing, onboarding, marketing, and the model's own replies.
5. **Stores:** Google Play requires a "not a medical device…" disclaimer in the listing for health apps that aren't devices, plus a Health apps declaration. Apple asks medical apps to remind users to consult a doctor, and expects apps in "highly regulated fields (such as … healthcare)" to be submitted by a legal entity, not an individual developer.

## 1. How established products detect distress

| Product / source | What it does | Source |
|---|---|---|
| **Anthropic (Claude.ai)** | A classifier (a small model) scans active conversations for possible suicidal ideation, and for fiction centred on suicide or self-harm. On a hit it shows a banner pointing to human support, with resources from **ThroughLine** (verified helplines in 170+ countries). Partnered with IASP. Evals published Dec 2025: single-turn clear-risk requests were handled appropriately ~98–99%. **Multi-turn** scenarios scored 86% (Opus 4.5) and 78% (Sonnet 4.5). | [Anthropic, "Protecting the well-being of users", 18 Dec 2025](https://www.anthropic.com/news/protecting-well-being-of-users) |
| **OpenAI (ChatGPT)** | Worked with 170+ mental-health experts on taxonomies of distress. Reports that ~0.15% of weekly active users show explicit indicators of suicidal planning or intent. Says responses falling short of desired behaviour dropped 65–80%. *(Primary page returned 403. Figures are via search snippets of the post.)* | [OpenAI, "Strengthening ChatGPT's responses in sensitive conversations", 27 Oct 2025](https://openai.com/index/strengthening-chatgpt-responses-in-sensitive-conversations/) |
| **Wysa** | Says it is "not a crisis service". An always-visible SOS button links to local helplines, and in-conversation distress detection "gently steps in". Wysa's own study: when a crisis was confirmed, only 2.4% chose to call a helpline. *(Company-reported, via search snippets.)* | [Wysa AI support](https://www.wysa.com/ai-support), [Wysa, Role of AI in SOS](https://www.wysa.com/role-of-ai-in-sos) |
| **Woebot** | Terms say it is not a crisis service and no human monitors conversations. It suggests crisis lines and 911 when a conversation escalates. *(Via APA app evaluation and news, not first-party.)* | [APA Woebot evaluation](https://psychiatry.org/psychiatrists/practice/mental-health-apps/evaluations/woebot-evaluation) |

**Evidence on where models fail:**

- RAND / *Psychiatric Services* (McBain et al., 2025): ChatGPT, Claude and Gemini matched clinicians at very-low and very-high risk, but did **not** reliably distinguish low, medium and high risk. Gemini avoided even basic suicide-statistics questions. [RAND summary](https://www.rand.org/pubs/external_publications/EP71040.html)
- Samaritans (Feb 2026): "Safeguards can weaken during long interactions leading to the exposure of suicide method information". Chatbots "may also fail to recognise or appropriately respond to the concealment of suicidal thoughts" and can "create an illusion of empathy". Relational modelling should not simulate "friendship, romance, or therapy". [Samaritans AI Chatbots Policy Briefing](https://media.samaritans.org/documents/AI_Chatbots_Policy_Briefing.pdf)

**What the stack gives us (Google Cloud):**

- Gemini safety filters on Vertex AI have four configurable categories (Hate Speech, Harassment, Sexually Explicit, Dangerous Content). **There is no self-harm category.** [Vertex AI safety filters](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters)
- Cloud Natural Language `moderateText` folds self-harm into a broad "Death, Harm & Tragedy" category. It is too coarse to act as the detector, though it could serve as one signal. [Moderating text](https://docs.cloud.google.com/natural-language/docs/moderating-text)
- Consequence: whichever model wins #11, **we need our own detection layer.** The likely shape is a dedicated classifier call per user turn (text, and voice transcripts), with a written taxonomy, evaluated on multi-turn and intermediate-risk cases. We should not rely on vendor filters.

**Detection approach this points to for look-together** (input to #10):

1. **Per-turn classifier** on the person's words (Problem text, Dialogue turns, voice transcripts), separate from the inquiring model. It scores at least: suicidal ideation / intent / plan, self-harm, harm to others, and acute distress or abuse disclosure. It sees a window of recent turns so it can catch escalation across turns, not just single messages.
2. **The inquiring model's own instructions** say: if distress appears, stop inquiring and hand off. This is a second line, not the primary one.
3. **An always-visible "I need help now" control** on every screen, including during voice (Wysa's SOS pattern). The person can step out themselves.
4. **Evaluate before launch** on multi-turn, concealed and intermediate-risk scripts (Anthropic's and RAND's evals show this is where failures hide). This feeds the "Knowing the method works" item on the map.

## 2. What a safe handoff looks like

Drawn from the laws in §4 and the guidance above:

- **Stop the method.** Don't continue the Breakdown or Dialogue, and don't treat the distress as an Assumption to examine. (Samaritans warns against chatbots that "reinforce maladaptive thinking patterns".)
- **Say what it is.** It is an AI, not a person, and not a crisis or emergency service. (NY and CA require crisis referral. Utah, CA and EU AI Act Art. 50 require AI disclosure.)
- **Refer to crisis services for the person's location**, by name and number, tappable (call / text). Include the emergency number. (CA SB 243 §22602(b): "a notification to the user that refers the user to crisis service providers, including a suicide hotline or crisis text line". NY GBL §1701 names "the 9-8-8 suicide prevention and behavioral health crisis hotline" and "a crisis text line".)
- **Never provide method or means information.** Expert open letters and the WHO safe-messaging principles are consistent on this. ([Now Matters Now open letter, Sept 2025](https://nowmattersnow.org/open-letter-on-ai-safety/), secondary.)
- **Voice:** stop speaking the Dialogue, put the resources on screen, and speak a short plain handoff.
- **Let the person come back** without forcing them. Wysa's 2.4% helpline uptake suggests a single "call this number" card is not enough on its own, though we shouldn't over-claim what the app can do either.

## 3. Crisis resources by candidate region

Verified against each service's own site unless noted. Numbers change, so in production, source them from a maintained directory or re-verify on a schedule.

| Region | Emergency | Crisis / emotional support | Source |
|---|---|---|---|
| **US** | 911 | **988** Suicide & Crisis Lifeline: call or text 988, chat at chat.988lifeline.org, 24/7/365. Spanish text and chat available. | [988lifeline.org](https://988lifeline.org/) |
| **UK** | 999 (or A&E) | **Samaritans 116 123** (free, 24/7). Welsh line 0808 164 0123. NHS 111 "select the mental health option". *Shout 85258 (text) exists, but I did not verify it first-party.* | [Samaritans](https://www.samaritans.org/how-we-can-help/contact-samaritan/), [NHS urgent help](https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/) |
| **Ireland** | 112 / 999 | **Samaritans 116 123** (free, day or night). **Text HELLO to 50808** (HSE-funded, 24/7; some networks use 0861800280). | [Samaritans Ireland](https://www.samaritans.org/samaritans-ireland/), [50808](https://text50808.ie/), [HSE urgent help](https://www2.hse.ie/mental-health/services-support/get-urgent-help/) |
| **EU (general)** | 112 | **116 123** is the reserved EU number for emotional support helplines, but member states aren't obliged to run it, and coverage is uneven. Per-country lookup is needed. | [Commission Decision 2007/116 (as amended)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023D0468), [EU 116 FAQ](https://europa.eu/youreurope/citizens/travel/security-and-emergencies/emergency/faq/index_en.htm) |
| **India** | 112 | **Tele-MANAS 14416 or 1-800-891-4416** (Ministry of Health & Family Welfare, toll-free, 24/7, 20 languages). | [Tele-MANAS](https://telemanas.mohfw.gov.in/) (site cert failed to verify, so confirmed via [PIB releases](https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2118790)) |
| **Australia** | 000 | **Lifeline 13 11 14**, text 0477 13 11 14, online chat 24/7. | [Lifeline](https://www.lifeline.org.au/) |
| **Elsewhere / fallback** | — | **Find A Helpline** (ThroughLine), with helplines in 175+ countries, verified directly with the helplines. Commercial integrations by arrangement (no public API documented). It is the directory Anthropic uses. | [findahelpline.com](https://findahelpline.com/) |

**Implication:** a small hand-verified table for the launch region (#14), with Find A Helpline as the link-out for everyone else, is enough for the MVP. Licensing ThroughLine is the step up if we go multi-country.

## 4. Laws and regulators touching this app

### United States

| Law | Who it covers | What it requires / forbids | Relevance |
|---|---|---|---|
| **California SB 243** (Ch. 677, Stats. 2025; Bus. & Prof. Code §22601–22606; signed 13 Oct 2025) | Operators of a "companion chatbot": "provides adaptive, human-like responses … capable of meeting a user's social needs, including by exhibiting anthropomorphic features and being able to sustain a relationship across multiple interactions". Excludes customer-service and productivity bots. | §22602(a) AI disclosure if a reasonable person could be misled. §22602(b) **crisis protocol** with referral to crisis lines, and the protocol must be **published on the website**. §22603 annual report to the Office of Suicide Prevention **from 1 July 2027** (referral counts, protocols; no user identifiers); "use evidence-based methods for measuring suicidal ideation". §22604 disclose it "may not be suitable for some minors". §22605 **private right of action**: greater of actual damages or $1,000 per violation. | Each Inquiry starts fresh, which argues against "sustain a relationship", but Patterns persist across Inquiries and the app is conversational. Coverage is arguable, and building to it costs little. [Chaptered text](https://www.sidley.com/en/-/media/resource-pages/ai-monitor/laws-and-regulations/cal-sb243-companion-chatbots.pdf?la=en) (official copy at [leginfo](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB243), which blocked fetch) |
| **New York GBL Art. 47** (§1700 ff., effective 5 Nov 2025) | Operators of "AI companions" in NY. | §1701: unlawful to offer one without a protocol making "reasonable efforts" at "detection of user expressions of suicidal ideation or self-harm" and referring the user to crisis services (988, a crisis text line). AG enforcement, no private action (per secondary summaries). | Same coverage question as CA. [§1701](https://www.nysenate.gov/legislation/laws/GBS/1701), [Governor's letter, Nov 2025](https://www.governor.ny.gov/news/governor-hochul-pens-letter-ai-companion-companies-notifying-them-safeguard-requirements-are) |
| **Utah Code 13-72a** (HB 452, eff. 7 May 2025, amended 2026) | "Mental health chatbot": generative AI conversing "similar to the confidential communications that an individual would have with a licensed mental health therapist" **and** that a supplier represents, or "a reasonable person would believe, can or will provide mental health therapy or help a user manage or treat mental health conditions". | AI disclosure before access, again after 7 days away, and whenever asked (§203). No selling or sharing of user input or health info with third parties (§201). Ad restrictions (§202). Fines up to $2,500 per violation (§204). | Positioning decides coverage, so stay clearly out of "manage or treat". The no-sharing rule aligns with the privacy value anyway. [Utah Code 13-72a](https://le.utah.gov/xcode/Title13/Chapter72A/C13-72a_2025050720250507.pdf) |
| **Illinois Wellness and Oversight for Psychological Resources Act** (HB 1806, P.A. 104-0054, eff. 1 Aug 2025) | Anyone providing or advertising therapy or psychotherapy in Illinois. | Prohibits "anyone from using AI to provide mental health and therapeutic decision-making". Fines up to $10,000 (IDFPR). Commentary says self-help and educational resources that don't claim to offer therapy, and peer support, are carved out. *(Exemption wording not verified in statute text: ilga.gov refused connection.)* | Never advertise or behave as therapy. [IDFPR press release, 4 Aug 2025](https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/news/2025/2025-08-04-idfpr-press-release-hb1806.pdf) |
| **Nevada AB 406** (eff. 1 Jul 2025) | AI providers in Nevada. | Per secondary summaries: no AI "specifically programmed" to provide what would be professional mental or behavioural health care if a human did it. No explicit **or implicit** representation that it can, or that an avatar is a therapist. Civil penalties up to $15,000. *(Enrolled text blocked; not verified first-party.)* | Same as Illinois. [Enrolled bill](https://archive.leg.state.nv.us/Session/83rd2025/Bills/AB/AB406_EN.pdf), [WSGR summary](https://www.wsgr.com/en/insights/nevada-passes-law-limiting-ai-use-for-mental-and-behavioral-healthcare.html) |
| **FDA general wellness policy** (Jan 2026 revision replaced 2019) | Software with wellness vs. disease claims. | Low-risk products for general wellness (e.g. stress, relaxation) are not regulated as devices. Claims to diagnose or treat a condition (anxiety, depression) move toward device territory. FDA's Digital Health Advisory Committee has discussed generative-AI mental-health devices. *(FDA page returned 401, so this is via [CRS Insight IN12657](https://www.everycrsreport.com/reports/IN12657.html).)* | Keep claims to examining one's own understanding, never to conditions. [FDA guidance page](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices) |
| **FTC Act §5** | Any US marketing. | Health-benefit claims need "competent and reliable scientific evidence". The FTC has acted against apps making unsupported health claims. Sept 2025 6(b) study of AI companion chatbots (Alphabet, Character.AI, Meta, OpenAI, Snap, xAI) on how they "measure, test, and monitor for negative impacts". | Don't claim outcomes ("reduces anxiety") we can't substantiate. [Health Products Compliance Guidance](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance), [FTC 6(b) release](https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions) |
| **State AG consumer-protection actions** | — | Texas AG opened an investigation (2025) into Meta AI Studio and Character.AI for presenting chatbots as professional therapeutic tools. | Shows "implied therapy" marketing is an enforcement target. [Texas AG release](https://www.texasattorneygeneral.gov/news/releases/attorney-general-ken-paxton-investigates-meta-and-characterai-misleading-children-deceptive-ai) |

### United Kingdom

- **MHRA, "Digital mental health technology: qualification and classification"** (published 3 Feb 2025, updated 29 Jul 2026). Qualification turns on intended purpose: "whether it is to support wellbeing or to aid treatment of a mental health condition". If the intended purpose is medical and the functionality is complex, it is software as a medical device. It names "AI algorithms and chatbots" as functionality examples. [gov.uk guidance](https://www.gov.uk/government/publications/digital-mental-health-technology-qualification-and-classification) ([full PDF](https://assets.publishing.service.gov.uk/media/6a68c3490825cc51a6c37c1d/Digital_mental_health_technology_device_characterisation__regulatory_qualification_and_classification.pdf); §6 covers non-qualification, not read in full).
- **Online Safety Act / Ofcom:** Ofcom's Nov 2024 open letter treats chatbots whose output users can share with each other as user-to-user services. Per secondary reporting of Ofcom's 3 Feb 2026 update, a chatbot where people only interact with the bot, that doesn't search multiple sites and can't generate pornography, is not in scope. look-together as designed (private, no sharing) looks out of scope today. Samaritans is lobbying to bring all chatbots in, so watch this. [Ofcom open letter](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/open-letter-to-uk-online-service-providers-regarding-generative-ai-and-chatbots), [Ofcom AI chatbots page](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/ai-chatbots-and-online-regulation-what-you-need-to-know) (blocked fetch), [Samaritans briefing](https://media.samaritans.org/documents/AI_Chatbots_Policy_Briefing.pdf)

### EU / Ireland

- **EU AI Act Art. 50(1)**, applying from 2 Aug 2026: AI systems "intended to interact directly with natural persons" must be designed so people "are informed that they are interacting with an AI system", unless that is obvious. [Art. 50](https://artificialintelligenceact.eu/article/50/)
- **Medical Device Regulation:** device status follows intended purpose, as in the UK. Not researched in depth here.
- Ireland: no AI-specific mental-health law found. EU rules apply.

### India

- No AI-therapy or companion-chatbot law found. Crisis line: Tele-MANAS (above). Medical-device and professional-licensing positions for wellness software were **not researched** and should be checked if India is chosen (#14).

### Australia

- **TGA:** digital mental health tools can be excluded from device regulation under item 14E of the Excluded Goods Determination, conditionally (e.g. based on referenced clinical guidelines). The TGA has said this exclusion "is not appropriate" and recommended an urgent review, so the position may tighten. A pure self-examination app making no clinical claims sits further from this, but check before launch. *(TGA guidance page blocked fetch; via search snippets of [TGA guidance](https://www.tga.gov.au/resources/guidance/understanding-digital-mental-health-tool-software-conditional-exclusion).)*

## 5. App store rules

**Apple App Review Guidelines** ([source](https://developer.apple.com/app-store/review/guidelines/)):

- **1.4.1:** medical apps "may be reviewed with greater scrutiny", and "should remind users to check with a doctor in addition to using the app and before making medical decisions."
- **1.2:** apps with AI-generated content need filtering of objectionable material, a reporting mechanism, and published contact information. (Written for shared content; a private chat app should still provide contact and reporting.)
- **4.7 / 4.7.1:** you are responsible for chatbots in your app, including privacy rules for sensitive data.
- **5.1.1(ix):** "Apps that provide services in highly regulated fields (such as … healthcare …) or that require sensitive user information should be submitted by a legal entity … and not by an individual developer." **This likely means publishing under a company account, not a personal one.**
- **5.1.2(i):** disclose and get explicit permission before sharing personal data "with third-party AI". This matters for Vertex model calls.
- **2.3.1:** misleading marketing is grounds for removal.
- No guideline names mental health or self-harm explicitly (the last ~14k characters, Sections 5.2–end, were not read).

**Google Play** ([Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511), [AI-Generated Content](https://support.google.com/googleplay/android-developer/answer/14094294)):

- Every developer must complete the **Health apps declaration** in Play Console.
- Health apps that aren't regulated medical devices must state in the **listing description** that the app is "not a medical device and does not diagnose, treat, cure, or prevent any medical condition", and must "remind users to consult a healthcare professional".
- The AI-generated content policy prohibits content "generated to encourage harmful behavior (for example, dangerous activities, self harm)".

## 6. What to say and what to avoid (positioning)

Derived from the claim-based tests above (Utah's "reasonable person would believe", Nevada's "implicit" representations, Illinois's advertising ban, FDA/MHRA/TGA intended purpose, FTC substantiation):

**Say** (onboarding, listing, website, and in-app when asked):
- It is an AI, not a person. Say so up front, after a long absence, and whenever asked (Utah; EU Art. 50).
- It is for examining your own understanding of a Problem. It is **not therapy, counselling or medical care**, and not a crisis service.
- If you are in crisis or at risk, contact [local line] or [emergency number]. Show this at onboarding and keep it reachable on every screen.
- A published crisis protocol page on the website describing detection and referral (CA §22602(b)(2)).
- Play's required "not a medical device…" disclaimer and "consult a healthcare professional" reminder in the listing.

**Avoid** (copy, store keywords, and the model's own replies):
- "therapy", "therapist", "counsellor/counselor", "coach for your mental health", "AI psychologist", "treatment", "heal".
- Naming conditions or claiming outcomes: "anxiety", "depression", "trauma", "reduces stress/anxiety", "improves mental health". (Even stress-reduction outcome claims need FTC-grade substantiation.)
- Implying confidentiality like a clinician's ("like talking to a therapist, but private").
- The model diagnosing, labelling feelings as disorders, or offering a treatment plan. Put this in the model's instructions and in the eval set.
- Companion or friend framing ("always here for you", relationship-building). This pulls toward CA/NY "companion" definitions and Samaritans' concerns.

## Gaps and unverified points

- **Illinois** statute text (exemptions, definitions) not read first-party: ilga.gov refused connections. Relied on the IDFPR press release and law-firm summaries.
- **Nevada AB 406** enrolled text blocked. All detail is from secondary summaries.
- **California SB 243** was read from a PDF copy of the chaptered text hosted by Sidley (authenticated legislative copy). leginfo itself blocked fetch.
- **NY** §1700 definitions of "AI companion" not read. Only §1701 was.
- **FDA** 2026 general wellness guidance not read first-party (401). **TGA** and **Ofcom** pages blocked; used search snippets.
- **OpenAI** post blocked (403). Figures are via search snippets.
- **Apple guidelines** Sections 5.2 onward not read.
- **India** device and licensing law, and EU **MDR** qualification for wellbeing software, not researched.
- Whether look-together is a "companion chatbot" (CA) or "AI companion" (NY) is a legal judgement this doc does not make.
