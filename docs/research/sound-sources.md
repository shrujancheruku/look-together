# Where a soundscape and a few cue sounds can come from, with no credit line and no subscription risk

Research for [Research royalty-free and one-off-licence sources for ambient sound and sound effects that ship with no credit](https://github.com/shrujancheruku/look-together/issues/202), under [Map: The pixel world's direction before the build](https://github.com/shrujancheruku/look-together/issues/196). Sources read on 2026-11-08. This note does not decide whether the world has sound; #212 does. It only says where sound could come from if it does.

Anything marked **unverified** was not confirmed in a primary source. Several licence pages refuse automated fetches (Zapsplat, OpenGameArt, Pond5, Envato, Artlist's licence page, Pro Sound Effects); for those we quote what their own pages show in search snippets or help-centre articles and say so. Quotes are the page's words; everything else is our reading, and none of it is legal advice.

**What we are shopping for:** one calm soundscape per place (forest, lake, shore: water, wind, birds, no melody), a very few soft Cue sounds, shipped inside the iOS, Android and web builds. The asset spec ([#75](https://github.com/shrujancheruku/look-together/issues/75), recorded in the sheet as "shipped with no credit") rules out a credits screen, and the map rules out a commission and melodic music.

## Short answer

- **Only three kinds of terms fit:** CC0 or an equivalent public-domain dedication, a perpetual buy-out whose EULA names apps or games, or sound we make ourselves. Anything under CC BY, OGA-BY, the BBC's RemArc licence, Zapsplat's free tier or ElevenLabs' free tier needs a credit, so it is out.
- **Free and credit-free, with the catalogue we need:** **Freesound filtered to CC0** (1,120 CC0 hits for "forest ambience", 79 for "lake shore waves", original WAV/FLAC files) and **Pixabay** (its own licence: perpetual, irrevocable, no attribution; 7,626 "forest ambience" hits). Both are field recordings of varying quality, and almost none are cut as seamless loops, so we crossfade or trim.
- **Free and credit-free, for Cue sounds:** the **Sonniss GDC bundles** (about 207 GB of professional libraries, "Games, films, videos, podcasts, apps and interactive projects all count", "without attribution", "for the entirety of their life time") and **Kenney's CC0 audio packs** (UI and impact sounds, no nature packs).
- **Paid buy-outs that allow apps:** **A Sound Effect** (perpetual, "mobile apps" named), **Boom Library's Quiet Planet** nature series ("mobile apps" named, Quietudes from $139), **Soundsnap** (perpetual, "apps" named, but downloads need a live subscription and the grant also says "revocable"). Boom's main EULA lists "video games" but not mobile apps.
- **Subscriptions that do not fit:** **Epidemic Sound** clears apps and games only on Business Plus ("From $100 per month, billed annually") and only for content that is "published" while subscribed. **Artlist** lists "Apps, software, games & its end-users" as needing a custom Enterprise agreement.
- **Generative:** ElevenLabs output is commercial and credit-free on paid plans; Stable Audio Open is free under $1M revenue but its licence demands a "Powered by Stability AI" notice (a credit); Meta's AudioGen weights are CC BY-NC (no commercial use). **Procedural synthesis in code** (filtered noise for wind and water) and **our own field recordings** need no licence at all.
- **Pick, if #212 says yes:** Freesound CC0 (with Pixabay as the second well) for the soundscape layers, the Sonniss GDC bundles for Cue sounds and gap-filling, and a single Quiet Planet or A Sound Effect buy-out (or a weekend of our own recording) only if the free recordings fall short on a place.

## The licence terms that matter

Four questions decide fitness, so each source below answers them: **credit** (does it need a line anywhere), **binary** (may the file sit inside an app bundle that anyone can unzip), **modify** (may we trim, loop, mix, pitch), **perpetual** (does the right survive cancellation or the vendor vanishing).

### CC0 and public domain

The CC0 legal code is the floor every "free" source is measured against. The dedicator "overtly, fully, permanently, irrevocably and unconditionally waives, abandons, and surrenders" the copyright, and if that waiver fails anywhere the fallback is a "royalty-free, non transferable, non sublicensable, non exclusive, irrevocable and unconditional license" ([CC0 legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode)). The deed adds that "You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission", and that CC0 does not touch "the patent or trademark rights of any person" or anyone's "publicity or privacy" rights ([CC0 deed](https://creativecommons.org/publicdomain/zero/1.0/)). Credit: none. Binary: yes. Modify: yes. Perpetual: yes.

CC BY 4.0, by contrast, says "You must give appropriate credit, provide a link to the license, and indicate if changes were made" ([CC BY 4.0 deed](https://creativecommons.org/licenses/by/4.0/)). That is a credits screen. Every CC BY sound is out, however good.

#### Freesound

- **Licences:** uploaders pick CC0, CC BY or CC BY-NC; Sampling+ is legacy. Of CC0 the FAQ says "you can do pretty much what you want with the sound. You could even sell the sound, ... but you can't claim you are the author!" Of CC BY: "always mention the original creators of the sounds when you use them." Of CC BY-NC: you "can't earn any money with the piece of work you create!" ([Freesound FAQ](https://freesound.org/help/faq/)).
- **Filter:** the search page has a licence filter; the URL form `f=license:"Creative Commons 0"` returns CC0 only ([example search](https://freesound.org/search/?q=forest+ambience&f=license%3A%22Creative+Commons+0%22)). Freesound also offers a "Free Cultural Works" filter, but that includes CC BY, so for us the CC0 filter is the only safe one.
- **Formats:** "you get the exact same original file that was uploaded"; accepted uploads are mp3, FLAC, Ogg Vorbis and AIFF/WAV, up to 1 GB ([FAQ](https://freesound.org/help/faq/)). Many nature recordings are 48 kHz WAV or FLAC.
- **Catalogue fit:** 1,120 CC0 results for "forest ambience" (first page: 82 s "Forest Ambience 1.wav", "Outdoor ambience near a forest with birdsong (Midlands, England)", "Forest Night Ambience - Stereo 48kHz 24bit - 2:20") and 79 for "lake shore waves" ("water medium gentle lake waves splash on shore close.flac", "Small Waves Lapping on Lake Ontario Close Perspective"). A representative shore recording, [LakeWavesOct25th2015.WAV](https://freesound.org/s/326097), is CC0, 1:33, 48 kHz 32-bit stereo, "Gentle waves lapping on the rocky shore of a lake in the Midwest". Nothing on these pages claims to be a seamless loop; we would cut and crossfade.
- **Cost:** free.
- **Fit:** the strongest free well for the soundscape. Risks: quality is uneven (traffic, wind on the mic), and CC0 on Freesound is the uploader's word, so a mis-licensed upload is possible. Mitigation: prefer uploaders with many CC0 field recordings, keep the sound URL and licence in the asset manifest.

#### Pixabay

- **Licence:** not CC0 (since 9 January 2019; older audio "may fall under CC0" per Section 4). Pixabay's own Content License grants "an irrevocable, worldwide, perpetual (or as long as allowed by law), non-exclusive and royalty-free right" to use content "for commercial or non-commercial purposes", including the right to "modify or adapt the Content". You "do not need to credit Pixabay or the contributor" ([Terms, Section 5](https://pixabay.com/service/terms/), [licence summary](https://pixabay.com/service/license-summary/)).
- **Binary caveat:** the prohibited use is selling or distributing content "on a Standalone basis", where "no creative effort has been applied to the Content and it remains in substantially the same form", including "as an image, audio, video, NFT or other digital file (including through a stock media platform)". An app that plays the clip as one layer of the Shoreline is a new work, not standalone distribution, but the raw file is still extractable from the bundle. Our reading is that this is fine; it is a judgement, not a clause we can quote.
- **Formats:** the FAQ lists upload formats (MP3, WAV, AAC, FLAC, AIF, M4A, under 100 MB and 15 minutes) but not download formats ([FAQ](https://pixabay.com/service/faq/)). Third-party guides say free downloads are MP3 and WAV needs a paid account; **unverified**.
- **Catalogue fit:** 7,626 "forest ambience" results (3:32 "Forest ambience", 4:48 "Forest Ambience" tagged Birds, Forest) and 539 for "lake" (20:40 "Fritton Lake", 3:29 "Small lake at night") ([forest](https://pixabay.com/sound-effects/search/forest%20ambience/), [lake](https://pixabay.com/sound-effects/search/lake/)). Much of it is re-uploaded Freesound material ("freesound_community").
- **Cost:** free.
- **Fit:** good second well. Prefer Freesound when the same recording exists there in WAV.

#### OpenGameArt

- **Licences:** the FAQ says "Yes, you can use this art. Even in commercial projects. Be sure to follow the terms of the license, though." CC-BY works need "appropriate credit"; OGA-BY is CC-BY 3.0 without the anti-DRM clause, so it still needs credit; CC0 works are credit-free but the site asks for a courtesy link ([FAQ, via search snippets](https://opengameart.org/content/faq); the page itself returns 403 to automated fetches, so this is **partly unverified**).
- **Fit:** only its CC0 subset is usable, and it is a game-art site whose audio leans to chiptune, music and game SFX. Low fit for nature ambience. Not worth the filtering effort when Freesound has the same CC0 pool at the source.

#### Kenney

- **Licence:** every asset is "public domain licensed (CC0)", "free to use them, even in commercial projects", credit optional ([Kenney support](https://kenney.nl/support)).
- **Catalogue:** the audio category lists Casino Audio, Sci-fi Sounds, Interface Sounds, Impact Sounds (130 files), UI Audio (50 files), RPG Audio, Digital Audio, Music Jingles and voice packs ([audio category](https://kenney.nl/assets/category:Audio), [Impact Sounds](https://kenney.nl/assets/impact-sounds), [UI Audio](https://kenney.nl/assets/ui-audio)). No nature or ambience pack. File formats are not stated on the pages read (**unverified**; Kenney packs are usually OGG).
- **Fit:** nothing for the soundscape. A possible source of a soft Cue click or tap, if any of the UI sounds is quiet enough for a world with "no HUD frames".

#### The BBC Sound Effects archive

- **Licence:** the site's own download dialogue says "Commercial use of this content is not allowed under the RemArc license." and "For commercial use, buy the sound effect from Pro Sound Effects". The licensing page (a JavaScript app; text read from its bundle) says the archive "is available for personal, educational or research purposes", the RemArc content licence forbids use "for commercial purposes – to make a profit" and "to develop or train artificial intelligence", and requires you to "Add a credit (if it doesn't already have one)" ([BBC Sound Effects licensing](https://sound-effects.bbcrewind.co.uk/licensing)). "Pro Sound Effects operate the commercial licensing of BBC sound effects."
- **Catalogue fit:** high in principle: "15,000 recordings from the Natural History Unit archive", categories Atmosphere, Birds, Nature, Water; downloads in MP3 and WAV.
- **Commercial route:** per-sound purchase through Pro Sound Effects; retailer listings show the complete library at about $1,999 and the "BBC Original 1-60" set at $199 (**unverified**, third-party listings). Pro Sound Effects' own licence text was not reachable (its licence pages return 404 or 403), so whether their single-user licence names apps is **unverified**.
- **Fit:** out as a free source (non-commercial and credit required). As a paid source it is a per-sound buy-out we could not read the terms of; park it.

### One-off licence libraries

#### Sonniss (GDC bundles and the store)

- **Licence (GDC bundles):** "the Licensor grants the Licensee, a worldwide, non-exclusive, royalty-free license to use all or any of the sound effects" on "an unlimited number of projects for the entirety of their life time", "for personal and commercial projects ... without attribution to the original creator". "Games, films, videos, podcasts, apps and interactive projects all count." You "may not distribute, publish, sub-license or otherwise supply the sound effects as sound effects to any other person", but may share with "people in the Licensee's own team or organisation" ([GDC bundle licence](https://sonniss.com/gdc-bundle-license/)). The FAQ adds "Attribution is always appreciated, but never required", redistribution is barred "Not as sound effects", and the files are "licensed for media production (games, film, TV, interactive projects) only" with AI training prohibited ([GDC page](https://sonniss.com/gameaudiogdc)).
- **Store licence:** the same shape for bought libraries: "worldwide, non-exclusive, royalty-free", "for the entirety of their life time", "without attribution to the original creator", sync with "games, films, television & interactive projects"; one local copy plus one backup, no upload "to a network-drive, server" for others, and "Licensee must be the sole editor, otherwise a multi-user license will be required" ([Sonniss licence](https://sonniss.com/license)). Apps are not named in the store licence (they are in the GDC one).
- **Catalogue:** bundles 2015 to 2024 (no 2025 bundle), 9.0 to 48.2 GB each, about 207 GB in all, "a selection of sounds from each library added over the years" ([GDC page](https://sonniss.com/gameaudiogdc)). The free Prime Selection packs include "dawn chorus birdsong and autumn forest wind" and rural ambiences; the store lists 1,124 Ambience libraries and a Water category, mostly 96 kHz 24-bit WAV ([Sonniss home](https://sonniss.com/)).
- **Cost:** bundles free; store packs from $19.
- **Binary:** the restriction is on supplying sounds "as sound effects"; a finished app that contains them is explicitly allowed ("Selling them as part of a finished game, film, app, or creative project is allowed"). This is the clearest binary clause of any paid-grade source.
- **Fit:** best free source for Cue sounds and a strong gap-filler for ambience. Cost is time: the bundles are large and indexed only by spreadsheet.

#### A Sound Effect (distributor for independent libraries)

- **Licence:** one EULA for every library sold there. "the Licensor grants the Licensee worldwide, non-exclusive, perpetual, royalty-free license(s) to use the sounds." Permitted where "synchronized with other media", including "websites, podcasts, mobile apps, advertising, multi-media presentations, video games and similar". Not permitted "to distribute or perform reproductions of the Sounds where these are not incorporated" in other media, nor "as pre-installed sounds in any physical / hardware device or toy", nor in any library. "the Licensee is prohibited from adapting, modifying or repackaging any Sounds, except as permitted in Clause 2.b" (that is, editing as part of a production is fine; repackaging is not). Licences are per workstation, as many as bought. The licensor is "the creator or creators of the Sound Libraries"; A Sound Effect ApS is the distributor ([A Sound Effect EULA](https://asoundeffect.com/license-agreement)). The FAQ says royalty-free and no attribution (search snippet; **the attribution point is not in the EULA text itself**, which is silent on credit).
- **Catalogue:** thousands of libraries; nature ambience is well covered, including Boom's Quiet Planet series ([Quietudes](https://www.asoundeffect.com/sound-library/quietudes/): 102 sounds, 2.5 GB, 24-bit 48 kHz WAV, $135, "Each file has an adequate playtime to loop it without sounding repetitive"). Quiet Planet libraries carry Quiet Planet's own EULA, not the house one (see Boom).
- **Cost:** per library, typically $20 to $200.
- **Fit:** a clean perpetual buy-out with "mobile apps" in the text. Good if a specific lake or shore library is needed.

#### Boom Library

- **Main EULA:** "BOOM Library grants a worldwide, non-exclusive MEDIA LICENSE for commercial and non-commercial use" in PRODUCTIONS "such as film, television, streaming series, music releases, video games, broadcast, advertising, podcasts, AR/VR experiences, theme-park installations, and any other audiovisual or audio-only work fixed in a tangible medium intended for distribution or public communication." "No additional fees or attribution are required for synced use." "Full payment grants a perpetual license." Prohibited: "Reselling, trading, or sharing raw or processed files", use "'in the clear' or as a standalone product", "Products where CONTENT comprises >50% of the total time", and "You may not embed or include the CONTENT in any software, application, or hardware where it functions as a real-time audio tool, effect, or processor (e.g., Impulse Responses used in convolution reverbs) rather than a fixed element of a PRODUCTION." "This license is granted to one individual only." Boom also sells subscriptions with a three-year minimum; productions finalised in the term stay licensed "in perpetuity" but raw content must be deleted ([Boom terms](https://www.boomlibrary.com/terms-conditions/)).
- **Reading:** a soundscape loop in an app is a "fixed element", not a real-time tool, so the embedding clause does not bite. But mobile apps are not in the PRODUCTIONS list (video games are), and an app whose soundscape runs the whole session could be argued to be a product where content is more than half the runtime. Ask Boom before buying a main-catalogue library for this use.
- **Quiet Planet (Gordon Hempton's nature series, sold by Boom under its own EULA):** "Examples of allowed uses are inclusion in self-produced radio programs, podcasts, mobile apps, television broadcasts, film soundtrack, music albums, PowerPoint presentations, websites, advertising, multi-media presentations, video games and other similar products." Royalty-free, no credit clause. "Upon full payment of the LICENSE FEE the license to the product is granted to you in perpetuity." Prohibited: "may not be used in any product that is primarily nature audio and therefore would compete with other present and future Quiet Planet LLC products" (pure nature sound for at least half the runtime); any library; "You may not sell, lend, or giveaway, any of the licensed audio files"; "You may transfer the licensed audio files to one local hard drive" and "This license does not allow you to upload to a server". Single user; "do not extend to a company"; multi-user is subscription only, three-year minimum. "The products are only available for commercial customers." Derivatives "remain bound by the terms" ([Boom terms, Quiet Planet section](https://www.boomlibrary.com/terms-conditions/)).
- **Catalogue:** 17 libraries: Coniferous Forests, Deciduous Forests, Waves, Flowing Water, Ocean Shores, Wetlands, Riparian Zones, Winds of Nature, Quietudes, and others; 24-bit 48 kHz WAV; most "from $235.00 excl. VAT", Quietudes from $139, the complete set from $1,405 ([Quiet Planet landing page](https://www.boomlibrary.com/?p=5634)). No lake library by name; Wetlands and Riparian Zones are the nearest.
- **Flags:** (1) "primarily nature audio": Look Together is words first, and sound is one layer of a pixel world, so we are not a nature-audio product, but if the soundscape ran unbroken through every session a lawyer might want to look. (2) "upload to a server": a web build serves the audio from a CDN. The clause reads as a storage rule for the raw library, not a distribution rule for a finished production, but it is a flag for the web target. (3) Single-user, company excluded: fine for a solo founder, awkward later.
- **Fit:** the best-recorded nature ambience on the market and the only paid source that names mobile apps in a nature-specific licence. One or two libraries at $139 to $235 would cover forest and shore if the free wells fall short.

#### Soundsnap

- **Licence:** "worldwide, royalty-free, non-exclusive, revocable, perpetual (for the duration of the applicable copyright) license" to "use, integrate, and sync the Sounds with Creative Works (such as films, TV shows, ads, recordings, video games, apps". Pro covers apps and games with budgets up to $500,000. Attribution "remains entirely up to your discretion". You may make "such modifications to, edits to, and/or cuts of, the Sounds as are technically necessary". Prohibited: "Resell, rent, sublicense, transmit, and/or distribute or re-distribute the Sounds 'as they are' in any context" and using them "to create expansion packs to distribute them through any mobile applications". If Soundsnap stops distributing a sound, "any such election will not serve to withdraw this License" ([Soundsnap licence](https://www.soundsnap.com/licence)).
- **Survives cancellation?** The licence is "perpetual" and ends only on breach, and downloaded sounds keep the tier they were downloaded under; nothing on the page says downloads lapse when the subscription does. But the same sentence says "revocable", and the pricing page could not be read (404), so the plan prices (third-party figures put annual unlimited at $199 to $299) are **unverified**. Downloading needs a live subscription.
- **Catalogue:** large general library; nature ambiences present. Formats **unverified** (WAV and MP3 are offered, per third-party reviews).
- **Fit:** workable, but "revocable" plus a subscription gate is exactly the ongoing risk the ticket asks us to avoid. A one-month plan to grab a few Cue sounds would be the only sensible use.

#### Epidemic Sound

- **Terms:** apps and games are cleared only on **Business Plus**: "Clearance for apps, games, and OTT, so product launches and streaming stay rights-cleared", "From $100 per month, billed annually" ([Business plan page](https://www.epidemicsound.com/our-plans/business-plan/)). Creator, Pro and Business do not cover apps ([which plan](https://epidemicsound.com/blog/which-plan-is-right-for-you)). Enterprise has a 12-month minimum ([pricing](https://www.epidemicsound.com/pricing/)).
- **Survives cancellation?** Only for published content: "Once a project is published, the license stays with it." and "Any content soundtracked after the subscription period won't be cleared, and may be subject to copyright claims." For an app that ships updates for years, every new build after cancellation is new content.
- **Fit:** no. $1,200 a year for the right plan, a licence tied to publication, and a catalogue built for video.

#### Artlist

- **Terms:** the help centre lists "Apps, software, games & its end-users" among uses that need a customised Enterprise agreement because they are "not covered by our standard license agreement" ([Artlist Enterprise article](https://artlist.freshdesk.com/en/support/solutions/articles/43000408271)). For video, "your license is valid forever, even if your subscription expires!" and "Any song you use in your project during your subscription is yours to use now and for all future time" ([licence expiry article](https://artlist.freshdesk.com/support/solutions/articles/43000669703-does-the-license-end-if-my-subscription-expires-)). The licence agreement page itself returns 403 and the Pro licence PDF uses a custom font encoding we could not read, so the clause wording is **unverified**; the help-centre statements are Artlist's own.
- **Fit:** no. Apps are an Enterprise negotiation.

#### Zapsplat (not in the ticket, included because it comes up in every "free SFX" list)

- **Terms:** the Standard Licence requires attribution ("a simple line naming ZapSplat.com"); Gold removes it for sounds downloaded while Gold, and that exemption persists after cancellation for those downloads; CC0-marked sounds are credit-free for anyone. The licence also bars redistributing sounds "in any form, including in apps" (**all from search snippets of zapsplat.com pages**; the licence page returns 403, so **unverified**).
- **Fit:** the free tier needs a credits screen; the "including in apps" line is a reason to stay away.

### Generative and field-recorded

#### ElevenLabs sound-effects generation

- **Terms:** "For commercial sound effects, our free plan requires attribution to elevenlabs.io." "Our paid plans do not require attribution and can be used in commercial projects." ([ElevenLabs SFX commercial page](https://elevenlabs.io/sound-effects/commercial)). The Terms of Use say free users may use the Services "only for non-commercial purposes" and "you retain all rights in and to your Output" ([Terms](https://elevenlabs.io/terms-of-use)).
- **Fit:** credit-free on a paid month (Starter about $5; **unverified**). Generated ambience tends to be short and seamy, so it suits a Cue sound (a drop, a pad settling) better than a two-minute forest. Generated output's copyright status is unsettled, which matters less for a sound nobody will copy.

#### Stable Audio Open (Stability AI)

- **Terms:** model card licence is the Stability AI Community License; "For commercial use, please refer to https://stability.ai/license". Trained on 472,618 Freesound recordings and 13,874 FMA tracks, "All audio files are licensed under CC0, CC BY, or CC Sampling+"; "better at generating sound effects and field recordings than music"; up to 47 s stereo at 44.1 kHz ([model card](https://huggingface.co/stabilityai/stable-audio-open-1.0)). The Community License is free for entities "generating annual revenue of less than US $1,000,000" but requires that you "prominently display 'Powered by Stability AI' on a related website" plus a licence notice ([Community License](https://stability.ai/community-license-agreement)). "You own any outputs".
- **Fit:** the "Powered by Stability AI" notice is a credit line, so it is out unless the notice can live on the marketing site rather than in the app, which is a question for a lawyer, not this note.

#### Meta AudioCraft (AudioGen, MusicGen)

- **Terms:** the weights file is CC BY-NC 4.0, "not primarily intended for or directed towards commercial advantage" ([LICENSE_weights](https://raw.githubusercontent.com/facebookresearch/audiocraft/main/LICENSE_weights)). Out.

#### Procedural synthesis in code

Wind, water and surf are close to filtered noise with slow modulation, and birds are short FM chirps. That is the thesis of Andy Farnell's *Designing Sound* (MIT Press, 2010; the publisher page could not be fetched, **unverified** citation). Synthesising the soundscape in an AudioWorklet (web) and a small DSP routine on native would mean zero licences, zero asset bytes, infinite loop and per-season variation for free, at the cost of engineering time and a thinner, less "real" result than a Hempton recording. It fits the house rule that code draws the landscape. Worth a prototype if #212 says yes; not a source for Cue sounds with character.

#### Our own field recordings

A recording we make is ours; there is nothing to clear and no credit to show. A handheld recorder costs roughly $100 to $250 (**unverified**, not checked against a vendor page). Forest, lake and shore are all within a day of most places; the hard part is finding a spot without traffic or aircraft, which is the same reason the Freesound CC0 pool is uneven. This is the only route that gives a lake recording to order.

## Formats and loop-ready assets

- **Sources** are mostly 48 or 96 kHz 24-bit WAV (Freesound originals, Sonniss, Boom, A Sound Effect). Pixabay free downloads are likely MP3 (**unverified**).
- **Shipping:** MDN's codec guide says "AAC in an MP4 container is supported by all major browsers" and is "likely your best choice if you can only support one audio format"; Safari does not play Ogg Vorbis and plays Opus only in CAF ([MDN audio codecs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs)). So: encode once to AAC in `.m4a` for iOS, Android and web, with MP3 as the fallback `<source>` on web if needed. Keep the WAV masters in the repo's asset sources, not the bundle.
- **Looping:** `expo-audio` exposes `AudioPlayer.loop` ("whether the player is currently looping") on native and web ([expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/)), but a gapless loop needs a file cut on a zero-crossing with its tail crossfaded into its head, and MP3/AAC add encoder padding at the joins. Expect to crossfade two overlapping players rather than loop one file, which also lets the mix drift so a two-minute recording does not read as a two-minute cycle. Only Quiet Planet advertises files long enough "to loop it without sounding repetitive"; no free source sells seamless loops.
- **Size:** a two-minute stereo AAC loop at 96 kbps is about 1.4 MB; three places and a handful of Cue sounds fit in about 5 MB, which is below the sheet's worry threshold for the bundle but worth a line in the asset spec.

## What would need a credits screen (ruled out)

Freesound CC BY and CC BY-NC, OpenGameArt CC-BY and OGA-BY, the BBC archive under RemArc (and it is non-commercial anyway), Zapsplat's free tier, ElevenLabs' free tier, Stable Audio Open's "Powered by Stability AI" notice.

## Which sources fit the lean

The lean is a soundscape of the world plus a very few soft Cue sounds, never melodic music, no credit, no commission.

1. **Freesound, CC0 filter only** (Pixabay as the second well). Free, irrevocable, credit-free, original WAVs, and the only free pool deep enough for forest, lake and shore. Budget the time to audition and clean, and record each sound's URL and licence in the asset manifest.
2. **Sonniss GDC bundles.** Free, perpetual, credit-free, "apps" named in the licence, with a clear "finished app is fine" redistribution clause. Use them for the Cue sounds (a drop, a pad, a stone on water) and to fill a gap in a place's ambience.
3. **One paid buy-out if a place still sounds thin:** a Quiet Planet library (Coniferous Forests, Ocean Shores or Wetlands, $139 to $235, "mobile apps" named, perpetual) or an A Sound Effect library under its house EULA. Alternatively one day of our own recording at a lake, which is the only way to get the lake to order.

Not Epidemic Sound, not Artlist, not Soundsnap as a standing subscription, nothing CC BY, nothing from the BBC archive, no generative model with a notice clause.

## Open questions for #212 and the asset spec

- Whether the soundscape is a file at all, or filtered noise synthesised in code (a prototype question, not a licence one).
- How the asset manifest records a sound's origin and licence (CI could check that every shipped sound has a CC0, Sonniss or buy-out entry), and whether `docs/privacy/closed-list.md` gains a row if a sound switch becomes a kept setting.
- Whether to ask Boom about the "upload to a server" line before buying Quiet Planet for a web build.
