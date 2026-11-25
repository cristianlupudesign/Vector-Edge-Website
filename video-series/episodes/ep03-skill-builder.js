/*
  Skill Builder site van — Roger Bisby (UNOFFICIAL FAN CONCEPT: original artwork,
  not his channel logo, no likeness).
  Engine 3: real Vector Edge van templates (assets/vans/ve-veh-*.svg), measured the same way
  as Van Designer v5. Designs use the v5 frame:
    u = 0 at the FRONT of the body → 1 at the rear;  v = 0 at the roof → 1 at the sill.
  Sizes (text, radii) are fractions of the body height. Same design fits every side and van.
*/
(function () {
  // Tape-measure stripe: one yellow strip with the tick marks cut out (holes show the paint).
  function tape(u0, u1, v0, v1, step, every) {
    const parts = [{ rrect: [u0, v0, u1, v1, 0.006] }];
    const h = v1 - v0;
    let i = 0;
    for (let u = u0 + step; u < u1 - step * 0.5; u += step, i++) {
      const long = (i + 1) % every === 0;
      parts.push({ rrect: [u - 0.002, v0 + h * 0.12, u + 0.002, v0 + h * (long ? 0.62 : 0.38), 0] });
    }
    return parts;
  }

  window.EPISODE = {
    engine: 3,
    id: 'ep03-skill-builder',
    number: 1,
    title: 'Skill Builder',
    subtitle: 'A site van for Roger Bisby',
    disclaimer: 'UNOFFICIAL FAN CONCEPT · NOT AFFILIATED WITH OR ENDORSED BY ROGER BISBY / SKILL BUILDER',

    van: { sheet: 'assets/vans/ve-veh-medium-van.svg', name: 'Ford Transit Custom', paint: { name: 'Black', hex: '#1A1B1E' } },

    brief: [
      { label: 'CLIENT', value: 'Roger Bisby · Skill Builder (unofficial fan concept)' },
      { label: 'THE VAN', value: 'Ford Transit Custom, painted black' },
      { label: 'WHAT IT’S FOR', value: 'A site van that says “quality” before the doors open' },
      { label: 'WHO SEES IT', value: 'Tradespeople on site and at the merchants' },
      { label: 'THE MESSAGE', value: '“Do it once. Do it right.”', key: true },
      { label: 'MUST', value: 'Cut vinyl · two colours · reads across a car park' },
    ],

    // Vinyl colours (Oracal 651). The paint swatch is added automatically.
    palette: [
      { name: 'Oracal 651 Yellow', hex: '#FFCC00' },
      { name: 'Oracal 651 White', hex: '#FFFFFF' },
    ],

    // Side artwork (drawn once; the offside is mirrored with the text kept readable).
    // The sliding-door rail crosses the panel at v ≈ 0.43–0.49 on this van: keep lettering off it.
    shapes: [
      { id: 'tape', fill: '#FFCC00', rule: 'evenodd', parts: tape(0.06, 0.875, 0.655, 0.715, 0.02, 5) },
      { id: 'hook', fill: '#FFCC00', rrect: [0.044, 0.638, 0.062, 0.732, 0.004] },
      { id: 'case', fill: '#FFCC00', rule: 'evenodd', parts: [{ rrect: [0.86, 0.565, 0.975, 0.80, 0.05] }, { circle: [0.9175, 0.6825, 0.075] }] },
      { id: 'reel', fill: '#FFFFFF', circle: [0.9175, 0.6825, 0.042] },
      { id: 'level', fill: '#FFCC00', rule: 'evenodd', parts: [{ rrect: [0.12, 0.50, 0.40, 0.57, 0.012] }, { rrect: [0.235, 0.512, 0.285, 0.558, 0.012] }] },
      { id: 'bubble', fill: '#FFFFFF', circle: [0.262, 0.535, 0.013] },
    ],

    texts: [
      { id: 'name', text: 'SKILL BUILDER', u: 0.70, v: 0.19, size: 0.08, fill: '#FFFFFF', spacing: 0.012 },
      { id: 'l1', text: 'DO IT ONCE.', u: 0.70, v: 0.395, size: 0.16, fill: '#FFFFFF', spacing: 0.004 },
      { id: 'l2', text: 'DO IT RIGHT.', u: 0.70, v: 0.635, size: 0.16, fill: '#FFCC00', spacing: 0.004 },
      { id: 'door', text: 'MEASURE TWICE.', u: 0.26, v: 0.628, size: 0.062, fill: '#FFFFFF', spacing: 0.006 },
    ],

    // Rear doors (rear frame: u left → right, v roof → sill).
    rear: {
      shapes: [{ fill: '#FFCC00', rule: 'evenodd', parts: tape(0.10, 0.90, 0.50, 0.555, 0.04, 5) }],
      texts: [
        { text: 'DO IT ONCE.', u: 0.5, v: 0.24, size: 0.115, fill: '#FFFFFF', spacing: 0.004 },
        { text: 'DO IT RIGHT.', u: 0.5, v: 0.40, size: 0.115, fill: '#FFCC00', spacing: 0.004 },
      ],
    },

    sketchNotes: [
      { text: 'BIG + SHORT: reads across a car park', u: 0.52, v: -0.13, arrow: [[0.66, -0.09], [0.66, 0.24]] },
      { text: 'spirit level on the cab door', u: 0.0, v: -0.13, arrow: [[0.12, -0.09], [0.22, 0.48]] },
      { text: 'tape measure = every trade knows it', u: 0.30, v: 1.27, arrow: [[0.44, 1.2], [0.52, 0.72]] },
    ],

    concept: {
      prompt: 'turn this sketch into a black Transit Custom livery for a builder: yellow tape measure stripe, spirit level, bold slogan',
      image: null,
      garbled: { 'SKILL BUILDER': 'SKILL BULIDER', 'DO IT ONCE.': 'DO IT OCNE.', 'DO IT RIGHT.': 'DO IT RIHGT.', 'MEASURE TWICE.': 'MEASRUE TWCIE.' },
    },

    camera: [
      { shapes: ['level', 'bubble'], k: 2.4 },
      { shapes: ['case', 'reel'], k: 2.2 },
      { texts: ['name', 'l1', 'l2'], k: 1.7 },
      { texts: ['door'], k: 2.3 },
    ],

    // Zoom compare area, in the side frame (h is set from the panel shape).
    zoom: { u: 0.46, v: 0.09, w: 0.37 },

    captions: {
      brief: [
        { at: 0.0, text: 'Every job starts with a brief, not a picture.' },
        { at: 3.4, text: 'One message: do it once, do it right.' },
      ],
      sketch: [
        { at: 0.0, text: 'A rough sketch, straight onto the van template.' },
        { at: 3.2, text: 'Tape measure and spirit level: every trade gets it in a second.' },
      ],
      concept: [
        { at: 0.0, text: 'Then AI turns the sketch into a look.' },
        { at: 3.4, text: 'Nice mood. But look at the spelling.' },
      ],
      vector: [
        { at: 0.0, text: 'So we redraw it as a clean vector.' },
        { at: 3.4, text: 'Every tick on that tape is its own cut.' },
        { at: 7.2, text: 'Real lettering, spelled right.' },
      ],
      colour: [{ at: 0.0, text: 'Black van. Two Oracal vinyls. That’s it.' }],
      zoom: [
        { at: 0.0, text: 'Zoom right in.' },
        { at: 1.6, text: 'AI: blurry and misspelt. Vector: razor sharp.' },
      ],
      van: [
        { at: 0.0, text: 'On the real van template.' },
        { at: 3.2, text: 'Both sides and the back, ready for the 3D preview.' },
      ],
      handoff: [{ at: 0.0, text: 'Now let’s see it in 3D.' }],
    },

    durations: { intro: 2.6, brief: 6, sketch: 6, concept: 5.5, vector: 10, colour: 4.5, zoom: 4.5, van: 7, handoff: 2.5, outro: 4 },
  };
})();
