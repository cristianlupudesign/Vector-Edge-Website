/*
  "From Idea to Van" video engine.
  Draws one 1080 x 1920 frame for any time t (seconds) from the EPISODE config.
  Same code is used for live preview in a browser and for frame-by-frame rendering.
*/
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1080, H = 1920, ART_X = 90, ART_Y = 450, ART_S = 0.9; // artboard placement on stage
  const EP = window.EPISODE;
  const C = { yellow: '#E5E521', blue: '#0057FF', charcoal: '#2B2B2B', ink: '#2B2B2B', bg: '#1B1B1B', grey: '#9C9C94', line: '#3A3A3A' };
  const DISPLAY = "'Bebas Neue', 'Arial Narrow', Impact, sans-serif";
  const BODY = "'Barlow Condensed', 'Arial Narrow', sans-serif";

  // ---------- small helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eout = (t) => 1 - Math.pow(1 - t, 3);
  const eback = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) {
      if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
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
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------- timeline ----------
  const ORDER = ['intro', 'concept', 'vector', 'colour', 'zoom', 'van', 'teaser', 'outro'];
  const T = {};
  let acc = 0;
  for (const k of ORDER) { T[k] = { start: acc, end: acc + EP.durations[k], dur: EP.durations[k] }; acc += EP.durations[k]; }
  const TOTAL = acc;
  const lt = (t, k) => t - T[k].start;
  const stageAt = (t) => ORDER.find((k) => t >= T[k].start && t < T[k].end) || 'outro';

  // ---------- build the stage ----------
  const stage = document.getElementById('stage');
  const svg = el('svg', { id: 'main', width: W, height: H, viewBox: `0 0 ${W} ${H}` }, stage);
  const defs = el('defs', {}, svg);

  const dots = el('pattern', { id: 'dots', width: 36, height: 36, patternUnits: 'userSpaceOnUse' }, defs);
  el('circle', { cx: 18, cy: 18, r: 1.6, fill: '#343434' }, dots);
  el('filter', { id: 'abShadow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs)
    .appendChild(el('feDropShadow', { dx: 0, dy: 18, stdDeviation: 26, 'flood-color': '#000', 'flood-opacity': 0.5 }));
  const abClip = el('clipPath', { id: 'abClip' }, defs);
  el('rect', { x: 0, y: 0, width: 1000, height: 1000 }, abClip);

  // Concept (fake AI image) filter: displacement wobble + blur, animated during "generation".
  const cfx = el('filter', { id: 'conceptFx', x: '-5%', y: '-5%', width: '110%', height: '110%', 'color-interpolation-filters': 'sRGB' }, defs);
  const cTurb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.011, numOctaves: 2, seed: 3, result: 'n' }, cfx);
  const cDisp = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 12, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }, cfx);
  const cBlur = el('feGaussianBlur', { in: 'd', stdDeviation: 1.6 }, cfx);
  const nfx = el('filter', { id: 'noiseFx', x: 0, y: 0, width: '100%', height: '100%' }, defs);
  const nTurb = el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.045, numOctaves: 4, seed: 1, stitchTiles: 'stitch' }, nfx);
  el('feColorMatrix', { type: 'matrix', values: '1.6 0 0 0 -0.2  0 1.5 0 0 -0.25  0 0 1.7 0 -0.3  0 0 0 0 1' }, nfx);
  el('filter', { id: 'cShadow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs)
    .appendChild(el('feDropShadow', { dx: 8, dy: 16, stdDeviation: 9, 'flood-color': '#5A3A1A', 'flood-opacity': 0.35 }));
  const cbg = el('radialGradient', { id: 'cbg', cx: '50%', cy: '42%', r: '75%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#FFF6EA' }, cbg);
  el('stop', { offset: '100%', 'stop-color': '#CDB596' }, cbg);
  const gradFor = {};
  for (const hex of new Set(EP.shapes.map((s) => s.fill).concat(EP.texts.map((x) => x.fill)))) {
    const id = 'cg' + hex.slice(1);
    const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 0.2, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': hex === '#FFFFFF' ? '#FFFFFF' : mix(hex, '#FFFFFF', 0.28) }, g);
    el('stop', { offset: '100%', 'stop-color': hex === '#FFFFFF' ? '#E6DCCD' : mix(hex, '#000000', 0.28) }, g);
    gradFor[hex] = `url(#${id})`;
  }

  // Shared art: the finished design (used by zoom, van and 3D) and the fake AI concept.
  function textNode(parent, x, attrs) {
    return el('text', Object.assign({
      x: x.x, y: x.y, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': x.size,
      'letter-spacing': x.spacing || 0, fill: x.fill,
    }, attrs || {}), parent);
  }
  const finalArt = el('g', { id: 'finalArt' }, defs);
  for (const s of EP.shapes) el('path', { d: VE.toD(s.cmds), fill: s.fill }, finalArt);
  for (const x of EP.texts) textNode(finalArt, x, { text: x.text });

  const conceptArt = el('g', { id: 'conceptArt', filter: 'url(#conceptFx)' }, defs);
  const usingImage = !!EP.concept.image;
  if (usingImage) {
    el('image', { href: EP.concept.image, x: 0, y: 0, width: 1000, height: 1000, preserveAspectRatio: 'xMidYMid slice' }, conceptArt);
  } else {
    el('rect', { x: 0, y: 0, width: 1000, height: 1000, fill: 'url(#cbg)' }, conceptArt);
    el('ellipse', { cx: 505, cy: 845, rx: 330, ry: 34, fill: '#7A5A3A', opacity: 0.22 }, conceptArt);
    const cg = el('g', { transform: 'translate(10 -4) rotate(-1.6 500 500) scale(1.02)', filter: 'url(#cShadow)' }, conceptArt);
    for (const s of EP.shapes) el('path', { d: VE.toD(s.cmds), fill: gradFor[s.fill] }, cg);
    for (const x of EP.texts) {
      const bad = (EP.concept.garbled || {})[x.text] || x.text;
      textNode(cg, x, { text: bad, fill: gradFor[x.fill], transform: `skewX(-3) translate(${x.y * 0.05} 0)` });
    }
  }

  // Background
  el('rect', { width: W, height: H, fill: C.bg }, svg);
  el('rect', { width: W, height: H, fill: 'url(#dots)' }, svg);

  // Header
  const header = el('g', {}, svg);
  const brand = el('text', { x: 90, y: 104, 'font-family': DISPLAY, 'font-size': 46, 'letter-spacing': 2, fill: '#fff' }, header);
  el('tspan', { text: 'VECTOR ' }, brand);
  el('tspan', { text: 'EDGE', fill: C.yellow }, brand);
  el('text', {
    x: 990, y: 102, 'text-anchor': 'end', 'font-family': BODY, 'font-weight': 500, 'font-size': 32, fill: C.grey, 'letter-spacing': 1,
    text: `FROM IDEA TO VAN · EP ${String(EP.number).padStart(2, '0')}`,
  }, header);

  // Stage titles
  const TITLES = {
    concept: { num: '01', main: 'CONCEPT', sub: 'AI image · the rough idea' },
    vector: { num: '02', main: 'VECTOR', sub: 'Redrawn by hand with the pen tool' },
    colour: { num: '02', main: 'VECTOR', sub: 'Brand colours locked in' },
    zoom: { num: '', main: 'WHY VECTOR?', sub: 'Same design, zoomed right in' },
    van: { num: '', main: 'ON THE VAN', sub: 'Cut straight from the vector file' },
    teaser: { num: '03', main: '3D', sub: 'Coming up next' },
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

  // Progress pips
  const PIPS = ['CONCEPT', 'VECTOR', '3D'];
  const pipEls = PIPS.map((label, i) => {
    const x = 90 + i * 310;
    el('rect', { x, y: 350, width: 280, height: 8, rx: 4, fill: C.line }, svg);
    const fill = el('rect', { x, y: 350, width: 0, height: 8, rx: 4, fill: C.yellow }, svg);
    const txt = el('text', { x, y: 395, 'font-family': DISPLAY, 'font-size': 30, 'letter-spacing': 2, fill: C.grey, text: label }, svg);
    return { fill, txt };
  });

  // Artboard
  const artboard = el('g', { transform: `translate(${ART_X},${ART_Y})` }, svg);
  el('rect', { x: 0, y: 0, width: 1000 * ART_S, height: 1000 * ART_S, fill: '#FFFFFF', filter: 'url(#abShadow)' }, artboard);
  const art = el('g', { transform: `scale(${ART_S})` }, artboard);
  const conceptLayer = el('g', { 'clip-path': 'url(#abClip)' }, art);
  el('use', { href: '#conceptArt' }, conceptLayer);
  const noise = el('rect', { x: 0, y: 0, width: 1000, height: 1000, filter: 'url(#noiseFx)' }, conceptLayer);
  const fillLayer = el('g', {}, art);
  const textLayer = el('g', {}, art);
  const traceLayer = el('g', { fill: 'none', stroke: C.blue, 'stroke-width': 3.4, 'stroke-linejoin': 'round' }, art);
  const anchorLayer = el('g', {}, art);
  const handleLayer = el('g', {}, art);
  const typeBox = el('rect', { fill: 'none', stroke: C.blue, 'stroke-width': 2.4, 'stroke-dasharray': '10 7', opacity: 0 }, art);
  const caret = el('rect', { width: 5, fill: C.blue, opacity: 0 }, art);
  const pen = el('g', { opacity: 0 }, art);
  el('path', { d: 'M0 0 L12 -34 L34 -12 Z', fill: '#fff', stroke: '#111', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, pen);
  el('path', { d: 'M12 -34 L30 -52 L52 -30 L34 -12', fill: '#111', stroke: '#111', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, pen);
  el('circle', { cx: 15, cy: -15, r: 3.5, fill: '#111' }, pen);
  const hLines = [0, 1].map(() => el('line', { stroke: C.blue, 'stroke-width': 2, opacity: 0 }, handleLayer));
  const hDots = [0, 1].map(() => el('circle', { r: 7, fill: C.blue, opacity: 0 }, handleLayer));

  // Live shapes (fills + trace outlines) with measurements for the pen tool.
  const SH = EP.shapes.map((s, i) => {
    const d = VE.toD(s.cmds);
    const cp = el('clipPath', { id: 'fc' + i, clipPathUnits: 'userSpaceOnUse' }, defs);
    const clipC = el('circle', { r: 0 }, cp);
    const fill = el('path', { d, fill: s.fill, 'clip-path': `url(#fc${i})` }, fillLayer);
    const trace = el('path', { d }, traceLayer);
    return { s, d, fill, trace, clipC, anchors: [], segs: [] };
  });
  const TX = EP.texts.map((x) => ({ x, node: el('text', { 'font-family': DISPLAY, 'font-size': x.size, 'letter-spacing': x.spacing || 0, fill: C.ink, opacity: 0 }, textLayer) }));

  // Readout: prompt box (concept), tool chip (vector), swatches (colour)
  const prompt = el('g', { opacity: 0 }, svg);
  el('rect', { x: 90, y: 1378, width: 900, height: 170, rx: 22, fill: '#262626', stroke: '#3E3E3E', 'stroke-width': 2 }, prompt);
  el('text', { x: 124, y: 1432, 'font-family': DISPLAY, 'font-size': 34, fill: C.yellow, 'letter-spacing': 2, text: '✦ PROMPT' }, prompt);
  const promptLines = wrap('“' + EP.concept.prompt + '”', 52);
  const promptTxt = promptLines.map((_, i) => el('text', { x: 124, y: 1478 + i * 40, 'font-family': BODY, 'font-size': 34, fill: '#EDEDE6' }, prompt));
  const genBtn = el('g', {}, prompt);
  const genRect = el('rect', { x: 790, y: 1400, width: 176, height: 50, rx: 25, fill: '#3A3A3A' }, genBtn);
  const genTxt = el('text', { x: 878, y: 1435, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 30, 'letter-spacing': 2, fill: '#fff', text: 'GENERATE' }, genBtn);
  const genBar = el('rect', { x: 90, y: 1542, width: 0, height: 6, fill: C.yellow }, prompt);

  const tool = el('g', { opacity: 0 }, svg);
  el('rect', { x: 90, y: 1390, width: 900, height: 96, rx: 22, fill: '#262626', stroke: '#3E3E3E', 'stroke-width': 2 }, tool);
  const toolName = el('text', { x: 124, y: 1452, 'font-family': DISPLAY, 'font-size': 44, 'letter-spacing': 2, fill: '#fff' }, tool);
  const toolCount = el('text', { x: 956, y: 1452, 'text-anchor': 'end', 'font-family': BODY, 'font-weight': 500, 'font-size': 38, fill: C.grey }, tool);

  const swatches = EP.palette.map((p, i) => {
    const g = el('g', { opacity: 0 }, svg);
    const x = 90 + i * 305;
    el('circle', { cx: x + 38, cy: 1440, r: 38, fill: p.hex, stroke: '#555', 'stroke-width': 2 }, g);
    el('text', { x: x + 92, y: 1432, 'font-family': DISPLAY, 'font-size': 36, 'letter-spacing': 1, fill: '#fff', text: p.name.toUpperCase() }, g);
    el('text', { x: x + 92, y: 1470, 'font-family': BODY, 'font-weight': 500, 'font-size': 32, fill: C.grey, text: p.hex.toUpperCase() }, g);
    return g;
  });

  // Zoom comparison panels
  const zoomG = el('g', { opacity: 0 }, svg);
  const zoomPct = Math.round(1000 / EP.zoom.w) * 100; // vs the artboard at fit-to-screen
  const panels = [
    { y: 450, href: '#conceptArt', label: `AI IMAGE · ${zoomPct}%`, chip: '#B23A2A' },
    { y: 1000, href: '#finalArt', label: `VECTOR · ${zoomPct}%`, chip: C.blue },
  ].map((p) => {
    const g = el('g', { transform: `translate(90,${p.y})` }, zoomG);
    el('rect', { x: -4, y: -4, width: 908, height: 528, rx: 6, fill: '#fff', stroke: '#444', 'stroke-width': 2 }, g);
    const inner = el('svg', { x: 0, y: 0, width: 900, height: 520, viewBox: '0 0 1000 1000', preserveAspectRatio: 'xMidYMid slice' }, g);
    el('rect', { x: -5000, y: -5000, width: 11000, height: 11000, fill: '#fff' }, inner);
    el('use', { href: p.href }, inner);
    const chipW = p.label.length * 17 + 40;
    el('rect', { x: 20, y: 20, width: chipW, height: 54, rx: 27, fill: p.chip }, g);
    el('text', { x: 20 + chipW / 2, y: 58, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 34, 'letter-spacing': 2, fill: '#fff', text: p.label }, g);
    return { g, inner };
  });

  // Van (side view, drawn in code)
  const vanWrap = el('g', { opacity: 0 }, svg);
  el('ellipse', { cx: 540, cy: 1160, rx: 520, ry: 26, fill: '#000', opacity: 0.45 }, vanWrap);
  const van = el('g', {}, vanWrap);
  const BODY_D = 'M 30 380 L 30 72 Q 30 40 62 40 L 688 40 Q 716 40 736 58 L 848 168 Q 864 184 890 189 L 948 199 Q 984 207 987 245 L 990 330 Q 990 380 958 380 L 885 380 A 90 90 0 0 0 705 380 L 305 380 A 90 90 0 0 0 125 380 Z';
  const vanClip = el('clipPath', { id: 'vanBody' }, defs);
  el('path', { d: BODY_D }, vanClip);
  el('path', { d: BODY_D, fill: '#F4F4F1', stroke: '#1E1E1E', 'stroke-width': 4, 'stroke-linejoin': 'round' }, van);
  el('path', { d: 'M 696 76 L 734 76 L 826 168 L 696 168 Z', fill: '#2C3644' }, van);
  el('path', { d: 'M 706 84 L 728 84 L 760 116 L 706 140 Z', fill: '#4A5A70', opacity: 0.8 }, van);
  el('path', { d: 'M 684 50 L 684 378', stroke: '#9A9A96', 'stroke-width': 3 }, van);
  el('path', { d: 'M 420 50 L 420 378', stroke: '#C4C4C0', 'stroke-width': 3 }, van);
  el('rect', { x: 700, y: 215, width: 46, height: 10, rx: 5, fill: '#8A8A86' }, van);
  el('rect', { x: 955, y: 222, width: 30, height: 30, rx: 8, fill: '#FFE9A8', stroke: '#333', 'stroke-width': 2 }, van);
  el('path', { d: 'M 940 330 L 992 330 L 992 372 Q 992 382 980 382 L 940 382 Z', fill: '#2A2A2A' }, van);
  el('rect', { x: 26, y: 330, width: 26, height: 52, fill: '#2A2A2A' }, van);
  el('rect', { x: 28, y: 110, width: 10, height: 60, rx: 4, fill: '#D93A2B' }, van);
  el('path', { d: 'M 836 150 L 870 132 L 878 160 L 846 170 Z', fill: '#1E1E1E' }, van);
  // Livery (applied with a squeegee wipe)
  const liveryClip = el('clipPath', { id: 'liveryClip' }, defs);
  const liveryRect = el('rect', { x: 0, y: 0, width: 0, height: 420 }, liveryClip);
  const livery = el('g', { 'clip-path': 'url(#liveryClip)' }, van);
  const liveryInner = el('g', { 'clip-path': 'url(#vanBody)' }, livery);
  el('rect', { x: 20, y: 340, width: 980, height: 14, fill: EP.van.stripe }, liveryInner);
  el('use', { href: '#finalArt', transform: 'translate(68 16) scale(0.3)' }, liveryInner);
  const words = EP.van.line.split('·').map((w) => w.trim().toUpperCase());
  words.forEach((w, i) => el('text', { x: 400, y: 150 + i * 52, 'font-family': DISPLAY, 'font-size': 52, 'letter-spacing': 1, fill: EP.texts[0].fill, text: w }, liveryInner));
  el('text', { x: 400, y: 150 + words.length * 52 + 14, 'font-family': DISPLAY, 'font-size': 46, 'letter-spacing': 1, fill: EP.van.stripe, text: EP.van.phone }, liveryInner);
  const squeegee = el('rect', { x: 0, y: 30, width: 16, height: 340, rx: 6, fill: C.yellow, stroke: '#111', 'stroke-width': 2, opacity: 0 }, van);
  const wheels = [215, 795].map((cx) => {
    const g = el('g', {}, van);
    el('circle', { cx, cy: 380, r: 74, fill: '#151515' }, g);
    el('circle', { cx, cy: 380, r: 44, fill: '#A7A7A3' }, g);
    const spokes = el('g', {}, g);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      el('line', { x1: cx, y1: 380, x2: cx + Math.cos(a) * 38, y2: 380 + Math.sin(a) * 38, stroke: '#5E5E5A', 'stroke-width': 9, 'stroke-linecap': 'round' }, spokes);
    }
    el('circle', { cx, cy: 380, r: 13, fill: '#3A3A38' }, g);
    return { spokes, cx };
  });
  const vanChip = el('g', { opacity: 0 }, svg);
  el('rect', { x: 90, y: 1250, width: 900, height: 96, rx: 22, fill: '#262626', stroke: '#3E3E3E', 'stroke-width': 2 }, vanChip);
  el('text', { x: 540, y: 1312, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 44, 'letter-spacing': 2, fill: '#fff', text: 'PLOTTER-CUT VINYL · NO PIXELS' }, vanChip);

  // 3D teaser spotlight (the extruded logo itself is HTML/CSS 3D, see #t3d)
  const spot = el('g', { opacity: 0 }, svg);
  const spotG = el('radialGradient', { id: 'spotG' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#3A3A30' }, spotG);
  el('stop', { offset: '100%', 'stop-color': '#1B1B1B', 'stop-opacity': 0 }, spotG);
  el('circle', { cx: 540, cy: 880, r: 620, fill: 'url(#spotG)' }, spot);
  el('ellipse', { cx: 540, cy: 1330, rx: 330, ry: 30, fill: '#000', opacity: 0.55 }, spot);

  // Captions
  const capG = el('g', {}, svg);
  const capLines = [0, 1].map((i) => el('text', { x: 540, y: 1650 + i * 66, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 600, 'font-size': 56, fill: '#fff' }, capG));

  // Footer
  const footer = el('text', { x: 540, y: 1850, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 500, 'font-size': 34, 'letter-spacing': 2, fill: C.grey, text: 'VECTOREDGE.CO.UK' }, svg);

  // Intro overlay
  const intro = el('g', {}, svg);
  el('rect', { width: W, height: H, fill: C.charcoal }, intro);
  const introLines = [['FROM', '#fff'], ['IDEA', C.yellow], ['TO VAN.', '#fff']].map(([s, f], i) =>
    el('text', { x: 90, y: 820 + i * 230, 'font-family': DISPLAY, 'font-size': 270, fill: f, text: s }, intro));
  const introRule = el('rect', { x: 90, y: 1340, width: 0, height: 10, fill: C.yellow }, intro);
  const introEp = el('text', { x: 92, y: 1430, 'font-family': BODY, 'font-weight': 600, 'font-size': 50, 'letter-spacing': 2, fill: '#fff', text: `EP ${String(EP.number).padStart(2, '0')} · ${EP.title.toUpperCase()}` }, intro);
  const introSub = el('text', { x: 92, y: 1490, 'font-family': BODY, 'font-weight': 500, 'font-size': 40, fill: C.grey, text: EP.subtitle }, intro);

  // Outro overlay
  const outro = el('g', { opacity: 0 }, svg);
  el('rect', { width: W, height: H, fill: C.charcoal }, outro);
  const oBrand = el('text', { x: 540, y: 820, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 210, 'letter-spacing': 4, fill: '#fff' }, outro);
  el('tspan', { text: 'VECTOR ' }, oBrand);
  el('tspan', { text: 'EDGE', fill: C.yellow }, oBrand);
  el('rect', { x: 340, y: 870, width: 400, height: 10, fill: C.yellow }, outro);
  el('text', { x: 540, y: 990, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 600, 'font-size': 58, fill: '#fff', text: 'Got an idea? Send it over.' }, outro);
  el('text', { x: 540, y: 1058, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 500, 'font-size': 46, fill: C.grey, text: 'Even a sketch on a napkin. We’ll take it from there.' }, outro);
  el('text', { x: 540, y: 1290, 'text-anchor': 'middle', 'font-family': DISPLAY, 'font-size': 100, 'letter-spacing': 3, fill: C.yellow, text: 'VECTOREDGE.CO.UK' }, outro);
  el('text', { x: 540, y: 1370, 'text-anchor': 'middle', 'font-family': BODY, 'font-weight': 600, 'font-size': 56, 'letter-spacing': 2, fill: '#fff', text: '07348 580359' }, outro);

  // 3D teaser: real CSS 3D — the logo stacked in depth and rotated.
  const t3d = document.getElementById('t3d');
  const t3dRot = document.createElement('div');
  t3dRot.className = 'rot';
  t3d.appendChild(t3dRot);
  const LAYERS = 30, DEPTH = 2.2;
  for (let i = LAYERS - 1; i >= 0; i--) {
    const d = document.createElement('div');
    d.className = 'layer';
    d.style.transform = `translateZ(${-i * DEPTH}px)`;
    if (i > 0) d.style.filter = `brightness(${(0.32 + 0.25 * (1 - i / LAYERS)).toFixed(3)})`;
    const s = el('svg', { width: 900, height: 900, viewBox: '0 0 1000 1000' }, d);
    el('use', { href: '#finalArt' }, s);
    t3dRot.appendChild(d);
  }

  // ---------- measurements (need fonts loaded) ----------
  let trace = null;
  function measure() {
    const probe = el('path', {}, svg);
    for (const sh of SH) {
      sh.len = sh.trace.getTotalLength();
      set(sh.trace, { 'stroke-dasharray': sh.len + ' ' + sh.len });
      const cmds = sh.s.cmds;
      let cum = 0;
      for (let k = 0; k < cmds.length; k++) {
        if (k > 0) { probe.setAttribute('d', VE.toD(cmds.slice(0, k + 1))); cum = probe.getTotalLength(); }
        const c = cmds[k];
        const segInfo = { type: c[0], cum, from: k > 0 ? sh.segs[k - 1].cum : 0 };
        if (c[0] === 'C') { segInfo.c1 = [c[1], c[2]]; segInfo.c2 = [c[3], c[4]]; segInfo.end = [c[5], c[6]]; segInfo.start = lastPt(cmds, k - 1); }
        sh.segs.push(segInfo);
        if (c[0] !== 'Z') {
          const p = c.slice(-2);
          sh.anchors.push({ x: p[0], y: p[1], cum, node: el('rect', { x: p[0] - 6, y: p[1] - 6, width: 12, height: 12, fill: '#fff', stroke: C.blue, 'stroke-width': 2.4, opacity: 0 }, anchorLayer) });
        }
      }
      const bb = sh.fill.getBBox();
      set(sh.clipC, { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 });
      sh.rMax = Math.hypot(bb.width, bb.height) / 2 + 2;
    }
    probe.remove();
    // Pen-tool time budget, shared out by path length (small shapes get a minimum).
    const weights = SH.map((s) => s.len + 140);
    const total = weights.reduce((a, b) => a + b, 0);
    let a = 0;
    trace = SH.map((sh, i) => { const w = { a: a / total, b: (a + weights[i]) / total }; a += weights[i]; return w; });
    for (const tx of TX) {
      const n = tx.node;
      n.textContent = tx.x.text;
      tx.fullW = n.getComputedTextLength();
      tx.x0 = tx.x.x - tx.fullW / 2;
      set(n, { x: tx.x0, y: tx.x.y });
      tx.prefixW = [];
      for (let k = 0; k <= tx.x.text.length; k++) { n.textContent = tx.x.text.slice(0, k); tx.prefixW.push(k ? n.getComputedTextLength() : 0); }
      n.textContent = '';
    }
  }
  function lastPt(cmds, k) {
    for (let j = k; j >= 0; j--) if (cmds[j][0] !== 'Z') return cmds[j].slice(-2);
    return [0, 0];
  }

  // ---------- per-frame render ----------
  function renderAt(t) {
    t = clamp(t, 0, TOTAL - 1e-6);
    const st = stageAt(t);
    const frame = Math.round(t * 30);

    // Intro
    const li = lt(t, 'intro');
    introLines.forEach((n, i) => {
      const p = eout(seg(li, 0.1 + i * 0.16, 0.6 + i * 0.16));
      set(n, { opacity: p, transform: `translate(0 ${(1 - p) * 80})` });
    });
    set(introRule, { width: 900 * eio(seg(li, 0.6, 1.3)) });
    set(introEp, { opacity: seg(li, 0.9, 1.3) });
    set(introSub, { opacity: seg(li, 1.1, 1.5) });
    const introOut = seg(li, T.intro.dur - 0.45, T.intro.dur);
    set(intro, { opacity: 1 - introOut, display: t < T.intro.end ? 'inline' : 'none' });

    // Titles (no flicker when consecutive stages share a main title)
    const keys = Object.keys(TITLES);
    keys.forEach((k, idx) => {
      const prev = keys[idx - 1], next = keys[idx + 1];
      const samePrev = prev && TITLES[prev].main === TITLES[k].main && TITLES[prev].num === TITLES[k].num;
      const sameNext = next && TITLES[next].main === TITLES[k].main && TITLES[next].num === TITLES[k].num;
      const a = T[k].start, b = T[k].end;
      const fin = samePrev ? 1 : eout(seg(t, a, a + 0.4));
      const fout = sameNext ? 0 : seg(t, b - 0.25, b);
      const on = t >= a - (samePrev ? 0 : 0) && t < b;
      const op = on ? fin * (1 - fout) : 0;
      set(titleEls[k].g, { opacity: op, transform: `translate(${(1 - fin) * -40} 0)` });
      const sop = t >= a && t < b ? eout(seg(t, a + 0.1, a + 0.45)) * (1 - seg(t, b - 0.25, b)) : 0;
      set(titleEls[k].sub, { opacity: sop });
    });

    // Pips
    const pp = [seg(t, T.concept.start, T.concept.end), seg(t, T.vector.start, T.van.end), 0.35 * seg(t, T.teaser.start, T.teaser.end)];
    const phase = st === 'teaser' || st === 'outro' ? 2 : st === 'concept' || st === 'intro' ? 0 : 1;
    pipEls.forEach((p, i) => {
      set(p.fill, { width: 280 * pp[i] });
      set(p.txt, { fill: i === phase ? '#fff' : C.grey });
    });

    // Artboard visibility
    const abIn = eout(seg(t, T.concept.start, T.concept.start + 0.5));
    const abOut = seg(t, T.zoom.start, T.zoom.start + 0.4);
    const abOp = abIn * (1 - abOut);
    const abScale = lerp(0.96, 1, abIn) * lerp(1, 0.94, abOut);
    set(artboard, { opacity: abOp, display: abOp > 0.001 ? 'inline' : 'none', transform: `translate(${ART_X + 450 * (1 - abScale)},${ART_Y + 450 * (1 - abScale)}) scale(${abScale})` });

    // Concept generation
    const lc = lt(t, 'concept');
    const g = seg(lc, 2.6, 5.6);
    const ge = eout(g);
    const endDisp = usingImage ? 0 : 12, endBlur = usingImage ? 0 : 1.6;
    set(cDisp, { scale: lerp(260, endDisp, ge) });
    set(cBlur, { stdDeviation: lerp(40, endBlur, ge) });
    set(cTurb, { seed: g < 1 ? 3 + (frame % 97) : 3 });
    set(nTurb, { seed: 1 + (frame % 89) });
    set(noise, { opacity: g < 1 ? Math.pow(1 - g, 0.8) : 0 });
    let cOp = lc >= 2.6 ? 1 : 0;
    const lv = lt(t, 'vector');
    if (t >= T.vector.start) cOp = lerp(1, 0.32, seg(lv, 0, 0.6));
    if (t >= T.colour.start) cOp = lerp(0.32, 0, seg(lt(t, 'colour'), 0, 0.8));
    set(conceptLayer, { opacity: cOp });

    // Prompt box
    const promptOn = t >= T.concept.start && t < T.vector.start + 0.3;
    const pOp = eout(seg(lc, 0, 0.35)) * (1 - seg(lv, 0, 0.3));
    set(prompt, { opacity: promptOn ? pOp : 0 });
    if (promptOn) {
      const full = promptLines.join('\n');
      const n = Math.floor(full.length * seg(lc, 0.25, 2.3));
      let used = 0;
      promptLines.forEach((line, i) => {
        const take = clamp(n - used, 0, line.length);
        const caretHere = n < full.length && n >= used && n <= used + line.length;
        promptTxt[i].textContent = line.slice(0, take) + (caretHere && frame % 16 < 10 ? '|' : '');
        used += line.length + 1;
      });
      const pressed = lc >= 2.35 && lc < 2.6;
      set(genRect, { fill: g >= 1 ? '#2F5E2F' : pressed || g > 0 ? C.yellow : '#3A3A3A' });
      set(genTxt, { fill: g >= 1 ? '#fff' : pressed || g > 0 ? '#111' : '#fff' });
      genTxt.textContent = g >= 1 ? 'DONE ✓' : g > 0 ? `${Math.floor(g * 100)}%` : 'GENERATE';
      set(genBar, { width: 900 * g, opacity: g >= 1 ? 1 - seg(lc, 5.6, 6.0) : 1 });
    }

    // Pen tool tracing
    const traceA = 0.6, traceB = 8.2;
    const tp = t < T.vector.start ? 0 : seg(lv, traceA, traceB);
    let anchorCount = 0, penPt = null, handleSeg = null;
    const lcol = lt(t, 'colour');
    const outlineFade = t < T.colour.start ? 1 : 1 - seg(lcol, 3.0, 3.8);
    SH.forEach((sh, i) => {
      const w = trace[i];
      const p = seg(tp, w.a, w.b);
      const L = sh.len * p;
      set(sh.trace, { 'stroke-dashoffset': sh.len - L, opacity: outlineFade });
      sh.anchors.forEach((a) => {
        const on = p > 0 && L >= a.cum - 0.5;
        if (on) anchorCount++;
        set(a.node, { opacity: on ? outlineFade : 0 });
      });
      if (p > 0 && p < 1) {
        const pt = sh.trace.getPointAtLength(L);
        penPt = [pt.x, pt.y];
        handleSeg = sh.segs.find((s) => s.type === 'C' && L >= s.from && L <= s.cum) || null;
      }
      // Colour fill (paint-bucket reveal)
      const fp = t < T.colour.start ? 0 : eout(seg(lcol, 0.3 + i * 0.2, 1.0 + i * 0.2));
      set(sh.clipC, { r: sh.rMax * fp });
    });
    set(pen, { opacity: penPt ? 1 : 0, transform: penPt ? `translate(${penPt[0]} ${penPt[1]})` : '' });
    if (handleSeg) {
      const pairs = [[handleSeg.start, handleSeg.c1], [handleSeg.end, handleSeg.c2]];
      pairs.forEach(([a, c], k) => { set(hLines[k], { x1: a[0], y1: a[1], x2: c[0], y2: c[1], opacity: 1 }); set(hDots[k], { cx: c[0], cy: c[1], opacity: 1 }); });
    } else { hLines.concat(hDots).forEach((n) => set(n, { opacity: 0 })); }

    // Type tool
    const typeA = 8.4, typeB = 10.4;
    let typing = null;
    TX.forEach((tx, i) => {
      const a = typeA + (i * (typeB - typeA)) / TX.length, b = typeA + ((i + 1) * (typeB - typeA)) / TX.length;
      const p = t < T.vector.start ? 0 : seg(lv, a, b - 0.15);
      const n = Math.round(tx.x.text.length * p);
      tx.node.textContent = tx.x.text.slice(0, n);
      set(tx.node, { opacity: n > 0 ? 1 : 0 });
      const cp = t < T.colour.start ? 0 : seg(lcol, 2.3 + i * 0.3, 2.9 + i * 0.3);
      set(tx.node, { fill: mix(C.ink, tx.x.fill, cp) });
      if (t >= T.vector.start && lv >= a && lv < b + 0.5 && t < T.colour.start) typing = { tx, n, done: lv >= b };
    });
    if (typing) {
      const { tx, n } = typing;
      const capH = tx.x.size * 0.72;
      set(typeBox, { x: tx.x0 - 14, y: tx.x.y - capH - 14, width: tx.fullW + 28, height: capH + 28, opacity: 1 });
      set(caret, { x: tx.x0 + tx.prefixW[n] + 3, y: tx.x.y - capH - 4, height: capH + 8, opacity: typing.done ? (frame % 16 < 9 ? 1 : 0) : 1 });
    } else { set(typeBox, { opacity: 0 }); set(caret, { opacity: 0 }); }

    // Tool chip
    const toolOp = t >= T.vector.start && t < T.colour.start + 0.3 ? eout(seg(lv, 0.2, 0.5)) * (1 - seg(lcol, 0, 0.3)) : 0;
    set(tool, { opacity: toolOp });
    toolName.textContent = lv < 8.3 ? 'PEN TOOL' : 'TYPE TOOL';
    toolCount.textContent = lv < 8.3 ? `Anchor points: ${anchorCount}` : `Bebas Neue · ${TX.length} lines`;

    // Swatches
    swatches.forEach((s, i) => {
      const on = t >= T.colour.start && t < T.zoom.start + 0.4;
      const p = on ? eback(seg(lcol, 0.4 + i * 0.3, 0.9 + i * 0.3)) * (1 - seg(lt(t, 'zoom'), 0, 0.35)) : 0;
      set(s, { opacity: clamp(p), transform: `translate(0 ${(1 - clamp(p)) * 30})` });
    });

    // Zoom compare
    const lz = lt(t, 'zoom');
    const zOn = t >= T.zoom.start && t < T.van.start;
    const zOp = zOn ? eout(seg(lz, 0.25, 0.65)) * (1 - seg(lz, T.zoom.dur - 0.3, T.zoom.dur)) : 0;
    set(zoomG, { opacity: zOp, display: zOp > 0.001 ? 'inline' : 'none' });
    if (zOp > 0) {
      const zp = eio(seg(lz, 0.6, 2.0));
      const Z = EP.zoom;
      const full = { x: -366, y: 0, w: 1732, h: 1000 }; // whole artboard, at panel aspect
      const vb = [lerp(full.x, Z.x, zp), lerp(full.y, Z.y, zp), lerp(full.w, Z.w, zp), lerp(full.h, Z.h, zp)];
      panels.forEach((p) => set(p.inner, { viewBox: vb.join(' ') }));
    }

    // Van
    const lvn = lt(t, 'van');
    const vOn = t >= T.van.start && t < T.teaser.start;
    const vOp = vOn ? seg(lvn, 0, 0.2) * (1 - seg(lvn, T.van.dur - 0.3, T.van.dur)) : 0;
    set(vanWrap, { opacity: vOp, display: vOp > 0.001 ? 'inline' : 'none' });
    set(vanChip, { opacity: vOn ? eout(seg(lvn, 3.6, 4.0)) * (1 - seg(lvn, T.van.dur - 0.3, T.van.dur)) : 0 });
    if (vOp > 0) {
      const drive = eout(seg(lvn, 0, 1.4));
      const x = lerp(1150, 40, drive);
      set(van, { transform: `translate(${x} 700)` });
      wheels.forEach((w) => set(w.spokes, { transform: `rotate(${(-(1150 - x) / 74) * (180 / Math.PI)} ${w.cx} 380)` }));
      const wp = eio(seg(lvn, 1.6, 3.6));
      set(liveryRect, { width: 40 + wp * 980 });
      set(squeegee, { x: 40 + wp * 980 - 8, opacity: wp > 0 && wp < 0.97 ? 1 : 0 });
    }

    // 3D teaser
    const ltz = lt(t, 'teaser');
    const tOn = t >= T.teaser.start && t < T.outro.start + 0.5;
    const tOp = tOn ? eout(seg(ltz, 0, 0.45)) * (1 - seg(lt(t, 'outro'), 0, 0.4)) : 0;
    set(spot, { opacity: tOp });
    t3d.style.opacity = tOp;
    t3d.style.display = tOp > 0.001 ? 'block' : 'none';
    if (tOp > 0) {
      const r = eio(seg(ltz, 0, T.teaser.dur + 0.5));
      t3dRot.style.transform = `scale(${lerp(0.82, 1, eout(seg(ltz, 0, 1.2)))}) rotateX(${lerp(16, 6, r)}deg) rotateY(${lerp(-42, 34, r)}deg)`;
    }

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

  // ---------- SVG export (for the 3D app) ----------
  function exportSVG() {
    return {
      shapes: EP.shapes.map((s) => ({ id: s.id, d: VE.toD(s.cmds), fill: s.fill })),
      texts: TX.map((tx) => ({ id: tx.x.id, text: tx.x.text, x: tx.x0, y: tx.x.y, size: tx.x.size, spacing: tx.x.spacing || 0, fill: tx.x.fill, width: tx.fullW })),
    };
  }

  window.VE_STAGES = T;
  window.VE_TOTAL = TOTAL;
  window.renderAt = renderAt;
  window.exportSVG = exportSVG;
  window.VE_READY = Promise.all([
    document.fonts.load(`400 100px 'Bebas Neue'`, 'A'),
    document.fonts.load(`500 40px 'Barlow Condensed'`, 'A'),
    document.fonts.load(`600 40px 'Barlow Condensed'`, 'A'),
  ]).then(() => document.fonts.ready).then(() => {
    measure();
    renderAt(0);
    return true;
  });
})();
