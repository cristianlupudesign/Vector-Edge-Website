/* Vector Edge \u2014 Vehicle Designer v5 library: designs, vinyl palette, fonts.

   A design is vehicle-independent. Per view (side / rear / front; side2 reuses
   side, mirrored) it gives:
     art(a)  -> shapes [{r:role, d:[['M',u,v],['L',u,v],['Q',u,v,u,v],['C',...],['Z']], clip?:[u0,v0,u1,v1]}]
                u runs along the body from the FRONT (0) to the rear (1), v from
                roof (0) to sill (1). `a` holds the vehicle's measured anchors:
                cab (cab end), belt (beltline), fw/rw (wheel centres), wt (wheel
                top), ar (frame width/height).
     blocks  -> where the customer's elements go: 'brand' (logo + name +
                services), 'list' (services list), 'contact' (phone, web, email,
                socials). x/y/w/h are fractions of a zone the engine measured on
                the vehicle: 'panel' (clean side), 'rear', 'bonnet', 'body'.
   Colour roles: p / a / k = graphics, t = main lettering, t2 = secondary
   lettering, w = lettering that sits on a graphic. Defaults are Oracal 651
   shades; a colour the customer picks for a role carries to every design. */
(function(){
  'use strict';

  var ORACAL = [
    {n:'White', h:'#FFFFFF'}, {n:'Golden Yellow', h:'#F6A800'}, {n:'Yellow', h:'#FFCC00'},
    {n:'Brimstone Yellow', h:'#E6DC32'}, {n:'Dark Red', h:'#8C1D20'}, {n:'Red', h:'#CC2229'},
    {n:'Orange Red', h:'#E2472C'}, {n:'Orange', h:'#F5731A'}, {n:'Purple', h:'#38197B'},
    {n:'Violet', h:'#6C2B84'}, {n:'Pink', h:'#D42F87'}, {n:'Light Pink', h:'#F49AC1'},
    {n:'Dark Blue', h:'#152F63'}, {n:'Brilliant Blue', h:'#1B57A5'}, {n:'Blue', h:'#14477D'},
    {n:'Light Blue', h:'#1F9CD9'}, {n:'Dark Green', h:'#0C4E37'}, {n:'Green', h:'#0B8457'},
    {n:'Yellow Green', h:'#33A457'}, {n:'Lime Green', h:'#7CBB45'}, {n:'Black', h:'#121215'},
    {n:'Dark Grey', h:'#4B4B4D'}, {n:'Grey', h:'#86888A'}, {n:'Silver', h:'#C6C7C9'},
    {n:'Gold', h:'#C2963D'}, {n:'Copper', h:'#AD6A2F'}, {n:'Fluor. Yellow', h:'#E8F73C'},
    {n:'Fluor. Orange', h:'#FF9B21'}, {n:'Fluor. Orange-Red', h:'#FF3F1E'}, {n:'Fluor. Green', h:'#4CDB43'}
  ];

  var VCOLOURS = [
    {n:'White', h:'#FFFFFF'}, {n:'Silver', h:'#C8C9CB'}, {n:'Grey', h:'#8F9193'},
    {n:'Black', h:'#1A1B1E'}, {n:'Dark Blue', h:'#1E3A66'}, {n:'Blue', h:'#2563B0'},
    {n:'Red', h:'#B3202C'}, {n:'Dark Green', h:'#1D4D36'}, {n:'Yellow', h:'#E7C93C'}, {n:'Orange', h:'#D2662A'}
  ];

  var FONTS = [
    { g:'Bold & block', items:[
      ['Anton', "'Anton',sans-serif"], ['Archivo Black', "'Archivo Black',sans-serif"],
      ['Alfa Slab One', "'Alfa Slab One',serif"], ['Russo One', "'Russo One',sans-serif"],
      ['Righteous', "'Righteous',sans-serif"], ['Montserrat Bold', "'Montserrat',sans-serif"],
      ['Poppins Bold', "'Poppins',sans-serif"] ]},
    { g:'Tall & condensed', items:[
      ['Bebas Neue', "'Bebas Neue',sans-serif"], ['Oswald', "'Oswald',sans-serif"],
      ['Barlow Condensed', "'Barlow Condensed','Arial Narrow',sans-serif"], ['Teko', "'Teko',sans-serif"] ]},
    { g:'Clean & modern', items:[
      ['Inter', "'Inter',sans-serif"], ['Exo 2', "'Exo 2',sans-serif"] ]},
    { g:'Tech & sport', items:[
      ['Orbitron', "'Orbitron',sans-serif"], ['Audiowide', "'Audiowide',sans-serif"] ]},
    { g:'Script & hand', items:[
      ['Pacifico', "'Pacifico',cursive"], ['Lobster', "'Lobster',cursive"],
      ['Dancing Script', "'Dancing Script',cursive"], ['Caveat', "'Caveat',cursive"],
      ['Permanent Marker', "'Permanent Marker',cursive"], ['Bangers', "'Bangers',cursive"] ]},
    { g:'Serif & classic', items:[
      ['Playfair Display', "'Playfair Display',serif"], ['Merriweather', "'Merriweather',serif"],
      ['Roboto Slab', "'Roboto Slab',serif"] ]}
  ];

  /* the customer's elements \u2014 one set, shared by every design and vehicle */
  var ELEMENTS = [
    {k:'logo', n:'Logo', on:true},
    {k:'name', n:'Business name', on:true, max:28, ph:'e.g. Bright Build'},
    {k:'services', n:'Tagline', on:true, max:60, ph:'e.g. Plumbing, Heating, Bathrooms'},
    {k:'list', n:'Services list', on:true, multi:true, ph:'One per line, up to 6'},
    {k:'phone', n:'Phone', on:true, max:16, ph:'07123 456 789'},
    {k:'web', n:'Website', on:true, max:28, ph:'yoursite.co.uk'},
    {k:'email', n:'Email', on:false, max:32, ph:'you@yoursite.co.uk'},
    {k:'socials', n:'Social handles', on:false, sub:[['insta', 'Instagram'], ['fb', 'Facebook'], ['tiktok', 'TikTok']]}
  ];

  var ROLE_NAMES = { p:'Main graphic', a:'Accent', k:'Third graphic', t:'Lettering', t2:'Second lettering', w:'Lettering on graphics' };

  /* seeded random, so procedural artwork is identical on every render */
  function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function blob(cx, cy, r, ar, R){
    var n = 9, pts = [];
    for (var i = 0; i < n; i++){
      var ang = i/n*Math.PI*2, rr = r*(0.6 + R()*0.7);
      pts.push([cx + Math.cos(ang)*rr*1.6/ar, cy + Math.sin(ang)*rr]);
    }
    function mid(p, q){ return [(p[0] + q[0])/2, (p[1] + q[1])/2]; }
    var m0 = mid(pts[n - 1], pts[0]), d = [['M', m0[0], m0[1]]];
    for (var j = 0; j < n; j++){ var m = mid(pts[j], pts[(j + 1) % n]); d.push(['Q', pts[j][0], pts[j][1], m[0], m[1]]); }
    d.push(['Z']);
    return d;
  }
  function camo(a, seed){
    var R = rng(seed), out = [{r:'p', d:[['M', -0.05, -0.05], ['L', 1.05, -0.05], ['L', 1.05, 1.05], ['L', -0.05, 1.05], ['Z']]}];
    ['a', 'k', 't2'].forEach(function(role, li){
      for (var i = 0; i < 26 - li*6; i++) out.push({r:role, d:blob(R()*1.05 - 0.02, R()*1.05 - 0.02, 0.07 + R()*0.09, a.ar, R)});
    });
    return out;
  }
  /* rear chevrons: 45-degree stripes meeting in a point at the centre line */
  function chevrons(a, top){
    var out = [], s = 0.075, dv = 1 - top, du = dv/a.ar;
    for (var i = -2, n = 0; i < 16; i++, n++){
      var x = i*s*2;
      out.push({r:n % 2 ? 'a' : 'p', clip:[0, top, 0.5, 1], d:[['M', x, top], ['L', x + s*2, top], ['L', x + s*2 - du, 1], ['L', x - du, 1], ['Z']]});
      out.push({r:n % 2 ? 'a' : 'p', clip:[0.5, top, 1, 1], d:[['M', 1 - x, top], ['L', 1 - x - s*2, top], ['L', 1 - x - s*2 + du, 1], ['L', 1 - x + du, 1], ['Z']]});
    }
    return out;
  }

  var DESIGNS = [
    { k:'bolt', n:'Bolt Stripe', d:'Diagonal bolt behind the cab, name, services & phone',
      font:"'Montserrat',sans-serif", roles:{p:'#1B57A5', a:'#FFCC00', t:'#152F63', t2:'#1B57A5'},
      views:{
        side:{
          art:function(a){
            var c = a.cab, b = a.belt;
            return [
              {r:'p', d:[['M', c - 0.045, b - 0.04], ['L', c - 0.005, b - 0.04], ['L', c - 0.06, 1.02], ['L', c - 0.1, 1.02], ['Z']]},
              {r:'a', d:[['M', c + 0.005, b - 0.04], ['L', c + 0.075, b - 0.04], ['L', c + 0.035, b + 0.2], ['L', c + 0.07, b + 0.2], ['L', c - 0.035, 1.0], ['L', c - 0.002, b + 0.3], ['L', c - 0.035, b + 0.3], ['Z']]}
            ];
          },
          blocks:[
            {b:'brand', z:'panel', x:0.1, y:0.02, w:0.9, h:0.34, arrange:'row'},
            {b:'list', z:'panel', x:0.1, y:0.46, w:0.46, h:0.46},
            {b:'contact', z:'panel', x:0.58, y:0.5, w:0.42, h:0.4, align:'right'}
          ]},
        rear:{ blocks:[
          {b:'brand', z:'rear', x:0, y:0, w:1, h:0.5, arrange:'row', align:'center'},
          {b:'contact', z:'rear', x:0.08, y:0.6, w:0.84, h:0.36, align:'center'}
        ]}
      }},

    { k:'sweep', n:'Lower Sweep', d:'Curved sweep rising to the rear, clean upper panel',
      font:"'Poppins',sans-serif", roles:{p:'#0B8457', a:'#7CBB45', t:'#0C4E37', t2:'#0B8457'},
      views:{
        side:{
          art:function(){
            return [
              {r:'a', d:[['M', -0.02, 0.93], ['C', 0.4, 0.92, 0.7, 0.8, 1.02, 0.6], ['L', 1.02, 0.64], ['C', 0.7, 0.84, 0.4, 0.96, -0.02, 0.97], ['Z']]},
              {r:'p', d:[['M', -0.02, 1.0], ['C', 0.4, 0.98, 0.7, 0.87, 1.02, 0.67], ['L', 1.02, 1.05], ['L', -0.02, 1.05], ['Z']]}
            ];
          },
          blocks:[
            {b:'brand', z:'panel', x:0, y:0.02, w:1, h:0.36, arrange:'row', align:'center'},
            {b:'list', z:'panel', x:0, y:0.46, w:0.48, h:0.42},
            {b:'contact', z:'panel', x:0.52, y:0.44, w:0.48, h:0.36, align:'right'}
          ]},
        rear:{
          art:function(){
            return [
              {r:'a', d:[['M', -0.02, 0.8], ['L', 1.02, 0.7], ['L', 1.02, 0.74], ['L', -0.02, 0.84], ['Z']]},
              {r:'p', d:[['M', -0.02, 0.87], ['L', 1.02, 0.77], ['L', 1.02, 1.05], ['L', -0.02, 1.05], ['Z']]}
            ];
          }}
      }},

    { k:'slash', n:'Dynamic Slash', d:'Angled orange, red & yellow bands with bold lettering',
      font:"'Russo One',sans-serif", roles:{p:'#F5731A', a:'#CC2229', k:'#FFCC00', t:'#121215', t2:'#121215'},
      views:{
        side:{
          art:function(a){
            var c = a.cab;
            return [
              {r:'p', d:[['M', c - 0.22, 1.03], ['L', c - 0.03, 0.62], ['L', c + 0.12, 0.62], ['L', c - 0.05, 1.03], ['Z']]},
              {r:'a', d:[['M', c - 0.02, 1.03], ['L', c + 0.3, 0.55], ['L', c + 0.4, 0.55], ['L', c + 0.12, 1.03], ['Z']]},
              {r:'k', d:[['M', c + 0.36, 0.66], ['L', 0.99, 0.58], ['L', 0.96, 0.74], ['L', c + 0.42, 0.78], ['Z']]},
              {r:'a', d:[['M', 0.8, -0.02], ['L', 1.0, -0.02], ['L', 0.97, 0.1], ['L', 0.84, 0.13], ['Z']]}
            ];
          },
          blocks:[
            {b:'brand', z:'panel', x:0, y:0.06, w:0.56, h:0.32, arrange:'row'},
            {b:'list', z:'panel', x:0.6, y:0.2, w:0.36, h:0.4},
            {b:'contact', z:'panel', x:0, y:0.5, w:0.42, h:0.3}
          ]},
        rear:{
          art:function(){
            return [
              {r:'a', d:[['M', -0.02, 1.02], ['L', 0.3, 0.7], ['L', 0.42, 0.7], ['L', 0.12, 1.02], ['Z']]},
              {r:'k', d:[['M', 0.58, 1.02], ['L', 0.9, 0.7], ['L', 1.02, 0.7], ['L', 1.02, 1.02], ['Z']]}
            ];
          }}
      }},

    { k:'line', n:'Clean Line', d:'Minimal sill line, centred name & contact',
      font:"'Inter',sans-serif", roles:{p:'#152F63', a:'#1F9CD9', t:'#152F63', t2:'#4B4B4D'},
      views:{
        side:{
          art:function(){
            return [
              {r:'a', d:[['M', -0.02, 0.81], ['L', 1.02, 0.77], ['L', 1.02, 0.79], ['L', -0.02, 0.83], ['Z']]},
              {r:'p', d:[['M', -0.02, 0.86], ['L', 1.02, 0.82], ['L', 1.02, 0.9], ['L', -0.02, 0.94], ['Z']]}
            ];
          },
          blocks:[
            {b:'brand', z:'panel', x:0.04, y:0.04, w:0.92, h:0.38, arrange:'row', align:'center'},
            {b:'list', z:'panel', x:0.04, y:0.52, w:0.44, h:0.42},
            {b:'contact', z:'panel', x:0.52, y:0.52, w:0.44, h:0.38, align:'right'}
          ]},
        rear:{
          art:function(){ return [{r:'p', d:[['M', -0.02, 0.9], ['L', 1.02, 0.9], ['L', 1.02, 0.96], ['L', -0.02, 0.96], ['Z']]}]; }
        }
      }},

    { k:'link', n:'Link Bars', d:'Angular bars at the rear corner with a sill link',
      font:"'Oswald',sans-serif", roles:{p:'#121215', a:'#E6DC32', t:'#121215', t2:'#4B4B4D'},
      views:{
        side:{
          art:function(){
            var out = [];
            for (var i = 0; i < 3; i++){
              var x = 0.8 + 0.06*i;
              out.push({r:i === 1 ? 'a' : 'p', d:[['M', x, -0.02], ['L', x + 0.035, -0.02], ['L', x - 0.065, 0.62], ['L', x - 0.1, 0.62], ['Z']]});
            }
            out.push({r:'a', d:[['M', -0.02, 0.88], ['L', 0.5, 0.88], ['L', 0.55, 0.83], ['L', 1.02, 0.83], ['L', 1.02, 0.87], ['L', 0.57, 0.87], ['L', 0.52, 0.92], ['L', -0.02, 0.92], ['Z']]});
            return out;
          },
          blocks:[
            {b:'brand', z:'panel', x:0, y:0.02, w:0.52, h:0.34, arrange:'row'},
            {b:'contact', z:'panel', x:0, y:0.42, w:0.5, h:0.26},
            {b:'list', z:'panel', x:0, y:0.72, w:0.5, h:0.26}
          ]},
        rear:{
          art:function(){
            return [
              {r:'p', d:[['M', 0.84, -0.02], ['L', 0.9, -0.02], ['L', 0.76, 0.3], ['L', 0.7, 0.3], ['Z']]},
              {r:'a', d:[['M', 0.94, -0.02], ['L', 1.0, -0.02], ['L', 0.86, 0.3], ['L', 0.8, 0.3], ['Z']]}
            ];
          }}
      }},

    { k:'chevron', n:'Reflective', d:'Chevron-striped rear doors, high-vis sill band',
      font:"'Barlow Condensed','Arial Narrow',sans-serif", roles:{p:'#CC2229', a:'#E8F73C', t:'#121215', t2:'#121215'},
      views:{
        side:{
          art:function(){
            return [
              {r:'a', d:[['M', -0.02, 0.85], ['L', 1.02, 0.85], ['L', 1.02, 0.93], ['L', -0.02, 0.93], ['Z']]},
              {r:'p', d:[['M', -0.02, 0.93], ['L', 1.02, 0.93], ['L', 1.02, 0.96], ['L', -0.02, 0.96], ['Z']]}
            ];
          },
          blocks:[
            {b:'brand', z:'panel', x:0, y:0.02, w:1, h:0.38, arrange:'row', align:'center'},
            {b:'list', z:'panel', x:0, y:0.5, w:0.48, h:0.42},
            {b:'contact', z:'panel', x:0.52, y:0.5, w:0.48, h:0.38, align:'right'}
          ]},
        rear:{
          art:function(a){ return chevrons(a, 0.56); },
          blocks:[
            {b:'brand', z:'rear', x:0, y:0, w:1, h:0.55, arrange:'row', align:'center'},
            {b:'contact', z:'rear', x:0.08, y:0.6, w:0.84, h:0.3, align:'center', only:['phone']}
          ]}
      }},

    { k:'camo', n:'Camo', d:'Full camo wrap with your logo & lettering on top',
      font:"'Bebas Neue',sans-serif", roles:{p:'#86888A', a:'#4B4B4D', k:'#C6C7C9', t2:'#121215', t:'#FFFFFF', w:'#121215'},
      views:{
        side:{
          art:function(a){ return camo(a, 7); },
          blocks:[
            {b:'brand', z:'panel', x:0, y:0.02, w:1, h:0.38, arrange:'row', align:'center', c2:'t', halo:'w'},
            {b:'list', z:'panel', x:0, y:0.5, w:0.48, h:0.42, c2:'t', halo:'w'},
            {b:'contact', z:'panel', x:0.52, y:0.5, w:0.48, h:0.38, align:'right', c2:'t', halo:'w'}
          ]},
        rear:{ art:function(a){ return camo(a, 11); },
          blocks:[
            {b:'brand', z:'rear', x:0, y:0, w:1, h:0.5, arrange:'row', align:'center', c2:'t', halo:'w'},
            {b:'contact', z:'rear', x:0.08, y:0.6, w:0.84, h:0.36, align:'center', c2:'t', halo:'w'}
          ]},
        front:{ art:function(a){ return camo(a, 3); },
          blocks:[{b:'brand', z:'bonnet', x:0, y:0, w:1, h:1, arrange:'row', align:'center', only:['logo', 'name'], halo:'w'}] }
      }}
  ];

  window.VED5_LIB = { ORACAL:ORACAL, VCOLOURS:VCOLOURS, FONTS:FONTS, ELEMENTS:ELEMENTS, ROLE_NAMES:ROLE_NAMES, DESIGNS:DESIGNS };
})();
