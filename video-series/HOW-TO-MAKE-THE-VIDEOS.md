# How to make a "From Idea to Van" video

Each video goes: **Brief → Sketch → AI concept → Vector → On the van → 3D preview → Vector Edge end card**.
Everything except the 3D part is made by code. You make the 3D clip in your 3D app, and a script joins it all.

---

## The five episodes so far

| File | Who (unofficial fan concepts) | Van | Message |
|---|---|---|---|
| `ve01-skill-builder` | Roger Bisby · Skill Builder | Ford Transit Custom, black | Do it once. Do it right. |
| `ve02-kaleb-cooper` | Kaleb Cooper | Vauxhall Combo, dark green | Straight hedges. Straight talking. |
| `ve03-tommy-walsh` | Tommy Walsh | Peugeot Boxer, white | Gardens built to last. |
| `ve04-jay-blades` | Jay Blades | Ford Transit Custom, dark blue | Don't bin it. Fix it. |
| `ve05-nick-knowles` | Nick Knowles | Peugeot Boxer, silver | Big builds. Big hearts. |

The look matches vectoredge.co.uk: navy `#16233D`, lime `#E8F338` highlight blocks, blue `#2563EB`, Barlow Condensed Black Italic headings, Archivo Narrow text, the site logo and the lime ticker strip.

---

## Step 1: Set up the PC (once)

Install these:
- **Node.js** (nodejs.org, the "LTS" button)
- **Git** (git-scm.com)

Then open **PowerShell** and run:

```powershell
cd $HOME\Desktop\Claude
git clone -b ccr-a837fcb7-92zh8a https://github.com/cristianlupudesign/Vector-Edge-Website.git vectoredge-video
cd vectoredge-video\video-series
npm install
npx playwright install chromium
```

Later, to get the newest version: open PowerShell in `vectoredge-video` and run `git pull`.

---

## Step 2: Make a new episode

Each video is one file in `video-series\episodes\`.

1. Copy `ve01-skill-builder.js` and rename it, e.g. `ve06-your-episode.js`.
2. Open it in Notepad (or VS Code) and change these parts:

| Part | What to put |
|---|---|
| `id` | the file name without `.js`, e.g. `'ve06-your-episode'` |
| `number`, `title`, `subtitle` | shown on the intro |
| `disclaimer` | keep "UNOFFICIAL FAN CONCEPT · NOT AFFILIATED…" with the person's name |
| `van` | `sheet`: which template (see table below), `name`, and `paint` colour |
| `brief` | the six lines typed on the brief card. Mark the message line with `key: true` |
| `palette` | the vinyl colours (Oracal 651 names + hex) |
| `shapes` | the graphics (see "Drawing shapes" below) |
| `texts` | the lettering: text, position, size, colour |
| `rear` | graphics and lettering for the back doors |
| `sketchNotes` | the handwritten notes in the sketch scene |
| `concept` | the AI prompt shown on screen, and the misspelt versions of each text line |
| `camera` | which shapes or text to zoom in on while drawing |
| `zoom` | the area shown in the "Why vector?" close-up |
| `captions` | the subtitles for each scene, one per spoken sentence (timing is filled in by `vo-plan.js`) |
| `durations` | starting seconds per scene (`vo-plan.js` stretches them to fit the voice) |

**Van templates:**

| `sheet` | Van |
|---|---|
| `assets/vans/ve-veh-medium-van.svg` | Ford Transit Custom |
| `assets/vans/ve-veh-large-van.svg` | Peugeot Boxer |
| `assets/vans/ve-veh-small-van.svg` | Vauxhall Combo |

**Drawing shapes:** positions are fractions of the van body:
- `u` goes from **0 = front** of the van to **1 = rear**
- `v` goes from **0 = roof** to **1 = sill** (bottom of the doors)
- sizes (text, round corners, circles) are fractions of the body height

Shape types:
- `rrect: [u0, v0, u1, v1, corner]`: rounded rectangle
- `circle: [u, v, radius]`
- `uv: [['M',u,v], ['L',u,v], ['C',u1,v1,u2,v2,u,v], ['Z']]`: any outline. `C` curves show handles in the pen-tool scene.
- `parts: [...]` with `rule: 'evenodd'`: a shape with holes cut out (like the tape-measure ticks)

The same design goes on both sides automatically (the other side is mirrored, with the text kept readable).

**Watch out for:** door handles, the sliding-door rail and lights. Vinyl is automatically cut around them, so lettering placed over them gets bits missing. On the Transit Custom the sliding-door rail is at `v` ≈ 0.43–0.49, so keep text off that band.

---

## Step 3: Preview while you edit

```powershell
cd $HOME\Desktop\Claude\vectoredge-video\video-series
node render.js ve06-your-episode --preview
```

Open the address it prints in Chrome. It plays the video with a scrub bar, so press F5 after each change. Ctrl+C stops it.

To check a single moment as a picture (e.g. 30 seconds in):

```powershell
node render.js ve06-your-episode --frame 30
```

---

## Step 4: Render the video

```powershell
node render.js ve06-your-episode
```

It takes about 4–5 minutes. You get, in `video-series\out\`:

| File | What it is |
|---|---|
| `…-main.mp4` | the video up to the "05 3D PREVIEW" slate |
| `…-outro.mp4` | the Vector Edge end card |
| `…-9x16.mp4` / `…-9x16-whatsapp.mp4` | the whole thing without the 3D part |
| `…-nearside.png`, `…-offside.png`, `…-rear.png` | **vinyl only**, transparent, for the 3D app |
| `…-nearside.svg` etc. | the same vinyl as vectors |
| `…-nearside-mockup.png` etc. | flat proof of each side |

---

## Step 5: Make the 3D clip

In your 3D app:
1. Pick the same van and set the body paint to the episode's paint colour.
2. Put `nearside.png` on the **left** side (sliding door side; front of the van is on the left of the image).
3. Put `offside.png` on the **right** side (front is on the right of the image).
4. Put `rear.png` on the back doors.
5. Check it against the `-mockup.png` files: nothing mirrored, no vinyl on windows or lights.
6. Export a slow turntable video, 6–8 seconds, portrait if possible.

(To get Claude on the PC to do this for you, use the prompt in `3D-ON-YOUR-PC.md`.)

---

## Step 6: Join it all into the final video

```powershell
node stitch.js ve06-your-episode "C:\path\to\your-3d-clip.mp4"
```

You can add more than one 3D clip, and they play in order. Any size works: each clip is fitted into the vertical frame.

Result: `out\ve06-your-episode-final.mp4` (1080 × 1920, ready for Reels / TikTok / Shorts) and `-final-whatsapp.mp4`.
The soundtrack is rebuilt to fit: the music plays on under your 3D clip, and the voice and sound effects stay in sync either side of it.

---

## Sound: music, voiceover and sound effects

Every render has a full soundtrack, levelled to -14 LUFS (what Instagram, TikTok and YouTube expect):

| Part | Where it comes from |
|---|---|
| **Music** | `assets/audio/music/idea-to-van-theme.mp3`, one track for the whole series (made in Magnific). It dips automatically when the voice speaks. |
| **Voiceover** | one MP3 per scene in `assets/audio/vo/<episode>/`: `intro.mp3`, `brief.mp3`, `sketch.mp3`, `concept.mp3`, `vector.mp3`, `colour.mp3`, `zoom.mp3`, `van.mp3`, `handoff.mp3`, `outro.mp3`. Any scene without a file is silent. |
| **Sound effects** | made by the code from what's on screen: typing, pen-tool clicks per anchor point, pencil, whooshes, pops, the AI "generating" riser, paint, the 3D hit. Nothing to supply. |

**Voiceover for a new episode:**
1. Write one or two short lines per scene (match the captions).
2. Make each scene's line in Magnific (Audio → Voiceover). Ep 01 used the voice **Preston Thornbury** with the eleven v4 model, so use the same voice to keep the series consistent.
3. Save them as `assets/audio/vo/<episode>/<scene>.mp3` and point `audio.voDir` in the episode file at that folder.
   Put `[pause 1s]` between sentences that have their own caption.
4. Run `node vo-plan.js <episode>`. It measures the voice, makes each scene long enough, and times every caption to its sentence (saved as `episodes/<episode>.timing.js`).
5. Render as normal.

The intro ("From idea… to van") and outro ("Vector Edge. Got an idea for your van? Send it over.") are the same in every episode, so copy them from `assets/audio/vo/ve01-skill-builder/`.

Levels live in the episode file: `voVolume`, `musicVolume`, `sfxVolume`.
Changed only the sound? `node render.js <episode> --audio-only` rebuilds it in seconds without re-rendering the pictures.

---

## Rules for real people

- Keep the **disclaimer** line on.
- Original artwork only: never copy their real logo, and no photos or drawings of their face.
- Don't run these as paid ads with their name in.
