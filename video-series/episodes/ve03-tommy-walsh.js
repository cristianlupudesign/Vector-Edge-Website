/*
  Tommy Walsh landscaping van. UNOFFICIAL FAN CONCEPT: original artwork, no likeness.
  Van: Peugeot Boxer (large van sheet, frame ratio 2.351). u 0 = front → 1 = rear, v 0 = roof → 1 = sill.
  Big clean panel above the sliding-door rail (v ≈ 0.49–0.53); handles low on the cab door (u ≈ 0.33–0.42).
*/
(function () {
  const AR = 2.351, AR_REAR = 1.065;
  const GREEN = '#0B8457', DARK = '#0C4E37', LIME = '#7CBB45';
  function grass(u0, u1, base, w, ar) {
    const pts = [[u0, base]];
    let i = 0;
    for (let x = u0; x + w <= u1 + 1e-9; x += w, i++) pts.push([x + w * 0.5, i % 2 ? base - 0.085 : base - 0.12], [x + w, base - 0.045]);
    pts.push([pts[pts.length - 1][0], base]);
    return VE.poly(pts);
  }

  window.EPISODE = {
    engine: 3,
    id: 've03-tommy-walsh',
    number: 3,
    title: 'Tommy Walsh',
    subtitle: 'A landscaper’s van',
    disclaimer: 'UNOFFICIAL FAN CONCEPT · NOT AFFILIATED WITH OR ENDORSED BY TOMMY WALSH',

    van: { sheet: 'assets/vans/ve-veh-large-van.svg', name: 'Peugeot Boxer', paint: { name: 'White', hex: '#FFFFFF' } },

    brief: [
      { label: 'CLIENT', value: 'Tommy Walsh (unofficial fan concept)' },
      { label: 'THE VAN', value: 'Peugeot Boxer, painted white' },
      { label: 'WHAT IT’S FOR', value: 'A landscaper’s van that looks like a garden on wheels' },
      { label: 'WHO SEES IT', value: 'Homeowners on every street he works in' },
      { label: 'THE MESSAGE', value: '“Gardens built to last.”', key: true },
      { label: 'MUST', value: 'Three greens · cut vinyl · clean, not cluttered' },
    ],
    palette: [
      { name: 'Oracal 651 Green', hex: GREEN },
      { name: 'Oracal 651 Dark Green', hex: DARK },
      { name: 'Oracal 651 Lime', hex: LIME },
    ],

    shapes: [
      { id: 'leaf1', fill: DARK, uv: VE.leaf(0.9, 0.46, 0.36, 0.07, -100, AR) },
      { id: 'leaf2', fill: GREEN, uv: VE.leaf(0.9, 0.46, 0.30, 0.065, -62, AR) },
      { id: 'leaf3', fill: LIME, uv: VE.leaf(0.9, 0.46, 0.28, 0.06, -138, AR) },
      { id: 'grass', fill: LIME, uv: grass(0.44, 0.78, 0.75, 0.017, AR) },
      { id: 'ground', fill: GREEN, rrect: [0.44, 0.735, 0.78, 0.755, 0] },
    ],
    texts: [
      { id: 'name', text: 'TOMMY WALSH', u: 0.62, v: 0.20, size: 0.13, fill: DARK, spacing: 0.004 },
      { id: 'msg', text: 'GARDENS BUILT TO LAST.', u: 0.62, v: 0.33, size: 0.085, fill: GREEN, spacing: 0.003 },
      { id: 'tag', text: 'LANDSCAPING · PATIOS · FENCING', u: 0.62, v: 0.42, size: 0.045, fill: DARK, spacing: 0.004 },
      { id: 'door', text: 'GARDENS · PATIOS', u: 0.27, v: 0.70, size: 0.04, fill: DARK, spacing: 0.003 },
    ],
    rear: {
      shapes: [
        { fill: DARK, uv: VE.leaf(0.5, 0.5, 0.16, 0.035, -100, AR_REAR) },
        { fill: GREEN, uv: VE.leaf(0.5, 0.5, 0.13, 0.032, -60, AR_REAR) },
        { fill: LIME, uv: VE.leaf(0.5, 0.5, 0.12, 0.03, -140, AR_REAR) },
        { fill: LIME, uv: grass(0.1, 0.9, 0.62, 0.03, AR_REAR) },
      ],
      texts: [
        { text: 'TOMMY WALSH', u: 0.5, v: 0.2, size: 0.085, fill: DARK, spacing: 0.003 },
        { text: 'GARDENS BUILT TO LAST.', u: 0.5, v: 0.30, size: 0.055, fill: GREEN, spacing: 0.003 },
      ],
    },

    sketchNotes: [
      { text: 'leaves growing up the back', u: 0.62, v: -0.1, arrow: [[0.82, -0.06], [0.88, 0.2]] },
      { text: 'name clear, nothing fussy', u: 0.12, v: -0.1, arrow: [[0.3, -0.06], [0.5, 0.15]] },
      { text: 'grass along the bottom', u: 0.36, v: 1.2, arrow: [[0.5, 1.13], [0.58, 0.72]] },
    ],
    concept: {
      prompt: 'turn this sketch into a white Peugeot Boxer livery for a landscaper: big green leaves, grass along the bottom, bold name',
      image: null,
      garbled: { 'TOMMY WALSH': 'TOMY WLASH', 'GARDENS BUILT TO LAST.': 'GRADENS BUILT TO LSAT.', 'LANDSCAPING · PATIOS · FENCING': 'LANDSCAIPNG · PATOIS · FENICNG', 'GARDENS · PATIOS': 'GARDNES · PAITOS' },
    },
    camera: [
      { shapes: ['leaf1', 'leaf2', 'leaf3'], k: 1.9 },
      { texts: ['name', 'msg', 'tag'], k: 1.5 },
      { texts: ['door'], k: 2.4 },
    ],
    zoom: { u: 0.47, v: 0.08, w: 0.32 },

    captions: {
      brief: [{ text: 'This one’s for Tommy Walsh.' }, { text: 'One message: *gardens built to last.*' }],
      sketch: [{ text: 'Rough sketch on a big Peugeot Boxer.' }, { text: 'Leaves growing up the back, grass along the bottom.' }],
      concept: [{ text: 'AI turns it into a look.' }, { text: 'Lovely garden… shame about the spelling.' }],
      vector: [{ text: 'Redrawn as clean vectors.' }, { text: 'Every leaf is just a few smooth curves.' }, { text: 'Then the lettering, *spelled right.*' }],
      colour: [{ text: 'White van. Three greens. Nothing else.' }],
      zoom: [{ text: 'Zoom right in.' }, { text: 'The AI leaves go fuzzy. The vector *stays crisp.*' }],
      van: [{ text: 'On the real Boxer template.' }, { text: 'Both sides and the back, ready for 3D.' }],
      handoff: [{ text: 'Let’s see it in *3D.*' }],
    },
    audio: {
      music: 'assets/audio/music/idea-to-van-theme.mp3', voVolume: 1.6, musicVolume: 0.2, sfxVolume: 0.35,
      voDir: 'assets/audio/vo/ve03-tommy-walsh',
      voAt: { intro: 0.35, brief: 0.3, sketch: 0.3, concept: 0.3, vector: 0.3, colour: 0.3, zoom: 0.3, van: 0.3, handoff: 0.2, outro: 0.4 },
    },
    durations: { intro: 2.8, brief: 7, sketch: 7, concept: 6.5, vector: 10, colour: 4.5, zoom: 6, van: 7, handoff: 2.6, outro: 4.5 },
  };
})();
