"""Builds job.json for Phoenix Travel (Ford Transit Custom, medium drawn van) incl. the ORIGINAL design:
RISING PHOENIX - three flame feathers (red / orange / yellow) rising up the rear quarter like a wing,
logo on the sliding door, big phone above the rear arch, website under the slider handle.
Van numbers (cm, generic medium van in proof.html): L 497, H 197, front axle 86, rear axle 379, arch R 42
(arch tops 75), B-pillar 232, slider back edge 332, belt 110, slider handle 242-256 x 95-99,
side rail line h 107 (x 332-483), roof line h 191, rear light x 492-497 h 60-115.
Back doors: width 198, centre gap 99, handle x 103-115 h 88-92, lights x <9 / >189, door panel h 54-187."""
import json, math

def feather(root, tip, w, sag, n=40):
    """tapered feather root->tip; sag (cm) pulls the middle down so the tip flicks up. Returns points."""
    (x0, y0), (x1, y1) = root, tip
    dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy); nx, ny = -dy / L, dx / L   # normal (up-ish)
    if ny < 0: nx, ny = -nx, -ny
    top, bot = [], []
    for i in range(n + 1):
        t = i / n
        bx, by = x0 + dx * t - nx * sag * 4 * t * (1 - t), y0 + dy * t - ny * sag * 4 * t * (1 - t)
        half = w / 2 * (math.sin(math.pi * min(1, t * 1.15)) ** .8) * (1 - .25 * t) + .6 * (1 - t)
        top.append((bx + nx * half, by + ny * half)); bot.append((bx - nx * half, by - ny * half))
    return top + bot[::-1]

def d(pts):
    return 'M' + ' L'.join('%.1f %.1f' % p for p in pts) + ' Z'

# side (passenger view, x from the front bumper, h up from the ground)
SIDE_F = [((358, 116), (489, 150), 15, 9, 'extra'),    # red, lowest - stays above the side rail (h 107)
          ((350, 132), (480, 177), 17, 10, 'main'),    # orange
          ((343, 149), (446, 187), 15, 8, 'accent')]   # yellow, top - tip under the roof line
# back doors: small wing on the right door, under the phone
REAR_F = [((126, 64), (183, 74), 9, 3, 'extra'),
          ((125, 79), (181, 97), 10, 3.5, 'main'),
          ((124, 96), (170, 120), 9, 3, 'accent')]

def pip(p, poly):
    x, y = p; c = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c

def seg_dist(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b; vx, vy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy or 1)))
    return math.hypot(px - ax - t * vx, py - ay - t * vy)

def gap(P, Q):
    if any(pip(p, Q) for p in P) or any(pip(q, P) for q in Q): return 0
    return min(seg_dist(p, a, b) for p in P for a, b in zip(Q, Q[1:] + Q[:1]))

def check(name, fs, keepout):
    polys = [feather(*f[:4]) for f in fs]
    for i in range(len(polys) - 1):
        g = gap(polys[i], polys[i + 1]); print('%s gap %d-%d: %.1f cm %s' % (name, i, i + 1, g, 'OK' if g >= 2.5 else 'TOO SMALL'))
    for i, P in enumerate(polys):
        xs, ys = [p[0] for p in P], [p[1] for p in P]
        # short side of the piece ~ its max width; length is fine for cut vinyl as long as width <= 58
        print('%s feather %d: x %.0f-%.0f h %.0f-%.0f, width %.0f cm' % (name, i, min(xs), max(xs), min(ys), max(ys), fs[i][2]))
        for kname, (x0, h0, x1, h1) in keepout.items():
            hit = [p for p in P if x0 <= p[0] <= x1 and h0 <= p[1] <= h1]
            if hit: print('   !! crosses', kname)
    return polys

side_polys = check('side', SIDE_F, {'side rail': (332, 104, 486, 110), 'rear arch': (330, 0, 428, 80),
                                    'rear light': (490, 55, 497, 118), 'roof': (0, 189, 497, 197), 'slider gap': (329, 0, 335, 197)})
rear_polys = check('rear', REAR_F, {'handle': (100, 85, 118, 95), 'centre gap': (96, 0, 102, 197), 'lights': (186, 0, 198, 197), 'door bottom': (0, 0, 198, 57)})

side = [{'type': 'path', 'd': d(P), 'fill': f[4]} for P, f in zip(side_polys, SIDE_F)]
side += [{'type': 'logo', 'box': [240, 114, 326, 188]},                                         # sliding door
         {'type': 'text', 'box': [344, 84, 486, 102], 'text': '01427 803 215', 'bold': True, 'fill': 'dark'},   # above the rear arch
         {'type': 'text', 'box': [240, 64, 326, 88], 'text': 'www.phoenix.taxi', 'fill': 'dark'}]   # slider, under the handle
rear = [{'type': 'path', 'd': d(P), 'fill': f[4]} for P, f in zip(rear_polys, REAR_F)]
rear += [{'type': 'logo', 'box': [20, 104, 92, 180]},
         {'type': 'text', 'box': [106, 146, 182, 166], 'text': '01427 803 215', 'bold': True, 'fill': 'dark'},
         {'type': 'text', 'box': [108, 130, 180, 142], 'text': 'www.phoenix.taxi', 'fill': 'dark'}]

job = {
    "date": "23 Nov 2026",
    "customer": "PHOENIX TRAVEL",
    "business": {"name": "PHOENIX TRAVEL", "sub": "", "trade": "Taxi & Private Hire",
                 "phone": "01427 803 215", "web": "www.phoenix.taxi", "email": "-", "social": "-",
                 "services": ["Airport Transfers", "Local & Long Distance", "Pre-booked Journeys", "Groups & Events"],
                 "location": ""},
    "colours": {"main": "#EE7A1F", "dark": "#1C1C1C", "accent": "#F6BE1E", "extra": "#E2452A"},
    "font": "Archivo Black",
    "van": {"label": "FORD TRANSIT CUSTOM", "size": "medium", "paint": "#FFFFFF", "slider": "ns", "rearWindows": False, "template": ""},
    "made_up": ["services", "logo (stand-in)"],
    "original": {"name": "RISING PHOENIX (ORIGINAL)", "price": 549, "posted": 329,
                 "line": "Made just for Phoenix Travel: a flame wing rising up the back of the van.",
                 "parts": ["bonnet"], "custom": {"side": side, "rear": rear}},
}
json.dump(job, open('job.json', 'w'), indent=2)
print('written job.json')
