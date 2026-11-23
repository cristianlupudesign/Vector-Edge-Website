"""Stand-in Phoenix Travel logo (NOT the customer's artwork - swap for their vector when it arrives).
Emblem: a rising phoenix, wings up in 3 feathers each side (red / orange / yellow), dark body,
orange tail flames. Colours never touch (bare gaps) so it can be cut as vinyl."""
import math
OR, YE, RE, DK = '#EE7A1F', '#F6BE1E', '#E2452A', '#1C1C1C'
cx, cy = 300, 215

def blade(root, tip, w, bend):
    """curved tapering feather from root to tip, max width w, bowed by bend (+ = up)"""
    (x0, y0), (x1, y1) = root, tip
    dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy); nx, ny = -dy / L, dx / L
    if nx * (1 if x1 > x0 else -1) > 0: nx, ny = -nx, -ny   # normal pointing "up/out"
    mx, my = x0 + dx * .5 + nx * bend, y0 + dy * .5 + ny * bend
    a = (mx + nx * w * .5, my + ny * w * .5); b = (mx - nx * w * .5, my - ny * w * .5)
    r1 = (x0 + nx * w * .18, y0 + ny * w * .18); r2 = (x0 - nx * w * .18, y0 - ny * w * .18)
    f = lambda p: '%.1f,%.1f' % p
    return 'M%s Q%s %s Q%s %s Z' % (f(r1), f(a), f((x1, y1)), f(b), f(r2))

def side(s):
    out = []
    # (root, tip, width, bend, colour) ; s = +1 right wing, -1 left wing
    for root, tip, w, bend, col in [((34, 30), (215, -40), 50, -26, RE),
                                     ((34, -18), (185, -140), 44, -24, OR),
                                     ((30, -62), (118, -190), 36, -18, YE)]:
        r = (cx + s * root[0], cy + root[1]); t = (cx + s * tip[0], cy + tip[1])
        out.append('<path d="%s" fill="%s"/>' % (blade(r, t, w, bend), col))
    return out

body = ('<path d="M{0},{1} C{2},{1} {3},{4} {5},{6} L{7},{8} L{5},{9} C{10},{11} {12},{13} {14},{15} '
        'C{16},{17} {18},{19} {20},{21} C{22},{17} {23},{19} {24},{15} C{25},{13} {26},{11} {27},{28} C{29},{4} {30},{1} {0},{1} Z" fill="{31}"/>').format(
    cx, cy - 200, cx + 16, cx + 24, cy - 186, cx + 22, cy - 172, cx + 42, cy - 164, cy - 158,
    cx + 40, cy - 110, cx + 40, cy - 40, cx + 16, cy + 30, cx + 10, cy + 70, cx + 4, cy + 100, cx, cy + 110,
    cx - 4, cx - 10, cx - 16, cx - 40, cx - 40, cx - 20, cy - 175, cx - 14, cx - 8, DK)
tail = []
for s in (-1, 1):
    tail.append('<path d="M%d,%d C%d,%d %d,%d %d,%d C%d,%d %d,%d %d,%d Z" fill="%s"/>' % (
        cx + s * 16, cy + 122, cx + s * 30, cy + 150, cx + s * 50, cy + 170, cx + s * 78, cy + 176,
        cx + s * 44, cy + 186, cx + s * 18, cy + 170, cx + s * 13, cy + 138, OR))
tail.append('<path d="M%d,%d C%d,%d %d,%d %d,%d C%d,%d %d,%d %d,%d Z" fill="%s"/>' % (
    cx - 9, cy + 128, cx - 6, cy + 150, cx - 4, cy + 172, cx, cy + 196, cx + 4, cy + 172, cx + 6, cy + 150, cx + 9, cy + 128, RE))
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">']
svg += side(-1) + side(1) + [body] + tail
svg.append('<text x="300" y="512" text-anchor="middle" font-family="Archivo Black" font-size="104" fill="%s" textLength="560" lengthAdjust="spacingAndGlyphs">PHOENIX</text>' % DK)
svg.append('<text x="300" y="586" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="62" fill="%s" textLength="440">TRAVEL</text>' % OR)
svg.append('</svg>')
open('logo-standin.svg', 'w').write('\n'.join(svg))
print('ok')
