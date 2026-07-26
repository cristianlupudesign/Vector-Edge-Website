# Vector Edge — brand logo

Canonical logo artwork for Vector Edge (mobile cut-vinyl signwriting, Ruislip HA4).

Everything here is generated from a single source of truth, **`build_logo.py`**, so
the artwork stays reproducible and plotter-safe. The wordmark is the genuine
**Bebas Neue** outline (Google Fonts, SIL OFL — see `src/OFL.txt`); the paper-plane
mark is drawn to the brand spec.

## ⚠️ Accent colour is not yet confirmed

The brief flagged that the canonical accent is undecided — the storefront banner
samples electric blue while the brand system specifies a yellow inner fold. **Nothing
here assumes a winner.** The complete four-file set is generated in every candidate
colourway under `variants/`, so the choice can be made from real artwork:

| Folder | Accent | Source of the value |
|---|---|---|
| `variants/yellow/`    | `#F5C518` | warm yellow inner fold (brand-system spec) |
| `variants/blue/`      | `#0057FF` | electric blue sampled from the storefront banner |
| `variants/themeblue/` | `#2563EB` | blue already used across the live theme colour schemes |

See `render/accent-comparison.png` for the three side by side.

**Once you confirm the accent**, that folder's files are the canonical deliverables.
To change or add a hue, edit `ACCENTS` in `build_logo.py` and re-run it — no manual
path editing.

## Files per colourway (`variants/<accent>/`)

| File | Use |
|---|---|
| `logo-primary.svg`   | full lockup, for **light** backgrounds (ink plane + ink wordmark) |
| `logo-inverse.svg`   | full lockup, for **dark** backgrounds (paper plane + paper wordmark) |
| `mark.svg`           | plane only, tight viewBox — favicons, app icons, social avatars |
| `favicon-512.png`    | mark on ink, 512×512 (only raster deliverable; regenerated from the SVG) |
| `logo.editable.svg`  | editable master with **live text** (Bebas Neue). Not for the plotter — convert type to outlines first. |

## Brand tokens

- Ink `#1A1A1A` · Paper `#FFFFFF` · Accent — *pending confirmation* (see above).
- Wordmark: Bebas Neue, `VECTOR EDGE`, set as two words to match the storefront.
- Mark: right-pointing origami dart — sharp nose, concave tail fold, accent inner-fold triangle.

## Plotter-safe guarantees (all SVG deliverables)

- One closed path per filled shape; **no strokes** anywhere (everything outlined).
- No embedded raster, no clip paths, masks, filters or `<use>`.
- Type converted to outlines in the deliverables; live text kept only in `logo.editable.svg`.
- Flat fills only, no gradients; `viewBox` tight to the artwork.

Validated by the build; re-check any edit with:
```
grep -REi 'stroke|clip-?path|mask|filter|image|xlink|<use|gradient' variants/*/*.svg   # expect no matches
```

## Regenerating

```
python3 -m pip install fonttools reportlab cairosvg pillow
python3 build_logo.py
```
Requires `src/BebasNeue-Regular.ttf` (bundled, OFL).

## Provenance note

No true-vector logo existed at build time — an exhaustive search (local repo, Shopify
Files, and the live theme assets) turned up only raster PNG exports (`Asset1d.png`,
`Asset_3d.png`, etc.). This artwork was therefore rebuilt to the written brand spec,
matched to those rasters, per Step 2 of the brief.
