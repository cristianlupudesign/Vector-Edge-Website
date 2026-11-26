# Vector Edge (vectoredge.co.uk) — design rules

Read this before designing or building anything for Vector Edge: Shopify sections, page
mockups, artifacts, social graphics, emails. These rules are taken from the approved
reference build, `sections/van-that-sells.liquid`. When in doubt, match that file exactly.
Do not invent a new look.

## Brand in one line
Mobile van signwriting, West London. Bold, plain-spoken, trade-friendly. It should look like
a confident signwriter made it, not a SaaS startup.

## Logo (always include it)
Every design needs the Vector Edge logo: page mockups, artifacts, social graphics, emails,
quotes, flyers and van mockups. Never retype "VECTOR EDGE" in a font as a stand-in, and
never redraw the mark.

Files are in `brand/` (transparent PNGs):
| File | Use |
|------|-----|
| `brand/vector-edge-logo.png` (655×213) | **Primary.** Full-colour mark + wordmark, on white or paper backgrounds |
| `brand/vector-edge-logo-reversed.png` | On charcoal or dark photos. Wordmark and blue shard turn white, yellow stays |
| `brand/vector-edge-icon.png` (231×197) | Mark only: favicons, avatars, small spaces, watermarks |
| `brand/vector-edge-icon-reversed.png` | Mark only, on dark backgrounds |

- **Logo:** the blue (`#0057FF`) and yellow (`#E5E521`) arrowhead "V" mark, with "VECTOR EDGE"
  in heavy italic blue capitals stacked on two lines. A small yellow corner sits under the final E.
- **Placement:** top-left of every page or graphic, plus the footer or sign-off on longer pieces.
  On Shopify, the theme header already shows it (`settings.logo`, served from
  `//vectoredge.co.uk/cdn/shop/files/Asset1d.png`), so standalone sections don't repeat it at the top.
- **Size:** 170px wide in the site header. Never narrower than 120px for the full logo; below that,
  use the icon. Keep clear space around it at least the height of the "E" in EDGE.
- **Background:** full colour on white or paper only. Use the reversed version on charcoal.
  Never put either version on yellow or blue, or on a busy photo without a dark overlay.
- **Don't:** recolour it (beyond the supplied reversed files), stretch or squash it, rotate it,
  add shadows or outlines, or put it inside a box or badge.
- **Standalone HTML/artifacts:** embed the PNG as a base64 `data:` URI so it always renders.
  Set `alt="Vector Edge"`.
- The reversed files were made from the official PNGs, with blue swapped for white. If the
  designer supplies official reversed or SVG versions, replace these and update this table.

## Colour (use these hex values only)
| Token           | Hex       | Use |
|-----------------|-----------|-----|
| `--ve-yellow`   | `#E5E521` | Primary buttons, price stamp, badges, guarantee rule, eyebrows on dark |
| `--ve-blue`     | `#0057FF` | Links, icons, "+" markers, "included" values, focus outlines on light |
| `--ve-charcoal` | `#2B2B2B` | Text, dark bands, strong borders. Never pure black |
| `--ve-paper`    | `#F7F7F5` | Alternating light band background, step cards |
| `--ve-white`    | `#FFFFFF` | Main background, cards, form inputs |
| `--ve-rule`     | `#D9D9D2` | Hairline dividers and card borders |
| muted text      | `#55554f` | Secondary or caption text |

- Yellow is for the action and the price. Don't use it for large background areas apart from the
  stamp, and never put white text on yellow.
- Blue is used sparingly and never for buttons.
- No gradients, no glassmorphism, no extra accent colours, no purple.

## Type
- Display: **Bebas Neue** (400). All headings, buttons, prices, labels, numbers. Always UPPERCASE.
  Fallbacks: `'Arial Narrow', Impact, sans-serif`.
- Body: **Barlow Condensed** (400/500/600). Fallbacks: `'Arial Narrow', system-ui, sans-serif`.
- Load both from Google Fonts in a single `<link>`, plus preconnect.
- Headings: `line-height: 0.96; letter-spacing: 0.01em; font-weight: 400`.
- Sizes (the theme root is 62.5%, so 1rem = 10px):
  - H1 `clamp(4.6rem, 9vw, 8.4rem)`
  - H2 `clamp(3.2rem, 5vw, 5.2rem)`, 2.4rem bottom margin
  - Eyebrow: Bebas 1.6rem, `letter-spacing: 0.18em`
  - Lead/body copy 1.9–2rem, line-height 1.6, max 62ch
  - Small/labels 1.4–1.6rem, weight 600, uppercase, letter-spacing 0.04em
- Don't use other fonts. Don't use sentence-case headings.

## Layout
- The page is a stack of full-width **bands**: `padding: 6.4rem 2rem` (mobile `4.8rem 1.6rem`).
  Alternate white, paper, white, paper. Use one charcoal band for the final CTA or form.
- Content width is `max-width: 1080px`, with a narrow variant of `820px` for text-heavy bands.
- Grids are 4 columns on desktop, 2 below 990px, and 1 below 750px. Gap 1.6–2rem.
- **Square corners everywhere** (`border-radius: 0`). No pills, no rounded cards.
- No soft drop shadows. The only shadow is the "job sheet" offset `10px 10px 0 rgba(43,43,43,0.08)`.
- Borders are 1px `--ve-rule` normally, and 2px charcoal for emphasis (featured card, sheet).
- Use thick top rules as accents: 3px charcoal on step cards, 4px yellow on the guarantee.

## Components (reuse these, don't redesign them)
- **Button primary**: yellow background, charcoal text, Bebas 2.1rem, `padding: 1.4rem 2.6rem`,
  square, hover `filter: brightness(0.95)`.
- **Button ghost**: transparent background with a 2px `currentColor` border.
- **Trust row**: blue check icon + uppercase 1.5rem/600 label, above a hairline top border.
- **Job sheet / value stack**: white card with a 2px charcoal border and the offset shadow. Rows split
  into title, line and value. Struck-through subtotal, then the yellow price stamp.
- **Price card**: white with a rule border. The featured card gets a 2px charcoal border and a yellow
  badge overlapping its top edge. Price in Bebas 4.6rem.
- **FAQ**: `<details>` with Bebas summaries and a blue plus/minus icon drawn in CSS. Divided by rules.
- **Add-on list**: blue Bebas "+" before each item, divided by rules.
- **Mobile sticky CTA bar**: charcoal background, two buttons (yellow CTA + white "call").
- Icons are simple line SVGs in blue. No emoji, no stock illustration.

## Copy voice
- Short, direct, British English (£, "colour", "enquiries").
- Headlines are uppercase statements or questions, e.g. "THE VAN THAT SELLS.", "WHAT'S ONE JOB WORTH TO YOU?"
- Talk money and outcomes in plain numbers: "£1,295 fitted", "about 70p a day".
- Primary CTA: "GET YOUR FREE MOCKUP". Secondary: "or text VAN to 07348 580359".
- No hype words ("revolutionary", "elevate", "unleash"), no exclamation marks.

## Accessibility (required)
- Focus outline `3px solid --ve-blue`, offset 2px. On dark bands use yellow.
- Every `<section>` has `aria-labelledby` pointing to its heading.
- Respect `prefers-reduced-motion`. Keep motion minimal (≤0.25s transforms only).
- Body text on paper or white is charcoal. Never use grey below `#55554f` for body copy.

## Shopify build conventions
- Each section is self-contained: a `<style>` scoped to `#shopify-section-{{ section.id }}`,
  a single root class prefix (e.g. `.vts`), and vanilla JS only.
- Keep the normal theme layout (no `layout none`).
- All copy lives in schema settings with sensible defaults. Repeating items are blocks.
- Each page has a JSON template in `templates/page.<handle>.json`.
- Shared snippets in use: `ve-check` (check icon).

## Before you hand anything over
Check the design against this file: the logo is present (right version for the
background, not distorted), colours, the two fonts, uppercase Bebas headings,
square corners, alternating bands, yellow CTA. If a request seems to need something
outside these rules, ask first rather than improvising.
