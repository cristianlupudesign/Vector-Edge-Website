#!/usr/bin/env python3
"""
Vector Edge — A5 double-sided windscreen flyer generator.

Two-page (front/back) A5 flyer with 3 mm bleed and crop marks, produced in two
accent colourways. The logo is the real artwork from brand/: the paper-plane
mark is drawn as vector via svglib.svg2rlg + reportlab.renderPDF.draw (never
rasterised); the wordmark is live Bebas Neue outlined by reportlab's font
engine. Recolouring is applied per colourway at draw time.

Geometry (verified by the trailing self-check):
  page  464.882 x 640.63 pt   (A5 trim 148x210 mm + 8 mm margin each side)
  trim  148 x 210 mm centred;  bleed 3 mm;  crop marks outside the bleed
  right-hand safe margin at X(138 mm); nothing crosses it or leaves the trim.
"""
from __future__ import annotations
import os, sys, tempfile

from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Group


def _text(c, x, y, s, font, size, colour, track=0.0):
    """Draw a string with letter tracking. Always emits the char-spacing
    operator so PDF Tc state never leaks between draws."""
    to = c.beginText(x, y)
    to.setFont(font, size)
    to.setFillColor(HexColor(colour))
    to.setCharSpace(track)   # always set (incl. 0) — resets any leaked Tc
    to.textOut(s)
    c.drawText(to)

HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.join(HERE, "brand")
sys.path.insert(0, BRAND)
import build_logo  # noqa: E402  (mark/wordmark source of truth)

# ---- Units & boxes --------------------------------------------------------
MM = 72.0 / 25.4
PAGE_W, PAGE_H = 464.882, 640.63
MARGIN_MM = 8.0                     # trim inset from page edge
TRIM_W_MM, TRIM_H_MM = 148.0, 210.0
BLEED_MM = 3.0
MARK_LEN_MM = 5.0
SAFE_MM = 10.0                      # inner safe margin
RIGHT_SAFE_MM = 138.0              # explicit right-hand safe edge

TX0 = MARGIN_MM * MM                        # trim left  (pt)
TY0 = MARGIN_MM * MM                        # trim bottom (pt)
TRIM_RIGHT = TX0 + TRIM_W_MM * MM
TRIM_TOP = TY0 + TRIM_H_MM * MM


CONTENT_W = (RIGHT_SAFE_MM - SAFE_MM) * MM   # left-safe -> right-safe
WRAP_W = CONTENT_W - 6.0                       # paragraph wrap width + buffer


def _fit(c, s, font, target, maxw, track=0.0):
    """Largest size <= target at which s (with tracking) fits within maxw."""
    size = target
    gaps = max(0, len(s) - 1)
    while size > 6 and c.stringWidth(s, font, size) + gaps * track > maxw:
        size -= 0.5
    return size


def X(mm_from_left):
    return TX0 + mm_from_left * MM


def Y(mm_from_top):
    return TRIM_TOP - mm_from_top * MM


# ---- Brand tokens & colourways -------------------------------------------
INK = "#16233D"      # brand navy (live theme scheme-1 background)
PAPER = "#F5F7FA"    # brand paper
WHITE = "#FFFFFF"
COLOURWAYS = {
    "blue":   "#0057FF",
    "yellow": "#F5C518",
}

FONT_PATH = os.path.join(BRAND, "src", "BebasNeue-Regular.ttf")
pdfmetrics.registerFont(TTFont("Bebas", FONT_PATH))

_BEBAS_CAP = 0.70    # cap height fraction of font size for Bebas Neue


# ---- Mark drawing (real SVG -> vector, recoloured at draw time) -----------
_mark_cache = {}


def _mark_drawing(accent_hex, light):
    """Return an svg2rlg Drawing of the plane mark, recoloured for this
    colourway. `light` picks the paper (light) plane for dark backgrounds."""
    key = (accent_hex, light)
    if key in _mark_cache:
        return _mark_cache[key]
    svg = build_logo.build_mark(accent_hex, far=("paper" if light else "ink"))
    fd, path = tempfile.mkstemp(suffix=".svg")
    with os.fdopen(fd, "w") as fh:
        fh.write(svg)
    d = svg2rlg(path)
    os.remove(path)
    _mark_cache[key] = d
    return d


def _draw_mark(c, accent_hex, x, y, height_pt, light):
    """Draw the plane mark with its bottom-left at (x, y), scaled to
    height_pt, as vector."""
    d = _mark_drawing(accent_hex, light)
    scale = height_pt / d.height
    g = Group(d)
    g.scale(scale, scale)
    renderPDF.draw(_wrap(g, d.width * scale, height_pt), c, x, y)


def _wrap(group, w, h):
    from reportlab.graphics.shapes import Drawing
    dw = Drawing(w, h)
    dw.add(group)
    return dw


def _mark_width(accent_hex, height_pt, light):
    d = _mark_drawing(accent_hex, light)
    return d.width * (height_pt / d.height)


# ---- Lockup ---------------------------------------------------------------
def lockup(c, x, y, mark, wordsize, accent, light=False):
    """Draw the logo lockup with the mark's bottom-left near (x, y).

    Signature preserved across side_a and side_b: `mark` is the plane height
    in pt, `wordsize` the wordmark font size in pt. The wordmark baseline is
    aligned to the mark's vertical centreline. `light` selects the paper
    plane + paper wordmark for dark backgrounds.
    """
    ink = WHITE if light else INK
    _draw_mark(c, accent, x, y, mark, light)
    mw = _mark_width(accent, mark, light)
    gap = mark * 0.28
    tx = x + mw + gap
    centre = y + mark / 2.0
    baseline = centre - (_BEBAS_CAP * wordsize) / 2.0
    _text(c, tx, baseline, "VECTOR EDGE", "Bebas", wordsize, ink,
          track=wordsize * 0.03)
    return tx + c.stringWidth("VECTOR EDGE", "Bebas", wordsize)


# ---- Print furniture ------------------------------------------------------
def bleed_rect(c, hex_fill):
    c.setFillColor(HexColor(hex_fill))
    c.rect(TX0 - BLEED_MM * MM, TY0 - BLEED_MM * MM,
           (TRIM_W_MM + 2 * BLEED_MM) * MM, (TRIM_H_MM + 2 * BLEED_MM) * MM,
           stroke=0, fill=1)


def crop_marks(c):
    c.setStrokeColor(HexColor("#000000"))
    c.setLineWidth(0.3)
    g = BLEED_MM * MM
    L = MARK_LEN_MM * MM
    corners = [
        (TX0, TY0, -1, -1),               # bottom-left
        (TRIM_RIGHT, TY0, 1, -1),         # bottom-right
        (TX0, TRIM_TOP, -1, 1),           # top-left
        (TRIM_RIGHT, TRIM_TOP, 1, 1),     # top-right
    ]
    for cx, cy, sx, sy in corners:
        # horizontal arm (outside the bleed, along x)
        c.line(cx + sx * g, cy, cx + sx * (g + L), cy)
        # vertical arm (outside the bleed, along y)
        c.line(cx, cy + sy * g, cx, cy + sy * (g + L))


# ---- Copy blocks ----------------------------------------------------------
def _para(c, text, x, y_top, size, leading, colour, font="Helvetica", maxw=None):
    """Word-wrapped paragraph (no tracking). Returns y after the last line."""
    words = text.split()
    line, y = "", y_top
    for w in words:
        trial = (line + " " + w).strip()
        if maxw and c.stringWidth(trial, font, size) > maxw and line:
            _text(c, x, y, line, font, size, colour)
            y -= leading
            line = w
        else:
            line = trial
    if line:
        _text(c, x, y, line, font, size, colour)
        y -= leading
    return y


SERVICES = [
    "Van & fleet graphics",
    "Shop fronts & fascia signs",
    "Cut-vinyl lettering & decals",
    "Banners & roll-up displays",
    "Workwear & branded merch",
]


# ---- Sides ----------------------------------------------------------------
def side_a(c, accent):
    """Front: dark hero."""
    bleed_rect(c, INK)
    # logo lockup, top
    lockup(c, X(SAFE_MM), Y(34), mark=30 * MM * 0.5, wordsize=30,
           accent=accent, light=True)
    # headline (auto-fit both lines to the safe width)
    hsize = min(62, _fit(c, "YOUR BEST ADVERT", "Bebas", 62, CONTENT_W, track=0.5))
    _text(c, X(SAFE_MM), Y(96), "YOUR VAN IS", "Bebas", hsize, WHITE, track=0.5)
    _text(c, X(SAFE_MM), Y(122), "YOUR BEST ADVERT", "Bebas", hsize, WHITE, track=0.5)
    # accent rule
    c.setFillColor(HexColor(accent))
    c.rect(X(SAFE_MM), Y(132), 46 * MM, 4, stroke=0, fill=1)
    # sub
    _para(c,
          "Mobile cut-vinyl signwriting: sharp, hard-wearing and fitted on "
          "site, right across West London.",
          X(SAFE_MM), Y(146), 13, 18, PAPER, maxw=WRAP_W)
    # bottom CTA band
    band_h = 30 * MM
    c.setFillColor(HexColor(accent))
    c.rect(TX0 - BLEED_MM * MM, TY0 - BLEED_MM * MM,
           (TRIM_W_MM + 2 * BLEED_MM) * MM, band_h + BLEED_MM * MM,
           stroke=0, fill=1)
    _text(c, X(SAFE_MM), Y(196), "VECTOREDGE.CO.UK", "Bebas", 26, INK, track=0.5)
    cta = "@vectoredge.co.uk   ·   West London · Ruislip HA4"
    _text(c, X(SAFE_MM), Y(203), cta, "Helvetica-Bold",
          _fit(c, cta, "Helvetica-Bold", 11, CONTENT_W), INK)


def side_b(c, accent):
    """Back: light detail."""
    bleed_rect(c, PAPER)
    # smaller logo (smaller mark / wordsize) — dark lockup on light
    lockup(c, X(SAFE_MM), Y(28), mark=22 * MM * 0.5, wordsize=22,
           accent=accent, light=False)
    # heading
    c.setFont("Bebas", 40)
    c.setFillColor(HexColor(INK))
    c.drawString(X(SAFE_MM), Y(58), "WHAT WE FIT")
    c.setFillColor(HexColor(accent))
    c.rect(X(SAFE_MM), Y(64), 30 * MM, 3, stroke=0, fill=1)
    # services list with accent ticks
    y = Y(80)
    for s in SERVICES:
        c.setFillColor(HexColor(accent))
        c.rect(X(SAFE_MM), y - 1, 3 * MM, 3 * MM, stroke=0, fill=1)
        c.setFont("Helvetica", 13)
        c.setFillColor(HexColor(INK))
        c.drawString(X(SAFE_MM) + 6 * MM, y, s)
        y -= 11 * MM
    # supporting line
    _para(c,
          "Design, print and fit from one team: no studio visit needed, we "
          "come to you.",
          X(SAFE_MM), Y(148), 12, 17, INK, maxw=WRAP_W)
    # contact block
    c.setFillColor(HexColor(INK))
    c.rect(X(SAFE_MM), Y(190), (RIGHT_SAFE_MM - SAFE_MM) * MM, 22 * MM,
           stroke=0, fill=1)
    _text(c, X(SAFE_MM) + 5 * MM, Y(178), "GET A QUOTE", "Bebas", 22, accent,
          track=0.5)
    contact = "vectoredge.co.uk   ·   Instagram @vectoredge.co.uk"
    _text(c, X(SAFE_MM) + 5 * MM, Y(184), contact, "Helvetica",
          _fit(c, contact, "Helvetica", 10.5, CONTENT_W - 10 * MM), WHITE)


# ---- Build ----------------------------------------------------------------
def build(colourway, accent):
    out = os.path.join(HERE, f"flyer-{colourway}.pdf")
    c = canvas.Canvas(out, pagesize=(PAGE_W, PAGE_H))
    side_a(c, accent); crop_marks(c); c.showPage()
    side_b(c, accent); crop_marks(c); c.showPage()
    c.save()
    return out


if __name__ == "__main__":
    for cw, acc in COLOURWAYS.items():
        print("wrote", build(cw, acc))
