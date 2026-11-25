/*
  VW Transporter T6.1 panel van (SWB) — drawn in code.
  Side view, van facing RIGHT (this is the nearside / UK kerb side, with the sliding door).
  Units: 1000 = overall length (4904 mm), so 1 unit ≈ 4.9 mm. Ground is y = 420.
  To add another van, copy this file, redraw the pieces, and set `van.model` in the episode.
*/
window.VAN = {
  id: 'vw-t61',
  name: 'VW Transporter T6.1',
  size: { w: 1000, h: 420 },
  // Body outline = the area the wrap covers.
  body: 'M 6 372 L 4 40 Q 4 18 26 17 L 735 15 Q 752 15 760 26 L 872 196 Q 878 205 890 207 L 975 222 Q 996 226 998 248 L 1000 330 Q 1000 372 975 374 L 876 376 A 84 84 0 1 0 716 376 L 264 376 A 84 84 0 1 0 104 376 L 30 374 Q 8 374 6 372 Z',
  glass: ['M 700 34 L 752 34 L 840 166 L 700 166 Z'],
  glassShine: ['M 712 34 L 752 34 L 790 91 L 712 140 Z'],
  // Panel shut lines and other line work.
  lines: [
    'M 690 30 L 690 372',          // B-pillar / front door rear edge
    'M 458 26 L 458 374',          // sliding door rear edge
    'M 862 214 Q 884 260 880 330', // front door front edge
    'M 20 30 L 20 372',            // rear door edge
    'M 458 150 L 690 150',         // sliding door top track
  ],
  wheels: [{ cx: 184, cy: 350, r: 70 }, { cx: 796, cy: 350, r: 70 }],
  // Solid parts drawn on top of the wrap in the "real van" stage.
  parts: [
    { d: 'M 940 300 L 1000 300 L 1000 330 Q 1000 372 975 374 L 940 374 Z', fill: '#1E1E20' },        // front bumper lower
    { d: 'M 4 318 L 34 318 L 34 374 L 30 374 Q 8 374 6 372 Z', fill: '#1E1E20' },                   // rear bumper
    { d: 'M 968 232 L 996 238 Q 999 250 999 262 L 970 258 Q 962 245 968 232 Z', fill: '#E8EEF2' },   // headlight
    { d: 'M 4 60 L 14 60 L 14 170 L 4 170 Z', fill: '#C8262B' },                                     // rear light
    { d: 'M 828 150 Q 846 132 866 138 L 870 162 Q 850 168 834 166 Z', fill: '#1E1E20' },             // mirror
    { d: 'M 700 196 L 738 196 L 738 206 L 700 206 Z', fill: '#2A2A2C' },                             // front door handle
    { d: 'M 470 196 L 508 196 L 508 206 L 470 206 Z', fill: '#2A2A2C' },                             // sliding door handle
  ],
  // Rear view (for the export panels). Units: 0..500 wide, ground y = 420.
  rear: {
    size: { w: 500, h: 420 },
    body: 'M 44 378 L 30 66 Q 30 22 80 18 L 420 18 Q 470 22 470 66 L 456 378 Z',
    parts: [
      { d: 'M 30 330 L 470 330 L 466 392 L 34 392 Z', fill: '#1E1E20' },
      { d: 'M 32 80 L 58 80 L 60 220 L 36 220 Z', fill: '#C8262B' },
      { d: 'M 468 80 L 442 80 L 440 220 L 464 220 Z', fill: '#C8262B' },
      { d: 'M 190 292 L 310 292 L 310 320 L 190 320 Z', fill: '#F4D23C' },
    ],
  },
};
