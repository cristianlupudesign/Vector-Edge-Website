/*
  Jay Blades furniture-restorer van. UNOFFICIAL FAN CONCEPT: original artwork, no likeness.
  Van: Ford Transit Custom (medium van sheet, frame ratio 2.82). u 0 = front → 1 = rear, v 0 = roof → 1 = sill.
  Sliding-door rail at v ≈ 0.43–0.49 (rear half), handles at v ≈ 0.44–0.47, rubbing strip v ≈ 0.78–0.84.
*/
(function () {
  const GOLD = '#C2963D', WHITE = '#FFFFFF';
  // Dovetail joint: tails (narrow top, wide bottom) on a base strip.
  function dovetails(u0, u1, v0, v1, step, top, bottom) {
    const out = [];
    for (let u = u0; u + bottom <= u1 + 1e-9; u += step) {
      const c = u + bottom / 2;
      out.push({ id: null, uv: [['M', c - top / 2, v0], ['L', c + top / 2, v0], ['L', c + bottom / 2, v1], ['L', c - bottom / 2, v1], ['Z']] });
    }
    return out;
  }

  window.EPISODE = {
    engine: 3,
    id: 've04-jay-blades',
    number: 4,
    title: 'Jay Blades',
    subtitle: 'A furniture restorer’s van',
    disclaimer: 'UNOFFICIAL FAN CONCEPT · NOT AFFILIATED WITH OR ENDORSED BY JAY BLADES',

    van: { sheet: 'assets/vans/ve-veh-medium-van.svg', name: 'Ford Transit Custom', paint: { name: 'Dark Blue', hex: '#1E3A66' } },

    brief: [
      { label: 'CLIENT', value: 'Jay Blades (unofficial fan concept)' },
      { label: 'THE VAN', value: 'Ford Transit Custom, painted dark blue' },
      { label: 'WHAT IT’S FOR', value: 'Collecting tired furniture and bringing it back' },
      { label: 'WHO SEES IT', value: 'Anyone about to throw something out' },
      { label: 'THE MESSAGE', value: '“Don’t bin it. Fix it.”', key: true },
      { label: 'MUST', value: 'Gold + white · cut vinyl · a craftsman’s feel' },
    ],
    palette: [
      { name: 'Oracal 651 Gold', hex: GOLD },
      { name: 'Oracal 651 White', hex: WHITE },
    ],

    shapes: [
      { id: 'tails', fill: GOLD, sketch: 'bbox', parts: dovetails(0.06, 0.85, 0.605, 0.69, 0.06, 0.022, 0.042) },
      { id: 'base', fill: GOLD, rrect: [0.05, 0.69, 0.855, 0.705, 0] },
    ],
    texts: [
      { id: 'name', text: 'JAY BLADES', u: 0.70, v: 0.235, size: 0.14, fill: WHITE, spacing: 0.004 },
      { id: 'msg', text: 'DON’T BIN IT. FIX IT.', u: 0.70, v: 0.38, size: 0.10, fill: GOLD, spacing: 0.003 },
      { id: 'tag', text: 'RESTORE · REPAIR · REUSE', u: 0.70, v: 0.575, size: 0.055, fill: WHITE, spacing: 0.005 },
      { id: 'door', text: 'FURNITURE RESTORATION', u: 0.30, v: 0.565, size: 0.045, fill: WHITE, spacing: 0.004 },
    ],
    rear: {
      shapes: [
        { fill: GOLD, parts: dovetails(0.12, 0.88, 0.40, 0.46, 0.1, 0.035, 0.065) },
        { fill: GOLD, rrect: [0.11, 0.46, 0.89, 0.47, 0] },
      ],
      texts: [
        { text: 'DON’T BIN IT.', u: 0.5, v: 0.22, size: 0.1, fill: GOLD, spacing: 0.003 },
        { text: 'FIX IT.', u: 0.5, v: 0.355, size: 0.1, fill: WHITE, spacing: 0.003 },
      ],
    },

    sketchNotes: [
      { text: 'the slogan does the talking', u: 0.5, v: -0.12, arrow: [[0.66, -0.08], [0.7, 0.3]] },
      { text: 'gold = craft, not bling', u: 0.0, v: -0.12, arrow: [[0.12, -0.08], [0.3, 0.52]] },
      { text: 'dovetail joint stripe', u: 0.3, v: 1.26, arrow: [[0.42, 1.19], [0.48, 0.66]] },
    ],
    concept: {
      prompt: 'turn this sketch into a dark blue Transit Custom livery for a furniture restorer: gold dovetail joint stripe, bold slogan, crafted feel',
      image: null,
      garbled: { 'JAY BLADES': 'JAY BALDES', 'DON’T BIN IT. FIX IT.': 'DON’T BNI IT. FXI IT.', 'RESTORE · REPAIR · REUSE': 'RESOTRE · REPIAR · REUSE', 'FURNITURE RESTORATION': 'FURNTIURE RESTORATOIN' },
    },
    camera: [
      { shapes: ['tails'], k: 1.4 },
      { texts: ['name', 'msg'], k: 1.7 },
      { texts: ['tag', 'door'], k: 1.3 },
    ],
    zoom: { u: 0.52, v: 0.1, w: 0.36 },

    captions: {
      brief: [{ text: 'This one’s for Jay Blades.' }, { text: 'One message: *don’t bin it, fix it.*' }],
      sketch: [{ text: 'Rough sketch on a Transit Custom.' }, { text: 'A dovetail joint stripe, because the craft is the message.' }],
      concept: [{ text: 'AI makes it look lovely.' }, { text: 'Then misspells half of it.' }],
      vector: [{ text: 'Redrawn as clean vectors.' }, { text: 'Every dovetail, cut to the same angle.' }, { text: 'Lettering, *spelled right.*' }],
      colour: [{ text: 'Dark blue van. Gold and white vinyl.' }],
      zoom: [{ text: 'Zoom in.' }, { text: 'The AI gets blurry. The vector *doesn’t.*' }],
      van: [{ text: 'On the real Transit template.' }, { text: 'Both sides and the back, ready for 3D.' }],
      handoff: [{ text: 'Now let’s see it in *3D.*' }],
    },
    audio: {
      music: 'assets/audio/music/idea-to-van-theme.mp3', voVolume: 1.6, musicVolume: 0.2, sfxVolume: 0.35,
      voDir: 'assets/audio/vo/ve04-jay-blades',
      voAt: { intro: 0.35, brief: 0.3, sketch: 0.3, concept: 0.3, vector: 0.3, colour: 0.3, zoom: 0.3, van: 0.3, handoff: 0.2, outro: 0.4 },
    },
    durations: { intro: 2.8, brief: 7, sketch: 7, concept: 6.5, vector: 10, colour: 4.5, zoom: 6, van: 7, handoff: 2.6, outro: 4.5 },
  };
})();
