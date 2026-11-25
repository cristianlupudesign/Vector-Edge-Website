# From Idea to Van — Vector Edge video series

## Van-wrap episodes (Ep 02 onwards)

Flow: **Brief → sketch on the van template → AI concept → vector (pen + type) → colours → zoom compare → on the van → 3D hand-off slate → outro**.

```bash
node render.js ep02-mrbeast
```

Extra outputs for these episodes, for the 3D mockup app (in `out/`):
- `ep02-mrbeast-nearside.svg / .png`: left side of the van (sliding-door side), artwork only, text as outlines, PNG 4000 px wide with a transparent background
- `ep02-mrbeast-offside.svg / .png`: right side (layout re-flowed so the text still reads the right way)
- `ep02-mrbeast-rear.svg / .png`: rear doors

`ep02-mrbeast-main.mp4` ends on the "05 3D PREVIEW" slate. Put your 3D clip after it, then `ep02-mrbeast-outro.mp4`.

A new episode = copy `episodes/ep02-mrbeast.js` and change the brief, shapes, text, notes, prompt and captions.
A new van = copy `vans/vw-t61.js`, redraw the outline, glass, lines, wheels and parts, and set `van.model` in the episode.
Real people: keep the `disclaimer` line, use original artwork only (no copies of their logos, no photos or likeness).

---

## Logo episodes (Ep 01)

Short 9:16 videos showing a design going **AI concept → hand-drawn vector → on the van → 3D**.
Everything up to the 3D part is made in code. The 3D part is made by you on the PC and dropped in.

## Each episode

| Stage | What happens |
|---|---|
| Intro | "From idea to van", episode number and name |
| 01 Concept | A prompt is typed, an AI-style image "generates" out of noise (wrong letters, fuzzy edges) |
| 02 Vector | The pen tool traces it point by point (anchors and bezier handles), the type tool sets the real lettering, brand colours fill in |
| Why vector? | 800% zoom: the AI image is a blur, the vector stays sharp |
| On the van | Van drives in, the livery goes on with a squeegee wipe |
| 03 3D teaser | The logo extruded and turning in 3D (CSS), "Next: we build it in 3D" |
| Outro | Vector Edge end card |

## Run it (Windows or Mac)

Needs Node.js 18 or newer.

```bash
cd video-series
npm install
npx playwright install chromium
node render.js ep01-harris-build              # full render (about 5 minutes)
node render.js ep01-harris-build --preview    # live preview with a scrub bar in your browser
node render.js ep01-harris-build --frame 20   # just one still at 20 s, for quick checks
```

ffmpeg comes with `npm install` (via `ffmpeg-static`). If that download fails, put ffmpeg on your PATH and it will be used instead.

## What you get in `out/`

- `ep01-harris-build-9x16.mp4`: the whole video (1080 × 1920, 30 fps)
- `ep01-harris-build-main.mp4`: everything up to the 3D teaser. **Your 3D clip goes after this.**
- `ep01-harris-build-outro.mp4`: the end card. Put it after your 3D clip.
- `ep01-harris-build-9x16-whatsapp.mp4`: a small copy for sharing
- `ep01-harris-build-logo.svg`: the finished logo, text already turned into outlines, to import into your 3D app and extrude

## Making the next episode

1. Copy `episodes/ep01-harris-build.js` to e.g. `episodes/ep02-smith-plumbing.js`.
2. Change the shapes (`VE.poly`, `VE.rrect`, `VE.circle`, or raw `M/L/C/Z` commands on a 1000 × 1000 artboard), the text, palette, prompt, captions and van details.
3. Optional: set `concept.image` to a real AI image (square PNG in `assets/concepts/`). It is used for the concept and zoom stages instead of the fake one.
4. `node render.js ep02-smith-plumbing`

Curves (`C` commands) are what show bezier handles in the pen-tool stage, so curvy designs look best.
Use made-up businesses or customers who have agreed to be shown. Ofcom drama numbers (07700 900xxx) are safe fake phone numbers.
