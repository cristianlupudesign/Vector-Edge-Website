/*
  Kaleb Cooper farm-contractor van. UNOFFICIAL FAN CONCEPT: original artwork, no likeness.
  Van: Vauxhall Combo (small van sheet). Design frame: u 0 = front → 1 = rear, v 0 = roof → 1 = sill.
  Keep lettering off the sliding-door rail (v ≈ 0.47–0.49 at the back) and the handles (v ≈ 0.49–0.52).
*/
(function () {
  // Tractor-tread stripe: chevrons pointing to the front (he's on his way).
  function tread(u0, u1, v0, v1, step, depth, thick) {
    const vm = (v0 + v1) / 2, out = [];
    for (let u = u0; u + depth + thick <= u1; u += step)
      out.push({ uv: [['M', u + depth, v0], ['L', u, vm], ['L', u + depth, v1], ['L', u + depth + thick, v1], ['L', u + thick, vm], ['L', u + depth + thick, v0], ['Z']] });
    return out;
  }
  const ORANGE = '#F5731A', WHITE = '#FFFFFF';

  window.EPISODE = {
    engine: 3,
    id: 've02-kaleb-cooper',
    number: 2,
    title: 'Kaleb Cooper',
    subtitle: 'A farm contractor’s van',
    disclaimer: 'UNOFFICIAL FAN CONCEPT · NOT AFFILIATED WITH OR ENDORSED BY KALEB COOPER',

    van: { sheet: 'assets/vans/ve-veh-small-van.svg', name: 'Vauxhall Combo', paint: { name: 'Dark Green', hex: '#1D4D36' } },

    brief: [
      { label: 'CLIENT', value: 'Kaleb Cooper (unofficial fan concept)' },
      { label: 'THE VAN', value: 'Vauxhall Combo, painted dark green' },
      { label: 'WHAT IT’S FOR', value: 'The contractor’s van parked at every farm gate' },
      { label: 'WHO SEES IT', value: 'Farmers, villagers, and everyone stuck behind a tractor' },
      { label: 'THE MESSAGE', value: '“Straight hedges. Straight talking.”', key: true },
      { label: 'MUST', value: 'Cut vinyl · two colours · muddy-lane tough' },
    ],
    palette: [
      { name: 'Oracal 651 Orange', hex: ORANGE },
      { name: 'Oracal 651 White', hex: WHITE },
    ],

    shapes: [
      { id: 'tread', fill: ORANGE, sketch: 'bbox', parts: tread(0.06, 0.93, 0.6, 0.685, 0.045, 0.03, 0.016) },
      { id: 'lineTop', fill: WHITE, rrect: [0.05, 0.582, 0.94, 0.59, 0] },
    ],
    texts: [
      { id: 'n1', text: 'KALEB', u: 0.755, v: 0.262, size: 0.24, fill: ORANGE, spacing: 0.004 },
      { id: 'n2', text: 'COOPER', u: 0.755, v: 0.448, size: 0.24, fill: WHITE, spacing: 0.004 },
      { id: 'tag', text: 'STRAIGHT HEDGES. STRAIGHT TALKING.', u: 0.755, v: 0.556, size: 0.052, fill: WHITE, spacing: 0.004 },
      { id: 'd1', text: 'HEDGING · BALING', u: 0.39, v: 0.52, size: 0.05, fill: ORANGE, spacing: 0.004 },
      { id: 'd2', text: 'TRACTOR WORK', u: 0.39, v: 0.572, size: 0.05, fill: WHITE, spacing: 0.004 },
    ],
    rear: {
      shapes: [{ fill: ORANGE, parts: tread(0.14, 0.86, 0.45, 0.51, 0.07, 0.045, 0.025) }],
      texts: [
        { text: 'KALEB', u: 0.5, v: 0.25, size: 0.13, fill: ORANGE, spacing: 0.004 },
        { text: 'COOPER', u: 0.5, v: 0.40, size: 0.13, fill: WHITE, spacing: 0.004 },
      ],
    },

    sketchNotes: [
      { text: 'name BIG on the back half', u: 0.55, v: -0.12, arrow: [[0.7, -0.08], [0.74, 0.12]] },
      { text: 'two colours, no fuss', u: 0.0, v: -0.12, arrow: [[0.12, -0.08], [0.32, 0.5]] },
      { text: 'tractor tread = he’s on his way', u: 0.28, v: 1.26, arrow: [[0.4, 1.19], [0.45, 0.66]] },
    ],
    concept: {
      prompt: 'turn this sketch into a dark green Vauxhall Combo livery for a farm contractor: orange tractor-tread stripe, bold name, country feel',
      image: null,
      garbled: { 'KALEB': 'KALEP', 'COOPER': 'COOOPER', 'STRAIGHT HEDGES. STRAIGHT TALKING.': 'STRAIHGT HEDGES. STARIGHT TALKNIG.', 'HEDGING · BALING': 'HEDGNIG · BAILNG', 'TRACTOR WORK': 'TARCTOR WROK' },
    },
    camera: [
      { texts: ['n1', 'n2', 'tag'], k: 1.7 },
      { texts: ['d1', 'd2'], k: 2.4 },
    ],
    zoom: { u: 0.58, v: 0.04, w: 0.36 },

    captions: {
      brief: [{ text: 'This one’s for Kaleb Cooper.' }, { text: 'One message: *straight hedges, straight talking.*' }],
      sketch: [{ text: 'Rough sketch on a Vauxhall Combo.' }, { text: 'A tractor-tread stripe, so you know he’s on his way.' }],
      concept: [{ text: 'AI gives it a country look.' }, { text: 'And a brand new spelling of his name.' }],
      vector: [{ text: 'Redrawn as clean vectors.' }, { text: 'Every tread block is its own cut.' }, { text: 'And his name, *spelled right.*' }],
      colour: [{ text: 'Dark green van. Orange and white vinyl.' }],
      zoom: [{ text: 'Zoom in.' }, { text: 'The AI version goes soft. The vector *stays sharp.*' }],
      van: [{ text: 'On the real Combo template.' }, { text: 'Both sides and the back, ready for 3D.' }],
      handoff: [{ text: 'Now, in *3D.*' }],
    },
    audio: {
      music: 'assets/audio/music/idea-to-van-theme.mp3', voVolume: 1.6, musicVolume: 0.2, sfxVolume: 0.35,
      voDir: 'assets/audio/vo/ve02-kaleb-cooper',
      voAt: { intro: 0.35, brief: 0.3, sketch: 0.3, concept: 0.3, vector: 0.3, colour: 0.3, zoom: 0.3, van: 0.3, handoff: 0.2, outro: 0.4 },
    },
    durations: { intro: 2.8, brief: 7, sketch: 7, concept: 6.5, vector: 10, colour: 4.5, zoom: 6, van: 7, handoff: 2.6, outro: 4.5 },
  };
})();
