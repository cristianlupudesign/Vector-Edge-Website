/*
  "From Idea to Van" engine v3 — real Vector Edge van templates.
  Brief → pencil sketch on the template → AI concept → vector (pen + type) → paint + vinyl →
  zoom compare → on the van (both sides + rear) → 3D hand-off slate → outro.

  Van templates are the ve-veh-*.svg outline sheets from the Vector Edge theme. They are loaded
  with the Van Designer v5 engine (assets/ve-vd5-engine.js), which measures each view and builds
  the bodywork mask, so vinyl never lands on glass, lights or tyres. The sheet is multiplied back
  over the vinyl so handles and panel lines sit on top, exactly like the live designer.
*/
(async function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1080, H = 1920;
  const EP = window.EPISODE;
  const C = { yellow: '#E5E521', blue: '#0057FF', charcoal: '#2B2B2B', ink: '#2B2B2B', bg: '#1A1A1A', grey: '#9C9C94', line: '#3A3A3A', graphite: '#4A4A4E' };
  const DISPLAY = "'Bebas Neue', 'Arial Narrow', Impact, sans-serif";
  const BODY = "'Barlow Condensed', 'Arial Narrow', sans-serif";

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eout = (t) => 1 - Math.pow(1 - t, 3);
  const eback = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) { if (attrs[k] == null) continue; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }
  const set = (e, attrs) => { for (const k in attrs) e.setAttribute(k, attrs[k]); };
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgbHex = (r) => '#' + r.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, i) => lerp(v, B[i], t))); };
  function wrap(text, max) {
    const words = text.split(' '), lines = [];
    let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    if (cur) lines.push(cur);
    return lines;
  }
  const NSS = { 'vector-effect': 'non-scaling-stroke' };

  // ---------- load the van template + logo ----------
  const [sheetTxt, logoTxt] = await Promise.all([
    fetch(EP.van.sheet).then((r) => r.text()),
    fetch('assets/brand/yellow/logo-inverse.svg').then((r) => r.text()),
  ]);
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:0;top:0;width:1368px;height:1368px;opacity:0;pointer-events:none;z-index:-1;overflow:hidden';
  document.body.appendChild(host);
  const SHEET = window.VED5.fromOutline(host, sheetTxt);
  const BASE = '#' + SHEET.maskId.replace(/-mask$/, '-base');
  const MASK = `url(#${SHEET.maskId})`;
  const V = SHEET.views;
  const SIDE = V.side, VB = SHEET.vb;
  const PAINT = EP.van.paint.hex;

  // Design (u, v) → sheet coordinates for a view.
  function conv(s, view) {
    const F = view.F, P = (u, v) => view.pt(u, v);
    if (s.uv) return s.uv.map((c) => { if (c[0] === 'Z') return ['Z']; const o = [c[0]]; for (let i = 1; i < c.length; i += 2) { const p = P(c[i], c[i + 1]); o.push(p[0], p[1]); } return o; });
    if (s.rrect) { const [u0, v0, u1, v1, r] = s.rrect; const a = P(u0, v0), b = P(u1, v1); return VE.rrect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.min(r * F.h, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2)); }
    if (s.circle) { const [u, v, r] = s.circle; const p = P(u, v); return VE.circle(p[0], p[1], r * F.h); }
    if (s.parts) return s.parts.flatMap((p) => conv(p, view));
    return [];
  }
  function convText(x, view) {
    const p = view.pt(x.u, x.v);
    return { x: p[0], y: p[1], size: x.size * view.F.h, spacing: (x.spacing || 0) * view.F.h };
  }

  // ---------- timeline ----------
  const ORDER = ['intro', 'brief', 'sketch', 'concept', 'vector', 'colour', 'zoom', 'van', 'handoff', 'outro'];
  const T = {};
  let acc = 0;
  for (const k of ORDER) { T[k] = { start: acc, end: acc + EP.durations[k], dur: EP.durations[k] }; acc += EP.durations[k]; }
  const TOTAL = acc;
  const lt = (t, k) => t - T[k].start;
  const within = (t, k) => t >= T[k].start && t < T[k].end;
  const stageAt = (t) => ORDER.find((k) => within(t, k)) || 'outro';

  // ---------- layout: the side view fills the paper ----------
  const PAPER = { x: 40, y: 560, w: 1000, h: 540 };
  const CR = SIDE.crop;
  const S = 920 / CR.w, PC = { x: 540, y: 830 }, DEF = { x: CR.x + CR.w / 2, y: CR.y + CR.h / 2, k: 1 };
  const camT = (c) => `translate(${PC.x - c.x * S * c.k} ${PC.y - c.y * S * c.k}) scale(${S * c.k})`;
  const PA = { x: DEF.x - (PC.x - PAPER.x) / S - 10, y: DEF.y - (PC.y - PAPER.y) / S - 10, w: PAPER.w / S + 20, h: PAPER.h / S + 20 };

  // ---------- stage + defs ----------
  const stage = document.getElementById('stage');
  const svg = el('svg', { id: 'main', width: W, height: H, viewBox: `0 0 ${W} ${H}` }, stage);
  const defs = el('defs', {}, svg);
  const dots = el('pattern', { id: 'dots', width: 36, height: 36, patternUnits: 'userSpaceOnUse' }, defs);
  el('circle', { cx: 18, cy: 18, r: 1.6, fill: '#333' }, dots);
  el('filter', { id: 'abShadow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs)
    .appendChild(el('feDropShadow', { dx: 0, dy: 18, stdDeviation: 26, 'flood-color': '#000', 'flood-opacity': 0.5 }));
  el('clipPath', { id: 'paperClip' }, defs).appendChild(el('rect', { x: PAPER.x, y: PAPER.y, width: PAPER.w, height: PAPER.h }));
  el('clipPath', { id: 'sideClip' }, defs).appendChild(el('rect', { x: CR.x - 2, y: CR.y - 2, width: CR.w + 4, height: CR.h + 4 }));

  const cfx = el('filter', { id: 'conceptFx', x: '-5%', y: '-5%', width: '110%', height: '110%', 'color-interpolation-filters': 'sRGB' }, defs);
  const cTurb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.016, numOctaves: 2, seed: 3, result: 'n' }, cfx);
  const cDisp = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 6, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }, cfx);
  const cBlur = el('feGaussianBlur', { in: 'd', stdDeviation: 1.0 }, cfx);
  const nfx = el('filter', { id: 'noiseFx', x: 0, y: 0, width: '100%', height: '100%' }, defs);
  const nTurb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.07, numOctaves: 4, seed: 1, stitchTiles: 'stitch' }, nfx);
  el('feColorMatrix', { type: 'matrix', values: '1.6 0 0 0 -0.2  0 1.5 0 0 -0.25  0 0 1.7 0 -0.3  0 0 0 0 1' }, nfx);
  const pfx = el('filter', { id: 'pencilFx', x: '-5%', y: '-5%', width: '110%', height: '110%' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.8, numOctaves: 1, seed: 7, result: 'pn' }, pfx);
  el('feDisplacementMap', { in: 'SourceGraphic', in2: 'pn', scale: 1.6, xChannelSelector: 'R', yChannelSelector: 'G' }, pfx);
  const fade = el('filter', { id: 'tplFade' }, defs);
  el('feColorMatrix', { type: 'matrix', values: '0.33 0.33 0.33 0 0.3  0.33 0.33 0.33 0 0.3  0.33 0.33 0.33 0 0.32  0 0 0 1 0' }, fade);
  const studio = el('radialGradient', { id: 'studio', cx: '50%', cy: '42%', r: '75%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#F1EEE8' }, studio);
  el('stop', { offset: '100%', 'stop-color': '#A9A49C' }, studio);
  const gradFor = {};
  for (const hex of new Set([PAINT].concat(EP.shapes.map((s) => s.fill), EP.texts.map((x) => x.fill)))) {
    const id = 'cg' + hex.slice(1);
    const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 0.15, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': mix(hex, '#FFFFFF', hex === PAINT ? 0.18 : 0.15) }, g);
    el('stop', { offset: '100%', 'stop-color': mix(hex, '#000000', 0.22) }, g);
    gradFor[hex] = `url(#${id})`;
  }

  function textEl(parent, p, attrs) {
    return el('text', Object.assign({ x: p.x, y: p.y, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': p.size, 'letter-spacing': p.spacing }, attrs || {}), parent);
  }
  // Artwork for one view, masked to the bodywork. mode: 'final' | 'concept'
  function buildArt(parent, key, mode, id) {
    const view = V[key], spec = key === 'rear' ? EP.rear : EP;
    const g = el('g', { id, mask: MASK }, parent);
    for (const s of spec.shapes) el('path', { d: VE.toD(conv(s, view)), fill: mode === 'concept' ? gradFor[s.fill] : s.fill, 'fill-rule': s.rule || 'nonzero' }, g);
    for (const x of spec.texts) textEl(g, convText(x, view), { fill: mode === 'concept' ? gradFor[x.fill] : x.fill, text: mode === 'concept' ? (EP.concept.garbled || {})[x.text] || x.text : x.text });
    return g;
  }
  const useBase = (parent, attrs) => el('use', Object.assign({ href: BASE }, attrs || {}), parent);
  const paintRect = (parent, fill, attrs) => el('rect', Object.assign({ x: VB[0], y: VB[1], width: VB[2], height: VB[3], fill, mask: MASK }, attrs || {}), parent);

  // Finished van (every view) — used by the zoom, the thumbnails and the exports.
  const artIds = { side: 'artSide', side2: 'artSide2', rear: 'artRear' };
  const artDefs = el('g', {}, defs);
  for (const k in artIds) buildArt(artDefs, k, 'final', artIds[k]);
  const vanAll = el('g', { id: 'vanAll' }, defs);
  useBase(vanAll);
  paintRect(vanAll, PAINT);
  for (const k in artIds) el('use', { href: '#' + artIds[k] }, vanAll);
  useBase(vanAll, { style: 'mix-blend-mode:multiply' });

  // AI-style concept (soft, gradients, misspelt) of the side view.
  const conceptArt = el('g', { id: 'conceptArt', filter: 'url(#conceptFx)' }, defs);
  const usingImage = !!EP.concept.image;
  if (usingImage) el('image', { href: EP.concept.image, x: PA.x, y: PA.y, width: PA.w, height: PA.h, preserveAspectRatio: 'xMidYMid slice' }, conceptArt);
  else {
    el('rect', { x: PA.x, y: PA.y, width: PA.w, height: PA.h, fill: 'url(#studio)' }, conceptArt);
    el('ellipse', { cx: SIDE.F.x + SIDE.F.w / 2, cy: CR.y + CR.h - 5, rx: SIDE.F.w * 0.55, ry: 9, fill: '#2A2520', opacity: 0.45 }, conceptArt);
    const cv = el('g', { 'clip-path': 'url(#sideClip)', transform: `rotate(-0.6 ${DEF.x} ${DEF.y})` }, conceptArt);
    useBase(cv);
    paintRect(cv, gradFor[PAINT]);
    buildArt(cv, 'side', 'concept');
    useBase(cv, { style: 'mix-blend-mode:multiply' });
  }

  // ---------- background, header (real logo), titles, pips ----------
  el('rect', { width: W, height: H, fill: C.bg }, svg);
  el('rect', { width: W, height: H, fill: 'url(#dots)' }, svg);
  const logoDoc = new DOMParser().parseFromString(logoTxt, 'image/svg+xml').documentElement;
  const logoVB = logoDoc.getAttribute('viewBox').split(/\s+/).map(Number);
  function placeLogo(parent, x, y, h, markOnly) {
    const k = h / logoVB[3];
    const g = el('g', { transform: `translate(${x} ${y}) scale(${k}) translate(${-logoVB[0]} ${-logoVB[1]})` }, parent);
    [...logoDoc.querySelectorAll('path')].forEach((p, i) => { if (!markOnly || i < 2) g.appendChild(document.importNode(p, true)); });
    return g;
  }
  placeLogo(svg, 90, 62, 54);
  el('text', { x: 990, y: 102, 'text-anchor': 'end', 'font-family': BODY, 'font-weight': 500, 'font-size': 32, fill: C.grey, 'letter-spacing': 1, text: `FROM IDEA TO VAN · EP ${String(EP.number).padStart(2, '0')}` }, svg);

  const TITLES = {
    brief: { num: '01', main: 'THE BRIEF', sub: 'Who it’s for and what it has to say' },
    sketch: { num: '02', main: 'SKETCH', sub: `On the ${EP.van.name} template` },
    concept: { num: '02', main: 'AI CONCEPT', sub: 'The sketch, turned into a look' },
    vector: { num: '03', main: 'VECTOR', sub: 'Redrawn clean with the pen tool' },
    colour: { num: '03', main: 'VECTOR', sub: 'Van paint + Oracal 651 vinyl' },
    zoom: { num: '', main: 'WHY VECTOR?', sub: 'Same design, zoomed right in' },
    van: { num: '04', main: 'ON THE VAN', sub: `${EP.van.name} · both sides + rear` },
  };
  const titleEls = {};
  for (const k in TITLES) {
    const g = el('g', { opacity: 0 }, svg);
    const tt = el('text', { x: 90, y: 262, 'font-family': DISPLAY, 'font-size': 150, fill: '#fff' }, g);
    if (TITLES[k].num) el('tspan', { text: TITLES[k].num + ' ', fill: C.yellow }, tt);
    el('tspan', { text: TITLES[k].main }, tt);
    titleEls[k] = { g, sub: el('text', { x: 92, y: 318, 'font-family': BODY, 'font-weight': 500, 'font-size': 40, fill: C.grey, text: TITLES[k].sub }, svg) };
  }
  const PIPS = ['BRIEF', 'CONCEPT', 'VECTOR', 'VAN', '3D'];
  const pipW = (900 - 4 * 18) / 5;
  const pipEls = PIPS.map((label, i) => {
    const x = 90 + i * (pipW + 18);
    el('rect', { x, y: 350, width: pipW, height: 8, rx: 4, fill: C.line }, svg);
    return { fill: el('rect', { x, y: 350, width: 0, height: 8, rx: 4, fill: C.yellow }, svg), txt: el('text', { x, y: 395, 'font-family': DISPLAY, 'font-size': 30, 'letter-spacing': 2, fill: C.grey, text: label }, svg) };
  });

  // ---------- brief card ----------
  const brief = el('g', { opacity: 0 }, svg);
  el('rect', { x: 90, y: 470, width: 900, height: 1000, rx: 26, fill: '#232323', stroke: '#3E3E3E', 'stroke-width': 2 }, brief);
  el('text', { x: 130, y: 540, 'font-family': DISPLAY, 'font-size': 44, 'letter-spacing': 3, fill: C.yellow, text: 'CREATIVE BRIEF' }, brief);
  el('rect', { x: 130, y: 562, width: 820, height: 2, fill: '#3E3E3E' }, brief);
  let by = 630;
  const briefRows = EP.brief.map((r) => {
    const size = r.key ? 54 : 44, lh = r.key ? 60 : 52;
    const lines = wrap(r.value, r.key ? 24 : 31);
    const label = el('text', { x: 130, y: by, 'font-family': DISPLAY, 'font-size': 30, 'letter-spacing': 2, fill: C.grey, text: r.label, opacity: 0 }, brief);
    const hl = r.key ? el('rect', { x: 330, y: by - 46, width: 0, height: lines.length * lh + 14, rx: 6, fill: C.yellow, opacity: 0.22 }, brief) : null;
    const nodes = lines.map((_, i) => el('text', { x: 340, y: by + i * lh, 'font-family': BODY, 'font-weight': 600, 'font-size': size, fill: r.key ? C.yellow : '#fff' }, brief));
    const row = { lines, label, nodes, hl };
    by += lines.length * lh + 26;
    return row;
  });
  const briefChars = briefRows.reduce((a, r) => a + r.lines.join(' ').length, 0);

  // ---------- paper + camera (sheet coordinates) ----------
  const paperG = el('g', {}, svg);
  const paperRect = el('rect', { x: PAPER.x, y: PAPER.y, width: PAPER.w, height: PAPER.h, fill: '#FBFAF6', filter: 'url(#abShadow)' }, paperG);
  const clipG = el('g', { 'clip-path': 'url(#paperClip)' }, paperG);
  const cam = el('g', { transform: camT(DEF) }, clipG);
  const floorShadow = el('ellipse', { cx: SIDE.F.x + SIDE.F.w / 2, cy: CR.y + CR.h - 4, rx: SIDE.F.w * 0.56, ry: 10, fill: '#000', opacity: 0 }, cam);
  const vanG = el('g', { 'clip-path': 'url(#sideClip)' }, cam);
  const tplBase = useBase(vanG);
  const pclip = el('clipPath', { id: 'paintClip', clipPathUnits: 'userSpaceOnUse' }, defs);
  const paintC = el('circle', { cx: SIDE.F.x + SIDE.F.w * 0.55, cy: SIDE.F.y + SIDE.F.h * 0.5, r: 0 }, pclip);
  paintRect(vanG, PAINT, { 'clip-path': 'url(#paintClip)' });
  const fillLayer = el('g', { mask: MASK }, vanG);
  const textLayer = el('g', { mask: MASK }, vanG);
  useBase(vanG, { style: 'mix-blend-mode:multiply' });
  const tplLabel = el('text', { x: CR.x + 4, y: CR.y + CR.h + 16, 'font-family': BODY, 'font-weight': 500, 'font-size': 10, fill: '#8DA2C0', text: `${EP.van.name.toUpperCase()} · NEARSIDE · VECTOR EDGE TEMPLATE` }, cam);
  const sketchLayer = el('g', { fill: 'none', stroke: C.graphite, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cam);
  const conceptLayer = el('g', {}, cam);
  el('use', { href: '#conceptArt' }, conceptLayer);
  const noise = el('rect', { x: PA.x, y: PA.y, width: PA.w, height: PA.h, filter: 'url(#noiseFx)', opacity: 0 }, cam);
  const traceLayer = el('g', { fill: 'none', stroke: C.blue, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, cam);
  const anchorLayer = el('g', {}, cam);
  const handleLayer = el('g', {}, cam);
  const typeBox = el('rect', Object.assign({ fill: 'none', stroke: C.blue, 'stroke-width': 2, 'stroke-dasharray': '9 6', opacity: 0 }, NSS), cam);
  const caret = el('rect', { width: 2, fill: C.blue, opacity: 0 }, cam);
  const pen = el('g', { opacity: 0 }, cam);
  el('path', { d: 'M0 0 L12 -34 L34 -12 Z', fill: '#fff', stroke: '#111', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, pen);
  el('path', { d: 'M12 -34 L30 -52 L52 -30 L34 -12', fill: '#111', stroke: '#111', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, pen);
  const pencil = el('g', { opacity: 0 }, cam);
  el('path', { d: 'M0 0 L5 -15 L15 -5 Z', fill: '#2A2A2A' }, pencil);
  el('path', { d: 'M5 -15 L12 -34 L34 -12 L15 -5 Z', fill: '#E9CBA0' }, pencil);
  el('path', { d: 'M12 -34 L70 -92 L92 -70 L34 -12 Z', fill: '#F5C518', stroke: '#B98F12', 'stroke-width': 1.5 }, pencil);
  el('path', { d: 'M70 -92 L80 -102 L102 -80 L92 -70 Z', fill: '#E67E9A' }, pencil);
  const hLines = [0, 1].map(() => el('line', Object.assign({ stroke: C.blue, 'stroke-width': 1.6, opacity: 0 }, NSS), handleLayer));
  const hDots = [0, 1].map(() => el('circle', { r: 3, fill: C.blue, opacity: 0 }, handleLayer));

  // Live side artwork (traced, bucket-filled, typed)
  const SH = EP.shapes.map((s, i) => {
    const cmds = conv(s, SIDE), d = VE.toD(cmds);
    const outer = s.parts ? conv(s.parts[0], SIDE) : cmds;
    const cp = el('clipPath', { id: 'fc' + i, clipPathUnits: 'userSpaceOnUse' }, defs);
    const clipC = el('circle', { r: 0 }, cp);
    const fill = el('path', { d, fill: s.fill, 'fill-rule': s.rule || 'nonzero', 'clip-path': `url(#fc${i})` }, fillLayer);
    const trace = el('path', Object.assign({ d }, NSS), traceLayer);
    return { s, cmds, d, outerD: VE.toD(outer), fill, trace, clipC, anchors: [], segs: [] };
  });
  const TX = EP.texts.map((x) => {
    const p = convText(x, SIDE);
    return { x, p, node: el('text', { 'font-family': DISPLAY, 'font-size': p.size, 'letter-spacing': p.spacing, fill: C.ink, opacity: 0 }, textLayer) };
  });

  // ---------- readouts ----------
  const RY = 1130;
  const prompt = el('g', { opacity: 0 }, svg);
  el('rect', { x: 90, y: RY + 20, width: 900, height: 210, rx: 22, fill: '#262626', stroke: '#3E3E3E', 'stroke-width': 2 }, prompt);
  el('text', { x: 124, y: RY + 74, 'font-family': DISPLAY, 'font-size': 34, fill: C.yellow, 'letter-spacing': 2, text: '✦ PROMPT  +  SKETCH.PNG' }, prompt);
  const promptLines = wrap('“' + EP.concept.prompt + '”', 56);
  const promptTxt = promptLines.map((_, i) => el('text', { x: 124, y: RY + 122 + i * 40, 'font-family': BODY, 'font-size': 34, fill: '#EDEDE6' }, prompt));
  const genRect = el('rect', { x: 790, y: RY + 40, width: 176, height: 50, rx: 25, fill: '#3A3A3A' }, prompt);
  const genTxt = el('text', { x: 878, y: RY + 75, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 30, 'letter-spacing': 2, fill: '#fff', text: 'GENERATE' }, prompt);
  const genBar = el('rect', { x: 90, y: RY + 224, width: 0, height: 6, fill: C.yellow }, prompt);

  const tool = el('g', { opacity: 0 }, svg);
  el('rect', { x: 90, y: RY + 40, width: 900, height: 96, rx: 22, fill: '#262626', stroke: '#3E3E3E', 'stroke-width': 2 }, tool);
  const toolName = el('text', { x: 124, y: RY + 102, 'font-family': DISPLAY, 'font-size': 44, 'letter-spacing': 2, fill: '#fff' }, tool);
  const toolCount = el('text', { x: 956, y: RY + 102, 'text-anchor': 'end', 'font-family': BODY, 'font-weight': 500, 'font-size': 38, fill: C.grey }, tool);

  const PAL = [{ name: `Van paint · ${EP.van.paint.name}`, hex: PAINT }].concat(EP.palette);
  const swW = 900 / PAL.length;
  const swatches = PAL.map((p, i) => {
    const g = el('g', { opacity: 0 }, svg);
    const x = 90 + i * swW;
    el('circle', { cx: x + 32, cy: RY + 90, r: 32, fill: p.hex, stroke: '#666', 'stroke-width': 2 }, g);
    el('text', { x: x + 76, y: RY + 84, 'font-family': DISPLAY, 'font-size': 30, 'letter-spacing': 1, fill: '#fff', text: p.name.toUpperCase() }, g);
    el('text', { x: x + 76, y: RY + 116, 'font-family': BODY, 'font-weight': 500, 'font-size': 28, fill: C.grey, text: p.hex.toUpperCase() }, g);
    return g;
  });

  // Exported views (thumbnails in the van stage)
  const panelsG = el('g', { opacity: 0 }, svg);
  el('text', { x: 90, y: RY + 70, 'font-family': DISPLAY, 'font-size': 36, 'letter-spacing': 2, fill: C.yellow, text: `READY FOR THE 3D MOCKUP · PAINT ${PAINT.toUpperCase()}` }, panelsG);
  let tx0 = 90;
  const thumbEls = [['side', 'NEARSIDE', 360], ['side2', 'OFFSIDE', 360], ['rear', 'REAR', 150]].map(([k, label, w]) => {
    const c = V[k].crop, h = (w * c.h) / c.w;
    const g = el('g', { opacity: 0 }, panelsG);
    el('rect', { x: tx0 - 6, y: RY + 90, width: w + 12, height: 186, rx: 10, fill: '#F4F4F1' }, g);
    const s = el('svg', { x: tx0, y: RY + 96 + (174 - h) / 2, width: w, height: h, viewBox: `${c.x} ${c.y} ${c.w} ${c.h}` }, g);
    el('use', { href: '#vanAll' }, s);
    el('text', { x: tx0, y: RY + 312, 'font-family': DISPLAY, 'font-size': 28, 'letter-spacing': 2, fill: '#fff', text: label }, g);
    tx0 += w + 33;
    return g;
  });

  // Zoom panels
  const zoomG = el('g', { opacity: 0 }, svg);
  const ZA = 520 / 900;
  const Z = { x: SIDE.F.x + EP.zoom.u * SIDE.F.w, y: SIDE.F.y + EP.zoom.v * SIDE.F.h, w: EP.zoom.w * SIDE.F.w };
  Z.h = Z.w * ZA;
  const zoomPct = Math.round(CR.w / Z.w) * 100;
  const panels = [
    { y: 490, href: '#conceptArt', label: `AI IMAGE · ${zoomPct}%`, chip: '#B23A2A' },
    { y: 1040, href: '#vanAll', label: `VECTOR · ${zoomPct}%`, chip: C.blue },
  ].map((p) => {
    const g = el('g', { transform: `translate(90,${p.y})` }, zoomG);
    el('rect', { x: -4, y: -4, width: 908, height: 528, rx: 6, fill: '#fff', stroke: '#444', 'stroke-width': 2 }, g);
    const inner = el('svg', { x: 0, y: 0, width: 900, height: 520, viewBox: '0 0 10 10', preserveAspectRatio: 'xMidYMid slice' }, g);
    el('rect', { x: -5000, y: -5000, width: 11000, height: 11000, fill: '#FBFAF6' }, inner);
    el('use', { href: p.href }, inner);
    const chipW = p.label.length * 17 + 40;
    el('rect', { x: 20, y: 20, width: chipW, height: 54, rx: 27, fill: p.chip }, g);
    el('text', { x: 20 + chipW / 2, y: 58, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 34, 'letter-spacing': 2, fill: '#fff', text: p.label }, g);
    return { inner };
  });

  // Hand-off slate
  const handoff = el('g', { opacity: 0 }, svg);
  const hoT = el('text', { x: 540, y: 900, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 200, fill: '#fff' }, handoff);
  el('tspan', { text: '05 ', fill: C.yellow }, hoT);
  el('tspan', { text: '3D PREVIEW' }, hoT);
  el('text', { x: 540, y: 990, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 500, 'font-size': 48, fill: C.grey, text: 'The full van, wrapped, in 3D' }, handoff);
  const hoArrow = el('path', { d: 'M 510 1080 L 540 1120 L 570 1080', fill: 'none', stroke: C.yellow, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, handoff);

  // Captions, footer, disclaimer
  const capG = el('g', {}, svg);
  const capLines = [0, 1].map((i) => el('text', { x: 540, y: 1640 + i * 66, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 600, 'font-size': 56, fill: '#fff' }, capG));
  const footer = el('text', { x: 540, y: 1860, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 500, 'font-size': 34, 'letter-spacing': 2, fill: C.grey, text: 'VECTOREDGE.CO.UK' }, svg);

  // Intro overlay: the paper plane flies in
  const intro = el('g', {}, svg);
  el('rect', { width: W, height: H, fill: C.charcoal }, intro);
  const introMark = el('g', {}, intro);
  placeLogo(introMark, 0, 0, 230, true);
  const introLines = [['FROM', '#fff'], ['IDEA', C.yellow], ['TO VAN.', '#fff']].map(([s, f], i) => el('text', { x: 90, y: 940 + i * 230, 'font-family': DISPLAY, 'font-size': 270, fill: f, text: s }, intro));
  const introRule = el('rect', { x: 90, y: 1460, width: 0, height: 10, fill: C.yellow }, intro);
  const introEp = el('text', { x: 92, y: 1550, 'font-family': BODY, 'font-weight': 600, 'font-size': 54, 'letter-spacing': 2, fill: '#fff', text: `EP ${String(EP.number).padStart(2, '0')} · ${EP.title.toUpperCase()}` }, intro);
  const introSub = el('text', { x: 92, y: 1612, 'font-family': BODY, 'font-weight': 500, 'font-size': 44, fill: C.grey, text: EP.subtitle }, intro);

  // Outro overlay: full logo
  const outro = el('g', { opacity: 0 }, svg);
  el('rect', { width: W, height: H, fill: C.charcoal }, outro);
  placeLogo(outro, 540 - (900 * logoVB[2]) / logoVB[2] / 2, 650, (900 * logoVB[3]) / logoVB[2]);
  el('text', { x: 540, y: 990, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 600, 'font-size': 58, fill: '#fff', text: 'Got an idea for your van? Send it over.' }, outro);
  el('text', { x: 540, y: 1058, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 500, 'font-size': 46, fill: C.grey, text: 'Even a sketch on a napkin. We’ll take it from there.' }, outro);
  el('text', { x: 540, y: 1250, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 600, 'font-size': 40, 'letter-spacing': 3, fill: C.grey, text: 'CUT VINYL · SIGNWRITING · FITTED' }, outro);
  el('text', { x: 540, y: 1350, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 100, 'letter-spacing': 3, fill: C.yellow, text: 'VECTOREDGE.CO.UK' }, outro);
  el('text', { x: 540, y: 1430, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 600, 'font-size': 56, 'letter-spacing': 2, fill: '#fff', text: '07348 580359' }, outro);

  if (EP.disclaimer) el('text', { x: 540, y: 1800, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 500, 'font-size': 23, 'letter-spacing': 1.2, fill: '#8A8A84', text: EP.disclaimer }, svg);

  // ---------- measurements (after fonts load) ----------
  let sketchItems = [], camKeys = [];
  const traceA = 0.5, traceB = 6.9, typeA = 7.1, typeB = 9.6;
  function lastPt(cmds, k) { for (let j = k; j >= 0; j--) if (cmds[j][0] !== 'Z') return cmds[j].slice(-2); return [0, 0]; }
  function noiseAt(i, seed) { return Math.sin(i * 0.41 + seed) * 0.9 + Math.sin(i * 1.13 + seed * 2.1) * 0.5 + Math.sin(i * 0.11 + seed * 0.7) * 1.3; }
  function wobbly(path, seed) {
    const L = path.getTotalLength(), n = Math.max(8, Math.round(L / 3)), pts = [];
    for (let i = 0; i <= n; i++) pts.push(path.getPointAtLength((L * i) / n));
    let d = '';
    pts.forEach((p, i) => {
      const q = pts[Math.min(n, i + 1)], o = pts[Math.max(0, i - 1)];
      const dx = q.x - o.x, dy = q.y - o.y, len = Math.hypot(dx, dy) || 1, off = noiseAt(i, seed);
      d += (i ? ' L ' : 'M ') + (p.x - (dy / len) * off).toFixed(1) + ' ' + (p.y + (dx / len) * off).toFixed(1);
    });
    return d;
  }

  function measure() {
    const probe = el('path', {}, cam);
    SH.forEach((sh) => {
      const bb = sh.trace.getBBox();
      sh.bb = bb;
      set(sh.clipC, { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 });
      sh.rMax = Math.hypot(bb.width, bb.height) / 2 + 2;
      sh.len = sh.trace.getTotalLength();
      set(sh.trace, { 'stroke-dasharray': sh.len + ' ' + sh.len });
      const cmds = sh.cmds;
      let cum = 0;
      for (let k = 0; k < cmds.length; k++) {
        if (k > 0) { probe.setAttribute('d', VE.toD(cmds.slice(0, k + 1))); cum = probe.getTotalLength(); }
        const c = cmds[k];
        const si = { type: c[0], cum, from: k > 0 ? sh.segs[k - 1].cum : 0 };
        if (c[0] === 'C') { si.c1 = [c[1], c[2]]; si.c2 = [c[3], c[4]]; si.end = [c[5], c[6]]; si.start = lastPt(cmds, k - 1); }
        sh.segs.push(si);
        if (c[0] !== 'Z') { const p = c.slice(-2); sh.anchors.push({ cum, p, node: el('rect', { fill: '#fff', stroke: C.blue, 'stroke-width': 1, opacity: 0 }, anchorLayer) }); }
      }
    });
    probe.remove();
    const wts = SH.map((s) => Math.sqrt(s.len) * 10 + 60), tot = wts.reduce((a, b) => a + b, 0);
    let a = 0;
    SH.forEach((s, i) => { s.win = { a: lerp(traceA, traceB, a / tot), b: lerp(traceA, traceB, (a + wts[i]) / tot) }; a += wts[i]; });
    TX.forEach((tx, i) => {
      const n = tx.node;
      n.textContent = tx.x.text;
      tx.fullW = n.getComputedTextLength();
      tx.x0 = tx.p.x - tx.fullW / 2;
      set(n, { x: tx.x0, y: tx.p.y });
      tx.prefixW = [];
      for (let k = 0; k <= tx.x.text.length; k++) { n.textContent = tx.x.text.slice(0, k); tx.prefixW.push(k ? n.getComputedTextLength() : 0); }
      n.textContent = '';
      tx.win = { a: typeA + (i * (typeB - typeA)) / TX.length, b: typeA + ((i + 1) * (typeB - typeA)) / TX.length };
      tx.capH = tx.p.size * 0.72;
      tx.bb = { x: tx.x0, y: tx.p.y - tx.capH, width: tx.fullW, height: tx.capH };
    });
    // Camera keyframes
    const specs = (EP.camera || []).map((c) => {
      const items = SH.filter((s) => (c.shapes || []).includes(s.s.id)).concat(TX.filter((t) => (c.texts || []).includes(t.x.id)));
      if (!items.length) return null;
      const x0 = Math.min(...items.map((i) => i.bb.x)), y0 = Math.min(...items.map((i) => i.bb.y));
      const x1 = Math.max(...items.map((i) => i.bb.x + i.bb.width)), y1 = Math.max(...items.map((i) => i.bb.y + i.bb.height));
      return { a: Math.min(...items.map((i) => i.win.a)), b: Math.max(...items.map((i) => i.win.b)), x: (x0 + x1) / 2, y: (y0 + y1) / 2, k: c.k };
    }).filter(Boolean).sort((p, q) => p.a - q.a);
    const R = 0.4;
    specs.forEach((sp, i) => {
      const prev = specs[i - 1];
      if (!prev || sp.a - prev.b > 2 * R) {
        if (prev) camKeys.push({ t: prev.b + R, c: DEF });
        camKeys.push({ t: sp.a - R, c: DEF }, { t: sp.a, c: sp });
      } else camKeys.push({ t: Math.max(sp.a, prev.b) + R, c: sp });
      camKeys.push({ t: sp.b, c: sp });
    });
    if (specs.length) camKeys.push({ t: specs[specs.length - 1].b + R, c: DEF });

    // Pencil sketch: headline lettering first, then shapes, then the rest, then notes.
    const order = [];
    TX.filter((t) => t.x.size >= 0.1 || t.x.id === 'name').forEach((t) => order.push({ kind: 'text', t }));
    SH.forEach((s) => order.push({ kind: 'shape', s }));
    TX.filter((t) => !order.find((o) => o.t === t)).forEach((t) => order.push({ kind: 'text', t }));
    order.forEach((o, i) => {
      if (o.kind === 'shape') {
        const base = el('path', { d: o.s.outerD }, cam);
        const g = el('g', {}, sketchLayer);
        const p1 = el('path', Object.assign({ d: wobbly(base, i * 3.1), 'stroke-width': 1.7, opacity: 0.85 }, NSS), g);
        const p2 = el('path', Object.assign({ d: wobbly(base, i * 7.7 + 11), 'stroke-width': 1.0, opacity: 0.5 }, NSS), g);
        base.remove();
        [p1, p2].forEach((p) => { p.len = p.getTotalLength(); set(p, { 'stroke-dasharray': p.len + ' ' + p.len, 'stroke-dashoffset': p.len }); });
        sketchItems.push({ kind: 'shape', paths: [p1, p2], w: Math.sqrt(p1.len) * 8 + 30, tip: p1 });
      } else {
        const cp = el('clipPath', { id: 'sk' + i, clipPathUnits: 'userSpaceOnUse' }, defs);
        const r = el('rect', { x: o.t.x0 - 6, y: o.t.p.y - o.t.capH - 8, width: 0, height: o.t.capH + 16 }, cp);
        const n = textEl(sketchLayer, o.t.p, { text: o.t.x.text, fill: 'none', stroke: C.graphite, 'stroke-width': 1.2, filter: 'url(#pencilFx)', 'clip-path': `url(#sk${i})` });
        set(n, NSS);
        sketchItems.push({ kind: 'text', rect: r, t: o.t, w: 120 });
      }
    });
    const tot2 = sketchItems.reduce((a2, s) => a2 + s.w, 0);
    let a2 = 0;
    sketchItems.forEach((s) => { s.a = lerp(0.9, 4.4, a2 / tot2); s.b = lerp(0.9, 4.4, (a2 + s.w) / tot2); a2 += s.w; });
    (EP.sketchNotes || []).forEach((nt, i) => {
      const a = 4.4 + i * 0.45, b = a + 0.55;
      const P = (u, v) => SIDE.pt(u, v);
      const at = P(nt.u, nt.v), sz = 17;
      const txt = el('text', { x: at[0], y: at[1], 'font-family': BODY, 'font-weight': 500, 'font-size': sz, fill: C.graphite, stroke: 'none', transform: `skewX(-10) translate(${at[1] * 0.176} 0)`, opacity: 0 }, sketchLayer);
      const p = P(...nt.arrow[0]), q = P(...nt.arrow[1]);
      const mx = (p[0] + q[0]) / 2 + (q[1] - p[1]) * 0.18, my = (p[1] + q[1]) / 2 - (q[0] - p[0]) * 0.18;
      const ang = Math.atan2(q[1] - my, q[0] - mx), hl = 10;
      const d = `M ${p[0]} ${p[1]} Q ${mx} ${my} ${q[0]} ${q[1]} M ${q[0] - hl * Math.cos(ang - 0.5)} ${q[1] - hl * Math.sin(ang - 0.5)} L ${q[0]} ${q[1]} L ${q[0] - hl * Math.cos(ang + 0.5)} ${q[1] - hl * Math.sin(ang + 0.5)}`;
      const ar = el('path', Object.assign({ d, 'stroke-width': 1.7 }, NSS), sketchLayer);
      ar.len = ar.getTotalLength() + 40;
      set(ar, { 'stroke-dasharray': ar.len + ' ' + ar.len, 'stroke-dashoffset': ar.len });
      sketchItems.push({ kind: 'note', txt, full: nt.text, ar, a, b, sz });
    });
  }

  // ---------- sound-effect cues (rendered to audio by audio.js) ----------
  function buildSfx() {
    const out = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const ev = (stage, at, type, o) => out.push(Object.assign({ t: +(T[stage].start + at).toFixed(3), type }, o || {}));
    const typing = (stage, a, b, gain, step = 0.07) => { for (let x = a; x < b; x += step * (0.7 + rnd() * 0.6)) ev(stage, x, 'key', { gain, pitch: 0.85 + rnd() * 0.3 }); };
    ['brief', 'sketch', 'concept', 'vector', 'colour', 'zoom', 'van'].forEach((k) => ev(k, 0, 'whoosh', { dur: 0.45, gain: 0.35 }));
    // Intro: plane flies in, words land, rule draws
    ev('intro', 0, 'whoosh', { dur: 0.9, gain: 0.8 });
    [0, 1, 2].forEach((i) => ev('intro', 0.42 + i * 0.16, 'thud', { gain: 0.55 }));
    ev('intro', 0.8, 'swish', { dur: 0.7, gain: 0.35 });
    // Brief: typing, then the marker highlight
    typing('brief', 0.42, 4.4, 0.3);
    ev('brief', 4.5, 'marker', { dur: 0.5, gain: 0.45 });
    // Sketch: pencil on paper for every stroke and note
    sketchItems.forEach((it) => ev('sketch', it.a, 'pencil', { dur: Math.max(0.15, it.b - it.a), gain: 0.2 }));
    // Concept: prompt typing, button, generation riser, done chime
    typing('concept', 0.2, 2.0, 0.28);
    ev('concept', 2.15, 'click', { gain: 0.6 });
    ev('concept', 2.6, 'riser', { dur: 2.2, gain: 0.45 });
    ev('concept', 4.8, 'ding', { gain: 0.4 });
    // Vector: a click per anchor point (thinned so it never turns into a buzz), then typing
    const clicks = [];
    SH.forEach((sh) => sh.anchors.forEach((a) => clicks.push(sh.win.a + (a.cum / sh.len) * (sh.win.b - sh.win.a))));
    clicks.sort((x, y) => x - y);
    let last = -1;
    clicks.forEach((c) => { if (c - last >= 0.055) { ev('vector', c, 'click', { gain: 0.55, pitch: 0.9 + rnd() * 0.25 }); last = c; } });
    TX.forEach((tx) => { const n = tx.x.text.replace(/ /g, '').length; for (let k = 0; k < n; k++) ev('vector', tx.win.a + (k / n) * (tx.win.b - 0.12 - tx.win.a), 'key', { gain: 0.3, pitch: 0.85 + rnd() * 0.3 }); });
    // Colour: paint pour, a pop per vinyl piece, pops for the swatches
    ev('colour', 0.2, 'paint', { dur: 0.9, gain: 0.5 });
    SH.forEach((sh, i) => ev('colour', 0.9 + i * 0.14, 'pop', { gain: 0.3, pitch: 1 + i * 0.06 }));
    PAL.forEach((p, i) => ev('colour', 0.3 + i * 0.45, 'pop', { gain: 0.4, pitch: 1.35 }));
    // Zoom: rising whoosh while it pushes in
    ev('zoom', 0.6, 'riser', { dur: 1.4, gain: 0.4 });
    // Van: the exported views pop in
    [0, 1, 2].forEach((i) => ev('van', 3.1 + i * 0.3, 'pop', { gain: 0.4, pitch: 1.1 + i * 0.1 }));
    // Hand-off and outro hits
    ev('handoff', 0, 'boom', { gain: 0.7 });
    ev('handoff', 0, 'whoosh', { dur: 0.6, gain: 0.45 });
    ev('outro', 0, 'boom', { gain: 0.5 });
    return out.sort((a, b) => a.t - b.t);
  }

  function camAt(lv) {
    if (!camKeys.length || lv <= camKeys[0].t) return DEF;
    for (let i = 0; i < camKeys.length - 1; i++) {
      const A = camKeys[i], B = camKeys[i + 1];
      if (lv >= A.t && lv <= B.t) { const p = eio(seg(lv, A.t, B.t)); return { x: lerp(A.c.x, B.c.x, p), y: lerp(A.c.y, B.c.y, p), k: lerp(A.c.k, B.c.k, p) }; }
    }
    return DEF;
  }

  // ---------- render one frame ----------
  function renderAt(t) {
    t = clamp(t, 0, TOTAL - 1e-6);
    const st = stageAt(t);
    const frame = Math.round(t * 30);

    // Intro
    const li = lt(t, 'intro');
    const mk = eout(seg(li, 0, 0.8));
    set(introMark, { transform: `translate(${lerp(-420, 90, mk)} ${lerp(520, 450, mk)}) rotate(${lerp(-14, 0, mk)})`, opacity: seg(li, 0, 0.2) });
    introLines.forEach((n, i) => { const p = eout(seg(li, 0.35 + i * 0.16, 0.85 + i * 0.16)); set(n, { opacity: p, transform: `translate(0 ${(1 - p) * 80})` }); });
    set(introRule, { width: 900 * eio(seg(li, 0.8, 1.5)) });
    set(introEp, { opacity: seg(li, 1.1, 1.5) });
    set(introSub, { opacity: seg(li, 1.3, 1.7) });
    set(intro, { opacity: 1 - seg(li, T.intro.dur - 0.45, T.intro.dur), display: t < T.intro.end ? 'inline' : 'none' });

    // Titles
    const keys = Object.keys(TITLES);
    keys.forEach((k, idx) => {
      const same = (o) => o && TITLES[o].main === TITLES[k].main && TITLES[o].num === TITLES[k].num;
      const a = T[k].start, b = T[k].end;
      const fin = same(keys[idx - 1]) ? 1 : eout(seg(t, a, a + 0.4));
      const fout = same(keys[idx + 1]) ? 0 : seg(t, b - 0.25, b);
      set(titleEls[k].g, { opacity: t >= a && t < b ? fin * (1 - fout) : 0, transform: `translate(${(1 - fin) * -40} 0)` });
      set(titleEls[k].sub, { opacity: t >= a && t < b ? eout(seg(t, a + 0.1, a + 0.45)) * (1 - seg(t, b - 0.25, b)) : 0 });
    });

    // Pips
    const pp = [seg(t, T.brief.start, T.brief.end), seg(t, T.sketch.start, T.concept.end), seg(t, T.vector.start, T.zoom.end), seg(t, T.van.start, T.van.end), seg(t, T.handoff.start, T.handoff.end)];
    const phase = { intro: 0, brief: 0, sketch: 1, concept: 1, vector: 2, colour: 2, zoom: 2, van: 3, handoff: 4, outro: 4 }[st];
    pipEls.forEach((p, i) => { set(p.fill, { width: pipW * pp[i] }); set(p.txt, { fill: i === phase ? '#fff' : C.grey }); });

    // Brief
    const lb = lt(t, 'brief');
    const bOp = within(t, 'brief') ? eout(seg(lb, 0, 0.35)) * (1 - seg(lb, T.brief.dur - 0.3, T.brief.dur)) : 0;
    set(brief, { opacity: bOp, display: bOp > 0 ? 'inline' : 'none' });
    if (bOp > 0) {
      const n = Math.floor(briefChars * seg(lb, 0.4, 4.4));
      let used = 0;
      briefRows.forEach((row) => {
        set(row.label, { opacity: lb > 0.4 && n >= used ? 1 : 0 });
        row.lines.forEach((line, i) => {
          const take = clamp(n - used, 0, line.length);
          row.nodes[i].textContent = line.slice(0, take) + (take > 0 && take < line.length && frame % 14 < 9 ? '▌' : '');
          used += line.length + (i < row.lines.length - 1 ? 1 : 0);
        });
        used += 1;
        if (row.hl) set(row.hl, { width: n >= used - 1 ? 620 * eout(seg(lb, 4.5, 5.0)) : 0 });
      });
    }

    // Paper / camera
    const ls = lt(t, 'sketch'), lc = lt(t, 'concept'), lv = lt(t, 'vector'), lcol = lt(t, 'colour'), lz = lt(t, 'zoom'), lvn = lt(t, 'van');
    const hidePaper = t >= T.zoom.start && t < T.van.start ? seg(lz, 0, 0.35) : 0;
    const vanOut = t >= T.van.start ? seg(lvn, T.van.dur - 0.3, T.van.dur) : 0;
    const paperOp = t < T.sketch.start || t >= T.handoff.start ? 0 : eout(seg(ls, 0, 0.45)) * (1 - hidePaper) * (1 - vanOut) * (t >= T.van.start ? eout(seg(lvn, 0, 0.35)) : 1);
    set(paperG, { opacity: paperOp, display: paperOp > 0.001 ? 'inline' : 'none' });
    set(paperRect, { opacity: t >= T.van.start ? 1 - eio(seg(lvn, 0.2, 0.9)) : 1 });
    let c = DEF;
    if (within(t, 'vector')) c = camAt(lv);
    if (t >= T.van.start) c = { x: DEF.x, y: DEF.y, k: lerp(0.97, 1.06, eio(seg(lvn, 0, T.van.dur))) };
    set(cam, { transform: camT(c) });
    const inv = 1 / (S * c.k);
    set(floorShadow, { opacity: t >= T.van.start ? 0.6 * seg(lvn, 0.2, 0.8) : 0 });

    // Template: faded "printed" look while sketching, clean from the vector stage
    let tplOp = 1, tplFilter = 'url(#tplFade)';
    if (t < T.vector.start) tplOp = 0.75;
    else tplFilter = '';
    set(vanG, { opacity: tplOp, filter: tplFilter || 'none' });
    if (!tplFilter) vanG.removeAttribute('filter');
    set(tplLabel, { opacity: t < T.colour.start ? 1 : 1 - seg(lcol, 0, 0.5) });

    // Sketch
    let pencilPt = null;
    set(sketchLayer, { opacity: t < T.sketch.start ? 0 : t < T.concept.start ? 1 : 1 - seg(lc, 2.2, 2.7) });
    sketchItems.forEach((s) => {
      const p = t < T.sketch.start ? 0 : seg(ls, s.a, s.b);
      if (s.kind === 'shape') {
        s.paths.forEach((pa, j) => set(pa, { 'stroke-dashoffset': pa.len * (1 - clamp(p * 1.15 - j * 0.15)) }));
        if (p > 0 && p < 1) { const q = s.tip.getPointAtLength(s.tip.len * p); pencilPt = [q.x, q.y]; }
      } else if (s.kind === 'text') {
        set(s.rect, { width: (s.t.fullW + 12) * p });
        if (p > 0 && p < 1) pencilPt = [s.t.x0 + s.t.fullW * p, s.t.p.y - s.t.capH * (0.5 + 0.4 * Math.sin(p * 40))];
      } else {
        const n = Math.round(s.full.length * p);
        s.txt.textContent = s.full.slice(0, n);
        set(s.txt, { opacity: n ? 1 : 0 });
        set(s.ar, { 'stroke-dashoffset': s.ar.len * (1 - seg(ls, s.b - 0.1, s.b + 0.3)) });
        if (p > 0 && p < 1) { const bb = s.txt.getBBox(); pencilPt = [bb.x + bb.width + 3, bb.y + s.sz]; }
      }
    });
    set(pencil, { opacity: pencilPt && within(t, 'sketch') ? 1 : 0, transform: pencilPt ? `translate(${pencilPt[0]} ${pencilPt[1]}) scale(${inv})` : '' });

    // Concept generation (sketch → noise → AI image)
    const g = seg(lc, 2.6, 4.8), ge = eout(g);
    set(cDisp, { scale: lerp(180, usingImage ? 0 : 6, ge) });
    set(cBlur, { stdDeviation: lerp(28, usingImage ? 0 : 1.0, ge) });
    set(cTurb, { seed: g < 1 ? 3 + (frame % 97) : 3 });
    set(nTurb, { seed: 1 + (frame % 89) });
    set(noise, { opacity: within(t, 'concept') ? (lc < 2.6 ? eio(seg(lc, 2.1, 2.6)) : Math.pow(1 - g, 0.8)) : 0 });
    let cOp = 0;
    if (t >= T.concept.start) cOp = lc >= 2.6 ? 1 : 0;
    if (t >= T.vector.start) cOp = lerp(1, 0.3, seg(lv, 0, 0.6));
    if (t >= T.colour.start) cOp = lerp(0.3, 0, seg(lcol, 0, 0.8));
    set(conceptLayer, { opacity: cOp });

    // Prompt
    const pOn = within(t, 'concept') || (t >= T.vector.start && lv < 0.3);
    set(prompt, { opacity: pOn ? eout(seg(lc, 0, 0.35)) * (1 - seg(lv, 0, 0.3)) : 0 });
    if (pOn) {
      const full = promptLines.join('\n');
      const n = Math.floor(full.length * seg(lc, 0.2, 2.0));
      let used = 0;
      promptLines.forEach((line, i) => {
        const take = clamp(n - used, 0, line.length);
        const here = n < full.length && n >= used && n <= used + line.length;
        promptTxt[i].textContent = line.slice(0, take) + (here && frame % 16 < 10 ? '|' : '');
        used += line.length + 1;
      });
      const pressed = lc >= 2.1 && lc < 2.6;
      set(genRect, { fill: g >= 1 ? '#2F5E2F' : pressed || g > 0 ? C.yellow : '#3A3A3A' });
      set(genTxt, { fill: g >= 1 ? '#fff' : pressed || g > 0 ? '#111' : '#fff' });
      genTxt.textContent = g >= 1 ? 'DONE ✓' : g > 0 ? `${Math.floor(g * 100)}%` : 'GENERATE';
      set(genBar, { width: 900 * g, opacity: g >= 1 ? 1 - seg(lc, 4.8, 5.2) : 1 });
    }

    // Pen tool
    let anchorCount = 0, penPt = null, hs = null;
    const outlineFade = t < T.colour.start ? 1 : 1 - seg(lcol, 2.6, 3.4);
    const as = 7 * inv;
    SH.forEach((sh, i) => {
      const p = t < T.vector.start ? 0 : seg(lv, sh.win.a, sh.win.b);
      const L = sh.len * p;
      set(sh.trace, { 'stroke-dashoffset': sh.len - L, opacity: outlineFade });
      sh.anchors.forEach((a) => {
        const on = p > 0 && L >= a.cum - 0.3;
        if (on) anchorCount++;
        set(a.node, { x: a.p[0] - as / 2, y: a.p[1] - as / 2, width: as, height: as, 'stroke-width': 1.6 * inv, opacity: on ? outlineFade : 0 });
      });
      if (p > 0 && p < 1) { const q = sh.trace.getPointAtLength(L); penPt = [q.x, q.y]; hs = sh.segs.find((s) => s.type === 'C' && L >= s.from && L <= s.cum) || null; }
      set(sh.clipC, { r: t < T.colour.start ? 0 : sh.rMax * eout(seg(lcol, 0.9 + i * 0.14, 1.5 + i * 0.14)) });
    });
    set(paintC, { r: t < T.colour.start ? 0 : CR.w * 0.75 * eio(seg(lcol, 0.2, 1.0)) });
    set(pen, { opacity: penPt ? 1 : 0, transform: penPt ? `translate(${penPt[0]} ${penPt[1]}) scale(${inv})` : '' });
    if (hs) [[hs.start, hs.c1], [hs.end, hs.c2]].forEach(([a, cc], k) => { set(hLines[k], { x1: a[0], y1: a[1], x2: cc[0], y2: cc[1], opacity: 1 }); set(hDots[k], { cx: cc[0], cy: cc[1], r: 5 * inv, opacity: 1 }); });
    else hLines.concat(hDots).forEach((n) => set(n, { opacity: 0 }));

    // Type tool
    let typing = null;
    TX.forEach((tx, i) => {
      const p = t < T.vector.start ? 0 : seg(lv, tx.win.a, tx.win.b - 0.12);
      const n = Math.round(tx.x.text.length * p);
      tx.node.textContent = tx.x.text.slice(0, n);
      const cp = t < T.colour.start ? 0 : seg(lcol, 2.0 + i * 0.15, 2.5 + i * 0.15);
      set(tx.node, { opacity: n > 0 ? 1 : 0, fill: mix(C.ink, tx.x.fill, cp) });
      if (within(t, 'vector') && lv >= tx.win.a && lv < tx.win.b + 0.3) typing = { tx, n, done: lv >= tx.win.b };
    });
    if (typing) {
      const { tx, n } = typing, pad = 6 * inv;
      set(typeBox, { x: tx.x0 - pad, y: tx.p.y - tx.capH - pad, width: tx.fullW + pad * 2, height: tx.capH + pad * 2, opacity: 1 });
      set(caret, { x: tx.x0 + tx.prefixW[n] + inv, y: tx.p.y - tx.capH - 2 * inv, width: 3 * inv, height: tx.capH + 4 * inv, opacity: typing.done ? (frame % 16 < 9 ? 1 : 0) : 1 });
    } else { set(typeBox, { opacity: 0 }); set(caret, { opacity: 0 }); }

    // Tool chip
    set(tool, { opacity: t >= T.vector.start && t < T.colour.start + 0.3 ? eout(seg(lv, 0.2, 0.5)) * (1 - seg(lcol, 0, 0.3)) : 0 });
    toolName.textContent = lv < typeA - 0.1 ? 'PEN TOOL' : 'TYPE TOOL';
    toolCount.textContent = lv < typeA - 0.1 ? `Anchor points: ${anchorCount}` : `Bebas Neue · ${TX.length} lines`;

    // Swatches
    swatches.forEach((s, i) => {
      const on = t >= T.colour.start && t < T.zoom.start + 0.4;
      const p = on ? eback(seg(lcol, 0.3 + i * 0.45, 0.8 + i * 0.45)) * (1 - seg(lz, 0, 0.35)) : 0;
      set(s, { opacity: clamp(p), transform: `translate(0 ${(1 - clamp(p)) * 30})` });
    });

    // Zoom
    const zOp = within(t, 'zoom') ? eout(seg(lz, 0.25, 0.65)) * (1 - seg(lz, T.zoom.dur - 0.3, T.zoom.dur)) : 0;
    set(zoomG, { opacity: zOp, display: zOp > 0.001 ? 'inline' : 'none' });
    if (zOp > 0) {
      const zp = eio(seg(lz, 0.6, 2.0));
      const fw = CR.w * 1.04, fh = fw * ZA, full = { x: DEF.x - fw / 2, y: DEF.y - fh / 2, w: fw, h: fh };
      const vb = [lerp(full.x, Z.x, zp), lerp(full.y, Z.y, zp), lerp(full.w, Z.w, zp), lerp(full.h, Z.h, zp)];
      panels.forEach((p) => set(p.inner, { viewBox: vb.join(' ') }));
    }

    // Van + exported views
    const pOn2 = within(t, 'van');
    set(panelsG, { opacity: pOn2 ? eout(seg(lvn, 2.9, 3.2)) * (1 - seg(lvn, T.van.dur - 0.3, T.van.dur)) : 0 });
    thumbEls.forEach((th, i) => { const p = pOn2 ? eback(seg(lvn, 3.1 + i * 0.3, 3.6 + i * 0.3)) : 0; set(th, { opacity: clamp(p), transform: `translate(0 ${(1 - clamp(p)) * 30})` }); });

    // Hand-off slate
    const lh = lt(t, 'handoff');
    const hOp = within(t, 'handoff') ? eout(seg(lh, 0, 0.4)) : 0;
    set(handoff, { opacity: hOp, transform: `translate(0 ${(1 - hOp) * 30})` });
    set(hoArrow, { transform: `translate(0 ${Math.sin(lh * 6) * 10})` });

    // Captions
    let cap = '', capOp = 0;
    const list = EP.captions[st] || [];
    const lst = t - T[st].start;
    for (let i = 0; i < list.length; i++) {
      const a = list[i].at, b = i + 1 < list.length ? list[i + 1].at : T[st].dur;
      if (lst >= a && lst < b) { cap = list[i].text; capOp = seg(lst, a, a + 0.25) * (1 - seg(lst, b - 0.22, b)); }
    }
    const lines = wrap(cap, 34);
    capLines.forEach((n, i) => { n.textContent = lines[i] || ''; });
    set(capG, { opacity: capOp, transform: `translate(0 ${(1 - capOp) * 14 + (lines.length < 2 ? 33 : 0)})` });

    // Outro
    const oOp = t >= T.outro.start ? eout(seg(lt(t, 'outro'), 0, 0.45)) : 0;
    set(outro, { opacity: oOp, display: oOp > 0 ? 'inline' : 'none' });
    set(footer, { opacity: t >= T.intro.end - 0.4 ? 1 : 0 });
  }

  // ---------- exports (for the 3D mockup app) ----------
  const EXPORTS = { nearside: 'side', offside: 'side2', rear: 'rear' };
  function exportViews() {
    const maskEl = document.getElementById(SHEET.maskId);
    return Object.entries(EXPORTS).map(([name, key]) => {
      const g = document.getElementById(artIds[key]);
      const items = [...g.children].map((n) => {
        if (n.tagName === 'path') return { tag: 'path', d: n.getAttribute('d'), fill: n.getAttribute('fill'), rule: n.getAttribute('fill-rule') };
        const w = n.getComputedTextLength(), x = +n.getAttribute('x');
        return { tag: 'text', text: n.textContent, x: x - w / 2, y: +n.getAttribute('y'), size: +n.getAttribute('font-size'), spacing: +n.getAttribute('letter-spacing') || 0, fill: n.getAttribute('fill'), width: w };
      });
      return { name, crop: V[key].crop, maskId: SHEET.maskId, maskHTML: maskEl.outerHTML, paint: PAINT, items };
    });
  }
  // Puts one view on its own, full size, for the renderer to screenshot.
  function showExport(name, mode, scale) {
    const key = EXPORTS[name], c = V[key].crop;
    document.getElementById('stage').style.display = 'none';
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    let x = document.getElementById('expSvg');
    if (x) x.remove();
    x = el('svg', { id: 'expSvg', width: c.w * scale, height: c.h * scale, viewBox: `${c.x} ${c.y} ${c.w} ${c.h}`, style: 'position:absolute;left:0;top:0;z-index:9999' }, document.body);
    if (mode === 'mockup') { el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, fill: '#FFFFFF' }, x); el('use', { href: '#vanAll' }, x); }
    else el('use', { href: '#' + artIds[key] }, x);
    return { w: Math.ceil(c.w * scale), h: Math.ceil(c.h * scale) };
  }

  window.VE_STAGES = T;
  window.VE_TOTAL = TOTAL;
  window.VE_HANDOFF = T.handoff.end;
  window.renderAt = renderAt;
  window.exportViews = exportViews;
  window.showExport = showExport;
  await Promise.all([
    document.fonts.load(`400 100px 'Bebas Neue'`, 'A'),
    document.fonts.load(`500 40px 'Barlow Condensed'`, 'A'),
    document.fonts.load(`600 40px 'Barlow Condensed'`, 'A'),
  ]);
  await document.fonts.ready;
  measure();
  window.VE_SFX = buildSfx();
  window.VE_AUDIO = EP.audio || null;
  renderAt(0);
})().then(() => { window.VE_READY = true; }, (e) => { console.error(e); window.VE_ERROR = String(e && e.stack || e); });
window.VE_READY = window.VE_READY || null;
