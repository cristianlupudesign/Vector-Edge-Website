# 3D preview on your PC — instructions

Three parts:
1. **Set up once.** Gets the project and the episode files onto your PC.
2. **The prompt.** You paste it into Claude on your PC, and it uses your 3D app to make the visuals.
3. **Finish.** Joins main clip → 3D clip → end card into one video.

---

## 1. Set up once (Windows, PowerShell)

You need **Node.js 18+** (nodejs.org) and **Git** (git-scm.com). Then:

```powershell
cd $HOME\Desktop\Claude
git clone -b ccr-a837fcb7-92zh8a https://github.com/cristianlupudesign/Vector-Edge-Website.git vectoredge-video
cd vectoredge-video\video-series
npm install
npx playwright install chromium
node render.js ve01-skill-builder
```

The last line takes about 5 minutes and fills `video-series\out\` with:

| File | Use |
|---|---|
| `ve01-skill-builder-main.mp4` | video up to the "05 3D PREVIEW" slate |
| `ve01-skill-builder-outro.mp4` | end card |
| `ve01-skill-builder-nearside.png` / `offside.png` / `rear.png` | **vinyl only**, transparent, for the 3D app |
| `ve01-skill-builder-*.svg` | same vinyl as vectors (text already outlined) |
| `ve01-skill-builder-*-mockup.png` | flat proof of each side, to check the 3D result against |

Already have the folder? Get the latest with `git pull` instead of `git clone`.

---

## 2. Prompt to paste into Claude on your PC

Use the **Claude desktop app** (Claude Code, with **computer use** turned on in Settings), opened in the `vectoredge-video` folder. Paste everything in the box:

```text
You're on my Windows PC, in the vectoredge-video repo (folder video-series). I run Vector Edge, a
cut-vinyl signwriting business. I need 3D visuals of a van livery from my 3D app,
"3D Changer" (find it in the Start menu / installed apps).

The design is an UNOFFICIAL FAN CONCEPT van for Roger Bisby / Skill Builder (episode
ve01-skill-builder). Do not change the design files.

Van: Ford Transit Custom (medium van, panel van, sliding door on the nearside, plain rear doors).
Van paint: solid black, hex #1A1B1E (gloss).
Vinyl graphics (transparent PNGs, already cut to the bodywork; colours are Oracal 651 Yellow #FFCC00
and White #FFFFFF):
  - video-series/out/ve01-skill-builder-nearside.png  → LEFT side of the van (kerb side, with the sliding door). Front of the van is on the LEFT of the image.
  - video-series/out/ve01-skill-builder-offside.png   → RIGHT side (driver side). Front is on the RIGHT of the image.
  - video-series/out/ve01-skill-builder-rear.png      → rear doors.
  The same artwork as vectors is in the matching .svg files if the app prefers vectors.
  To check the result, compare against the *-mockup.png flat proofs in the same folder.

Steps:
1. Open the app and work out how it takes artwork: per-side images, a UV/texture layout, or
   decals. If it has an import, scripting or command-line option, use that before clicking around.
   Tell me what you found before doing anything that installs software, signs in, buys, or
   uploads my files to the internet. Ask me then.
2. Choose the closest van it has (Ford Transit Custom; otherwise any medium panel van). Set the body
   paint to #1A1B1E. Apply the three PNGs to the matching sides. Make sure:
   - text reads the right way on both sides (nothing mirrored),
   - no vinyl on glass, lights, tyres or the black plastic trim,
   - the yellow tape-measure stripe runs straight along the side above the wheel arches,
     matching the mockup PNGs.
3. Make these visuals, in a dark studio or plain background (charcoal #2B2B2B if it lets me choose):
   a. VIDEO: a slow 360° turntable of the van, 6–8 seconds, portrait 1080 x 1920 if possible
      (otherwise the highest resolution it offers), 30 fps. Start on the front 3/4 view.
   b. STILLS (PNG, as large as it allows): front 3/4 left, rear 3/4 left, front 3/4 right,
      straight side (nearside), rear.
   Save everything to video-series/out/3d/ (create the folder) with clear names, e.g.
   ep03-turntable.mp4, ep03-front-34-left.png.
4. Check your own work: take a screenshot of each still and compare it with the mockup PNGs. Fix
   anything mirrored, misplaced or on the wrong side before carrying on.
5. Join the finished video:  cd video-series  then
   node stitch.js ve01-skill-builder out/3d/ep03-turntable.mp4
   (stitch.js fits any clip size into 9:16 and joins main → 3D → outro). It makes
   out/ve01-skill-builder-final.mp4 and a WhatsApp-size copy.
6. Report back: what you made, where it's saved, anything you couldn't do and why. If the app
   couldn't export video, say so, and use stills: add each still as a 2-second clip with
   ffmpeg (or ask me), then run stitch.js with those clips.
```

For the next episode, change `ve01-skill-builder`, the van, the paint colour and the description to match that episode.

---

## 3. Finish (if you do the 3D part yourself)

Save your 3D clip anywhere, then in `video-series`:

```powershell
node stitch.js ve01-skill-builder "C:\path\to\your-3d-clip.mp4"
```

You can pass several clips (turntable, close-ups); they play in the order given. The result is `out\ve01-skill-builder-final.mp4` (1080 × 1920, 30 fps) plus `-final-whatsapp.mp4`, with the full soundtrack: the music plays on under the 3D clip, and the voice and sound effects are in sync either side.
