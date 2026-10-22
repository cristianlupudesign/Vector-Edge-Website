# Stripe designer: handoff

Wheel rim stripe designer for the Speed Army Shopify store. The customer designs a stripe kit on
a live wheel preview, then adds it to the basket with every choice attached to the order line.

> The original handoff note (`docs/stripe-designer-handoff-2026-09-26.md`) was never committed,
> so this was rebuilt from scratch on 2026-10-22. Anything that differs from what was planned
> should be noted here.

## Files

| File | What it is |
|------|------------|
| `sections/stripe-designer.liquid` | Self-contained section: markup, scoped CSS, vanilla JS, schema |
| `templates/page.stripe-designer.json` | Page template with the section and a 13-colour vinyl palette |

## What the customer can do

1. **Bike:** make, model and year (required, so the kit can be cut to the rim), plus front and rear wheel sizes.
2. **Style:** full ring, segments, tapered (blade ends) or twin line (two colours).
3. **Pieces per side** (2 to 8; twin line allows 1) and **gap** between pieces (2 to 24 degrees).
4. **Width:** 5, 7, 10 or 12 mm. Drawn to scale for the chosen wheel size.
5. **Colours:** stripe colour, second colour (twin line or text), rim colour (preview only).
6. **Rim text** (optional, up to 14 characters), set into the gaps in the second colour.
7. **Kit:** product variants (e.g. Front & rear / Front only / Rear only), with live price.
8. **Front/rear preview toggle**, a spin toggle, and **Copy design link**, which reopens the exact design.

## What lands on the order

Line item properties:
`Bike`, `Front wheel`, `Rear wheel`, `Style`, `Pieces per side`, `Gap`, `Stripe width`,
`Stripe colour`, `Inner line colour` (twin), `Rim text`, `Text colour`, `Rim colour`,
`Kit` (only if the product has a single variant), `Design code`, and `_Design link`
(underscore keeps it out of checkout but it shows in the admin order).

**Design code** example: `SA-TAP3-G37-W10-F17R17-YEL.GB-T`, which decodes as
Speed Army, tapered, 3 pieces, 37 degree gaps, 10 mm, 17" front, 17" rear, yellow stripe,
gloss black second colour, has text. Colours are abbreviated from their names
(one word: first 3 letters; several words: initials), so reordering swatches never changes a code.

Open `_Design link` from the order to see the design exactly as the customer did.

## Setup in Shopify

1. Upload both files to the theme (Online Store > Themes > Edit code), or push via Shopify CLI / GitHub sync.
2. Create a **Wheel Stripe Kit** product. Recommended variants: `Front & rear`, `Front only`, `Rear only`,
   each with its price. A single-variant product also works; the kit choice is then sent as a property.
3. *(Optional)* Create a **Rim text** product (one variant, e.g. £5). It is added alongside the kit
   only when the customer adds text. Leave it unset to include text free.
4. Online Store > Pages > Add page, e.g. "Wheel Stripe Designer", Theme template: `stripe-designer`.
5. In the theme editor, open the page and set **Stripe kit product** (and the add-on) in the section settings.
   Until a product is picked the button becomes "Send design for a quote" and goes to the quote page
   (default `/pages/contact`) with `?design=`, `&bike=` and `&link=` in the URL.
6. Edit the vinyl palette as blocks (name + swatch). Tick "Only for text / second line" for colours
   that should not be offered as the main stripe.

Other settings: eyebrow, H1, intro, button label, notes under the button (one per line),
accent colour, and whether to go to the basket or stay on the page after adding.

## Notes and limits

- Preview only. No cut files are generated; cut from the properties and design link.
- Styling inherits the theme's font, and spacing assumes the Dawn-style `62.5%` root font size used elsewhere in this repo.
- After adding with "Stay on page", the section fires a `cart:refresh` event. Themes that listen for
  it update the cart count; others update on the next page load.
- Pushes `sd_add_to_cart` to `dataLayer` if present.

## Tested

Rendered with liquidjs and driven in Chromium: bike validation, style and colour changes, text
sanitising, variant and add-on pricing, the `/cart/add.js` payload, design-link restore, the
no-product quote fallback, and 390px mobile (no horizontal overflow, no console errors).
Not yet tested on the live store theme.
