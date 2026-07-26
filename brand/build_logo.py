#!/usr/bin/env python3
"""
Vector Edge — canonical logo generator.

Produces plotter-safe SVG deliverables (one closed path per filled shape,
no strokes, no rasters, no clips/masks/filters, flat fills, tight viewBox)
plus a favicon PNG. The wordmark is the genuine Bebas Neue outline
(google/fonts, OFL) converted to paths; the paper-plane mark is drawn to the
brand spec.

Accent colour is a parameter (ACCENTS below) because the canonical accent is
still to be confirmed — the script renders every candidate so the choice can
be made from real artwork rather than a guess.
"""
from __future__ import annotations
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "src", "BebasNeue-Regular.ttf")

# ---- Brand tokens ---------------------------------------------------------
INK   = "#1A1A1A"   # brand ink
PAPER = "#FFFFFF"   # brand paper
# Candidate accents — canonical one TBC by the client.
ACCENTS = {
    "yellow": "#F5C518",   # warm yellow inner fold (brand-system spec)
    "blue":   "#0057FF",   # electric blue sampled from the storefront banner
    "themeblue": "#2563EB" # blue already used across the live theme schemes
}

# ---- Wordmark (real Bebas Neue outlines) ----------------------------------
CAP = 700.0            # Bebas Neue cap height in font units (upm 1000)
TEXT = "VECTOR EDGE"
TRACK = 24             # optical tracking, font units added between glyphs
WORD_GAP = 130         # width of the inter-word space, font units

_font = TTFont(FONT)
_cmap = _font.getBestCmap()
_hmtx = _font["hmtx"]
_gset = _font.getGlyphSet()


def wordmark_paths(cap_px: float, x0: float, baseline_y: float):
    """Return (list_of_path_d, total_width_px). Baseline at baseline_y,
    cap tops sit cap_px above it. Glyphs are outlined (closed paths)."""
    s = cap_px / CAP
    pen_x = 0.0
    ds = []
    for ch in TEXT:
        if ch == " ":
            pen_x += WORD_GAP
            continue
        gname = _cmap[ord(ch)]
        spen = SVGPathPen(_gset)
        # matrix: scale x by s, flip+scale y by -s, translate to pen position.
        tpen = TransformPen(spen, (s, 0, 0, -s, x0 + pen_x * s, baseline_y))
        _gset[gname].draw(tpen)
        d = spen.getCommands()
        if d:
            ds.append(d)
        pen_x += _hmtx[gname][0] + TRACK
    total_w = pen_x - TRACK  # drop trailing track
    return ds, total_w * s


# ---- Paper-plane mark (drawn to spec) -------------------------------------
# Square-ish artwork box; origami dart points right. Sharp nose; concave tail
# ("the rear edge cuts inward to a point") via NOTCH pulled toward the nose.
# Two flat elements keep it plotter-ideal and legible at favicon size:
#   1. plane silhouette  -> ink (light bg) / paper (dark bg)
#   2. inner-fold flap   -> accent triangle, laid along the centre spine
# Coordinates in a ~100x100 space, y-down.
NOSE  = (98.0, 50.0)   # sharp nose, far right
TOP   = (3.0,  7.0)    # top tail corner
NOTCH = (44.0, 58.0)   # concave tail point — cuts inward toward the nose
BOT   = (23.0, 93.0)   # bottom tail corner


def _lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def _poly(*pts):
    d = f"M{pts[0][0]:.2f},{pts[0][1]:.2f}"
    for p in pts[1:]:
        d += f" L{p[0]:.2f},{p[1]:.2f}"
    return d + " Z"


# inner-fold flap: nose -> tail notch -> midpoint of the lower edge
FOLD_MID = _lerp(BOT, NOSE, 0.52)


def mark_paths(ink, accent, far="ink"):
    """Silhouette + accent inner fold. `far` picks ink (light bg) or paper
    (dark bg) for the plane body."""
    body = ink if far == "ink" else PAPER
    return [
        # plane silhouette with concave tail
        (_poly(NOSE, TOP, NOTCH, BOT), body),
        # inner-fold flap along the spine, accent colour
        (_poly(NOSE, NOTCH, FOLD_MID), accent),
    ]


# ---- SVG assembly ---------------------------------------------------------
def _svg(viewbox, body):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" '
        f'role="img" aria-label="Vector Edge">\n{body}\n</svg>\n'
    )


def _paths_svg(items):
    return "\n".join(f'  <path d="{d}" fill="{f}"/>' for d, f in items)


def build_mark(accent, far="ink", inverse=False):
    items = mark_paths(INK, accent, far=far)
    # tight viewBox around the plane geometry (x 3..98, y 7..93)
    return _svg("1 5 99 90", _paths_svg(items))


def build_lockup(accent, inverse=False):
    """Full lockup: mark left, wordmark right, wordmark baseline aligned to
    the mark's vertical centre."""
    ink_for_text = PAPER if inverse else INK
    far = "paper" if inverse else "ink"

    # Layout in a common coordinate space.
    mark_h = 84.0            # plane occupies y 6..90 in its own space
    mark_top = 8.0
    mark_scale = mark_h / 84.0
    # place mark
    mx, my = 0.0, mark_top
    mark_items = []
    for d, f in mark_paths(INK if not inverse else INK, accent, far=far):
        mark_items.append((_shift(d, mx - 2.0, my - 6.0), f))
    mark_right = 98.0 * 1.0 + (mx - 2.0)

    cap_px = 62.0
    gap = 26.0
    text_x = mark_right + gap
    mark_cy = my + (90.0 - 6.0) / 2.0  # centreline of plane box
    baseline = mark_cy + cap_px / 2.0  # centre text block on the centreline
    wm, ww = wordmark_paths(cap_px, text_x, baseline)
    text_items = [(d, ink_for_text) for d in wm]

    total_w = text_x + ww
    top = my - 6.0
    height = 90.0 + (mark_top - 6.0)
    vb = f"{-1} {top-1:.2f} {total_w+2:.2f} {height+2:.2f}"
    body = _paths_svg(mark_items) + "\n" + _paths_svg(text_items)
    return _svg(vb, body)


def _shift(d, dx, dy):
    """Translate a path made only of absolute M/L commands."""
    out = []
    for tok in d.replace(",", " ").split():
        if tok in ("M", "L", "Z", "z"):
            out.append(tok); coord = []
            continue
    # simpler: re-parse
    import re
    def repl(m):
        x = float(m.group(1)) + dx
        y = float(m.group(2)) + dy
        return f"{x:.2f},{y:.2f}"
    return re.sub(r"(-?\d+\.?\d*),(-?\d+\.?\d*)", repl, d)


def build_favicon_svg(accent):
    """512x512 square, plane centred on ink with padding. Source for the PNG."""
    # mark spans x 3..98 (95 wide), y 7..93 (86 tall); centre in 512 with pad.
    pad = 96.0
    span = 512 - 2 * pad
    mw, mh = 95.0, 86.0
    s = min(span / mw, span / mh)
    ox = (512 - mw * s) / 2 - 3 * s
    oy = (512 - mh * s) / 2 - 7 * s
    items = mark_paths(INK, accent, far="paper")  # paper plane on ink
    body = []
    for d, f in items:
        body.append(f'  <path transform="translate({ox:.2f} {oy:.2f}) scale({s:.4f})" d="{d}" fill="{f}"/>')
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" '
        'width="512" height="512" role="img" aria-label="Vector Edge">\n'
        f'  <path d="M0,0 H512 V512 H0 Z" fill="{INK}"/>\n'
        + "\n".join(body) + "\n</svg>\n"
    )


def build_editable_svg(accent):
    """Editable master with LIVE text (Bebas Neue). Not for the plotter —
    keep alongside the outlined deliverables per the brief."""
    mark_items = mark_paths(INK, accent, far="ink")
    mark_svg = _paths_svg(mark_items)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 470 100" '
        'role="img" aria-label="Vector Edge">\n'
        '  <!-- Editable master: wordmark is live text (font: Bebas Neue). '
        'Convert to outlines before sending to the plotter. -->\n'
        f'{mark_svg}\n'
        '  <text x="150" y="78" font-family="Bebas Neue, sans-serif" '
        f'font-size="74" letter-spacing="2" fill="{INK}">VECTOR EDGE</text>\n'
        '</svg>\n'
    )


if __name__ == "__main__":
    import cairosvg
    # 1. Complete canonical set per candidate accent (nothing assumed).
    for key, acc in ACCENTS.items():
        d = os.path.join(HERE, "variants", key)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "logo-primary.svg"), "w").write(build_lockup(acc, inverse=False))
        open(os.path.join(d, "logo-inverse.svg"), "w").write(build_lockup(acc, inverse=True))
        open(os.path.join(d, "mark.svg"), "w").write(build_mark(acc))
        open(os.path.join(d, "logo.editable.svg"), "w").write(build_editable_svg(acc))
        cairosvg.svg2png(bytestring=build_favicon_svg(acc).encode(),
                         write_to=os.path.join(d, "favicon-512.png"),
                         output_width=512, output_height=512)
    print("wrote canonical sets ->", os.path.join(HERE, "variants", "<accent>", "..."))
