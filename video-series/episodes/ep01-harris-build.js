/*
  Episode 01 — Harris Build (a made-up business, not a real customer).
  To make a new episode: copy this file, change the shapes / text / colours /
  captions, then run:  node render.js ep02-your-name
*/
window.EPISODE = {
  id: 'ep01-harris-build',
  number: 1,
  title: 'Harris Build',
  subtitle: 'Builder logo → van livery',

  // Brand colours of the design being made (shown as swatches in the video).
  palette: [
    { name: 'Site Orange', hex: '#F26B1D' },
    { name: 'Deep Navy', hex: '#16243A' },
    { name: 'White', hex: '#FFFFFF' },
  ],

  concept: {
    prompt: 'bold logo for a Kent builder, roof and window, orange and navy, flat, looks good on a van',
    // Optional: put a real AI image here (square works best), e.g. 'assets/concepts/ep01.png'.
    // Leave null and the video fakes an AI-style concept from the shapes below.
    image: null,
    // How the fake AI concept "misspells" the text (AI images rarely get letters right).
    garbled: { 'HARRIS': 'HARRlS', 'BUILD & ROOF': 'BULID & R0OF' },
  },

  // Vector shapes, in the order they are traced. Artboard is 1000 x 1000.
  shapes: [
    { id: 'roof', fill: '#F26B1D', cmds: VE.poly([[215, 430], [500, 170], [785, 430], [712, 430], [500, 237], [288, 430]]) },
    { id: 'chimney', fill: '#F26B1D', cmds: VE.poly([[640, 205], [700, 205], [700, 352], [640, 298]]) },
    { id: 'win1', fill: '#16243A', cmds: VE.rrect(453, 303, 42, 42, 12) },
    { id: 'win2', fill: '#16243A', cmds: VE.rrect(505, 303, 42, 42, 12) },
    { id: 'win3', fill: '#16243A', cmds: VE.rrect(453, 355, 42, 42, 12) },
    { id: 'win4', fill: '#16243A', cmds: VE.rrect(505, 355, 42, 42, 12) },
    {
      id: 'swoosh', fill: '#16243A',
      cmds: [['M', 170, 480], ['C', 360, 414, 640, 414, 830, 480], ['C', 640, 446, 360, 446, 170, 480], ['Z']],
    },
    { id: 'bar', fill: '#F26B1D', cmds: VE.rrect(292, 690, 416, 84, 6) },
  ],

  // Text set with the type tool after the shapes. x is the centre.
  texts: [
    { id: 'name', text: 'HARRIS', x: 500, y: 662, size: 214, fill: '#16243A', spacing: 6 },
    { id: 'tag', text: 'BUILD & ROOF', x: 500, y: 757, size: 70, fill: '#FFFFFF', spacing: 4 },
  ],

  // Area of the artboard to zoom into for the "AI vs vector" comparison.
  zoom: { x: 438, y: 292, w: 124, h: 72 },

  // What goes on the demo van. 07700 900xxx is an Ofcom drama number (not a real line).
  van: { line: 'Extensions · Roofing · Repairs', phone: '07700 900 123', stripe: '#F26B1D' },

  // Captions, in seconds from the start of each stage.
  captions: {
    concept: [
      { at: 0.0, text: 'It starts with an idea, typed into an AI image tool.' },
      { at: 3.4, text: 'Great for the feel of it. Now look closer…' },
      { at: 5.6, text: 'Fuzzy edges. Made-up letters. It can’t be cut or printed.' },
    ],
    vector: [
      { at: 0.0, text: 'So we redraw it as a vector, point by point.' },
      { at: 4.2, text: 'Every curve is maths, not pixels.' },
      { at: 8.4, text: 'Real lettering, spelled right.' },
    ],
    colour: [{ at: 0.0, text: 'Exact brand colours, matched to vinyl.' }],
    zoom: [
      { at: 0.0, text: 'Zoom in 800%.' },
      { at: 1.8, text: 'The AI image falls apart. The vector stays razor sharp.' },
    ],
    van: [{ at: 0.0, text: 'One clean file → plotter-cut vinyl → on the van.' }],
    teaser: [{ at: 0.0, text: 'Next: we build it in 3D.' }],
  },

  // Seconds per stage. Change these to speed up or slow down an episode.
  durations: { intro: 2.5, concept: 7.5, vector: 11, colour: 4.5, zoom: 5, van: 5.5, teaser: 4, outro: 4 },
};
