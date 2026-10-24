#!/usr/bin/env python3
"""Export vehicle PSD mockups into the layers the v5 van designer uses.

One PSD per view, named <vehicle>-<view>.psd (view = side | side2 | rear | front),
or one PSD per vehicle with top-level groups named side / side2 / rear / front.
'side' means the vehicle faces LEFT, 'side2' faces RIGHT. If you only have one
side, pass --mirror and side2 is made by flipping side.

Layers are found by name (case-insensitive, first word match):
  body      REQUIRED  pixels cover every panel vinyl may go on (no glass, tyres,
                      lights, trim). The colour does not matter, only coverage.
  glass     optional  windows; used to measure cab end + beltline
  wheels    optional  tyres/rims; used to measure wheel positions
  shade     optional  shading layer (also: shadow, shadows, multiply)
  hi        optional  highlights / reflections (also: highlights, reflection, screen)
  design    hidden    any mockup placeholder (also: artwork, your design, smart)
Everything else that is visible makes up the vehicle photo itself.

Writes, per view, into --out:
  ve-v5-<vehicle>-<view>.webp        vehicle (design placeholders hidden)
  ve-v5-<vehicle>-<view>-mask.png    bodywork mask (alpha)
  ve-v5-<vehicle>-<view>-shade.webp  if a shade layer exists
  ve-v5-<vehicle>-<view>-hi.webp     if a highlights layer exists
and prints the "photo" block to paste into templates/page.van-designer-v5.liquid.

Usage:
  pip install psd-tools
  python3 psd_to_vd5.py medium-van-side.psd medium-van-rear.psd --vehicle medium-van --mirror --out export/
"""
import argparse
import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageOps
from psd_tools import PSDImage

VIEWS = ('side', 'side2', 'rear', 'front')
ROLES = {
    'body': ('body', 'mask', 'paint'),
    'glass': ('glass', 'windows', 'window'),
    'wheels': ('wheels', 'wheel', 'tyres', 'tires'),
    'shade': ('shade', 'shadow', 'shadows', 'multiply'),
    'hi': ('hi', 'highlights', 'highlight', 'reflection', 'reflections', 'screen'),
    'design': ('design', 'artwork', 'your', 'smart', 'placeholder'),
}


def role_of(name):
    first = re.split(r'[\s_\-.]+', name.strip().lower())[0] if name.strip() else ''
    for role, words in ROLES.items():
        if first in words:
            return role
    return None


def layer_image(layer, size):
    """Composite one layer/group onto a transparent canvas the size of the doc."""
    canvas = Image.new('RGBA', size, (0, 0, 0, 0))
    was = layer.visible
    layer.visible = True
    img = layer.composite()
    layer.visible = was
    if img is None:
        return canvas
    canvas.paste(img.convert('RGBA'), (layer.left, layer.top))
    return canvas


def view_parts(container, size):
    """Split a PSD (or a view group) into base composite + role layers."""
    parts = {}
    hidden = []
    for layer in container:
        r = role_of(layer.name)
        if r is None:
            continue
        if r != 'design':
            parts[r] = layer_image(layer, size)
        if layer.visible:
            hidden.append(layer)
            layer.visible = False
    try:
        base = container.composite(force=True)   # PSDImage: ignore the stale embedded preview
    except TypeError:
        base = container.composite()
    for layer in hidden:
        layer.visible = True
    if base is None:
        base = Image.new('RGBA', size, (255, 255, 255, 0))
    canvas = Image.new('RGBA', size, (0, 0, 0, 0))
    off = (getattr(container, 'left', 0), getattr(container, 'top', 0))
    canvas.paste(base.convert('RGBA'), off)
    parts['base'] = canvas
    return parts


def alpha_box(img):
    return img.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()


def runs(flags):
    out, start = [], None
    for i, f in enumerate(flags + [False]):
        if f and start is None:
            start = i
        if not f and start is not None:
            out.append((start, i - 1))
            start = None
    return out


def measure(parts, frame, view):
    """Anchors in the body frame, u from the FRONT. Only what the layers allow.
    Column profiles keep this tolerant of untidy layers: tyres are the only
    TALL columns in a wheels layer, windows are glass that starts high up."""
    fx0, fy0, fx1, fy1 = frame
    fw, fh = float(fx1 - fx0), float(fy1 - fy0)
    mirror = view == 'side2'
    side = view in ('side', 'side2')

    def U(x):
        u = (x - fx0) / fw
        return 1 - u if mirror else u

    def V(y):
        return (y - fy0) / fh

    def alpha(img):
        return np.asarray(img.getchannel('A'))[fy0:fy1, fx0:fx1] > 24

    a = {}
    g = parts.get('glass')
    if g is not None and alpha_box(g):
        A = alpha(g)
        if side:
            panes = []
            for s, e in runs(list(A.any(axis=0))):
                rows = np.where(A[:, s:e + 1].any(axis=1))[0]
                u0, u1 = sorted((U(fx0 + s), U(fx0 + e + 1)))
                v0, v1 = rows[0] / fh, (rows[-1] + 1) / fh
                if v0 < 0.42 and u1 - u0 > 0.03 and v1 - v0 > 0.08:
                    panes.append((u0, u1, v0, v1))
            front = [p for p in panes if (p[0] + p[1]) / 2 < 0.55]
            if front:
                a['cab'] = round(max(p[1] for p in front), 4)
                a['belt'] = round(max(p[3] for p in front), 4)
        else:
            rows = np.where(A.any(axis=1))[0]
            if len(rows) and rows[0] / fh < 0.4:
                # the windscreen / rear window is the topmost run of glass rows
                top = runs(list(A.any(axis=1)))[0]
                a['gb'] = round((top[1] + 1) / fh, 4)
    w = parts.get('wheels')
    if side and w is not None and alpha_box(w):
        A = alpha(w)
        tall = list(A.sum(axis=0) > fh * 0.15)
        tyres = [(s, e) for s, e in runs(tall) if e - s > fw * 0.04]
        if tyres:
            centres = sorted(U(fx0 + (s + e) / 2.0) for s, e in tyres)
            a['fw'] = round(centres[0], 4)
            a['rw'] = round(centres[-1], 4)
            tops = [np.where(A[:, s:e + 1].any(axis=1))[0][0] for s, e in tyres]
            a['wt'] = round(min(tops) / fh, 4)
    return a


def export_view(parts, vehicle, view, out, max_w):
    size = parts['base'].size
    if 'body' not in parts or not alpha_box(parts['body']):
        sys.exit('%s %s: no "body" layer found — name the bodywork layer "body".' % (vehicle, view))
    scale = min(1.0, max_w / float(size[0]))
    W, H = int(round(size[0] * scale)), int(round(size[1] * scale))

    def rs(img):
        return img.resize((W, H), Image.LANCZOS) if scale < 1 else img

    stem = 've-v5-%s-%s' % (vehicle, view)
    base = Image.new('RGBA', size, (255, 255, 255, 0))
    base.alpha_composite(parts['base'])
    rs(base).save(os.path.join(out, stem + '.webp'), quality=88)
    m = parts['body'].getchannel('A')
    mask = Image.merge('RGBA', (Image.new('L', size, 255),) * 3 + (m,))
    rs(mask).save(os.path.join(out, stem + '-mask.png'), optimize=True)
    entry = {'img': stem + '.webp', 'mask': stem + '-mask.png', 'w': W, 'h': H}
    if 'shade' in parts:
        sh = Image.new('RGBA', size, (255, 255, 255, 255))
        sh.alpha_composite(parts['shade'])
        rs(sh.convert('RGB')).save(os.path.join(out, stem + '-shade.webp'), quality=85)
        entry['shade'] = stem + '-shade.webp'
    if 'hi' in parts:
        hi = Image.new('RGBA', size, (0, 0, 0, 255))
        hi.alpha_composite(parts['hi'])
        rs(hi.convert('RGB')).save(os.path.join(out, stem + '-hi.webp'), quality=85)
        entry['hi'] = stem + '-hi.webp'
    box = alpha_box(parts['body'])
    entry['frame'] = [round(box[0] / size[0], 4), round(box[1] / size[1], 4),
                      round((box[2] - box[0]) / size[0], 4), round((box[3] - box[1]) / size[1], 4)]
    anchors = measure(parts, box, view)
    if anchors:
        entry['anchors'] = anchors
    return entry


def mirror_parts(parts):
    return {k: ImageOps.mirror(v) for k, v in parts.items()}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('psd', nargs='+')
    ap.add_argument('--vehicle', required=True, help='vehicle key, e.g. medium-van')
    ap.add_argument('--out', default='export')
    ap.add_argument('--mirror', action='store_true', help='make side2 by flipping side')
    ap.add_argument('--max-width', type=int, default=2400)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    views = {}
    for path in args.psd:
        psd = PSDImage.open(path)
        size = psd.size
        groups = {l.name.strip().lower(): l for l in psd if l.is_group() and l.name.strip().lower() in VIEWS}
        if groups:
            for name, grp in groups.items():
                views[name] = view_parts(grp, size)
        else:
            m = re.search(r'(side2|side|rear|front)', os.path.basename(path).lower())
            if not m:
                sys.exit('%s: name the file <vehicle>-<view>.psd or use side/side2/rear/front groups' % path)
            views[m.group(1)] = view_parts(psd, size)
    if args.mirror and 'side' in views and 'side2' not in views:
        views['side2'] = mirror_parts(views['side'])

    manifest = {}
    for view in VIEWS:
        if view in views:
            manifest[view] = export_view(views[view], args.vehicle, view, args.out, args.max_width)
    with open(os.path.join(args.out, 've-v5-%s.json' % args.vehicle), 'w') as fh:
        json.dump({'views': manifest}, fh, indent=2)

    # Liquid block for the template's vehicle entry
    def liq(v):
        return '{{ \'%s\' | asset_url | json }}' % v
    lines = []
    for view, e in manifest.items():
        bits = ['"%s": %s' % (k, liq(e[k])) for k in ('img', 'mask', 'shade', 'hi') if k in e]
        bits += ['"w": %d' % e['w'], '"h": %d' % e['h'], '"frame": %s' % json.dumps(e['frame'])]
        if 'anchors' in e:
            bits.append('"anchors": %s' % json.dumps(e['anchors']))
        lines.append('      "%s": {%s}' % (view, ', '.join(bits)))
    print('Exported %d view(s) to %s/' % (len(manifest), args.out))
    print('Upload the files to the theme\'s assets, then add to the "%s" vehicle entry:\n' % args.vehicle)
    print('    "photo": {"views": {\n' + ',\n'.join(lines) + '\n    }}')


if __name__ == '__main__':
    main()
