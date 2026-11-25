/*
  Episode 02 — MrBeast giveaway van.
  UNOFFICIAL FAN CONCEPT: original artwork, not his real logo or branding, no likeness.
  Van-wrap episodes (engine 2): design is drawn straight onto the van side, in van units
  (see vans/<model>.js — 1000 wide, van faces right, ground at y = 420).
*/
window.EPISODE = {
  engine: 2,
  id: 'ep02-mrbeast',
  number: 2,
  title: 'MrBeast',
  subtitle: 'The giveaway van',
  disclaimer: 'UNOFFICIAL FAN CONCEPT · NOT AFFILIATED WITH OR ENDORSED BY MRBEAST',

  van: { model: 'vw-t61' },

  brief: [
    { label: 'CLIENT', value: 'MrBeast (unofficial fan concept)' },
    { label: 'THE VAN', value: 'VW Transporter T6.1' },
    { label: 'WHAT IT’S FOR', value: 'A giveaway van that turns up in UK towns' },
    { label: 'WHO SEES IT', value: 'Families and kids who’ll chase it down the street' },
    { label: 'THE MESSAGE', value: '“If this van stops, someone wins.”', key: true },
    { label: 'MUST', value: 'Readable from across the road · loud · fun' },
  ],

  palette: [
    { name: 'Electric Blue', hex: '#1B4DFF' },
    { name: 'Hot Pink', hex: '#FF2E88' },
    { name: 'Sky', hex: '#3EC6FF' },
    { name: 'Sunshine', hex: '#FFD60A' },
  ],

  // The wrap artwork, in drawing order. `trace: false` = not pen-traced (the van template already gives it).
  shapes: [
    { id: 'bg', fill: '#1B4DFF', d: 'VAN_BODY', trace: false },
    { id: 'swoosh', fill: '#FF2E88', cmds: [['M', -10, 330], ['C', 300, 300, 560, 330, 1010, 205], ['L', 1010, 255], ['C', 560, 370, 300, 340, -10, 372], ['Z']] },
    { id: 'line', fill: '#FFD60A', cmds: [['M', -10, 318], ['C', 300, 288, 560, 318, 1010, 193], ['L', 1010, 201], ['C', 560, 326, 300, 296, -10, 326], ['Z']] },
    { id: 'burst', fill: '#3EC6FF', cmds: VE.star(575, 238, 14, 140, 102) },
    { id: 'box', fill: '#FF2E88', cmds: VE.rrect(515, 222, 120, 105, 8) },
    { id: 'lid', fill: '#FF5CA3', cmds: VE.rrect(503, 195, 144, 32, 8) },
    { id: 'ribbon', fill: '#FFD60A', cmds: VE.rrect(563, 195, 24, 132, 3) },
    { id: 'bowL', fill: '#FFD60A', cmds: [['M', 575, 197], ['C', 548, 157, 512, 167, 528, 193], ['C', 540, 203, 560, 199, 575, 197], ['Z']] },
    { id: 'bowR', fill: '#FFD60A', cmds: [['M', 575, 197], ['C', 602, 157, 638, 167, 622, 193], ['C', 610, 203, 590, 199, 575, 197], ['Z']] },
    { id: 'dot1', fill: '#FFD60A', cmds: VE.circle(452, 92, 10) },
    { id: 'dot2', fill: '#FFFFFF', cmds: VE.circle(668, 104, 9) },
    { id: 'dot3', fill: '#FFFFFF', cmds: VE.circle(432, 205, 8) },
    { id: 'dot4', fill: '#FFD60A', cmds: VE.circle(446, 292, 9) },
  ],

  texts: [
    { id: 'l1', text: 'IF THIS VAN STOPS…', x: 235, y: 80, size: 44, fill: '#FFFFFF', spacing: 2 },
    { id: 'l2', text: 'SOMEONE', x: 235, y: 172, size: 104, fill: '#FFD60A', spacing: 2 },
    { id: 'l3', text: 'WINS.', x: 235, y: 256, size: 104, fill: '#FFD60A', spacing: 2 },
    { id: 'l4', text: 'WAVE IT DOWN!', x: 778, y: 236, size: 34, fill: '#FFFFFF', spacing: 1.5 },
  ],

  // Rear doors (export panel only). Rear units: 500 wide, ground y = 420.
  rear: {
    shapes: [
      { fill: '#1B4DFF', d: 'VAN_REAR' },
      { fill: '#FF2E88', d: 'M -10 300 C 150 280 350 320 510 270 L 510 330 C 350 370 150 330 -10 350 Z' },
    ],
    texts: [
      { text: 'KEEP FOLLOWING…', x: 250, y: 92, size: 34, fill: '#FFFFFF', spacing: 2 },
      { text: 'SOMEONE', x: 250, y: 182, size: 82, fill: '#FFD60A', spacing: 2 },
      { text: 'WINS.', x: 250, y: 262, size: 82, fill: '#FFD60A', spacing: 2 },
    ],
  },

  sketchNotes: [
    { text: 'BIG + YELLOW — reads from across the road', x: 30, y: -38, arrow: [[200, -28], [230, 30]] },
    { text: 'gift box = the prize', x: 600, y: 462, arrow: [[610, 440], [585, 345]] },
    { text: 'wave it down!', x: 800, y: -38, arrow: [[860, -30], [800, 205]] },
  ],

  concept: {
    prompt: 'turn this sketch into a bold giveaway van wrap: electric blue, hot pink, yellow, confetti, a gift box',
    image: null, // optional real AI image of the van side (same framing as the template)
    garbled: { 'IF THIS VAN STOPS…': 'IF THS VAN STPOS…', 'SOMEONE': 'SOMOENE', 'WINS.': 'WNIS.', 'WAVE IT DOWN!': 'WAVE IT DWON!' },
  },

  // Camera zooms while tracing / typing these (k = zoom).
  camera: [
    { shapes: ['box', 'lid', 'ribbon', 'bowL', 'bowR'], k: 2.0 },
    { texts: ['l1', 'l2', 'l3'], k: 1.7 },
    { texts: ['l4'], k: 2.2 },
  ],

  zoom: { x: 40, y: 72, w: 400, h: 231 },

  captions: {
    brief: [
      { at: 0.0, text: 'Every job starts with a brief, not a picture.' },
      { at: 3.4, text: 'One message: if this van stops, someone wins.' },
    ],
    sketch: [
      { at: 0.0, text: 'First, a rough sketch on the van template.' },
      { at: 3.2, text: 'What grabs the eye, and what reads from across the road.' },
    ],
    concept: [
      { at: 0.0, text: 'Then AI turns the sketch into a look.' },
      { at: 3.4, text: 'Nice mood. But the letters are made up.' },
    ],
    vector: [
      { at: 0.0, text: 'So we redraw it as a clean vector.' },
      { at: 3.4, text: 'Every curve placed point by point.' },
      { at: 7.2, text: 'Real lettering, spelled right.' },
    ],
    colour: [{ at: 0.0, text: 'Exact colours, matched to wrap vinyl.' }],
    zoom: [
      { at: 0.0, text: 'Zoom right in.' },
      { at: 1.6, text: 'AI: blurry and misspelt. Vector: razor sharp.' },
    ],
    van: [
      { at: 0.0, text: 'Off the screen and onto the van.' },
      { at: 3.2, text: 'Every side exported for the 3D preview.' },
    ],
    handoff: [{ at: 0.0, text: 'Now let’s see it in 3D.' }],
  },

  durations: { intro: 2.5, brief: 6, sketch: 6, concept: 5.5, vector: 10, colour: 4, zoom: 4.5, van: 7, handoff: 2.5, outro: 4 },
};
