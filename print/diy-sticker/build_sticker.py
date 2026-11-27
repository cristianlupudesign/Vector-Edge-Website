#!/usr/bin/env python3
"""
Vector Edge - "DIY VEHICLE / GRAPHICS" contour die-cut sticker.

Builds, into the folder this script lives in:
  vectoredge-diy-sticker_single.pdf   one sticker + 2 mm bleed, layers Print / CutContour
  vectoredge-diy-sticker_sheet.pdf    PDF/X-4 print sheet for Mutoh + VerteLith, Graphtec ARMS marks
  preview.png                         2000 px render of the single sticker on mid-grey

Pipeline: fonttools + uharfbuzz (text -> outlines), shapely (union / offsets / cut path),
reportlab (PDF, CutContour as a Separation colour space), pypdf (layers, PDF/X-4 plumbing),
pdftoppm (preview).

Logo: the supplied Vector Edge reverse horizontal lockup is placed on the truck's rear door.
It is NEVER redrawn. The script looks for it (see find_logo()); pass --logo PATH to point at it.
If it can't be found the build still runs, leaves the door clean and prints a loud warning;
the PDFs are then NOT approved for press.
"""
import argparse
import datetime as dt
import glob
import math
import os
import re
import subprocess
import sys
import uuid

import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (ArrayObject, DecodedStreamObject, DictionaryObject, NameObject,
                           NumberObject, RectangleObject, TextStringObject)
from reportlab.lib.colors import CMYKColor, CMYKColorSep
from reportlab.pdfgen import canvas as rl_canvas
from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_HEAD = os.path.join(HERE, "fonts", "BarlowCondensed-BlackItalic.ttf")  # 900 italic
FONT_URL = os.path.join(HERE, "fonts", "BarlowCondensed-Bold.ttf")         # 700
ICC = os.path.join(HERE, "icc", "Artifex_SWOP_default_cmyk.icc")
MM = 72.0 / 25.4  # points per mm

# ------------------------------------------------------------------ brand colours (CMYK 0-100)
# Navy #16233D -> CMYK through an ICC transform (sRGB -> SWOP/CGATS TR001, relative colorimetric).
# Naive formula would give C64 M43 Y0 K76, which prints flat and purple-ish; the ICC build is used.
NAVY = (87, 76, 53, 75)
YELLOW = (14, 0, 97, 0)       # logo yellow
BLUE = (96, 80, 2, 0)         # logo blue
OFFWHITE = (2, 1, 0, 0)       # text off-white / "paper"
RICHBLACK = (60, 40, 40, 100)  # truck body
WHITE = (0, 0, 0, 0)          # rim: printed white / unprinted vinyl
GLASS = (0, 0, 0, 18)         # light grey glass
ALLOY = (0, 0, 0, 38)         # grey alloys
TRIM = (0, 0, 0, 65)          # plastic trim / arch flares
SEAM = (0, 0, 0, 78)          # door shut lines on black
HUB = (0, 0, 0, 60)
REG = (0, 0, 0, 100)          # marks
CUT_SPOT = CMYKColorSep(0, 1, 0, 0, spotName="CutContour", density=1)

# ------------------------------------------------------------------ geometry spec (mm)
FINISHED_W = 100.0
NAVY_OFFSET = 6.0
RIM_OFFSET = 2.5
EPS = 0.01            # safety so polygon chords never fall below the nominal offsets
MIN_RADIUS = 1.0      # tightest allowed curve on the cut path
SMOOTH_R = 1.6        # concave-corner rounding radius applied to the cut (>= MIN_RADIUS)
NAVY_CLOSE = 3.0      # closes narrow notches in the navy ground
BLEED = 2.0
QS = 64               # quad segments for buffers (chord error ~0.002 mm)

SHEET_W = 11.5 * 25.4
SHEET_H = 7.5 * 25.4
SAFE = 15.0           # safe margin: no reg mark closer than this to the sheet edge
GAP = 4.0             # between cut lines
REG_LEN, REG_W, REG_SQ = 10.0, 0.5, 5.0
REG_CLEAR = 8.0       # min clearance from any reg mark to crop marks / cut paths


def c(col):
    return CMYKColor(*[v / 100.0 for v in col])


# ================================================================== text -> outlines
class RecPen(BasePen):
    """Records glyph outlines as cubic contours (quadratics are promoted by BasePen)."""

    def __init__(self, glyphset, xf):
        super().__init__(glyphset)
        self.xf = xf
        self.contours, self.cur = [], None

    def _moveTo(self, p):
        self.cur = [("M", self.xf(p))]

    def _lineTo(self, p):
        self.cur.append(("L", self.xf(p)))

    def _curveToOne(self, p1, p2, p3):
        self.cur.append(("C", self.xf(p1), self.xf(p2), self.xf(p3)))

    def _closePath(self):
        self.contours.append(self.cur)
        self.cur = None

    _endPath = _closePath


def shape_text(font_path, text, size_mm, x0=0.0, y0=0.0, tracking=0.0):
    """Return list of contours (font outlines, kerned via HarfBuzz) at cap-size scale `size_mm` per em."""
    blob = hb.Blob.from_file_path(font_path)
    face = hb.Face(blob)
    hbfont = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})
    tt = TTFont(font_path)
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    upm = tt["head"].unitsPerEm
    s = size_mm / upm
    contours, pen_x = [], 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        ox, oy = pen_x + pos.x_offset, pos.y_offset
        pen = RecPen(gs, lambda p, ox=ox, oy=oy: (x0 + (p[0] + ox) * s, y0 + (p[1] + oy) * s))
        gs[name].draw(pen)
        contours += pen.contours
        pen_x += pos.x_advance + tracking * upm
    return contours


def flatten(contour, steps=24):
    pts = []
    for op in contour:
        if op[0] in "ML":
            pts.append(op[1])
        else:
            p0 = pts[-1]
            p1, p2, p3 = op[1], op[2], op[3]
            for i in range(1, steps + 1):
                t = i / steps
                mt = 1 - t
                pts.append((mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
                            mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1]))
    return pts


def contours_geom(contours):
    """Non-zero fill of glyph contours -> shapely (TrueType outlines: XOR of rings is equivalent)."""
    g = Polygon()
    for ct in contours:
        pts = flatten(ct)
        if len(pts) >= 3:
            g = g.symmetric_difference(Polygon(pts).buffer(0))
    return g


def xform_contours(contours, sx, sy, dx, dy):
    f = lambda p: (p[0] * sx + dx, p[1] * sy + dy)
    return [[(op[0],) + tuple(f(p) for p in op[1:]) for op in ct] for ct in contours]


# ================================================================== the pickup (truck units: 0..100 long)
def circle(x, y, r):
    return Point(x, y).buffer(r, quad_segs=QS)


def build_truck():
    """Flat double-cab pickup, side view facing right. Returns (layers, silhouette, door_box).
    layers: ordered list of (cmyk, shapely geometry). Purely generic: no make badges / grilles."""
    WR, WF, WY = 19.5, 80.5, 8.2           # wheel centres (tyre touches y=0)
    R_TYRE, R_ARCH, R_FLARE, R_RIM = 8.2, 9.7, 10.9, 5.3
    body = Polygon([(1.5, 8), (1.2, 25.4), (2.5, 26.6), (40.6, 26.6), (42.7, 39.6), (44.8, 41.5),
                    (65.2, 41.5), (67.4, 40.4), (76.6, 31.4), (92, 30.0), (96.4, 28.8), (98.7, 25.8),
                    (99.5, 20), (99.5, 12.5), (98.3, 8), (95, 7), (4, 7)])
    body = body.buffer(0.6, quad_segs=QS).buffer(-0.6, quad_segs=QS)  # soften the corners a touch
    for wx in (WR, WF):
        body = body.difference(circle(wx, WY, R_ARCH))
    above = box(-5, 6.6, 105, 60)
    flares = unary_union([circle(wx, WY, R_FLARE).difference(circle(wx, WY, R_ARCH)).intersection(above)
                          for wx in (WR, WF)])
    sill = box(30.4, 5.5, 69.6, 7.3)
    rear_bumper = Polygon([(0.6, 7.0), (7, 7.0), (7, 10.8), (0.9, 10.8)])
    front_bumper = Polygon([(92.5, 7.0), (98.4, 7.8), (99.9, 11.8), (93.5, 11.3)])
    tyres = unary_union([circle(wx, WY, R_TYRE) for wx in (WR, WF)])

    dlo = Polygon([(44.7, 32.3), (45.8, 39.3), (64.7, 39.3), (72.4, 32.3)])
    dlo = dlo.buffer(-0.7, quad_segs=QS).buffer(0.7, quad_segs=QS)
    glass = dlo.difference(box(57.5, 30, 59.2, 45))
    mirror = Polygon([(72.4, 31.4), (75.8, 31.4), (76.3, 33.8), (73.2, 34.5)])

    clip = body.difference(dlo)
    # blue diagonal stripe on the front wing, leaning forward like the italic headline
    lean = 7.5 / 23.0
    stripe = Polygon([(82.0, 7), (87.5, 7), (87.5 + 23 * lean, 30), (82.0 + 23 * lean, 30)]).intersection(clip)
    # yellow swoosh: starts just behind the stripe and runs back, tapering to a point on the rear door
    fx = lambda y: 80.6 + (y - 7) * lean
    swoosh = Polygon([(fx(12.2), 12.2), (fx(26.2), 26.2), (60, 17.2), (26, 10.4), (60, 12.4)])
    swoosh = swoosh.buffer(0.35, quad_segs=QS).buffer(-0.35, quad_segs=QS).intersection(clip)

    head = Polygon([(91, 29.1), (96.4, 27.7), (97.6, 25.5), (92, 26.4)])
    tail = box(1.3, 18.4, 3.0, 24.4).intersection(body)
    seams = unary_union([
        LineString([(42.1, 26.6), (42.1, 9.0)]).buffer(0.16),
        LineString([(44.0, 40.6), (42.1, 26.6)]).buffer(0.16),
        LineString([(58.35, 32.0), (58.35, 9.0)]).buffer(0.16),
        LineString([(74.4, 32.0), (75.0, 22.0), (73.0, 15.0)]).buffer(0.16),
        LineString([(2.0, 25.8), (40.6, 25.8)]).buffer(0.12),            # bed rail
    ]).intersection(body)
    handles = unary_union([box(53.2, 27.0, 55.8, 27.7), box(69.0, 27.0, 71.6, 27.7)])

    def alloy(wx):
        rim = circle(wx, WY, R_RIM)
        holes = []
        for i in range(5):
            a0 = math.radians(i * 72 + 90 - 21)
            a1 = math.radians(i * 72 + 90 + 21)
            arc = [(wx + 4.5 * math.cos(a0 + (a1 - a0) * k / 16), WY + 4.5 * math.sin(a0 + (a1 - a0) * k / 16))
                   for k in range(17)]
            arc_in = [(wx + 2.0 * math.cos(a1 - (a1 - a0) * k / 16), WY + 2.0 * math.sin(a1 - (a1 - a0) * k / 16))
                      for k in range(17)]
            holes.append(Polygon(arc + arc_in).buffer(-0.3, quad_segs=16).buffer(0.3, quad_segs=16))
        return rim, unary_union(holes), circle(wx, WY, 1.1)

    layers = [(RICHBLACK, tyres), (RICHBLACK, body), (TRIM, sill),
              (TRIM, rear_bumper), (TRIM, front_bumper), (BLUE, stripe), (YELLOW, swoosh),
              (GLASS, glass), (RICHBLACK, mirror), (OFFWHITE, head), (TRIM, tail),
              (SEAM, seams), (TRIM, handles), (TRIM, flares)]
    for wx in (WR, WF):
        rim, holes, hub = alloy(wx)
        layers += [(ALLOY, rim), (RICHBLACK, holes), (HUB, hub)]
    silhouette = unary_union([g for _, g in layers])
    door_box = (43.4, 16.8, 57.4, 31.0)   # rear door panel, above the swoosh, below the glass
    return layers, silhouette, door_box


# ================================================================== logo (supplied file only)
def find_logo(cli_path=None):
    cands = []
    if cli_path:
        cands.append(os.path.expanduser(cli_path))
    if os.environ.get("VE_LOGO"):
        cands.append(os.path.expanduser(os.environ["VE_LOGO"]))
    roots = [os.path.expanduser("~/VectorEdge"), HERE, os.path.join(HERE, "..", "..")]
    for r in roots:
        cands += glob.glob(os.path.join(r, "**", "ve-logo-horizontal-reverse.svg"), recursive=True)
    for r in roots:
        cands += [p for p in glob.glob(os.path.join(r, "**", "*.pdf"), recursive=True)
                  if "primary" in os.path.basename(p).lower() and "logo" in p.lower()]
    for p in cands:
        if os.path.isfile(p):
            return p
    return None


def nearest_brand(rgb):
    """Map a logo fill (sRGB) to the brand CMYK build - logo colours are a fixed palette."""
    pal = {(0x16, 0x23, 0x3D): NAVY, (255, 255, 255): OFFWHITE, (0xF5, 0xF3, 0xEE): OFFWHITE,
           (0xE2, 0xE8, 0x1E): YELLOW, (0xEE, 0xF0, 0x12): YELLOW, (0xFF, 0xE6, 0x00): YELLOW,
           (0x1D, 0x3F, 0x9B): BLUE, (0x23, 0x45, 0xA5): BLUE, (0, 0, 0): RICHBLACK}
    best = min(pal, key=lambda k: sum((a - b) ** 2 for a, b in zip(k, rgb)))
    return pal[best]


def load_logo_svg(path):
    """Parse the supplied SVG into filled cubic contours (exact curves, no redraw)."""
    import svgelements as se
    svg = se.SVG.parse(path, reify=True)
    items = []
    for el in svg.elements():
        if not isinstance(el, se.Shape):
            continue
        if el.fill is None or el.fill.value is None or el.fill.alpha == 0:
            continue
        p = se.Path(el)
        contours, cur = [], None
        for seg in p.segments(transformed=True):
            if isinstance(seg, se.Move):
                if cur:
                    contours.append(cur)
                cur = [("M", (seg.end.x, -seg.end.y))]
            elif isinstance(seg, se.Close):
                if cur:
                    contours.append(cur)
                cur = None
            elif isinstance(seg, (se.Line,)):
                cur.append(("L", (seg.end.x, -seg.end.y)))
            elif isinstance(seg, se.CubicBezier):
                cur.append(("C", (seg.control1.x, -seg.control1.y), (seg.control2.x, -seg.control2.y),
                            (seg.end.x, -seg.end.y)))
            elif isinstance(seg, se.QuadraticBezier):
                s0 = seg.start
                c1 = (s0.x + 2 / 3 * (seg.control.x - s0.x), s0.y + 2 / 3 * (seg.control.y - s0.y))
                c2 = (seg.end.x + 2 / 3 * (seg.control.x - seg.end.x), seg.end.y + 2 / 3 * (seg.control.y - seg.end.y))
                cur.append(("C", (c1[0], -c1[1]), (c2[0], -c2[1]), (seg.end.x, -seg.end.y)))
            elif isinstance(seg, se.Arc):
                for cb in seg.as_cubic_curves():
                    cur.append(("C", (cb.control1.x, -cb.control1.y), (cb.control2.x, -cb.control2.y),
                                (cb.end.x, -cb.end.y)))
        if cur:
            contours.append(cur)
        if contours:
            rule = "evenodd" if str(getattr(el, "fillrule", "nonzero")).lower() == "evenodd" else "nonzero"
            items.append((nearest_brand((el.fill.red, el.fill.green, el.fill.blue)), contours, rule))
    if not items:
        raise RuntimeError(f"No filled shapes found in logo {path}")
    pts = [op[-1] for _, cts, _ in items for ct in cts for op in ct]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return items, (min(xs), min(ys), max(xs), max(ys))


# ================================================================== layout
def build_layout(G, logo):
    """G = GRAPHICS em size in mm. Returns dict of artwork items + art union (all in mm)."""
    items = []          # (kind, cmyk, payload, fillrule) ; kind 'curves' or 'geom'

    def bbox_of(cts):
        pts = [p for ct in cts for p in flatten(ct, 4)]
        return min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)

    # GRAPHICS
    g_ct = shape_text(FONT_HEAD, "GRAPHICS", G)
    gx0, gy0, gx1, gy1 = bbox_of(g_ct)
    g_ct = xform_contours(g_ct, 1, 1, -gx0, -gy0)              # bbox origin at (0,0)
    GW, GH = gx1 - gx0, gy1 - gy0
    # DIY VEHICLE at 60 % of GRAPHICS width
    d_ct = shape_text(FONT_HEAD, "DIY VEHICLE", 100)
    dx0, dy0, dx1, dy1 = bbox_of(d_ct)
    k = 0.60 * GW / (dx1 - dx0)
    d_ct = xform_contours(d_ct, k, k, 0, 0)
    dx0, dy0, dx1, dy1 = bbox_of(d_ct)
    line_gap = 0.075 * GH
    d_ct = xform_contours(d_ct, 1, 1, GW / 2 - (dx0 + dx1) / 2, GH + line_gap - dy0)
    # truck
    t_layers, t_sil, door = build_truck()
    tw = 0.88 * GW
    ts = tw / 100.0
    tx = GW / 2 + 0.07 * GW - tw / 2                          # sits right of centre, like the reference
    tx = min(tx, GW - tw)
    roof = 41.5
    ty = GH / 3.0 - roof * ts                                 # roof line overlaps the bottom third of GRAPHICS
    T = lambda g: affinity.translate(affinity.scale(g, ts, ts, origin=(0, 0)), tx, ty)
    truck_sil = T(t_sil)
    # navy keyline separating the truck from the yellow lettering
    items.append(("geom_over_text", NAVY, truck_sil.buffer(0.7, quad_segs=QS), None))
    truck_items = [("geom", col, T(g), None) for col, g in t_layers]
    # logo on rear door
    logo_items = []
    if logo is not None:
        litems, (lx0, ly0, lx1, ly1) = logo
        bx0, by0, bx1, by1 = door
        bw, bh = (bx1 - bx0) * ts, (by1 - by0) * ts
        s = min(bw / (lx1 - lx0), bh / (ly1 - ly0)) * 0.92
        cx = tx + (bx0 + bx1) / 2 * ts
        cy = ty + (by0 + by1) / 2 * ts
        for col, cts, rule in litems:
            logo_items.append(("curves", col, xform_contours(
                cts, s, s, cx - (lx0 + lx1) / 2 * s, cy - (ly0 + ly1) / 2 * s), rule))
    # URL centred under the truck
    u_ct = shape_text(FONT_URL, "vectoredge.co.uk", 100)
    ux0, uy0, ux1, uy1 = bbox_of(u_ct)
    k = 0.50 * tw / (ux1 - ux0)
    u_ct = xform_contours(u_ct, k, k, 0, 0)
    ux0, uy0, ux1, uy1 = bbox_of(u_ct)
    truck_bottom = truck_sil.bounds[1]
    truck_cx = (truck_sil.bounds[0] + truck_sil.bounds[2]) / 2
    u_ct = xform_contours(u_ct, 1, 1, truck_cx - (ux0 + ux1) / 2, truck_bottom - 0.035 * GH * 3 - uy1)

    text_items = [("curves", OFFWHITE, d_ct, "nonzero"), ("curves", YELLOW, g_ct, "nonzero")]
    art = unary_union([contours_geom(d_ct), contours_geom(g_ct), truck_sil, contours_geom(u_ct)])
    ordered = (text_items + [items[0]] + truck_items + logo_items +
               [("curves", OFFWHITE, u_ct, "nonzero")])
    return ordered, art


def exterior_only(g):
    if isinstance(g, MultiPolygon):
        g = max(g.geoms, key=lambda p: p.area)
    return Polygon(g.exterior)


def build_shapes(art):
    navy = art.buffer(NAVY_OFFSET + EPS, quad_segs=QS, join_style="round")
    navy = navy.buffer(NAVY_CLOSE, quad_segs=QS).buffer(-NAVY_CLOSE, quad_segs=QS)   # close notches
    navy = exterior_only(navy)                                                       # fill all holes
    rim = navy.buffer(RIM_OFFSET + EPS, quad_segs=QS, join_style="round")
    rim = exterior_only(rim)
    # smooth: round every concave corner (closing) and confirm convex radius (opening)
    cut = rim.buffer(SMOOTH_R, quad_segs=QS).buffer(-SMOOTH_R, quad_segs=QS)
    cut = cut.buffer(-SMOOTH_R, quad_segs=QS).buffer(SMOOTH_R, quad_segs=QS)
    cut = exterior_only(cut.union(rim))   # never let smoothing eat into the 2.5 mm rim
    cut = cut.buffer(SMOOTH_R, quad_segs=QS).buffer(-SMOOTH_R, quad_segs=QS)
    cut = exterior_only(cut).simplify(0.005, preserve_topology=True)
    return navy, cut


# ================================================================== drawing
def path_from_curves(cv, contours, dx, dy):
    p = cv.beginPath()
    for ct in contours:
        for op in ct:
            pts = [((x + dx) * MM, (y + dy) * MM) for x, y in op[1:]]
            if op[0] == "M":
                p.moveTo(*pts[0])
            elif op[0] == "L":
                p.lineTo(*pts[0])
            else:
                p.curveTo(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1])
        p.close()
    return p


def path_from_geom(cv, g, dx, dy):
    p = cv.beginPath()
    polys = g.geoms if hasattr(g, "geoms") else [g]
    for poly in polys:
        if poly.is_empty or poly.geom_type != "Polygon":
            continue
        for ring in [poly.exterior] + list(poly.interiors):
            cs = list(ring.coords)[:-1]
            p.moveTo((cs[0][0] + dx) * MM, (cs[0][1] + dy) * MM)
            for x, y in cs[1:]:
                p.lineTo((x + dx) * MM, (y + dy) * MM)
            p.close()
    return p


def draw_sticker_print(cv, items, navy, cut, dx, dy, bleed_rim=True):
    # 1) rim: printed white / unprinted vinyl, carried 2 mm past the cut (bleed)
    cv.setFillColor(c(WHITE))
    rim_area = cut.buffer(BLEED, quad_segs=QS) if bleed_rim else cut
    cv.drawPath(path_from_geom(cv, rim_area, dx, dy), stroke=0, fill=1, fillMode=1)
    # 2) navy ground
    cv.setFillColor(c(NAVY))
    cv.drawPath(path_from_geom(cv, navy, dx, dy), stroke=0, fill=1, fillMode=1)
    # 3) artwork, back to front
    for kind, col, payload, rule in items:
        cv.setFillColor(c(col))
        if kind == "curves":
            cv.drawPath(path_from_curves(cv, payload, dx, dy), stroke=0, fill=1,
                        fillMode=0 if rule == "nonzero" else 1)
        else:
            cv.drawPath(path_from_geom(cv, payload, dx, dy), stroke=0, fill=1, fillMode=1)


def draw_cut(cv, cut, dx, dy):
    cv.setStrokeColor(CUT_SPOT)
    cv.setStrokeOverprint(True)
    cv.setLineWidth(0.25)
    cv.setLineJoin(1)
    cv.drawPath(path_from_geom(cv, cut, dx, dy), stroke=1, fill=0)
    cv.setStrokeOverprint(False)


def oc_begin(cv, tag):
    cv._code.append(f"/OC /{tag} BDC")


def oc_end(cv):
    cv._code.append("EMC")


# ================================================================== PDF post-processing (layers, PDF/X-4)
def finalize_pdf(path, title, trim_mm, pdfx=False):
    w = PdfWriter(clone_from=path)
    w.pdf_header = b"%PDF-1.6"

    def ocg(name):
        return w._add_object(DictionaryObject({NameObject("/Type"): NameObject("/OCG"),
                                               NameObject("/Name"): TextStringObject(name)}))
    o_print, o_cut = ocg("Print"), ocg("CutContour")
    for page in w.pages:
        res = page["/Resources"]
        # reportlab always opens a page with an unused "BT /F1 12 Tf ... ET" (Helvetica): strip it
        # so the file carries no font at all (all text is outlines).
        cs = page["/Contents"].get_object()
        data = cs.get_data()
        data = re.sub(rb"BT /F\d+ [\d.]+ Tf [\d.]+ TL ET", b"", data)
        assert b" Tf" not in data and b"BT" not in data, "live text found in page content"
        fresh = DecodedStreamObject()
        fresh.set_data(data)
        page[NameObject("/Contents")] = w._add_object(fresh.flate_encode())
        if "/Font" in res:
            del res["/Font"]
        res[NameObject("/ProcSet")] = ArrayObject([NameObject("/PDF")])
        res[NameObject("/Properties")] = DictionaryObject({NameObject("/Print"): o_print,
                                                           NameObject("/CutContour"): o_cut})
        mb = page.mediabox
        x0, y0, x1, y1 = trim_mm
        page.trimbox = RectangleObject([x0 * MM, y0 * MM, x1 * MM, y1 * MM])
        page.bleedbox = RectangleObject([float(mb.left), float(mb.bottom), float(mb.right), float(mb.top)])
    w._root_object[NameObject("/OCProperties")] = DictionaryObject({
        NameObject("/OCGs"): ArrayObject([o_print, o_cut]),
        NameObject("/D"): DictionaryObject({
            NameObject("/Name"): TextStringObject("Default"),
            NameObject("/Order"): ArrayObject([o_print, o_cut]),
            NameObject("/ON"): ArrayObject([o_print, o_cut]),
            NameObject("/OFF"): ArrayObject([]),
        }),
    })
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    pdfdate = now.strftime("D:%Y%m%d%H%M%S+00'00'")
    iso = now.isoformat().replace("+00:00", "Z")
    info = {"/Title": title, "/Creator": "build_sticker.py (Vector Edge)",
            "/Producer": "reportlab + pypdf", "/CreationDate": pdfdate, "/ModDate": pdfdate}
    if pdfx:
        info["/GTS_PDFXVersion"] = "PDF/X-4"
    w.add_metadata(info)
    w._info[NameObject("/Trapped")] = NameObject("/False")
    if pdfx:
        icc = DecodedStreamObject()
        icc.set_data(open(ICC, "rb").read())
        icc[NameObject("/N")] = NumberObject(4)
        icc_ref = w._add_object(icc)
        oi = DictionaryObject({
            NameObject("/Type"): NameObject("/OutputIntent"),
            NameObject("/S"): NameObject("/GTS_PDFX"),
            NameObject("/OutputConditionIdentifier"): TextStringObject("CGATS TR 001"),
            NameObject("/OutputCondition"): TextStringObject("SWOP (CGATS TR 001) - VerteLith applies media profile"),
            NameObject("/RegistryName"): TextStringObject("http://www.color.org"),
            NameObject("/Info"): TextStringObject("U.S. Web Coated (SWOP) compatible"),
            NameObject("/DestOutputProfile"): icc_ref,
        })
        w._root_object[NameObject("/OutputIntents")] = ArrayObject([w._add_object(oi)])
        docid = uuid.uuid4()
        xmp = f"""<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/">
   <dc:format>application/pdf</dc:format>
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">{title}</rdf:li></rdf:Alt></dc:title>
   <xmp:CreateDate>{iso}</xmp:CreateDate>
   <xmp:ModifyDate>{iso}</xmp:ModifyDate>
   <xmp:MetadataDate>{iso}</xmp:MetadataDate>
   <xmp:CreatorTool>build_sticker.py (Vector Edge)</xmp:CreatorTool>
   <xmpMM:DocumentID>uuid:{docid}</xmpMM:DocumentID>
   <xmpMM:InstanceID>uuid:{uuid.uuid4()}</xmpMM:InstanceID>
   <xmpMM:VersionID>1</xmpMM:VersionID>
   <xmpMM:RenditionClass>default</xmpMM:RenditionClass>
   <pdf:Producer>reportlab + pypdf</pdf:Producer>
   <pdf:Trapped>False</pdf:Trapped>
   <pdfxid:GTS_PDFXVersion>PDF/X-4</pdfxid:GTS_PDFXVersion>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""
        md = DecodedStreamObject()
        md.set_data(xmp.encode("utf-8"))
        md[NameObject("/Type")] = NameObject("/Metadata")
        md[NameObject("/Subtype")] = NameObject("/XML")
        w._root_object[NameObject("/Metadata")] = w._add_object(md)
    with open(path, "wb") as f:
        w.write(f)


# ================================================================== outputs
def write_single(path, items, navy, cut):
    x0, y0, x1, y1 = cut.bounds
    W, H = (x1 - x0) + 2 * BLEED, (y1 - y0) + 2 * BLEED
    dx, dy = BLEED - x0, BLEED - y0
    cv = rl_canvas.Canvas(path, pagesize=(W * MM, H * MM), pageCompression=1)
    oc_begin(cv, "Print")
    cv.saveState()
    draw_sticker_print(cv, items, navy, cut, dx, dy)
    cv.restoreState()
    oc_end(cv)
    oc_begin(cv, "CutContour")
    cv.saveState()
    draw_cut(cv, cut, dx, dy)
    cv.restoreState()
    oc_end(cv)
    cv.showPage()
    cv.save()
    finalize_pdf(path, "Vector Edge DIY sticker - single", (BLEED, BLEED, W - BLEED, H - BLEED), pdfx=True)
    return W, H


def plan_sheet(sw, sh):
    """Grid that fits inside the sheet with the 15 mm safe margin, clear of the reg marks."""
    best = None
    for rot in (False, True):
        w, h = (sh, sw) if rot else (sw, sh)
        # cut area may use the full safe rectangle vertically, but must clear the corner marks
        # horizontally by REG_CLEAR (marks occupy SAFE..SAFE+REG_LEN in from each corner).
        avail_w = SHEET_W - 2 * (SAFE + REG_LEN + REG_CLEAR)
        avail_h = SHEET_H - 2 * SAFE
        cols = int((avail_w + GAP) // (w + GAP))
        rows = int((avail_h + GAP) // (h + GAP))
        # alternative: clear marks vertically instead
        avail_w2 = SHEET_W - 2 * SAFE
        avail_h2 = SHEET_H - 2 * (SAFE + REG_LEN + REG_CLEAR)
        cols2 = int((avail_w2 + GAP) // (w + GAP))
        rows2 = int((avail_h2 + GAP) // (h + GAP))
        for cc, rr in ((cols, rows), (cols2, rows2)):
            if cc * rr > 0 and (best is None or cc * rr > best[0]):
                best = (cc * rr, cc, rr, rot)
    return best


def sticker_ok_vs_marks(cut_shapes, marks):
    m = unary_union(marks)
    return min(s.distance(m) for s in cut_shapes)


def write_sheet(path, items, navy, cut):
    sx0, sy0, sx1, sy1 = cut.bounds
    sw, sh = sx1 - sx0, sy1 - sy0
    n, cols, rows, rot = plan_sheet(sw, sh)
    assert not rot, "layout expects unrotated stickers"
    block_w = cols * sw + (cols - 1) * GAP
    block_h = rows * sh + (rows - 1) * GAP
    bx = (SHEET_W - block_w) / 2
    by = (SHEET_H - block_h) / 2
    offsets = [(bx + ci * (sw + GAP) - sx0, by + ri * (sh + GAP) - sy0) for ri in range(rows) for ci in range(cols)]
    cuts = [affinity.translate(cut, dx, dy) for dx, dy in offsets]

    # Graphtec ARMS registration marks, Type 2: filled square at the origin (front-left / bottom-left),
    # L-shaped corner marks at the other three corners. Outer corners sit on the 15 mm safe margin.
    L, t = REG_LEN, REG_W
    xL, xR, yB, yT = SAFE, SHEET_W - SAFE, SAFE, SHEET_H - SAFE
    marks = [box(xL, yB, xL + REG_SQ, yB + REG_SQ)]
    marks.append(unary_union([box(xR - L, yB, xR, yB + t), box(xR - t, yB, xR, yB + L)]))   # bottom-right
    marks.append(unary_union([box(xL, yT - t, xL + L, yT), box(xL, yT - L, xL + t, yT)]))   # top-left
    marks.append(unary_union([box(xR - L, yT - t, xR, yT), box(xR - t, yT - L, xR, yT)]))   # top-right
    clear_cut = sticker_ok_vs_marks(cuts, marks)

    # paper-cutter guide lines: short ticks in the margins on every grid line (gutter centres + block edges)
    xs = [bx - GAP / 2] + [bx + ci * (sw + GAP) + sw + GAP / 2 for ci in range(cols)]
    ys = [by - GAP / 2] + [by + ri * (sh + GAP) + sh + GAP / 2 for ri in range(rows)]
    ticks = []
    tick_len = 6.0
    for x in xs:
        ticks.append(((x, by - GAP / 2 - 1.5 - tick_len), (x, by - GAP / 2 - 1.5)))
        ticks.append(((x, by + block_h + GAP / 2 + 1.5), (x, by + block_h + GAP / 2 + 1.5 + tick_len)))
    for y in ys:
        ticks.append(((bx - GAP / 2 - 1.5 - tick_len, y), (bx - GAP / 2 - 1.5, y)))
        ticks.append(((bx + block_w + GAP / 2 + 1.5, y), (bx + block_w + GAP / 2 + 1.5 + tick_len, y)))
    tick_geoms = [LineString(a).buffer(0.0) if False else LineString([p, q]) for p, q in ticks]
    clear_ticks = min(tg.distance(unary_union(marks)) for tg in tick_geoms)
    tick_vs_cut = min(tg.distance(unary_union(cuts)) for tg in tick_geoms)

    # sheet label (outlined), bottom margin, centred
    label = f"VE-DIY-STK · sheet 01 · qty {n}"
    l_ct = shape_text(FONT_URL, label, 3.2)
    pts = [p for ct in l_ct for p in flatten(ct, 4)]
    lx0, lx1 = min(p[0] for p in pts), max(p[0] for p in pts)
    ly0 = min(p[1] for p in pts)
    l_ct = xform_contours(l_ct, 1, 1, SHEET_W / 2 - (lx0 + lx1) / 2, 5.0 - ly0)
    label_geom = contours_geom(l_ct)
    clear_label = min(label_geom.distance(unary_union(marks)), label_geom.distance(unary_union(cuts)))

    cv = rl_canvas.Canvas(path, pagesize=(SHEET_W * MM, SHEET_H * MM), pageCompression=1)
    oc_begin(cv, "Print")
    cv.saveState()
    for dx, dy in offsets:
        draw_sticker_print(cv, items, navy, cut, dx, dy, bleed_rim=True)
    cv.setFillColor(c(REG))
    for m in marks:
        cv.drawPath(path_from_geom(cv, m, 0, 0), stroke=0, fill=1, fillMode=1)
    cv.setStrokeColor(c(REG))
    cv.setLineWidth(0.25)
    for (x0, y0), (x1, y1) in ticks:
        cv.line(x0 * MM, y0 * MM, x1 * MM, y1 * MM)
    cv.setFillColor(c(REG))
    cv.drawPath(path_from_curves(cv, l_ct, 0, 0), stroke=0, fill=1, fillMode=0)
    cv.restoreState()
    oc_end(cv)
    oc_begin(cv, "CutContour")
    cv.saveState()
    for cg in cuts:
        draw_cut(cv, cg, 0, 0)
    cv.restoreState()
    oc_end(cv)
    cv.showPage()
    cv.save()
    finalize_pdf(path, "Vector Edge DIY sticker - sheet 01", (0, 0, SHEET_W, SHEET_H), pdfx=True)
    return dict(n=n, cols=cols, rows=rows, cuts=cuts, clear_cut=clear_cut, clear_ticks=clear_ticks,
                tick_vs_cut=tick_vs_cut, clear_label=clear_label, block=(bx, by, block_w, block_h),
                mark_span=(xR - xL, yT - yB))


def write_preview(png_path, items, navy, cut, tmp_pdf):
    x0, y0, x1, y1 = cut.bounds
    pad = 8.0
    W, H = (x1 - x0) + 2 * pad, (y1 - y0) + 2 * pad
    dx, dy = pad - x0, pad - y0
    cv = rl_canvas.Canvas(tmp_pdf, pagesize=(W * MM, H * MM))
    cv.setFillColor(c((0, 0, 0, 50)))       # mid-grey backdrop (preview only)
    cv.rect(0, 0, W * MM, H * MM, stroke=0, fill=1)
    draw_sticker_print(cv, items, navy, cut, dx, dy, bleed_rim=False)
    draw_cut(cv, cut, dx, dy)
    cv.showPage()
    cv.save()
    base = png_path[:-4]
    subprocess.run(["pdftoppm", "-png", "-singlefile", "-scale-to-x", "2000", "-scale-to-y", "-1",
                    "-aa", "yes", "-aaVector", "yes", tmp_pdf, base], check=True)
    os.remove(tmp_pdf)


# ================================================================== checks
def min_radius(poly, step=0.1, span=0.5):
    """Smallest turning radius along the ring, from 3 points `span` mm apart on a resampled path."""
    ring = LineString(poly.exterior.coords)
    Ltot = ring.length
    n = int(Ltot / step)
    pts = [ring.interpolate(i * Ltot / n) for i in range(n)]
    k = max(1, int(span / (Ltot / n)))
    best = float("inf")
    for i in range(n):
        a, b, cc = pts[i - k], pts[i], pts[(i + k) % n]
        ab, bc, ca = a.distance(b), b.distance(cc), cc.distance(a)
        area2 = abs((b.x - a.x) * (cc.y - a.y) - (cc.x - a.x) * (b.y - a.y))
        if area2 < 1e-12:
            continue
        best = min(best, ab * bc * ca / (2 * area2))
    return best


def morph_radius_check(poly, r):
    o = poly.buffer(-r, quad_segs=QS).buffer(r, quad_segs=QS)   # loses convex corners tighter than r
    cl = poly.buffer(r, quad_segs=QS).buffer(-r, quad_segs=QS)  # fills concave corners tighter than r
    return poly.symmetric_difference(o).area, poly.symmetric_difference(cl).area


def inspect_pdf_colours(path):
    """Walk every content stream + resource: return the set of colour spaces / operators used."""
    import re
    rd = PdfReader(path)
    found_ops, spaces, problems = set(), set(), []
    for page in rd.pages:
        data = page.get_contents().get_data().decode("latin-1")
        toks = re.findall(r"(?<![\w/])(rg|RG|g|G|k|K|cs|CS|sc|SC|scn|SCN)(?![\w])", data)
        found_ops.update(toks)
        res = page["/Resources"]
        if "/ColorSpace" in res:
            for name, cs in res["/ColorSpace"].get_object().items():
                cs = cs.get_object()
                if isinstance(cs, list) or hasattr(cs, "__getitem__") and not isinstance(cs, str):
                    fam = str(cs[0])
                    if fam == "/Separation":
                        spaces.add(f"Separation {cs[1]} (alt {cs[2]})")
                    else:
                        spaces.add(fam)
                else:
                    spaces.add(str(cs))
        if "/XObject" in res:
            problems.append("XObjects present")
    for bad in ("rg", "RG", "g", "G"):
        if bad in found_ops:
            problems.append(f"DeviceRGB/Gray operator '{bad}' used")
    raw = open(path, "rb").read()
    if b"/DeviceRGB" in raw or b"/DeviceGray" in raw or b"/CalRGB" in raw:
        problems.append("RGB/Gray colour space object present")
    return found_ops, spaces, problems


def pdf_layers(path):
    rd = PdfReader(path)
    oc = rd.trailer["/Root"]["/OCProperties"]
    return [str(o.get_object()["/Name"]) for o in oc["/OCGs"]]


# ================================================================== main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--logo", help="path to ve-logo-horizontal-reverse.svg (or primary logo PDF)")
    ap.add_argument("--out", default=HERE)
    args = ap.parse_args()

    logo_path = find_logo(args.logo)
    logo = None
    if logo_path and logo_path.lower().endswith(".svg"):
        logo = load_logo_svg(logo_path)
        print(f"logo: {logo_path}")
    elif logo_path:
        sys.exit(f"Found {logo_path} but only the SVG lockup is wired in; export/supply "
                 "ve-logo-horizontal-reverse.svg (PDF import would risk RGB objects in a CMYK file).")
    else:
        print("!" * 78)
        print("!! LOGO NOT FOUND: ve-logo-horizontal-reverse.svg is missing. The rear door is left")
        print("!! clean. These files are a layout/cut proof only - NOT approved for press until")
        print("!! the build is re-run with --logo /path/to/ve-logo-horizontal-reverse.svg")
        print("!" * 78)

    # solve GRAPHICS size so the finished cut is exactly 100 mm wide
    G = 30.0
    for _ in range(6):
        items, art = build_layout(G, logo)
        navy, cut = build_shapes(art)
        w = cut.bounds[2] - cut.bounds[0]
        if abs(w - FINISHED_W) < 0.005:
            break
        art_w = art.bounds[2] - art.bounds[0]
        G *= (FINISHED_W - (w - art_w)) / art_w

    out = args.out
    os.makedirs(out, exist_ok=True)
    single = os.path.join(out, "vectoredge-diy-sticker_single.pdf")
    sheet = os.path.join(out, "vectoredge-diy-sticker_sheet.pdf")
    png = os.path.join(out, "preview.png")
    SW, SH = write_single(single, items, navy, cut)
    sh = write_sheet(sheet, items, navy, cut)
    write_preview(png, items, navy, cut, os.path.join(out, "_preview_tmp.pdf"))

    # ---------------------------------------------------------------- report
    cw, chh = cut.bounds[2] - cut.bounds[0], cut.bounds[3] - cut.bounds[1]
    print(f"\nGRAPHICS em = {G:.3f} mm | finished sticker (cut) = {cw:.2f} x {chh:.2f} mm "
          f"| single artboard incl. 2 mm bleed = {SW:.2f} x {SH:.2f} mm")
    print(f"navy CMYK used = C{NAVY[0]} M{NAVY[1]} Y{NAVY[2]} K{NAVY[3]}")
    print("\nCHECKS")
    ok = True

    def chk(name, cond, detail):
        nonlocal ok
        ok &= bool(cond)
        print(f"  [{'PASS' if cond else 'FAIL'}] {name}: {detail}")

    chk("cut path single polygon, no holes", cut.geom_type == "Polygon" and len(cut.interiors) == 0,
        f"geom_type={cut.geom_type}, interiors={len(cut.interiors)}, nodes={len(cut.exterior.coords) - 1}")
    nav_d = art.distance(navy.exterior)
    chk("navy >= 6 mm from artwork everywhere", nav_d >= NAVY_OFFSET, f"min distance = {nav_d:.4f} mm")
    rim_d = navy.distance(cut.exterior)
    chk("white rim >= 2.5 mm", rim_d >= RIM_OFFSET and cut.contains(navy), f"min rim width = {rim_d:.4f} mm")
    mr = min_radius(cut)
    a_open, a_close = morph_radius_check(cut, MIN_RADIUS)
    chk("no cut node tighter than 1 mm radius", mr >= MIN_RADIUS and a_open < 0.01 and a_close < 0.01,
        f"min sampled radius = {mr:.2f} mm; 1 mm opening/closing change = {a_open:.4f} / {a_close:.4f} mm^2")
    chk("finished width 100 mm", abs(cw - FINISHED_W) < 0.05, f"{cw:.3f} mm")
    for p in (single, sheet):
        fonts = subprocess.run(["pdffonts", p], capture_output=True, text=True).stdout.strip().splitlines()
        chk(f"no live fonts ({os.path.basename(p)})", len(fonts) <= 2, f"pdffonts rows = {len(fonts) - 2}")
        ops, spaces, problems = inspect_pdf_colours(p)
        chk(f"CMYK + CutContour only ({os.path.basename(p)})", not problems and spaces <= {
            "Separation /CutContour (alt /DeviceCMYK)"},
            f"colour ops={sorted(ops)}, colour spaces={sorted(spaces) or 'DeviceCMYK only'} {problems or ''}")
        chk(f"layers ({os.path.basename(p)})", pdf_layers(p) == ["Print", "CutContour"], f"{pdf_layers(p)}")
    rs = PdfReader(sheet).pages[0].mediabox
    wpt, hpt = float(rs.width), float(rs.height)
    chk("sheet <= 11.5 x 7.5 in", wpt <= 11.5 * 72 + 0.01 and hpt <= 7.5 * 72 + 0.01,
        f"{wpt / 72:.3f} x {hpt / 72:.3f} in ({wpt / MM:.1f} x {hpt / MM:.1f} mm)")
    gaps = [a.distance(b) for i, a in enumerate(sh['cuts']) for b in sh['cuts'][i + 1:]]
    chk("sheet layout", sh["n"] > 0 and min(gaps) >= GAP - 0.01,
        f"{sh['n']} stickers per sheet ({sh['cols']} x {sh['rows']}), min gap between cut lines "
        f"{min(gaps):.2f} mm; cut->reg mark clearance {sh['clear_cut']:.1f} mm; crop ticks->marks "
        f"{sh['clear_ticks']:.1f} mm; crop ticks->cut {sh['tick_vs_cut']:.1f} mm; label clearance "
        f"{sh['clear_label']:.1f} mm")
    print(f"  ARMS mark spacing (outer corners): X {sh['mark_span'][0]:.1f} mm, Y {sh['mark_span'][1]:.1f} mm; "
          f"mark length {REG_LEN} mm, line {REG_W} mm")
    print(f"  logo: {'placed from ' + logo_path if logo else 'MISSING - door left clean, not press-approved'}")
    print("\nALL CHECKS PASSED" if ok else "\nSOME CHECKS FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
