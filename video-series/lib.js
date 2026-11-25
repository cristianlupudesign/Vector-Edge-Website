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

  function toD(cmds) {
    return cmds.map((c) => c[0] + (c.length > 1 ? ' ' + c.slice(1).map((n) => +n.toFixed(2)).join(' ') : '')).join(' ');
  }

  return { poly, rrect, circle, star, toD };
})();
