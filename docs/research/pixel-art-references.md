# Which calm, non-retro pixel-art games and apps draw at a density near ours, and what does each do about light, line, dither, motion and text?

Research for [Research calm pixel-art games and apps at 256 to 480 art px across, as a reference board](https://github.com/shrujancheruku/look-together/issues/200) (map [#196](https://github.com/shrujancheruku/look-together/issues/196)). Sources read on 2026-11-08. The board feeds the art-direction ticket [#213](https://github.com/shrujancheruku/look-together/issues/213), which decides; this file only lays out the evidence and argues from it.

Our style today, from the [current-state sheet](../current-state.md): soft hi-bit at **320 art px across** on every device class, 12-step full-colour ramps, Luminous light (shafts, haze, glows), selective coloured edges and never black, ordered dithering only in light, mist and water depth, water at 8 fps, glints at 5 fps, bob at 3 fps; calm, soft, somewhat nostalgic, never a retro-game homage.

Anything marked **unverified** was not confirmed in a primary source. Anything marked **read from the screenshot** is my reading of an official image, not a developer's statement.

## Short answer

- **Nobody calm and non-retro draws at 320 across on a phone.** The verified densities cluster at two places: **480×270** (Hyper Light Drifter by statement and measurement, Stardew Valley and Fields of Mistria by measurement) and **640×360** (Kingdom Two Crowns, Sea of Stars, Eastward, Owlboy, Sword & Sworcery's widest scenes, all measured). Celeste is the one 320×180 game on the board, by its programmer's own statement, and it is not calm. Papers, Please is the one phone game below us, at 208 across by its author's statement.
- **What makes those games read as calm pixel art on a phone is the physical pixel, not the count.** On the 5.5-inch iPhone frames the publishers upload, one art pixel is 0.22 mm in Kingdom Two Crowns, 0.25–0.32 mm in Sword & Sworcery, 0.29 mm in Hyper Light Drifter, 0.31 mm in Living Worlds, 0.35 mm in Stardew Valley and 0.39 mm in the Pixeldoro timer app. Ours at 320 across is 0.21 mm on the Pixel 8 Pro and 0.22 mm on an iPhone 16 ([sprite sizes](sprite-sizes.md)), the smallest pixel on the board apart from Unpacking's. Unpacking, at 1104 across on the same iPhone frame (0.13 mm), is where pixel art stops reading as pixel art and starts reading as a crisp illustration.
- **Light is drawn by the engine, not the artist, in every hi-bit reference** (Eastward's hand-painted bump maps and fog layers, Sea of Stars' normal-mapped sprites, Celeste's light grid, Kingdom's reflection pass, Hyper Light Drifter's glows). The frame is pixel-grid art plus a smooth light pass. Only Mark Ferrari's Living Worlds does its light inside the palette, by cycling 256 colours.
- **Outlines are dark-coloured and selective everywhere on the board; nobody uses black on scenery.** Figures and touchable props get an outline in a dark step of their own colour; land, foliage and sky are shaped by value and cluster edges.
- **Dithering is rare and, where it appears, it is in light and texture, never in shading:** Sea of Stars' light-pool edges, Kingdom's shimmering water, Sword & Sworcery's stippled rock, and Ferrari's scenes (which dither everything, as a 256-colour artist must). Celeste, Eastward, Unpacking, Coffee Talk, Stardew and Mistria do not dither at all.
- **Text over the art is player-paced and plated.** Dialogue sits on a solid or near-solid plate until dismissed; HUDs are persistent only in games that need them. The two calmest story games, Coffee Talk and A Space for the Unbound, keep the words **out of the picture**, in a black band below a letterboxed frame. Unpacking, Kingdom and Living Worlds have no words over the art at all.
- **Frame rates of water, foliage and figures are not published by any developer on the board.** Nothing here verifies or contradicts our 8 / 5 / 3 fps; the only artist statements found are generic (a 6-frame sparkle loop, a 2-second ripple loop). This needs measuring from captured video in the motion prototype, not from a reference board.

## 1. Method

**Art px across** comes from one of two places, and each entry says which:

- **Developer statement:** a resolution the studio named in an interview, devlog or blog post. These are the primary sources for Celeste, Hyper Light Drifter, Papers, Please and Owlboy.
- **Measured screenshot:** an official store image (the Steam store API's `screenshots[].path_full`, or the App Store's full-size screenshot assets from the iTunes lookup API) run through a small script. It collects the columns where the image changes sharply and scores candidate periods k (device px per art px) by phase coherence, `|Σ exp(2πi·x/k)| / N`; a true integer scale scores 1.0 and the largest such k is the fundamental. The frame's width ÷ k is the art px across. Where a game scales by a non-integer (phones usually do), coherence drops to 0.5–0.9 and the figure is approximate; where no period scores above 0.45 the image is not pixel art on a fixed grid, and that is itself a finding (Terra Nil, Virtual Cottage, Children of Morta). The script was checked against synthetic 320×180 images at 6× and 4× before use.

**Physical size** of one art pixel on a phone is k × 25.4 ÷ ppi, using the frame's device class: 1242×2208 App Store frames are the 5.5-inch class at 401 ppi, 1242×2688 frames the 6.5-inch class at 458 ppi. Publishers sometimes upload renders rather than captures, so these are the pixels they *chose to show*, which is the point.

**Everything else** (ramp depth, outline rule, light, dithering, text) is read from the same official images unless a statement is cited. Colour counts in lossless (PNG) phone frames come from a direct count of distinct colours; JPEG frames were not counted.

## 2. The board, grouped by what each teaches

### A. Density near ours: pixel art that still reads as pixel art on a phone

**Celeste** (Maddy Makes Games / Extremely OK Games, 2018; PC, consoles; not on phones)

- **Art px across:** **320×180**, by statement: Noel Berry, who programmed it, writes that "the screen resolution is tiny (320x180)" in [Remaking Celeste's Lighting](https://medium.com/@NoelFB/remaking-celestes-lighting-3478d6f10bf) (the page refuses automated reads; the quote is as surfaced by search). Confirmed by measurement: three of four Steam screenshots are exactly 6 device px per art px at 1920×1080 (coherence 1.00), the fourth is a 2× zoom cut-scene.
- **Colours per ramp:** 3–4 steps on figures and terrain; the sky is a banded gradient of about 6 steps with no dithering (read from the screenshot).
- **Outline rule:** dark coloured outlines on Madeline and on the floating cloud (a blue outline on a white cloud); terrain is edged in its own darkest step; no black.
- **Light:** a separate light pass. Berry's post describes drawing the game's lights onto one grid texture rather than per sprite, so glows are smooth over the pixel grid. In the screenshot the only "light" is the falling white streaks and the warm-to-cool sky.
- **Where it dithers:** nowhere.
- **Frame rates:** not published. **unverified**
- **Text over the art:** dialogue in a portrait box over the art, advanced by the player; most frames carry no text.
- **Mood:** bright, tender, high-contrast; the environments are calm, the play is not. It is the proof that 320×180 can carry a soft pink-and-violet dusk with banded skies, which is the closest thing on the board to our palette.

**Hyper Light Drifter** (Heart Machine, 2016; PC, consoles; iOS 2019 by Abylight Studios)

- **Art px across:** **480×270**, by statement: Alx Preston, "We were constrained by our resolution, 480x270, which creates some good rules" ([Game Developer, 19 Jan 2017](https://www.gamedeveloper.com/design/road-to-the-igf-heart-machine-s-i-hyper-light-drifter-i-)); earlier, "our game is 480p … very intentionally so" and "our game is intentionally not retro, it's pixel art" ([GamingBolt, 13 Nov 2014](https://gamingbolt.com/our-game-is-480p-yeah-its-low-resolution-and-very-intentionally-so) and [28 Jan 2015](https://www.gamingbolt.com/hyper-light-drifter-interview-everything-you-need-to-know-about-heart-machines-2d-action-rpg)). Measured: two Steam screenshots at exactly 4× (480×270, coherence 1.00); one at 5× (384×216) is a zoomed shot. On the iPhone 5.5-inch frames the art is 478 across at a non-integer 4.6 device px per art px, so one art px is **0.29 mm**.
- **Colours per ramp:** 3–4 steps per material, many materials; Preston: "I embrace color; bright, saturated, neon, muted, whatever works" (Game Developer 2017).
- **Outline rule:** none on scenery; tiny figures are shaped by a dark selective edge. Shapes read by value and hue, not line.
- **Light:** smooth glows and bloom around every emissive (the red sigils, the teal particles); the glow is a blurred layer over the grid, not drawn in pixels. The App Store page says the port runs at 60 fps on iPhone and 120 fps on iPad Pro, which is the engine rate, not the sprite rate.
- **Where it dithers:** nowhere visible; mist is a soft gradient.
- **Frame rates:** not published; Preston says the resolution constraint "was not applied to animation" and they could push "frames of animation as much as we pleased". **unverified** for water and foliage.
- **Text over the art:** almost none; the game tells its story in pictures. Store frames carry marketing captions on a brush-stroke black plate.
- **Mood:** melancholy, hushed, lush; proof that 480 across reads as pixel art on a phone, and that glow does the emotional work at this density.

**Papers, Please** (3909 / Lucas Pope, 2013; iPad 2014; phones 2022)

- **Art px across:** **570×320** on desktop and **208 across on phones**, by statement: "The actual resolution is laughably low (570x320) but these pixels need to be big", and "the phone interface settled into 208x405 based on how the game's existing documents would fit legibly onto a modern non-Max iPhone … the effective resolution of the game is basically only 208x450" ([Cramming 'Papers, Please' Onto Phones, 6 Aug 2022](https://dukope.com/devlogs/papers-please/mobile/)). He mixes a 3× and a 2× grid ("fractional 2/3 pixel scaling on the 2x stuff, which multiplies out to integer coordinates in the final 3x buffer") and then scales to the screen with "a combination of integer scaling and bilinear filtering". My measurement on the phone frames found a 4.9 device px period, which is the mixed grid, not a clean k; the statement stands.
- **Colours per ramp:** 2–3; flat, muted, near-monochrome per region.
- **Outline rule:** dark coloured outlines on everything.
- **Light:** none drawn; the booth is flat.
- **Where it dithers:** nowhere.
- **Frame rates:** not published. **unverified**
- **Text over the art:** the text *is* the art, in a bitmap font sized to the grid; legibility set the resolution, not the other way round.
- **Mood:** grey, oppressive, not ours. It is here because it is the one documented case of a developer choosing a phone density *from the reading size of the words*, which is our constraint too.

**Stardew Valley** (ConcernedApe, 2016; phones 2018)

- **Art px across:** **480×270** at the Steam screenshots' zoom (exactly 4× at 1080p, coherence 1.00 on three frames); on the iPhone 5.5-inch frames about **394 across** at a non-integer 5.6 device px per art px (**0.35 mm**). The game draws 16×16 tiles and lets the player zoom, so density is a setting, not a rule.
- **Colours per ramp:** 4–5; warm, saturated.
- **Outline rule:** dark brown outlines on sprites and props; no black.
- **Light:** lanterns are soft radial glows multiplied over the tiles (the mine screenshot); daylight is flat.
- **Where it dithers:** nowhere; texture comes from drawn grain.
- **Frame rates:** not published. **unverified**
- **Text over the art:** persistent HUD (clock, money, toolbar); dialogue on an opaque plate, player-paced.
- **Mood:** cosy, busy, nostalgic in the retro-homage sense we are avoiding; on the board as the density most people already read on a phone.

**Fields of Mistria** (NPC Studio, 2026 on Steam; PC)

- **Art px across:** **480×270**, measured (exactly 4× at 1080p on three of four frames).
- **Colours per ramp:** 4–6, pastel and high-key.
- **Outline rule:** thick dark coloured outlines on figures and props, lighter on terrain; portraits are drawn at the same grid.
- **Light:** flat daylight; snow is value, not light.
- **Where it dithers:** nowhere.
- **Frame rates:** not published. **unverified**
- **Text over the art:** a large opaque blue plate over the bottom third with a white bitmap font, player-paced.
- **Mood:** sweet, soft-pastel, cosy; the current cosy-farm look at 480 across and the clearest sample of "soft" done with outlines everywhere.

**Living Worlds, Mark Ferrari** (Pixfabrik, 2019; iOS and Android)

- **Art px across:** the original scenes are **640×480, 256-colour** images ("35 of Mark's original 640×480 pixel masterpieces", "one single flat image with one 256 color palette", [80.lv on Joseph Huckaby's 2010 Canvas Cycle article](https://80.lv/articles/color-cycling-from-the-90s-returns-with-html5)). The app shows the original *Seize the Day* art, which is portrait ([Pixfabrik support FAQ](https://www.pixfabrik.com/livingworlds/support/)). Measured on the iPhone 5.5-inch frames: **256 art px across × 455 tall** at 4.85 device px per art px (**0.31 mm**), and a direct count finds **149 distinct colours** in the frame, consistent with an indexed palette.
- **Colours per ramp:** long: 8–16 steps per material, which is how a 256-colour image affords dawn-to-dusk by palette change alone.
- **Outline rule:** none; painterly clusters.
- **Light:** entirely in the palette. Light, water, rain, snow and the sun's path are palette cycling and timed palette fades ("The sun rises and falls in real time, storms pass through", [Pixfabrik](https://www.pixfabrik.com/livingworlds/)); the FAQ notes "the existing palette transitions and artwork changes are all set up for specific times". Huckaby's BlendShift fades colours between cycle steps for in-between frames.
- **Where it dithers:** everywhere: snow, sky, bark. Ferrari's dithering is the texture of the image, which is the opposite of our rule, and it reads as noise at 0.31 mm per pixel on a phone unless you look closely.
- **Frame rates:** the cycling rate is adjustable in Huckaby's demo (¼ to 4×); no published rate for the app. **unverified**
- **Text over the art:** none; the Logbook story is a separate page.
- **Mood:** "stunning and contemplative" ([Obscuritory, 3 May 2019](https://obscuritory.com/blog/seize-the-day-lives-on-as-the-living-worlds-app/)); the one app on the board whose whole purpose is a still pixel landscape that breathes, which is the closest thing to our Still water and Shoreline between Inquiries.

**Superbrothers: Sword & Sworcery EP** (Capybara Games, 2011 iPad; iPhone "Micro" 2011; Steam 2012)

- **Art px across:** no number from the studio; Craig D. Adams calls the style "hard-edged, resolution-independent pixels" and says environments are "512×512 or 1024×512" paintings ([CDM, 14 Apr 2011](https://cdm.link/inside-handheld-game-art-the-art-style-and-making-of-swords-sworcery-superbrothers-pixel-cinema/)). Measured: the scale changes per scene. iPhone 5.5-inch frames are exactly 4× (**552 across**) and 5× (**442 across**); the iPad frame is 6× (455 across); Steam frames are 3×, 4.5× and 6× (640, 427, 320 across). One art px on the iPhone is **0.25–0.32 mm**. A count finds about 255 significant colours in a frame.
- **Colours per ramp:** 2–4; muted, low-contrast.
- **Outline rule:** none; silhouettes against sky and water.
- **Light:** soft blurred glows (the moon, the clouds) over the grid; a reflection of the island in still water, with the pixel grid kept in the reflection.
- **Where it dithers:** heavily, in rock and foliage texture; fog is a blur.
- **Frame rates:** not published; Adams says older iPhones were excluded because "the frame rate wasn't great". **unverified**
- **Text over the art:** a sentence at a time on the art, player-paced; none in the frames measured.
- **Mood:** quiet, tall, mythic; the one phone-native pixel game that uses *very few* art pixels per figure and lets stillness and reflection carry it.

**Cozy Pomodoro: Pixeldoro Mini** (Sergei Andrei Postnov, IE; iOS; a focus timer, not a game)

- **Art px across:** measured on the iPhone 6.5-inch frame: about **382 across** at 7.0 device px per art px (**0.39 mm**), coherence 0.66 because the asset is a JPEG. The listing promises "over 20 animated pixel art backgrounds" and "calm scenes designed to create a relaxing study vibe" ([App Store](https://apps.apple.com/us/app/cozy-pomodoro-pixeldoro-mini/id6761088565)).
- **Colours per ramp:** 3–5, dusty.
- **Outline rule:** thin dark edges on cars and walls.
- **Light:** painted, not computed: a lilac dusk sky with flat cloud shapes.
- **Where it dithers:** nowhere.
- **Frame rates:** not published. **unverified**
- **Text over the art:** persistent plates (timer, coins, radio) with a bitmap font over the picture, which is exactly the HUD-over-the-world look we have ruled out.
- **Mood:** lo-fi, cosy, a little busy. It is the nearest thing to a calm pixel app at our density on a phone, and it shows that about 380 across at 0.39 mm reads plainly as pixel art.

### B. Light is the mood: hi-bit scenery with an engine light pass

**Eastward** (Pixpil, 2021; PC, Switch, consoles)

- **Art px across:** about **640×360**, measured (3× at 1080p on two frames, coherence 0.6–0.8; the shader lighting and a soft vignette blur the grid, so the number is approximate). No published resolution. **unverified** as a statement.
- **Colours per ramp:** 4–6 drawn, then multiplied by lighting into many more.
- **Outline rule:** dark coloured outlines on figures and props; terrain edged by value.
- **Light:** the engine's. Tommo Zhou: "we use shader textures and lighting systems in our custom engine (Maoi) to help convey atmosphere", "intricate fog layers and sunlight beams breaking through the landscape during dawn and dusk", and sprites are split into parts "ready to be hand painted in the bump map one by one to ensure they have the correct lighting performance in-game" ([Game Developer, 11 Oct 2021](https://www.gamedeveloper.com/art/eastward-s-creators-share-insights-on-making-pixel-art-adventures)). Pixpil's stated aim is a "retro-pixel + 3D lighting" look close to 90s Japanese animation (quoted on their Steam Greenlight-era page; the current store text says only "peaceful pixel surroundings").
- **Where it dithers:** nowhere; haze is a smooth layer, and the official frames carry a faint scanline-like vignette, which is a CRT nod we would not take.
- **Frame rates:** not published. **unverified**
- **Text over the art:** a solid pale speech bubble with a bitmap font over the picture, player-paced; it hides what is under it for the exchange.
- **Mood:** warm, lived-in, nostalgic without being a homage; the clearest statement of "pixel grid plus soft light" on the board, and the look our Luminous direction most resembles.

**Sea of Stars** (Sabotage Studio, 2023; PC, consoles; mobile via Netflix)

- **Art px across:** **640×360**, measured (3× at 1080p, coherence 1.00 on two frames). No published number. **unverified** as a statement.
- **Colours per ramp:** 4–6 drawn, lit to many more.
- **Outline rule:** dark coloured outlines on figures and monsters; environments edge-shaded.
- **Light:** "Our custom-made render pipeline allows the creation of a breathtaking world coming to life" under "Full-on dynamic lighting" ([press kit](https://sabotagestudio.com/presskits/sea-of-stars)); the Kickstarter's feature list promised "fully dynamic lighting of sprites including normal mapping", "pixel depth writing", "volumetric lighting" and "animated height fog" (the campaign page blocks automated reads; wording via [Niche Gamer, 19 Mar 2020](https://nichegamer.com/2020/03/19/the-messenger-prequel-rpg-sea-of-stars-enters-kickstarter-launches-2020-for-pc/)). Thierry Boulanger says one technical artist worked on the lighting from the start of development in 2018 ([MobileSyrup, 11 Sep 2023](https://mobilesyrup.com/2023/09/11/sea-of-stars-level-design-sabotage-studio-thierry-boulanger-interview/)).
- **Where it dithers:** at the edge of light pools on the ground, the one place on the board where ordered dithering is used the way our rule says (in light, not in shading).
- **Frame rates:** not published. **unverified**
- **Text over the art:** persistent battle HUD plates; dialogue on plates, player-paced.
- **Mood:** lush, golden, adventurous rather than calm; here for the light pass and the dithered light edge.

**Kingdom Two Crowns** (Fury Studios and Coatsink, published by Raw Fury, 2018; phones April 2020)

- **Art px across:** **640×360**, measured (3× at 1080p, coherence 1.00 on three frames). On the iPhone 5.5-inch frames the same 640 across at a non-integer 3.45 device px per art px, so one art px is **0.22 mm**, the same as ours. A count finds 1,500 significant colours in a phone frame: the lighting and reflection make it full-colour. No published number. **unverified** as a statement.
- **Colours per ramp:** 3–5 drawn, lit and reflected into many.
- **Outline rule:** silhouettes with dark edges; no black lines on scenery.
- **Light:** lamps, torches, a red moon and the whole lower half of every frame is a water reflection with shimmer. Thomas van den Berg on why pixel art: "it is economical", and it is "impressionist" because "the viewer fills in the details with their imagination" ([Game Developer, 6 Feb 2019](https://www.gamedeveloper.com/design/-i-kingdom-two-crowns-i-and-the-practical-intersection-of-pixel-art-and-roguelike-design)). His TIGSource devlog on the water refuses automated reads, so the reflection technique is **unverified** beyond the screenshots.
- **Where it dithers:** in the water: the reflection is broken by horizontal bands and sparkle noise rather than smooth blur, which is dithering in our sense (water depth and light).
- **Frame rates:** not published. **unverified**
- **Text over the art:** none in play; no dialogue, no HUD text, only coins.
- **Mood:** tranquil at dusk, tense at night; the best sample of water as half the frame, which is our pond and lake.

**Owlboy** (D-Pad Studio, 2016; PC, consoles)

- **Art px across:** **640×360**, measured (exactly 2× on the 1280×720 Steam frames). D-Pad locked the window at 1024×768 at first and added 1920×1080 later ([The Hi-Bit Era](https://www.dpadstudio.com/Blog/postHibit.html), Jo-Remi Madsen), which is where the word **hi-bit** comes from: "any pixel art game that operates beyond the limitations of the old 8/16/32-bit consoles can be defined as hi-bit".
- **Colours per ramp:** 5–8; the densest cluster shading on the board.
- **Outline rule:** dark selective outlines on figures; foliage by cluster edge; no black on scenery.
- **Light:** painted into the sprites (cloud highlights, grass gradients), not computed.
- **Where it dithers:** nowhere.
- **Frame rates:** not published. **unverified**
- **Text over the art:** dialogue on plates, player-paced; a persistent health bar.
- **Mood:** bright, airy, heroic; on the board for the definition of hi-bit and as the ceiling of hand-shaded density without an engine light.

### C. Calm without a game: what the quiet ones do with words and frames

**Unpacking** (Witch Beam, published by Humble Games, 2021; phones 24 Aug 2023; Apple Arcade as Unpacking+)

- **Art px across:** **960×540** on the Steam frames (exactly 2× at 1080p, coherence 1.00) and **1104 across** on the iPhone 5.5-inch frames (2× at 2208 wide), so one art px on the phone is **0.13 mm**. No published number. **unverified** as a statement.
- **Colours per ramp:** 4–6, soft and even.
- **Outline rule:** dark coloured outlines on objects, none on walls and floors.
- **Light:** painted; a soft window light on the wall and nothing computed.
- **Where it dithers:** nowhere.
- **Frame rates:** not published; nothing in the room moves until touched. **unverified**
- **Text over the art:** none in play. The store copy is the clearest mood statement on the board: "the zen game", "Meditative gameplay with no timers, meters or scores" ([App Store, Unpacking+](https://apps.apple.com/us/app/unpacking/id6751239710)). Wren Brier says she "had actually never attempted isometric art before Unpacking" ([Game Developer](https://www.gamedeveloper.com/design/unpacking---witch-beam)).
- **Mood:** calm, intimate, domestic. At 1104 across on a phone it reads as a crisp illustration with a faint pixel texture; the pixel grid has stopped being the medium. That is the upper edge of the ticket's question, answered.

**Coffee Talk** (Toge Productions, 2020; PC, consoles)

- **Art px across:** about **640 across**, measured weakly (about 2.9 device px per art px at 1080p on the portrait panel, coherence 0.5; the 1440×900 frames are resampled). **unverified** as a statement; Toge describes "90's anime-inspired pixel art visuals and chill vibes-inducing color palette" ([Steam](https://store.steampowered.com/app/914800/Coffee_Talk/)) and "the calm feelings of drinking warm drinks in the middle of a cold rainy night" ([Toge](https://www.togeproductions.com/project/coffee-talk)).
- **Colours per ramp:** 3–5; anime cel shading.
- **Outline rule:** dark coloured line art, anime-style.
- **Light:** painted warm interiors; the rain is drawn.
- **Where it dithers:** nowhere.
- **Frame rates:** not published. **unverified**
- **Text over the art:** **never over the art.** The picture sits in a letterboxed panel and the words run in a black band below it, in a bitmap font, player-paced. The PC-98 framing the studio cites is a retro nod, but the separation of words from picture is the useful part for us.
- **Mood:** chill, lo-fi, warm; the strongest statement on the board that calm reading and a pixel picture can share a screen without the words covering the picture.

**A Space for the Unbound** (Mojiken, published by Toge Productions, 2023; PC, consoles)

- **Art px across:** about **480×270**, measured weakly (about 4× at 1080p, coherence 0.46; the frames are filtered and letterboxed, and one cut-scene is at 8×). **unverified** as a statement. Dimas Novan D: "one of our game themes is nostalgia, so it makes sense to use pixel art as a medium of expression" ([80.lv, 20 Mar 2024](https://80.lv/articles/postmortem-developing-a-game-with-a-distinct-indonesian-identity)); the store promises "beautiful pixel art" and a "relaxing atmosphere" ([Steam](https://store.steampowered.com/app/1201270/A_Space_for_the_Unbound/)).
- **Colours per ramp:** 3–4; flat anime shading with a soft, slightly desaturated palette.
- **Outline rule:** dark coloured outlines (navy, brown) on everything; no black.
- **Light:** painted: window light as a flat pale wash across a classroom; night skies as drawn star fields; glows on magical objects are soft blurred circles.
- **Where it dithers:** nowhere.
- **Frame rates:** not published. **unverified**
- **Text over the art:** short labels in small plates on the picture ("Cassette"), dialogue in boxes at the bottom; the whole picture is letterboxed inside a rounded dark frame.
- **Mood:** warm, nostalgic, slice-of-life, 90s Indonesia; the calmest *story* pixel game on the board, and proof that soft comes from palette and flat light, not from softening the grid.

### D. Looked at and set aside

- **Terra Nil** (Free Lives, 2023; phones via Netflix): the commercial game is not pixel art on a grid (no period scores above 0.45 in any frame); the pixel-art version is the 2019 jam prototype that "will continue to remain on itch, for free" ([Free Lives devlog](https://vfqd.itch.io/terra-nil/devlog/188191/the-future-of-terra-nil)). Its calm is real but its medium is not ours.
- **Virtual Cottage** (DU&I, 2020): hand-drawn vector rooms, not pixel art (no grid period). Set aside.
- **Children of Morta** (Dead Mage, 2019): pixel sprites under heavy sub-pixel particle and light effects; no grid period survives, and the frame is too busy for the board.
- **Rusty's Retirement, Chillquarium, Garden Story, Roots of Pacha, Kynseed, Potion Permit, Coral Island:** not read in a primary source in time; candidates for a second pass if #213 wants more cosy-farm density samples (most will land at 480 across like Stardew and Mistria).

## 3. The table

| Reference | Platform read | Art px across | How verified | Device px per art px on the phone frame | One art px on that phone | Words over the art |
|---|---|---|---|---|---|---|
| Celeste | PC | 320×180 | statement + measured 6× | not on phones | — | plate, player-paced |
| Papers, Please | phone | 208 (desktop 570×320) | statement | mixed 3×/2× grid, then integer + bilinear | ≈0.31 mm (3× grid) | the text is the art |
| Living Worlds | phone | 256 wide portrait (640×480 originals) | measured 4.85× + 80.lv on the originals | 4.85 | 0.31 mm | none |
| Pixeldoro Mini | phone | ≈382 | measured 7.0× (JPEG) | 7.0 | 0.39 mm | persistent plates |
| Stardew Valley | PC, phone | 480×270 (PC); ≈394 (phone) | measured 4× / 5.6× | 5.6 | 0.35 mm | HUD + plate |
| Hyper Light Drifter | PC, phone | 480×270 | statement + measured 4× / 4.6× | 4.6 | 0.29 mm | almost none |
| Fields of Mistria | PC | 480×270 | measured 4× | — | — | large plate |
| A Space for the Unbound | PC | ≈480×270 | measured weakly | — | — | letterboxed, plates below |
| Sword & Sworcery | phone, iPad, PC | 442–552 (phone), 320–640 (PC) by scene | measured 4×, 5×, 6× | 4 and 5 | 0.25–0.32 mm | a line at a time |
| Kingdom Two Crowns | PC, phone | 640×360 | measured 3× / 3.45× | 3.45 | 0.22 mm | none |
| Sea of Stars | PC | 640×360 | measured 3× | — | — | HUD + plate |
| Eastward | PC | ≈640×360 | measured 3× (lit) | — | — | bubble, player-paced |
| Coffee Talk | PC | ≈640 | measured weakly | — | — | **below the picture** |
| Owlboy | PC | 640×360 | measured 2× at 720p | — | — | plate |
| Unpacking | PC, phone | 960×540 (PC); 1104 (phone) | measured 2× | 2 | 0.13 mm | none |
| **Look Together today** | phone | **320** | current-state sheet | 4 (Pixel 8 Pro, iPhone 16); 2 (iPhone SE) | **0.21 mm**; 0.16 mm on the SE | frost panels |

## 4. The ones at 320 to 480 that still read as pixel art on a phone

Read as pixel art at arm's length on the frames the publishers chose: **Hyper Light Drifter** (478 across, 0.29 mm), **Pixeldoro** (about 382 across, 0.39 mm), **Stardew Valley** (about 394 across, 0.35 mm), **Sword & Sworcery** (442 across at 5×, 0.32 mm). **Living Worlds** (256 across, 0.31 mm) and **Papers, Please** (208 across) are below the band and read as pixel art plainly. **Kingdom Two Crowns** at 640 across (0.22 mm) still reads as pixel art because its silhouettes are one art pixel wide and its water shimmer is on the grid; **Unpacking** at 1104 across (0.13 mm) does not.

Two things are doing the work in that list. First, the physical pixel: everything that reads as pixel art on a phone shows an art pixel of 0.22 mm or more, and Kingdom at 0.22 mm is the thinnest that still does. Second, what is drawn *on* the grid: one-pixel figures, hard cluster edges and on-grid shimmer declare the medium; smooth engine light and bilinear scaling hide it.

## 5. What this means for Look Together

The board does not decide; #213 does. It does narrow the argument.

- **320 across sits below every calm reference and at the bottom of the physical-pixel range.** Our 0.21 mm art pixel on the Pixel 8 Pro equals Kingdom's on a 5.5-inch iPhone, the finest pixel on the board that still reads as pixel art, and ours is smaller than Hyper Light Drifter's, Sword & Sworcery's, Stardew's and Pixeldoro's. So 320 is not too coarse for a phone by any reference; if anything the risk runs the other way, that at k = 4 on a flagship our grid is as fine as the finest hi-bit game's and reads as pixel art only if the drawing declares it. The counter-case for *raising* density (to 480, where Hyper Light Drifter, Stardew, Mistria and A Space for the Unbound sit) would have to come from how much a 20-px koi or a 169-px islet needs, not from how pixel art reads on a phone; the sprite-size research already found 16–20 px readable at our density.
- **The case for staying at 320 is cost and legibility of the words, and it is Pope's case.** He picked 208 across for the phone "based on how the game's existing documents would fit legibly", mixed two grids to get there, and still accepted bilinear scaling. We put native text on frost panels over the art, so our words do not depend on the art grid at all; that frees the density choice to be about the pictures and the frame budget, and 320 at integer k on every phone (293–375 across, [sprite sizes](sprite-sizes.md)) is the only choice on the board that gives whole device pixels everywhere without Pope's compromises.
- **The references we most resemble in intent (Eastward, Sea of Stars, Kingdom) all draw at 640×360 and get their softness from an engine light pass, not from the density.** If #213 finds the chosen kit "has no solid direction", the board suggests the missing thing is the light pass and its rules, not more pixels: Eastward's fog layers and sunbeams, Sea of Stars' dithered light-pool edges, Kingdom's water reflection with on-grid shimmer, Celeste's single light grid. All four keep the pixel grid under a smooth light. Our Luminous shafts, haze and glows are already that idea; the board gives it four anchors and a way to draw it (light as a separate smooth layer, dithering only where the light meets the ground or the water).
- **Our line and dither rules match the board's consensus.** Dark-coloured selective outlines on figures and touchable things, none on scenery, never black: that is Celeste, Eastward, Sea of Stars, Unpacking and A Space for the Unbound. Dithering only in light and water: that is Sea of Stars and Kingdom, and the no-dither majority is the softer half of the board. Nothing here argues for changing either rule. Living Worlds is the one counter-example and it is a 1990s palette constraint, not a choice we face.
- **12-step full-colour ramps are richer than any drawn ramp on the board.** The hi-bit games draw 4–6 steps and let the light multiply them; Celeste and A Space for the Unbound get softness from 3–4 steps and a gentle palette. Long drawn ramps are a Living Worlds trait. The board does not condemn 12 steps, but it suggests they earn their keep in skies, water depth and the light pass rather than in sprite shading, which is where the earlier Soft hi-bit proposal (5 steps) came from.
- **Words:** the calmest reading experiences on the board keep text off the picture (Coffee Talk, A Space for the Unbound) or have none (Unpacking, Kingdom, Living Worlds). Frost panels and reading mode are our version of that; the board supports the rule that nothing moves within the frost's column, since every reference that plates its text also stops the world under the plate.
- **Motion rates are the gap.** No developer on the board publishes water, foliage or figure rates, and the board cannot say whether 8 / 5 / 3 fps reads calm or cheap. That belongs to the motion prototype on the Pixel 8 Pro, ideally with frame-stepped captures of Kingdom's water and Eastward's foliage for comparison.
- **If #213 wants an anchor or two:** by resemblance of intent and look, **Eastward** (grid plus light, warm and lived-in, outlines on figures only) and **Kingdom Two Crowns** (water as half the frame, dusk light, wordless) cover most of what we are after, with **A Space for the Unbound** as the softness-from-palette reference and **Living Worlds** as the stillness reference. None of them is at 320; all of them would survive being redrawn at it.

## 6. Open points

- Frame rates for water, foliage and figures in every reference: **unverified**; measure from video.
- Developer statements of resolution for Eastward, Sea of Stars, Kingdom, Unpacking, Coffee Talk and A Space for the Unbound: not found; the numbers above are measurements.
- Noel Berry's Celeste lighting post and Noio's Kingdom water devlog refuse automated reads; both are cited from search excerpts and secondary pointers and should be read by hand before #213 leans on their technique details.
- The iTunes lookup for Hyper Light Drifter lists the seller as "Fictions, Inc."; the App Store page's copyright line reads "© 2019 Abylight Studios SA licensed by Heart Machine, LLC", so the frames are the licensed port's.

## Sources

Developer and publisher statements:

- Alx Preston, Heart Machine: [Road to the IGF, Game Developer, 19 Jan 2017](https://www.gamedeveloper.com/design/road-to-the-igf-heart-machine-s-i-hyper-light-drifter-i-); [GamingBolt, 13 Nov 2014](https://gamingbolt.com/our-game-is-480p-yeah-its-low-resolution-and-very-intentionally-so); [GamingBolt, 28 Jan 2015](https://www.gamingbolt.com/hyper-light-drifter-interview-everything-you-need-to-know-about-heart-machines-2d-action-rpg).
- Noel Berry: [Remaking Celeste's Lighting](https://medium.com/@NoelFB/remaking-celestes-lighting-3478d6f10bf).
- Lucas Pope: [Cramming 'Papers, Please' Onto Phones, 6 Aug 2022](https://dukope.com/devlogs/papers-please/mobile/).
- Jo-Remi Madsen, D-Pad Studio: [The Hi-Bit Era](https://www.dpadstudio.com/Blog/postHibit.html).
- Tommo Zhou and Hong Moran, Pixpil: [Game Developer, 11 Oct 2021](https://www.gamedeveloper.com/art/eastward-s-creators-share-insights-on-making-pixel-art-adventures); [Road to the IGF, 19 Mar 2020](https://www.gamedeveloper.com/business/road-to-the-igf-pixpil-s-i-eastward-i-).
- Thomas van den Berg and Gordon van Dyke: [Game Developer, 6 Feb 2019](https://www.gamedeveloper.com/design/-i-kingdom-two-crowns-i-and-the-practical-intersection-of-pixel-art-and-roguelike-design).
- Sabotage Studio: [Sea of Stars press kit](https://sabotagestudio.com/presskits/sea-of-stars); Thierry Boulanger in [MobileSyrup, 11 Sep 2023](https://mobilesyrup.com/2023/09/11/sea-of-stars-level-design-sabotage-studio-thierry-boulanger-interview/).
- Craig D. Adams, Superbrothers: [CDM, 14 Apr 2011](https://cdm.link/inside-handheld-game-art-the-art-style-and-making-of-swords-sworcery-superbrothers-pixel-cinema/).
- Dimas Novan D, Mojiken: [80.lv, 20 Mar 2024](https://80.lv/articles/postmortem-developing-a-game-with-a-distinct-indonesian-identity).
- Wren Brier and Tim Dawson, Witch Beam: [Game Developer](https://www.gamedeveloper.com/design/unpacking---witch-beam).
- Pixfabrik: [Living Worlds](https://www.pixfabrik.com/livingworlds/) and [support FAQ](https://www.pixfabrik.com/livingworlds/support/); Joseph Huckaby's 2010 Canvas Cycle article as quoted by [80.lv, 28 Jul 2017](https://80.lv/articles/color-cycling-from-the-90s-returns-with-html5).
- Mark Ferrari: [8 Bit & '8 Bitish' Graphics, GDC 2016](https://www.gdcvault.com/play/1023586/8-Bit-8-Bitish-Graphics).
- Toge Productions: [Coffee Talk](https://www.togeproductions.com/project/coffee-talk).
- Raymond Schlitter (artist rules, generic): [Pixelblog 1, Color Palettes, 16 Jan 2018](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes) (9-step ramps, 20° hue shift per step, saturation peaking mid-ramp); [Pixelblog 10, Water in Motion, 16 Oct 2018](https://www.slynyrd.com/blog/2018/10/12/pixelblog-10-water-in-motion) (6-frame sparkle loop, 2-second ripple loop).

Official images measured (Steam store API `appdetails` screenshots; App Store screenshot assets via the iTunes lookup API, 2026-11-08): Celeste 504230, Hyper Light Drifter 257850 and iOS 1453875289, Eastward 977880, Owlboy 115800, Superbrothers: Sword & Sworcery EP 204060 and iOS 424912055 / 431166885, Unpacking 1135690 and iOS 6450058135 / 6751239710, Kingdom Two Crowns 701160 and iOS 1477991646, Sea of Stars 1244090, A Space for the Unbound 1201270, Stardew Valley 413150 and iOS 1406710800, Virtual Cottage 1369320, Terra Nil 1593030, Coffee Talk 914800, Children of Morta 330020, Fields of Mistria 2142790, Living Worlds iOS 1371140984, Papers, Please iOS 935216956, Cozy Pomodoro: Pixeldoro Mini iOS 6761088565.

Store pages read for mood words and dates: [Eastward](https://store.steampowered.com/app/977880/Eastward/), [Kingdom Two Crowns](https://store.steampowered.com/app/701160/Kingdom_Two_Crowns/), [Coffee Talk](https://store.steampowered.com/app/914800/Coffee_Talk/), [A Space for the Unbound](https://store.steampowered.com/app/1201270/A_Space_for_the_Unbound/), [Unpacking+](https://apps.apple.com/us/app/unpacking/id6751239710), [Unpacking](https://apps.apple.com/us/app/unpacking/id6450058135), [Hyper Light Drifter iOS](https://apps.apple.com/us/app/hyper-light-drifter/id1453875289), [Pixeldoro Mini](https://apps.apple.com/us/app/cozy-pomodoro-pixeldoro-mini/id6761088565); [Obscuritory on Living Worlds, 3 May 2019](https://obscuritory.com/blog/seize-the-day-lives-on-as-the-living-worlds-app/); [Free Lives on Terra Nil's pixel version](https://vfqd.itch.io/terra-nil/devlog/188191/the-future-of-terra-nil).
