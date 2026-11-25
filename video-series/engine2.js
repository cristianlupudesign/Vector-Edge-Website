/*
  "From Idea to Van" engine v2 — van-wrap episodes.
  Brief → sketch on the van template → AI concept → vector (pen + type) → colours →
  zoom compare → real van + exported panels → 3D hand-off slate → outro.
  Same code runs the live preview and the frame-by-frame render (window.renderAt).
*/
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1080, H = 1920;
  const EP = window.EPISODE, VAN = window.VAN;
  const C = { yellow: '#E5E521', blue: '#0057FF', charcoal: '#2B2B2B', ink: '#2B2B2B', bg: '#1B1B1B', grey: '#9C9C94', line: '#3A3A3A', tpl: '#8DA2C0', graphite: '#4A4A4E' };
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
    for (const k in attrs || {}) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
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
  const dOf = (s, which) => (s.d === 'VAN_BODY' ? VAN.body : s.d === 'VAN_REAR' ? VAN.rear.body : s.d || VE.toD(s.cmds));
  const NSS = { 'vector-effect': 'non-scaling-stroke' };

  // ---------- timeline ----------
  const ORDER = ['intro', 'brief', 'sketch', 'concept', 'vector', 'colour', 'zoom', 'van', 'handoff', 'outro'];
  const T = {};
  let acc = 0;
  for (const k of ORDER) { T[k] = { start: acc, end: acc + EP.durations[k], dur: EP.durations[k] }; acc += EP.durations[k]; }
  const TOTAL = acc;
  const lt = (t, k) => t - T[k].start;
  const within = (t, k) => t >= T[k].start && t < T[k].end;
  const stageAt = (t) => ORDER.find((k) => within(t, k)) || 'outro';

  // ---------- layout ----------
  const PAPER = { x: 40, y: 560, w: 1000, h: 540 };
  const S = 0.92, PC = { x: 540, y: 830 }, DEF = { x: 500, y: (830 - 638) / 0.92, k: 1 };
  const camT = (c) => `translate(${PC.x - c.x * S * c.k} ${PC.y - c.y * S * c.k}) scale(${S * c.k})`;
  const PA = { x: (PAPER.x - 80) / S - 20, y: (PAPER.y - 638) / S - 20, w: PAPER.w / S + 40, h: PAPER.h / S + 40 };

  // ---------- stage + defs ----------
  const stage = document.getElementById('stage');
  const svg = el('svg', { id: 'main', width: W, height: H, viewBox: `0 0 ${W} ${H}` }, stage);
  const defs = el('defs', {}, svg);
  const dots = el('pattern', { id: 'dots', width: 36, height: 36, patternUnits: 'userSpaceOnUse' }, defs);
  el('circle', { cx: 18, cy: 18, r: 1.6, fill: '#343434' }, dots);
  el('filter', { id: 'abShadow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs)
    .appendChild(el('feDropShadow', { dx: 0, dy: 18, stdDeviation: 26, 'flood-color': '#000', 'flood-opacity': 0.5 }));
  const paperClip = el('clipPath', { id: 'paperClip' }, defs);
  el('rect', { x: PAPER.x, y: PAPER.y, width: PAPER.w, height: PAPER.h }, paperClip);
  const bodyClip = el('clipPath', { id: 'bodyClip' }, defs);
  el('path', { d: VAN.body }, bodyClip);
  const bodyClipM = el('clipPath', { id: 'bodyClipM' }, defs);
  el('path', { d: VAN.body, transform: `translate(${VAN.size.w} 0) scale(-1 1)` }, bodyClipM);
  const rearClip = el('clipPath', { id: 'rearClip' }, defs);
  el('path', { d: VAN.rear.body }, rearClip);

  const cfx = el('filter', { id: 'conceptFx', x: '-5%', y: '-5%', width: '110%', height: '110%', 'color-interpolation-filters': 'sRGB' }, defs);
  const cTurb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.011, numOctaves: 2, seed: 3, result: 'n' }, cfx);
  const cDisp = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 8, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }, cfx);
  const cBlur = el('feGaussianBlur', { in: 'd', stdDeviation: 1.4 }, cfx);
  const nfx = el('filter', { id: 'noiseFx', x: 0, y: 0, width: '100%', height: '100%' }, defs);
  const nTurb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.05, numOctaves: 4, seed: 1, stitchTiles: 'stitch' }, nfx);
  el('feColorMatrix', { type: 'matrix', values: '1.6 0 0 0 -0.2  0 1.5 0 0 -0.25  0 0 1.7 0 -0.3  0 0 0 0 1' }, nfx);
  const pfx = el('filter', { id: 'pencilFx', x: '-5%', y: '-5%', width: '110%', height: '110%' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.6, numOctaves: 1, seed: 7, result: 'pn' }, pfx);
  el('feDisplacementMap', { in: 'SourceGraphic', in2: 'pn', scale: 2.2, xChannelSelector: 'R', yChannelSelector: 'G' }, pfx);
  const studio = el('radialGradient', { id: 'studio', cx: '50%', cy: '40%', r: '75%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#F3F0EA' }, studio);
  el('stop', { offset: '100%', 'stop-color': '#B9B4AC' }, studio);
  const shade = el('linearGradient', { id: 'shade', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  [[0, '#FFFFFF', 0.28], [0.3, '#FFFFFF', 0], [0.62, '#000000', 0], [1, '#000000', 0.32]].forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, shade));
  const gradFor = {};
  for (const hex of new Set(EP.shapes.map((s) => s.fill).concat(EP.texts.map((x) => x.fill)))) {
    const id = 'cg' + hex.slice(1);
    const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 0.15, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': mix(hex, '#FFFFFF', 0.22) }, g);
    el('stop', { offset: '100%', 'stop-color': mix(hex, '#000000', 0.25) }, g);
    gradFor[hex] = `url(#${id})`;
  }

  function textNode(parent, x, attrs) {
    return el('text', Object.assign({ x: x.x, y: x.y, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': x.size, 'letter-spacing': x.spacing || 0, fill: x.fill }, attrs || {}), parent);
  }
  function drawWheels(parent, soft) {
    for (const w of VAN.wheels) {
      const g = el('g', {}, parent);
      el('circle', { cx: w.cx, cy: w.cy, r: w.r, fill: '#141414' }, g);
      el('circle', { cx: w.cx, cy: w.cy, r: w.r * 0.66, fill: soft ? '#9A9DA2' : '#B9BCC0' }, g);
      el('circle', { cx: w.cx, cy: w.cy, r: w.r * 0.57, fill: '#8E9297' }, g);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        el('line', { x1: w.cx, y1: w.cy, x2: w.cx + Math.cos(a) * w.r * 0.55, y2: w.cy + Math.sin(a) * w.r * 0.55, stroke: '#C9CCD0', 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
      }
      el('circle', { cx: w.cx, cy: w.cy, r: w.r * 0.17, fill: '#3A3A3C' }, g);
    }
  }
  function drawDetails(parent) {
    el('path', { d: VAN.body, fill: 'url(#shade)', 'clip-path': 'url(#bodyClip)' }, parent);
    for (const d of VAN.lines) el('path', Object.assign({ d, fill: 'none', stroke: '#000', 'stroke-opacity': 0.4, 'stroke-width': 1.6 }, NSS), parent);
    for (const d of VAN.glass) el('path', { d, fill: '#18212B' }, parent);
    for (const d of VAN.glassShine || []) el('path', { d, fill: '#FFFFFF', opacity: 0.14 }, parent);
    for (const p of VAN.parts) el('path', { d: p.d, fill: p.fill }, parent);
    el('path', Object.assign({ d: VAN.body, fill: 'none', stroke: '#000', 'stroke-opacity': 0.55, 'stroke-width': 1.6 }, NSS), parent);
  }
  // Livery artwork. mode: 'final' | 'concept'. mirror: offside (van facing left, text kept readable).
  function buildLivery(parent, mode, mirror) {
    const g = el('g', { 'clip-path': `url(#${mirror ? 'bodyClipM' : 'bodyClip'})` }, parent);
    const sg = mirror ? el('g', { transform: `translate(${VAN.size.w} 0) scale(-1 1)` }, g) : g;
    for (const s of EP.shapes) el('path', { d: dOf(s), fill: mode === 'concept' ? gradFor[s.fill] : s.fill }, sg);
    for (const x of EP.texts) {
      const xx = mirror ? Object.assign({}, x, { x: VAN.size.w - x.x }) : x;
      if (mode === 'concept') textNode(g, xx, { text: (EP.concept.garbled || {})[x.text] || x.text, fill: gradFor[x.fill], transform: `skewX(-3) translate(${x.y * 0.05} 0)` });
      else textNode(g, xx, { text: x.text });
    }
    return g;
  }

  // Shared art in defs: final livery (for zoom) and the AI-style concept.
  const liveryFinal = el('g', { id: 'liveryFinal' }, defs);
  buildLivery(liveryFinal, 'final');
  const conceptArt = el('g', { id: 'conceptArt', filter: 'url(#conceptFx)' }, defs);
  const usingImage = !!EP.concept.image;
  if (usingImage) el('image', { href: EP.concept.image, x: PA.x, y: PA.y, width: PA.w, height: PA.h, preserveAspectRatio: 'xMidYMid slice' }, conceptArt);
  else {
    el('rect', { x: PA.x, y: PA.y, width: PA.w, height: PA.h, fill: 'url(#studio)' }, conceptArt);
    el('ellipse', { cx: 500, cy: 424, rx: 540, ry: 22, fill: '#3A3026', opacity: 0.4 }, conceptArt);
    const cv = el('g', { transform: 'translate(6 -3) rotate(-0.8 500 210)' }, conceptArt);
    buildLivery(cv, 'concept');
    drawDetails(cv);
    drawWheels(cv, true);
  }

  // ---------- background, header, titles, pips ----------
  el('rect', { width: W, height: H, fill: C.bg }, svg);
  el('rect', { width: W, height: H, fill: 'url(#dots)' }, svg);
  const brand = el('text', { x: 90, y: 104, 'font-family': DISPLAY, 'font-size': 46, 'letter-spacing': 2, fill: '#fff' }, svg);
  el('tspan', { text: 'VECTOR ' }, brand);
  el('tspan', { text: 'EDGE', fill: C.yellow }, brand);
  el('text', { x: 990, y: 102, 'text-anchor': 'end', 'font-family': BODY, 'font-weight': 500, 'font-size': 32, fill: C.grey, 'letter-spacing': 1, text: `FROM IDEA TO VAN · EP ${String(EP.number).padStart(2, '0')}` }, svg);

  const TITLES = {
    brief: { num: '01', main: 'THE BRIEF', sub: 'Who it’s for and what it has to say' },
    sketch: { num: '02', main: 'SKETCH', sub: 'The rough idea, on the van template' },
    concept: { num: '02', main: 'AI CONCEPT', sub: 'The sketch, turned into a look' },
    vector: { num: '03', main: 'VECTOR', sub: 'Redrawn clean with the pen tool' },
    colour: { num: '03', main: 'VECTOR', sub: 'Exact colours locked in' },
    zoom: { num: '', main: 'WHY VECTOR?', sub: 'Same design, zoomed right in' },
    van: { num: '04', main: 'ON THE VAN', sub: `Wrapped onto a ${VAN.name}` },
  };
  const titleEls = {};
  for (const k in TITLES) {
    const g = el('g', { opacity: 0 }, svg);
    const tt = el('text', { x: 90, y: 262, 'font-family': DISPLAY, 'font-size': 150, fill: '#fff' }, g);
    if (TITLES[k].num) el('tspan', { text: TITLES[k].num + ' ', fill: C.yellow }, tt);
    el('tspan', { text: TITLES[k].main }, tt);
    const sub = el('text', { x: 92, y: 318, 'font-family': BODY, 'font-weight': 500, 'font-size': 40, fill: C.grey, text: TITLES[k].sub }, svg);
    titleEls[k] = { g, sub };
  }
  const PIPS = ['BRIEF', 'CONCEPT', 'VECTOR', 'VAN', '3D'];
  const pipW = (900 - 4 * 18) / 5;
  const pipEls = PIPS.map((label, i) => {
    const x = 90 + i * (pipW + 18);
    el('rect', { x, y: 350, width: pipW, height: 8, rx: 4, fill: C.line }, svg);
    const fill = el('rect', { x, y: 350, width: 0, height: 8, rx: 4, fill: C.yellow }, svg);
    const txt = el('text', { x, y: 395, 'font-family': DISPLAY, 'font-size': 30, 'letter-spacing': 2, fill: C.grey, text: label }, svg);
    return { fill, txt };
  });

  // ---------- brief card ----------
  const brief = el('g', { opacity: 0 }, svg);
  el('rect', { x: 90, y: 470, width: 900, height: 900, rx: 26, fill: '#232323', stroke: '#3E3E3E', 'stroke-width': 2 }, brief);
  el('text', { x: 130, y: 540, 'font-family': DISPLAY, 'font-size': 44, 'letter-spacing': 3, fill: C.yellow, text: 'CREATIVE BRIEF' }, brief);
  el('rect', { x: 130, y: 562, width: 820, height: 2, fill: '#3E3E3E' }, brief);
  let by = 630;
  const briefRows = EP.brief.map((r) => {
    const size = r.key ? 54 : 44, lh = r.key ? 60 : 52;
    const lines = wrap(r.value, r.key ? 24 : 31);
    const label = el('text', { x: 130, y: by, 'font-family': DISPLAY, 'font-size': 30, 'letter-spacing': 2, fill: C.grey, text: r.label, opacity: 0 }, brief);
    const hl = r.key ? el('rect', { x: 330, y: by - 46, width: 0, height: lines.length * lh + 14, rx: 6, fill: C.yellow, opacity: 0.22 }, brief) : null;
    const nodes = lines.map((_, i) => el('text', { x: 340, y: by + i * lh, 'font-family': BODY, 'font-weight': 600, 'font-size': size, fill: r.key ? C.yellow : '#fff' }, brief));
    const row = { r, lines, label, nodes, hl, y: by, lh };
    by += lines.length * lh + 30;
    return row;
  });
  const briefChars = briefRows.reduce((a, r) => a + r.lines.join(' ').length, 0);

  // ---------- paper + art (camera) ----------
  const paperG = el('g', {}, svg);
  const paperRect = el('rect', { x: PAPER.x, y: PAPER.y, width: PAPER.w, height: PAPER.h, fill: '#FBFAF6', filter: 'url(#abShadow)' }, paperG);
  const clipG = el('g', { 'clip-path': 'url(#paperClip)' }, paperG);
  const cam = el('g', { transform: camT(DEF) }, clipG);
  const sketchLayer = el('g', { fill: 'none', stroke: C.graphite, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cam);
  const conceptLayer = el('g', {}, cam);
  el('use', { href: '#conceptArt' }, conceptLayer);
  const noise = el('rect', { x: PA.x, y: PA.y, width: PA.w, height: PA.h, filter: 'url(#noiseFx)', opacity: 0 }, cam);
  const fillLayer = el('g', { 'clip-path': 'url(#bodyClip)' }, cam);
  const textLayer = el('g', { 'clip-path': 'url(#bodyClip)' }, cam);
  const realLayer = el('g', { opacity: 0 }, cam);
  const floorShadow = el('ellipse', { cx: 500, cy: 424, rx: 540, ry: 18, fill: '#000', opacity: 0.55 }, realLayer);
  drawDetails(realLayer);
  drawWheels(realLayer, false);
  const tplLayer = el('g', { fill: 'none', stroke: C.tpl }, cam);
  el('path', Object.assign({ d: VAN.body, 'stroke-width': 2 }, NSS), tplLayer);
  for (const d of VAN.glass) el('path', Object.assign({ d, fill: '#DCE4EE', 'fill-opacity': 0.7, 'stroke-width': 1.6 }, NSS), tplLayer);
  for (const d of VAN.lines) el('path', Object.assign({ d, 'stroke-width': 1.4 }, NSS), tplLayer);
  for (const w of VAN.wheels) el('circle', Object.assign({ cx: w.cx, cy: w.cy, r: w.r, 'stroke-width': 1.4, 'stroke-dasharray': '6 5' }, NSS), tplLayer);
  for (const p of VAN.parts) el('path', Object.assign({ d: p.d, 'stroke-width': 1.2 }, NSS), tplLayer);
  const tplLabel = el('text', { x: 0, y: 452, 'text-anchor': 'start', 'font-family': BODY, 'font-weight': 500, 'font-size': 20, fill: C.tpl, stroke: 'none', text: `${VAN.name.toUpperCase()} · NEARSIDE TEMPLATE` }, tplLayer);
  const traceLayer = el('g', { fill: 'none', stroke: C.blue, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, cam);
  const anchorLayer = el('g', {}, cam);
  const handleLayer = el('g', {}, cam);
  const typeBox = el('rect', Object.assign({ fill: 'none', stroke: C.blue, 'stroke-width': 2, 'stroke-dasharray': '9 6', opacity: 0 }, NSS), cam);
  const caret = el('rect', { width: 4, fill: C.blue, opacity: 0 }, cam);
  const pen = el('g', { opacity: 0 }, cam);
  el('path', { d: 'M0 0 L12 -34 L34 -12 Z', fill: '#fff', stroke: '#111', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, pen);
  el('path', { d: 'M12 -34 L30 -52 L52 -30 L34 -12', fill: '#111', stroke: '#111', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, pen);
  const pencil = el('g', { opacity: 0 }, cam);
  el('path', { d: 'M0 0 L5 -15 L15 -5 Z', fill: '#2A2A2A' }, pencil);
  el('path', { d: 'M5 -15 L12 -34 L34 -12 L15 -5 Z', fill: '#E9CBA0' }, pencil);
  el('path', { d: 'M12 -34 L70 -92 L92 -70 L34 -12 Z', fill: '#F2C230', stroke: '#B98F12', 'stroke-width': 1.5 }, pencil);
  el('path', { d: 'M70 -92 L80 -102 L102 -80 L92 -70 Z', fill: '#E67E9A' }, pencil);
  const hLines = [0, 1].map(() => el('line', Object.assign({ stroke: C.blue, 'stroke-width': 1.6, opacity: 0 }, NSS), handleLayer));
  const hDots = [0, 1].map(() => el('circle', { r: 5, fill: C.blue, opacity: 0 }, handleLayer));

  // Live shapes
  const SH = EP.shapes.map((s, i) => {
    const d = dOf(s);
    const cp = el('clipPath', { id: 'fc' + i, clipPathUnits: 'userSpaceOnUse' }, defs);
    const clipC = el('circle', { r: 0 }, cp);
    const fill = el('path', { d, fill: s.fill, 'clip-path': `url(#fc${i})` }, fillLayer);
    const trace = s.trace === false ? null : el('path', Object.assign({ d }, NSS), traceLayer);
    return { s, d, fill, trace, clipC, anchors: [], segs: [] };
  });
  const TX = EP.texts.map((x) => ({ x, node: el('text', { 'font-family': DISPLAY, 'font-size': x.size, 'letter-spacing': x.spacing || 0, fill: C.ink, opacity: 0 }, textLayer) }));

  // ---------- readouts ----------
  const RY = 1130;
  const prompt = el('g', { opacity: 0 }, svg);
  el('rect', { x: 90, y: RY + 20, width: 900, height: 180, rx: 22, fill: '#262626', stroke: '#3E3E3E', 'stroke-width': 2 }, prompt);
  el('text', { x: 124, y: RY + 74, 'font-family': DISPLAY, 'font-size': 34, fill: C.yellow, 'letter-spacing': 2, text: '✦ PROMPT  +  SKETCH.PNG' }, prompt);
  const promptLines = wrap('“' + EP.concept.prompt + '”', 54);
  const promptTxt = promptLines.map((_, i) => el('text', { x: 124, y: RY + 122 + i * 40, 'font-family': BODY, 'font-size': 34, fill: '#EDEDE6' }, prompt));
  const genRect = el('rect', { x: 790, y: RY + 40, width: 176, height: 50, rx: 25, fill: '#3A3A3A' }, prompt);
  const genTxt = el('text', { x: 878, y: RY + 75, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 30, 'letter-spacing': 2, fill: '#fff', text: 'GENERATE' }, prompt);
  const genBar = el('rect', { x: 90, y: RY + 194, width: 0, height: 6, fill: C.yellow }, prompt);

  const tool = el('g', { opacity: 0 }, svg);
  el('rect', { x: 90, y: RY + 40, width: 900, height: 96, rx: 22, fill: '#262626', stroke: '#3E3E3E', 'stroke-width': 2 }, tool);
  const toolName = el('text', { x: 124, y: RY + 102, 'font-family': DISPLAY, 'font-size': 44, 'letter-spacing': 2, fill: '#fff' }, tool);
  const toolCount = el('text', { x: 956, y: RY + 102, 'text-anchor': 'end', 'font-family': BODY, 'font-weight': 500, 'font-size': 38, fill: C.grey }, tool);

  const swW = 900 / EP.palette.length;
  const swatches = EP.palette.map((p, i) => {
    const g = el('g', { opacity: 0 }, svg);
    const x = 90 + i * swW;
    el('circle', { cx: x + 32, cy: RY + 90, r: 32, fill: p.hex, stroke: '#555', 'stroke-width': 2 }, g);
    el('text', { x: x + 74, y: RY + 84, 'font-family': DISPLAY, 'font-size': 28, 'letter-spacing': 1, fill: '#fff', text: p.name.toUpperCase() }, g);
    el('text', { x: x + 74, y: RY + 116, 'font-family': BODY, 'font-weight': 500, 'font-size': 28, fill: C.grey, text: p.hex.toUpperCase() }, g);
    return g;
  });

  // Export panels (real elements, kept off-screen; thumbnails <use> them)
  const exportStage = el('g', { transform: 'translate(-30000 0)' }, svg);
  const exNear = el('g', { id: 'exNear' }, exportStage);
  buildLivery(exNear, 'final', false);
  const exOff = el('g', { id: 'exOff' }, exportStage);
  buildLivery(exOff, 'final', true);
  const exRear = el('g', { id: 'exRear' }, exportStage);
  {
    const g = el('g', { 'clip-path': 'url(#rearClip)' }, exRear);
    for (const s of EP.rear.shapes) el('path', { d: dOf(s), fill: s.fill }, g);
    for (const x of EP.rear.texts) textNode(g, x, { text: x.text });
  }
  const panelsG = el('g', { opacity: 0 }, svg);
  el('text', { x: 90, y: RY + 70, 'font-family': DISPLAY, 'font-size': 36, 'letter-spacing': 2, fill: C.yellow, text: 'EXPORTED FOR THE 3D MOCKUP · SVG + PNG' }, panelsG);
  const thumbs = [
    { id: 'exNear', label: 'NEARSIDE', vb: `0 0 ${VAN.size.w} ${VAN.size.h}`, w: 370, h: 156 },
    { id: 'exOff', label: 'OFFSIDE', vb: `0 0 ${VAN.size.w} ${VAN.size.h}`, w: 370, h: 156 },
    { id: 'exRear', label: 'REAR', vb: `0 0 ${VAN.rear.size.w} ${VAN.rear.size.h}`, w: 130, h: 110 },
  ];
  let tx0 = 90;
  const thumbEls = thumbs.map((th, i) => {
    const g = el('g', { opacity: 0 }, panelsG);
    const ty = RY + 96 + (156 - th.h);
    el('rect', { x: tx0 - 6, y: RY + 90, width: th.w + 12, height: 168, rx: 10, fill: '#262626', stroke: '#3E3E3E', 'stroke-width': 2 }, g);
    const s = el('svg', { x: tx0, y: ty - 2, width: th.w, height: th.h, viewBox: th.vb }, g);
    el('use', { href: '#' + th.id }, s);
    el('text', { x: tx0, y: RY + 296, 'font-family': DISPLAY, 'font-size': 28, 'letter-spacing': 2, fill: '#fff', text: th.label }, g);
    tx0 += th.w + 25;
    return g;
  });

  // Zoom panels
  const zoomG = el('g', { opacity: 0 }, svg);
  const zoomPct = Math.round(VAN.size.w / EP.zoom.w) * 100;
  const panels = [
    { y: 490, href: '#conceptArt', label: `AI IMAGE · ${zoomPct}%`, chip: '#B23A2A' },
    { y: 1040, href: '#liveryFinal', label: `VECTOR · ${zoomPct}%`, chip: C.blue },
  ].map((p) => {
    const g = el('g', { transform: `translate(90,${p.y})` }, zoomG);
    el('rect', { x: -4, y: -4, width: 908, height: 528, rx: 6, fill: '#fff', stroke: '#444', 'stroke-width': 2 }, g);
    const inner = el('svg', { x: 0, y: 0, width: 900, height: 520, viewBox: '0 0 1000 1000', preserveAspectRatio: 'xMidYMid slice' }, g);
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

  // Intro overlay
  const intro = el('g', {}, svg);
  el('rect', { width: W, height: H, fill: C.charcoal }, intro);
  const introLines = [['FROM', '#fff'], ['IDEA', C.yellow], ['TO VAN.', '#fff']].map(([s, f], i) => el('text', { x: 90, y: 780 + i * 230, 'font-family': DISPLAY, 'font-size': 270, fill: f, text: s }, intro));
  const introRule = el('rect', { x: 90, y: 1300, width: 0, height: 10, fill: C.yellow }, intro);
  const introEp = el('text', { x: 92, y: 1390, 'font-family': BODY, 'font-weight': 600, 'font-size': 54, 'letter-spacing': 2, fill: '#fff', text: `EP ${String(EP.number).padStart(2, '0')} · ${EP.title.toUpperCase()}` }, intro);
  const introSub = el('text', { x: 92, y: 1452, 'font-family': BODY, 'font-weight': 500, 'font-size': 44, fill: C.grey, text: EP.subtitle }, intro);

  // Outro overlay
  const outro = el('g', { opacity: 0 }, svg);
  el('rect', { width: W, height: H, fill: C.charcoal }, outro);
  const oBrand = el('text', { x: 540, y: 820, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 210, 'letter-spacing': 4, fill: '#fff' }, outro);
  el('tspan', { text: 'VECTOR ' }, oBrand);
  el('tspan', { text: 'EDGE', fill: C.yellow }, oBrand);
  el('rect', { x: 340, y: 870, width: 400, height: 10, fill: C.yellow }, outro);
  el('text', { x: 540, y: 990, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 600, 'font-size': 58, fill: '#fff', text: 'Got an idea for your van? Send it over.' }, outro);
  el('text', { x: 540, y: 1058, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 500, 'font-size': 46, fill: C.grey, text: 'Even a sketch on a napkin. We’ll take it from there.' }, outro);
  el('text', { x: 540, y: 1290, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 100, 'letter-spacing': 3, fill: C.yellow, text: 'VECTOREDGE.CO.UK' }, outro);
  el('text', { x: 540, y: 1370, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 600, 'font-size': 56, 'letter-spacing': 2, fill: '#fff', text: '07348 580359' }, outro);

  const disclaimer = EP.disclaimer ? el('text', { x: 540, y: 1800, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 500, 'font-size': 26, 'letter-spacing': 1.5, fill: '#8A8A84', text: EP.disclaimer }, svg) : null;

  // ---------- measurements (after fonts load) ----------
  let traceW = null, typeW = null, sketchItems = [], camKeys = [];
  const traceA = 0.5, traceB = 6.9, typeA = 7.1, typeB = 9.6;
  function lastPt(cmds, k) { for (let j = k; j >= 0; j--) if (cmds[j][0] !== 'Z') return cmds[j].slice(-2); return [0, 0]; }
  function noiseAt(i, seed) { return Math.sin(i * 0.37 + seed) * 1.6 + Math.sin(i * 1.13 + seed * 2.1) * 0.9 + Math.sin(i * 0.09 + seed * 0.7) * 2.2; }
  function wobbly(path, seed) {
    const L = path.getTotalLength(), n = Math.max(8, Math.round(L / 5)), pts = [];
    for (let i = 0; i <= n; i++) pts.push(path.getPointAtLength((L * i) / n));
    let d = '';
    pts.forEach((p, i) => {
      const q = pts[Math.min(n, i + 1)], o = pts[Math.max(0, i - 1)];
      const dx = q.x - o.x, dy = q.y - o.y, len = Math.hypot(dx, dy) || 1;
      const off = noiseAt(i, seed);
      d += (i ? ' L ' : 'M ') + (p.x - (dy / len) * off).toFixed(1) + ' ' + (p.y + (dx / len) * off).toFixed(1);
    });
    return d;
  }

  function measure() {
    const probe = el('path', {}, svg);
    SH.forEach((sh, i) => {
      const bb = sh.fill.getBBox();
      sh.bb = bb;
      set(sh.clipC, { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 });
      sh.rMax = Math.hypot(bb.width, bb.height) / 2 + 2;
      if (!sh.trace) return;
      sh.len = sh.trace.getTotalLength();
      set(sh.trace, { 'stroke-dasharray': sh.len + ' ' + sh.len });
      const cmds = sh.s.cmds;
      let cum = 0;
      for (let k = 0; k < cmds.length; k++) {
        if (k > 0) { probe.setAttribute('d', VE.toD(cmds.slice(0, k + 1))); cum = probe.getTotalLength(); }
        const c = cmds[k];
        const si = { type: c[0], cum, from: k > 0 ? sh.segs[k - 1].cum : 0 };
        if (c[0] === 'C') { si.c1 = [c[1], c[2]]; si.c2 = [c[3], c[4]]; si.end = [c[5], c[6]]; si.start = lastPt(cmds, k - 1); }
        sh.segs.push(si);
        if (c[0] !== 'Z') {
          const p = c.slice(-2);
          sh.anchors.push({ cum, node: el('rect', { x: p[0] - 5, y: p[1] - 5, width: 10, height: 10, fill: '#fff', stroke: C.blue, 'stroke-width': 2, opacity: 0 }, anchorLayer) });
        }
      }
    });
    probe.remove();
    // Pen-tool time share
    const tr = SH.filter((s) => s.trace);
    const wts = tr.map((s) => Math.sqrt(s.len) * 10 + 60), tot = wts.reduce((a, b) => a + b, 0);
    let a = 0;
    tr.forEach((s, i) => { s.win = { a: lerp(traceA, traceB, a / tot), b: lerp(traceA, traceB, (a + wts[i]) / tot) }; a += wts[i]; });
    // Type tool
    TX.forEach((tx, i) => {
      const n = tx.node;
      n.textContent = tx.x.text;
      tx.fullW = n.getComputedTextLength();
      tx.x0 = tx.x.x - tx.fullW / 2;
      set(n, { x: tx.x0, y: tx.x.y });
      tx.prefixW = [];
      for (let k = 0; k <= tx.x.text.length; k++) { n.textContent = tx.x.text.slice(0, k); tx.prefixW.push(k ? n.getComputedTextLength() : 0); }
      n.textContent = '';
      tx.win = { a: typeA + (i * (typeB - typeA)) / TX.length, b: typeA + ((i + 1) * (typeB - typeA)) / TX.length };
      tx.capH = tx.x.size * 0.72;
      tx.bb = { x: tx.x0, y: tx.x.y - tx.capH, width: tx.fullW, height: tx.capH };
    });
    // Camera keyframes from the episode's camera list
    const specs = (EP.camera || []).map((c) => {
      const items = SH.filter((s) => (c.shapes || []).includes(s.s.id) && s.win).concat(TX.filter((t) => (c.texts || []).includes(t.x.id)));
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
        camKeys.push({ t: sp.a - R, c: DEF });
        camKeys.push({ t: sp.a, c: sp });
      } else camKeys.push({ t: Math.max(sp.a, prev.b) + R, c: sp });
      camKeys.push({ t: sp.b, c: sp });
    });
    if (specs.length) camKeys.push({ t: specs[specs.length - 1].b + R, c: DEF });

    // Pencil sketch strokes (from the design, made wobbly) + rough lettering + notes
    const order = [];
    const ids = (EP.sketchOrder || null);
    TX.filter((t) => t.x.size >= 60 || /^l[123]$/.test(t.x.id)).forEach((t) => order.push({ kind: 'text', t }));
    SH.filter((s) => s.trace).forEach((s) => order.push({ kind: 'shape', s }));
    TX.filter((t) => !order.find((o) => o.t === t)).forEach((t) => order.push({ kind: 'text', t }));
    order.forEach((o, i) => {
      if (o.kind === 'shape') {
        const g = el('g', {}, sketchLayer);
        const p1 = el('path', Object.assign({ d: wobbly(o.s.trace, i * 3.1), 'stroke-width': 1.8, opacity: 0.85 }, NSS), g);
        const p2 = el('path', Object.assign({ d: wobbly(o.s.trace, i * 7.7 + 11), 'stroke-width': 1.1, opacity: 0.5 }, NSS), g);
        [p1, p2].forEach((p) => { p.len = p.getTotalLength(); set(p, { 'stroke-dasharray': p.len + ' ' + p.len, 'stroke-dashoffset': p.len }); });
        sketchItems.push({ kind: 'shape', paths: [p1, p2], w: Math.sqrt(o.s.len) * 8 + 30, tip: p1 });
      } else {
        const cp = el('clipPath', { id: 'sk' + i, clipPathUnits: 'userSpaceOnUse' }, defs);
        const r = el('rect', { x: o.t.x0 - 10, y: o.t.x.y - o.t.capH - 12, width: 0, height: o.t.capH + 26 }, cp);
        const n = textNode(sketchLayer, o.t.x, { text: o.t.x.text, fill: 'none', stroke: C.graphite, 'stroke-width': 1.3, filter: 'url(#pencilFx)', 'clip-path': `url(#sk${i})` });
        set(n, NSS);
        sketchItems.push({ kind: 'text', rect: r, t: o.t, w: 120 });
      }
    });
    const tot2 = sketchItems.reduce((a2, s) => a2 + s.w, 0);
    let a2 = 0;
    sketchItems.forEach((s) => { s.a = lerp(0.9, 4.4, a2 / tot2); s.b = lerp(0.9, 4.4, (a2 + s.w) / tot2); a2 += s.w; });
    (EP.sketchNotes || []).forEach((nt, i) => {
      const a = 4.4 + i * 0.45, b = a + 0.55;
      const txt = el('text', { x: nt.x, y: nt.y, 'font-family': BODY, 'font-weight': 500, 'font-size': 26, fill: C.graphite, stroke: 'none', transform: `skewX(-10) translate(${nt.y * 0.176} 0)`, opacity: 0 }, sketchLayer);
      const [p, q] = nt.arrow, mx = (p[0] + q[0]) / 2 + (q[1] - p[1]) * 0.18, my = (p[1] + q[1]) / 2 - (q[0] - p[0]) * 0.18;
      const ang = Math.atan2(q[1] - my, q[0] - mx), hl = 16;
      const d = `M ${p[0]} ${p[1]} Q ${mx} ${my} ${q[0]} ${q[1]} M ${q[0] - hl * Math.cos(ang - 0.5)} ${q[1] - hl * Math.sin(ang - 0.5)} L ${q[0]} ${q[1]} L ${q[0] - hl * Math.cos(ang + 0.5)} ${q[1] - hl * Math.sin(ang + 0.5)}`;
      const ar = el('path', Object.assign({ d, 'stroke-width': 1.8 }, NSS), sketchLayer);
      ar.len = ar.getTotalLength() + 60;
      set(ar, { 'stroke-dasharray': ar.len + ' ' + ar.len, 'stroke-dashoffset': ar.len });
      sketchItems.push({ kind: 'note', txt, full: nt.text, ar, a, b });
    });
  }

  function camAt(lv) {
    if (!camKeys.length || lv <= camKeys[0].t) return DEF;
    for (let i = 0; i < camKeys.length - 1; i++) {
      const A = camKeys[i], B = camKeys[i + 1];
      if (lv >= A.t && lv <= B.t) {
        const p = eio(seg(lv, A.t, B.t));
        return { x: lerp(A.c.x, B.c.x, p), y: lerp(A.c.y, B.c.y, p), k: lerp(A.c.k, B.c.k, p) };
      }
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
    introLines.forEach((n, i) => { const p = eout(seg(li, 0.1 + i * 0.16, 0.6 + i * 0.16)); set(n, { opacity: p, transform: `translate(0 ${(1 - p) * 80})` }); });
    set(introRule, { width: 900 * eio(seg(li, 0.6, 1.3)) });
    set(introEp, { opacity: seg(li, 0.9, 1.3) });
    set(introSub, { opacity: seg(li, 1.1, 1.5) });
    set(intro, { opacity: 1 - seg(li, T.intro.dur - 0.45, T.intro.dur), display: t < T.intro.end ? 'inline' : 'none' });

    // Titles
    const keys = Object.keys(TITLES);
    keys.forEach((k, idx) => {
      const prev = keys[idx - 1], next = keys[idx + 1];
      const same = (o) => o && TITLES[o].main === TITLES[k].main && TITLES[o].num === TITLES[k].num;
      const a = T[k].start, b = T[k].end;
      const fin = same(prev) ? 1 : eout(seg(t, a, a + 0.4));
      const fout = same(next) ? 0 : seg(t, b - 0.25, b);
      const op = t >= a && t < b ? fin * (1 - fout) : 0;
      set(titleEls[k].g, { opacity: op, transform: `translate(${(1 - fin) * -40} 0)` });
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
      let n = Math.floor(briefChars * seg(lb, 0.4, 4.4)), used = 0;
      briefRows.forEach((row) => {
        set(row.label, { opacity: n > used || (n === used && n > 0) ? 1 : used === 0 && lb > 0.4 ? 1 : 0 });
        row.lines.forEach((line, i) => {
          const take = clamp(n - used, 0, line.length);
          row.nodes[i].textContent = line.slice(0, take) + (take > 0 && take < line.length && frame % 14 < 9 ? '▌' : '');
          used += line.length + (i < row.lines.length - 1 ? 1 : 0);
        });
        used += 1;
        if (row.hl) {
          const done = n >= used - 1;
          set(row.hl, { width: done ? 600 * eout(seg(lb, 4.5, 5.0)) : 0 });
        }
      });
    }

    // Paper visible from sketch to end of colour (+fade in zoom); van stage keeps the clip, paper fades to dark
    const ls = lt(t, 'sketch'), lc = lt(t, 'concept'), lv = lt(t, 'vector'), lcol = lt(t, 'colour'), lz = lt(t, 'zoom'), lvn = lt(t, 'van');
    const paperIn = eout(seg(t, T.sketch.start, T.sketch.start + 0.45));
    const hidePaper = t >= T.zoom.start && t < T.van.start ? seg(lz, 0, 0.35) : 0;
    const vanFadeOut = t >= T.van.start ? seg(lvn, T.van.dur - 0.3, T.van.dur) : 0;
    const paperOp = t < T.sketch.start ? 0 : t >= T.handoff.start ? 0 : paperIn * (1 - hidePaper) * (1 - vanFadeOut) * (t >= T.van.start ? eout(seg(lvn, 0, 0.35)) : 1);
    set(paperG, { opacity: paperOp, display: paperOp > 0.001 ? 'inline' : 'none' });
    set(paperRect, { opacity: t >= T.van.start ? 1 - eio(seg(lvn, 0.2, 0.9)) : 1 });

    // Camera
    let c = DEF;
    if (within(t, 'vector')) c = camAt(lv);
    if (t >= T.van.start) c = { x: DEF.x, y: DEF.y + 10, k: lerp(0.98, 1.07, eio(seg(lvn, 0, T.van.dur))) };
    set(cam, { transform: camT(c) });
    const inv = 1 / (S * c.k);

    // Template lines
    let tplOp = eout(seg(ls, 0.15, 0.7));
    if (t >= T.concept.start) tplOp = 1 - seg(lc, 2.2, 2.7);
    if (t >= T.vector.start) tplOp = seg(lv, 0, 0.5);
    if (t >= T.van.start) tplOp = 1 - seg(lvn, 0.1, 0.6);
    set(tplLayer, { opacity: tplOp });
    set(tplLabel, { opacity: t < T.colour.start ? 1 : 1 - seg(lcol, 0, 0.5) });

    // Sketch
    let pencilPt = null;
    let skOp = t < T.concept.start ? 1 : 1 - seg(lc, 2.2, 2.7);
    set(sketchLayer, { opacity: t >= T.sketch.start ? skOp : 0 });
    sketchItems.forEach((s) => {
      const p = t < T.sketch.start ? 0 : seg(ls, s.a, s.b);
      if (s.kind === 'shape') {
        s.paths.forEach((pa, j) => set(pa, { 'stroke-dashoffset': pa.len * (1 - clamp(p * 1.15 - j * 0.15)) }));
        if (p > 0 && p < 1) { const q = s.tip.getPointAtLength(s.tip.len * p); pencilPt = [q.x, q.y]; }
      } else if (s.kind === 'text') {
        set(s.rect, { width: (s.t.fullW + 24) * p });
        if (p > 0 && p < 1) pencilPt = [s.t.x0 + s.t.fullW * p, s.t.x.y - s.t.capH * (0.5 + 0.4 * Math.sin(p * 40))];
      } else {
        const n = Math.round(s.full.length * p);
        s.txt.textContent = s.full.slice(0, n);
        set(s.txt, { opacity: n ? 1 : 0 });
        set(s.ar, { 'stroke-dashoffset': s.ar.len * (1 - seg(ls, s.b - 0.1, s.b + 0.3)) });
        if (p > 0 && p < 1) pencilPt = [s.txt.getBBox().x + s.txt.getBBox().width + 4, s.txt.getBBox().y + 26];
      }
    });
    set(pencil, { opacity: pencilPt && within(t, 'sketch') ? 1 : 0, transform: pencilPt ? `translate(${pencilPt[0]} ${pencilPt[1]}) scale(${inv})` : '' });

    // Concept generation (sketch → noise → AI image)
    const g = seg(lc, 2.6, 4.8), ge = eout(g);
    set(cDisp, { scale: lerp(240, usingImage ? 0 : 8, ge) });
    set(cBlur, { stdDeviation: lerp(36, usingImage ? 0 : 1.4, ge) });
    set(cTurb, { seed: g < 1 ? 3 + (frame % 97) : 3 });
    set(nTurb, { seed: 1 + (frame % 89) });
    let nOp = 0;
    if (within(t, 'concept')) nOp = lc < 2.6 ? eio(seg(lc, 2.1, 2.6)) : Math.pow(1 - g, 0.8);
    set(noise, { opacity: nOp });
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
        const caretHere = n < full.length && n >= used && n <= used + line.length;
        promptTxt[i].textContent = line.slice(0, take) + (caretHere && frame % 16 < 10 ? '|' : '');
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
    const outlineFade = t < T.colour.start ? 1 : 1 - seg(lcol, 2.4, 3.2);
    SH.forEach((sh, i) => {
      if (sh.trace) {
        const p = t < T.vector.start ? 0 : seg(lv, sh.win.a, sh.win.b);
        const L = sh.len * p;
        set(sh.trace, { 'stroke-dashoffset': sh.len - L, opacity: outlineFade });
        sh.anchors.forEach((a) => { const on = p > 0 && L >= a.cum - 0.5; if (on) anchorCount++; set(a.node, { opacity: on ? outlineFade : 0, transform: '' }); });
        if (p > 0 && p < 1) { const q = sh.trace.getPointAtLength(L); penPt = [q.x, q.y]; hs = sh.segs.find((s) => s.type === 'C' && L >= s.from && L <= s.cum) || null; }
      }
      const fp = t < T.colour.start ? 0 : eout(seg(lcol, 0.2 + i * 0.12, 0.8 + i * 0.12));
      set(sh.clipC, { r: sh.rMax * fp });
    });
    set(pen, { opacity: penPt ? 1 : 0, transform: penPt ? `translate(${penPt[0]} ${penPt[1]}) scale(${inv})` : '' });
    if (hs) [[hs.start, hs.c1], [hs.end, hs.c2]].forEach(([a, cc], k) => { set(hLines[k], { x1: a[0], y1: a[1], x2: cc[0], y2: cc[1], opacity: 1 }); set(hDots[k], { cx: cc[0], cy: cc[1], r: 5 * inv * 1.1, opacity: 1 }); });
    else hLines.concat(hDots).forEach((n) => set(n, { opacity: 0 }));

    // Type tool
    let typing = null;
    TX.forEach((tx, i) => {
      const p = t < T.vector.start ? 0 : seg(lv, tx.win.a, tx.win.b - 0.12);
      const n = Math.round(tx.x.text.length * p);
      tx.node.textContent = tx.x.text.slice(0, n);
      const cp = t < T.colour.start ? 0 : seg(lcol, 1.6 + i * 0.15, 2.1 + i * 0.15);
      set(tx.node, { opacity: n > 0 ? 1 : 0, fill: mix(C.ink, tx.x.fill, cp) });
      if (within(t, 'vector') && lv >= tx.win.a && lv < tx.win.b + 0.3) typing = { tx, n, done: lv >= tx.win.b };
    });
    if (typing) {
      const { tx, n } = typing;
      set(typeBox, { x: tx.x0 - 10, y: tx.x.y - tx.capH - 10, width: tx.fullW + 20, height: tx.capH + 20, opacity: 1 });
      set(caret, { x: tx.x0 + tx.prefixW[n] + 2, y: tx.x.y - tx.capH - 4, width: 3.5 * inv, height: tx.capH + 8, opacity: typing.done ? (frame % 16 < 9 ? 1 : 0) : 1 });
    } else { set(typeBox, { opacity: 0 }); set(caret, { opacity: 0 }); }

    // Tool chip
    set(tool, { opacity: t >= T.vector.start && t < T.colour.start + 0.3 ? eout(seg(lv, 0.2, 0.5)) * (1 - seg(lcol, 0, 0.3)) : 0 });
    toolName.textContent = lv < typeA - 0.1 ? 'PEN TOOL' : 'TYPE TOOL';
    toolCount.textContent = lv < typeA - 0.1 ? `Anchor points: ${anchorCount}` : `Bebas Neue · ${TX.length} lines`;

    // Swatches
    swatches.forEach((s, i) => {
      const on = t >= T.colour.start && t < T.zoom.start + 0.4;
      const p = on ? eback(seg(lcol, 0.3 + i * 0.25, 0.8 + i * 0.25)) * (1 - seg(lz, 0, 0.35)) : 0;
      set(s, { opacity: clamp(p), transform: `translate(0 ${(1 - clamp(p)) * 30})` });
    });

    // Zoom
    const zOp = within(t, 'zoom') ? eout(seg(lz, 0.25, 0.65)) * (1 - seg(lz, T.zoom.dur - 0.3, T.zoom.dur)) : 0;
    set(zoomG, { opacity: zOp, display: zOp > 0.001 ? 'inline' : 'none' });
    if (zOp > 0) {
      const zp = eio(seg(lz, 0.6, 2.0)), Z = EP.zoom;
      const fw = VAN.size.w * 1.08, fh = fw * (520 / 900), full = { x: VAN.size.w / 2 - fw / 2, y: 210 - fh / 2, w: fw, h: fh };
      const vb = [lerp(full.x, Z.x, zp), lerp(full.y, Z.y, zp), lerp(full.w, Z.w, zp), lerp(full.h, Z.h, zp)];
      panels.forEach((p) => set(p.inner, { viewBox: vb.join(' ') }));
    }

    // Real van + exported panels
    set(realLayer, { opacity: t >= T.van.start ? eio(seg(lvn, 0.1, 0.7)) : 0 });
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
    const lo = lt(t, 'outro');
    const oOp = t >= T.outro.start ? eout(seg(lo, 0, 0.45)) : 0;
    set(outro, { opacity: oOp, display: oOp > 0 ? 'inline' : 'none' });
    set(footer, { opacity: t >= T.intro.end - 0.4 ? 1 : 0 });
  }

  // ---------- export: panel artwork as a tree the renderer turns into SVG/PNG ----------
  function walk(node, parent) {
    const tag = node.tagName;
    const m = parent.getCTM().inverse().multiply(node.getCTM()); // local transform only (parents emit their own)
    const mat = [m.a, m.b, m.c, m.d, m.e, m.f].map((v) => +v.toFixed(5));
    if (tag === 'g') {
      const cp = node.getAttribute('clip-path');
      let clip = null;
      if (cp) { const id = cp.match(/#([^)]+)/)[1]; const cpe = document.getElementById(id).firstElementChild; clip = { d: cpe.getAttribute('d'), transform: cpe.getAttribute('transform') || '' }; }
      return { tag: 'g', mat, clip, children: [...node.children].map((c) => walk(c, node)) };
    }
    if (tag === 'path') return { tag: 'path', mat, d: node.getAttribute('d'), fill: node.getAttribute('fill') };
    if (tag === 'text') {
      const w = node.getComputedTextLength(), x = +node.getAttribute('x');
      return { tag: 'text', mat, text: node.textContent, x: node.getAttribute('text-anchor') === 'middle' ? x - w / 2 : x, y: +node.getAttribute('y'), size: +node.getAttribute('font-size'), spacing: +node.getAttribute('letter-spacing') || 0, fill: node.getAttribute('fill'), width: w };
    }
    return null;
  }
  function exportPanels() {
    return [
      { name: 'nearside', w: VAN.size.w, h: VAN.size.h, tree: walk(exNear, exNear) },
      { name: 'offside', w: VAN.size.w, h: VAN.size.h, tree: walk(exOff, exOff) },
      { name: 'rear', w: VAN.rear.size.w, h: VAN.rear.size.h, tree: walk(exRear, exRear) },
    ];
  }

  window.VE_STAGES = T;
  window.VE_TOTAL = TOTAL;
  window.VE_HANDOFF = T.handoff.end; // the main clip ends here; your 3D clip goes next, then the outro
  window.renderAt = renderAt;
  window.exportPanels = exportPanels;
  window.VE_READY = Promise.all([
    document.fonts.load(`400 100px 'Bebas Neue'`, 'A'),
    document.fonts.load(`500 40px 'Barlow Condensed'`, 'A'),
    document.fonts.load(`600 40px 'Barlow Condensed'`, 'A'),
  ]).then(() => document.fonts.ready).then(() => { measure(); renderAt(0); return true; });
})();
