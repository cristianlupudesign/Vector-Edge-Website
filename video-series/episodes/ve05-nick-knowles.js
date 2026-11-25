/*
  Nick Knowles site van. UNOFFICIAL FAN CONCEPT: original artwork, no likeness.
  Van: Peugeot Boxer (large van sheet, frame ratio 2.351). u 0 = front → 1 = rear, v 0 = roof → 1 = sill.
  Rear chevrons are "Chapter 8 style" artwork; real Chapter 8 kits use certified retroreflective film.
*/
(function () {
  const AR = 2.351, AR_REAR = 1.065;
  const RED = '#CC2229', YELLOW = '#FFCC00', BLACK = '#121215';
  // 45° red bands (in real proportions) clipped to a box; dir = +1 leans one way, -1 the other.
  function bands(u0, v0, u1, v1, ar, step, width, dir) {
    const X0 = u0 * ar, X1 = u1 * ar, out = [];
    const toUV = (p) => [p[0] / ar, p[1]];
    const lo = dir > 0 ? X0 + v0 : X0 - v1, hi = dir > 0 ? X1 + v1 : X1 - v0;
    for (let c = lo - width; c < hi; c += step) {
      const L = dir > 0
        ? [[c + 1, -1], [c - 2, 2], [c + width - 2, 2], [c + width + 1, -1]]
        : [[c - 1, -1], [c + 2, 2], [c + width + 2, 2], [c + width - 1, -1]];
      const clipped = VE.clipPoly(L, [X0, v0, X1, v1]);
      if (clipped.length >= 3) out.push({ uv: VE.poly(clipped.map(toUV)) });
    }
    return out;
  }

  window.EPISODE = {
    engine: 3,
    id: 've05-nick-knowles',
    number: 5,
    title: 'Nick Knowles',
    subtitle: 'A site van for big community builds',
    disclaimer: 'UNOFFICIAL FAN CONCEPT · NOT AFFILIATED WITH OR ENDORSED BY NICK KNOWLES',

    van: { sheet: 'assets/vans/ve-veh-large-van.svg', name: 'Peugeot Boxer', paint: { name: 'Silver', hex: '#C8C9CB' } },

    brief: [
      { label: 'CLIENT', value: 'Nick Knowles (unofficial fan concept)' },
      { label: 'THE VAN', value: 'Peugeot Boxer, painted silver' },
      { label: 'WHAT IT’S FOR', value: 'A site van for big community builds' },
      { label: 'WHO SEES IT', value: 'Neighbours, volunteers and every driver on the high street' },
      { label: 'THE MESSAGE', value: '“Big builds. Big hearts.”', key: true },
      { label: 'MUST', value: 'Chapter 8 style rear · cut vinyl · safe and seen' },
    ],
    palette: [
      { name: 'Oracal 651 Red', hex: RED },
      { name: 'Oracal 651 Yellow', hex: YELLOW },
      { name: 'Oracal 651 Black', hex: BLACK },
    ],

    shapes: [
      { id: 'hazBg', fill: YELLOW, rrect: [0.845, 0.05, 0.955, 0.47, 0] },
      { id: 'haz', fill: RED, sketch: 'bbox', parts: bands(0.845, 0.05, 0.955, 0.47, AR, 0.13, 0.065, 1) },
      { id: 'band', fill: YELLOW, rrect: [0.43, 0.565, 0.80, 0.655, 0] },
    ],
    texts: [
      { id: 'name', text: 'NICK KNOWLES', u: 0.615, v: 0.20, size: 0.12, fill: BLACK, spacing: 0.004 },
      { id: 'msg', text: 'BIG BUILDS. BIG HEARTS.', u: 0.615, v: 0.33, size: 0.085, fill: RED, spacing: 0.003 },
      { id: 'tag', text: 'BUILDING · RENOVATIONS · COMMUNITY PROJECTS', u: 0.615, v: 0.627, size: 0.045, fill: BLACK, spacing: 0.003 },
      { id: 'door', text: 'BUILDER · PRESENTER', u: 0.265, v: 0.70, size: 0.04, fill: BLACK, spacing: 0.003 },
    ],
    rear: {
      shapes: [
        { fill: YELLOW, rrect: [0.04, 0.40, 0.96, 0.62, 0] },
        { fill: RED, parts: bands(0.04, 0.40, 0.5, 0.62, AR_REAR, 0.16, 0.08, -1) },
        { fill: RED, parts: bands(0.5, 0.40, 0.96, 0.62, AR_REAR, 0.16, 0.08, 1) },
      ],
      texts: [
        { text: 'NICK KNOWLES', u: 0.5, v: 0.18, size: 0.085, fill: BLACK, spacing: 0.003 },
        { text: 'BIG BUILDS. BIG HEARTS.', u: 0.5, v: 0.28, size: 0.055, fill: RED, spacing: 0.003 },
      ],
    },

    sketchNotes: [
      { text: 'hazard panel at the back corner', u: 0.6, v: -0.1, arrow: [[0.82, -0.06], [0.88, 0.2]] },
      { text: 'name + message, big and simple', u: 0.1, v: -0.1, arrow: [[0.3, -0.06], [0.5, 0.15]] },
      { text: 'Chapter 8 chevrons on the back doors', u: 0.3, v: 1.2, arrow: [[0.5, 1.13], [0.6, 0.62]] },
    ],
    concept: {
      prompt: 'turn this sketch into a silver Peugeot Boxer site van livery: red and yellow hazard chevrons, yellow stripe, bold name',
      image: null,
      garbled: { 'NICK KNOWLES': 'NIKC KNOWELS', 'BIG BUILDS. BIG HEARTS.': 'BIG BIULDS. BIG HAERTS.', 'BUILDING · RENOVATIONS · COMMUNITY PROJECTS': 'BUIDLING · RENOVATOINS · COMMUINTY PROJCETS', 'BUILDER · PRESENTER': 'BULIDER · PERSENTER' },
    },
    camera: [
      { shapes: ['hazBg', 'haz'], k: 1.8 },
      { texts: ['name', 'msg'], k: 1.6 },
      { texts: ['tag'], k: 1.8 },
    ],
    zoom: { u: 0.47, v: 0.08, w: 0.32 },

    captions: {
      brief: [{ text: 'This one’s for Nick Knowles.' }, { text: 'One message: *big builds, big hearts.*' }],
      sketch: [{ text: 'Rough sketch on a Peugeot Boxer.' }, { text: 'Chapter 8 chevrons on the back, so it’s seen on every site.' }],
      concept: [{ text: 'AI goes for a bold look.' }, { text: 'The spelling? Not so much.' }],
      vector: [{ text: 'Redrawn as clean vectors.' }, { text: 'Every chevron cut to a perfect 45°.' }, { text: 'Lettering, *spelled right.*' }],
      colour: [{ text: 'Silver van. Red, yellow and black vinyl.' }],
      zoom: [{ text: 'Zoom in.' }, { text: 'The AI falls apart. The vector stays *razor sharp.*' }],
      van: [{ text: 'On the real Boxer template.' }, { text: 'Both sides, and those chevrons on the back, ready for 3D.' }],
      handoff: [{ text: 'Let’s see it in *3D.*' }],
    },
    audio: {
      music: 'assets/audio/music/idea-to-van-theme.mp3', voVolume: 1.6, musicVolume: 0.2, sfxVolume: 0.35,
      voDir: 'assets/audio/vo/ve05-nick-knowles',
      voAt: { intro: 0.35, brief: 0.3, sketch: 0.3, concept: 0.3, vector: 0.3, colour: 0.3, zoom: 0.3, van: 0.3, handoff: 0.2, outro: 0.4 },
    },
    durations: { intro: 2.8, brief: 7, sketch: 7, concept: 6.5, vector: 10, colour: 4.5, zoom: 6, van: 7, handoff: 2.6, outro: 4.5 },
  };
})();
