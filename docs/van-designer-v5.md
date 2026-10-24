# Vehicle Designer v5

A rebuild of the live van designer (`templates/page.van-designer.liquid`, v4) so that:

- **any design goes on any vehicle.** v4 needed one Illustrator export per design per vehicle, so almost every design only existed for the medium van.
- **the customer's elements are shared.** Logo, business name, tagline, services list, phone, website, email and socials are entered once. Each one switches on or off once. They stay put when the design or vehicle changes, and so do the customer's colours (per colour role) and font. The state also survives a page refresh.
- **realistic vehicles can be swapped in** from PSDs, per vehicle, without touching the designs.

Pricing, fitting by postcode, the Oracal 651 palette, fonts and the cart flow are carried over from v4 unchanged.

## How it renders

Each vehicle view is drawn as stacked layers in one SVG:

| Layer | What it is |
|---|---|
| base | the vehicle as supplied: the outline sheet today, or the PSD photo |
| paint | the chosen vehicle colour, inside the bodywork mask |
| art | the design's graphics plus the customer's elements |
| overlay | the vehicle again, multiplied over paint and art, so shading, panel lines, handles and reflections sit *on* the vinyl |

The bodywork mask stops anything from being drawn on glass, lights, tyres or trim. On outline sheets it is built automatically from the drawing. On PSDs it comes from the `body` layer.

Designs never contain a vehicle. A design draws in each view's normalised frame: `u` runs from the front of the body to the rear, and `v` runs from roof to sill. It can place things against anchors measured on the vehicle: cab end, beltline, wheel centres and wheel top. Customer elements go into three blocks (`brand`, `list`, `contact`) placed in zones measured on the vehicle (`panel`, `rear`, `bonnet`). That is why one design fits a Caddy, a Luton and a Hilux.

## Files

| File | Role |
|---|---|
| `templates/page.van-designer-v5.liquid` | page markup, styles, vehicle list, price variants |
| `assets/ve-vd5-engine.js` | measuring vehicles, masks, layers, layout, rendering |
| `assets/ve-vd5-library.js` | designs, Oracal palette, vehicle colours, fonts, element list |
| `assets/ve-vd5-app.js` | page controller: shared state, controls, fitting, cart |
| `tools/psd-to-vd5/psd_to_vd5.py` | exports vehicle PSDs to the layers the engine reads |

It reuses existing theme assets: `ve-editor.css`, the `ve-veh-*.svg` outline sheets, the `custom-van-design` product and the `ve-seo-block` snippet.

## Trying it without touching the live page

1. On the **Copy of VE Ready to Use** theme (unpublished), add the template and the three `ve-vd5-*.js` assets.
2. Create a page, e.g. *Van Designer v5*, with template `page.van-designer-v5`.
3. Preview that theme and open the page. The live `/pages/van-designer` is unchanged.

Add `?vd5debug` to the URL to see the measured zones drawn on each view.

## Adding realistic vehicles from PSDs

One PSD per view (`medium-van-side.psd`, `medium-van-rear.psd`, …). Alternatively, one PSD per vehicle with top-level groups named `side`, `side2`, `rear`, `front`. `side` faces left and `side2` faces right. With only one side, `--mirror` makes the other.

Name these layers (the first word is what counts, case doesn't matter):

| Layer | Needed | What it should contain |
|---|---|---|
| `body` | yes | pixels covering every panel vinyl may go on: no glass, tyres, lights or trim. Colour is ignored. |
| `glass` | recommended | the windows, used to find the cab end and beltline |
| `wheels` | recommended | tyres and rims, used to find the wheel positions |
| `shade` | optional | a shading/shadow layer (multiplied over the vinyl) |
| `hi` | optional | highlights/reflections (screened over the vinyl) |
| `design` / `artwork` / `your design` | — | mockup placeholders; hidden on export |

Everything else that is visible becomes the vehicle photo. Then:

```
pip install psd-tools
python3 tools/psd-to-vd5/psd_to_vd5.py medium-van-side.psd medium-van-rear.psd medium-van-front.psd \
        --vehicle medium-van --mirror --out export/
```

Upload the files from `export/` to the theme assets, and paste the printed `"photo": {...}` block into that vehicle's entry in the template's `vd5-config`. Vehicles without a `photo` block keep using their outline sheet, so vehicles can be converted one at a time.

**Licence:** many paid mockup PSDs forbid use inside a tool customers interact with. Check each PSD's licence before publishing it.

## Adding or changing a design

Designs live in `assets/ve-vd5-library.js`. A design gives, per view (`side` is reused, mirrored, for `side2`):

- `art(a)`: shapes as path commands in `(u, v)` with a colour role. `a` holds the anchors (`cab`, `belt`, `fw`, `rw`, `wt`, `ar`).
- `blocks`: where `brand`, `list` and `contact` go, as fractions of a zone, with alignment.
- `roles`: default Oracal colours for `p`/`a`/`k` (graphics), `t`/`t2` (lettering) and `w` (lettering outline on busy artwork).

A view a design leaves out falls back to the default layout, so every element always has a place.

## When measuring gets a vehicle wrong

Give the vehicle a `tune` entry in the template, e.g. the pickup's bed side:

```json
"tune": {"side": {"zones": {"panel": {"x0": 0.6, "y0": 0.42, "x1": 0.95, "y1": 0.74}}}}
```

Zones and anchors can both be pinned this way. PSD manifests accept the same `zones` / `anchors` keys.

## Not carried over yet

- **Mascot**: its character artwork exists only as a medium-van Illustrator export. It can return as an artwork design once the source art is available.
- **HGV**: in the vehicle list, but its outline sheet couldn't be fetched for testing.
- **Logo files** still can't travel through `cart/add.js`. The filename is recorded and the customer sends the file after ordering, as in v4.
