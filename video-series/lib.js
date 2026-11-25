/*
  Shape helpers used by episode files.
  Every shape is a list of path commands in a 1000 x 1000 artboard:
    ['M', x, y]  move      ['L', x, y]  line
    ['C', x1, y1, x2, y2, x, y]  cubic curve (shows bezier handles in the video)
    ['Z']  close
  Keeping shapes as commands (not just a "d" string) is what lets the video
  show each anchor point and handle being placed with the pen tool.
*/
window.VE = (function () {
  const K = 0.5523; // circle-to-bezier constant

  function poly(points) {
    const c = [['M', points[0][0], points[0][1]]];
    for (let i = 1; i < points.length; i++) c.push(['L', points[i][0], points[i][1]]);
    c.push(['Z']);
    return c;
  }

  function rrect(x, y, w, h, r) {
    const k = r * K;
    return [
      ['M', x + r, y],
      ['L', x + w - r, y],
      ['C', x + w - r + k, y, x + w, y + r - k, x + w, y + r],
      ['L', x + w, y + h - r],
      ['C', x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h],
      ['L', x + r, y + h],
      ['C', x + r - k, y + h, x, y + h - r + k, x, y + h - r],
      ['L', x, y + r],
      ['C', x, y + r - k, x + r - k, y, x + r, y],
      ['Z'],
    ];
  }

  function circle(cx, cy, r) {
    const k = r * K;
    return [
      ['M', cx, cy - r],
      ['C', cx + k, cy - r, cx + r, cy - k, cx + r, cy],
      ['C', cx + r, cy + k, cx + k, cy + r, cx, cy + r],
      ['C', cx - k, cy + r, cx - r, cy + k, cx - r, cy],
      ['C', cx - r, cy - k, cx - k, cy - r, cx, cy - r],
      ['Z'],
    ];
  }

  function star(cx, cy, n, ro, ri, rot) {
    const pts = [];
    const a0 = rot === undefined ? -Math.PI / 2 : rot;
    for (let i = 0; i < n * 2; i++) {
      const a = a0 + (i * Math.PI) / n, r = i % 2 ? ri : ro;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return poly(pts);
  }

  // Clip a polygon [[x,y],...] to a rectangle [x0,y0,x1,y1] (Sutherland–Hodgman).
  function clipPoly(pts, r) {
    const edges = [
      (p) => p[0] >= r[0], (p) => p[0] <= r[2], (p) => p[1] >= r[1], (p) => p[1] <= r[3],
    ];
    const cut = [
      (a, b) => [r[0], a[1] + ((b[1] - a[1]) * (r[0] - a[0])) / (b[0] - a[0])],
      (a, b) => [r[2], a[1] + ((b[1] - a[1]) * (r[2] - a[0])) / (b[0] - a[0])],
      (a, b) => [a[0] + ((b[0] - a[0]) * (r[1] - a[1])) / (b[1] - a[1]), r[1]],
      (a, b) => [a[0] + ((b[0] - a[0]) * (r[3] - a[1])) / (b[1] - a[1]), r[3]],
    ];
    let out = pts;
    for (let e = 0; e < 4 && out.length; e++) {
      const inp = out; out = [];
      for (let i = 0; i < inp.length; i++) {
        const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
        const ain = edges[e](a), bin = edges[e](b);
        if (bin) { if (!ain) out.push(cut[e](a, b)); out.push(b); } else if (ain) out.push(cut[e](a, b));
      }
    }
    return out;
  }

  // A leaf (two smooth curves) in design units, where x is squashed by `ar` (u = x / ar).
  function leaf(cu, cv, len, wid, angDeg, ar) {
    const a = (angDeg * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
    const P = (along, side) => [cu + (dx * along + px * side) / ar, cv + dy * along + py * side];
    const tip = P(len, 0);
    const c1 = P(len * 0.2, wid), c2 = P(len * 0.75, wid * 0.9), c3 = P(len * 0.75, -wid * 0.9), c4 = P(len * 0.2, -wid);
    return [['M', cu, cv], ['C', ...c1, ...c2, ...tip], ['C', ...c3, ...c4, cu, cv], ['Z']];
  }

  function toD(cmds) {
    return cmds.map((c) => c[0] + (c.length > 1 ? ' ' + c.slice(1).map((n) => +n.toFixed(2)).join(' ') : '')).join(' ');
  }

  return { poly, rrect, circle, star, clipPoly, leaf, toD };
})();
