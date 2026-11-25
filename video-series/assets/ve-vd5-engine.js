/* Vector Edge \u2014 Vehicle Designer v5 engine.

   Renders a design onto a vehicle as stacked layers inside one <svg>:
     1. base    \u2014 the vehicle as supplied (outline sheet, or PSD-exported photos)
     2. paint   \u2014 the chosen vehicle colour, inside the bodywork mask
     3. art     \u2014 design graphics + the customer's elements (logo, name, ...)
     4. overlay \u2014 the vehicle again, multiplied over 2+3, so panel lines,
                  shading and reflections sit ON the vinyl instead of under it
   Layers 2-4 share one bodywork mask, so nothing is ever drawn on glass,
   tyres, lights or trim.

   Designs never contain a vehicle. They are drawn in each view's normalised
   frame (u along the body from the FRONT, v from roof to sill) against anchors
   measured from the vehicle (cab end, beltline, wheels), and the customer's
   elements are laid out into a fixed set of blocks (brand / list / contact).
   So every design fits every vehicle, and logo, text, colours and font carry
   over unchanged when the design or vehicle changes.

   Vehicle sources:
     VED5.fromOutline(host, svgText) \u2014 the existing 1368x1368 five-view sheets
     VED5.fromPhotos(host, manifest) \u2014 per-view layers exported from the PSDs
   Both return the same "sheet" object, so the renderer does not care which. */
(function(){
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function mk(tag, attrs, parent){
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function parseRgb(s){
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s || '');
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  function lum(c){ return 0.299*c[0] + 0.587*c[1] + 0.114*c[2]; }
  function union(rs){
    if (!rs.length) return null;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    rs.forEach(function(r){ x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); });
    return {x:x0, y:y0, w:x1 - x0, h:y1 - y0};
  }
  function centreIn(r, R){
    var cx = r.x + r.w/2, cy = r.y + r.h/2;
    return cx >= R.x && cx <= R.x + R.w && cy >= R.y && cy <= R.y + R.h;
  }
  function pad(R, p){ return {x:R.x - p, y:R.y - p, w:R.w + p*2, h:R.h + p*2}; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  /* ---------- view regions on an outline sheet ----------
     Same idea as v4: cluster all geometry into three rows (top / front+side /
     rear+side2), then split the lower two rows into left and right. */
  function computeRegions(pts, size){
    if (!pts.length) return null;
    var SZ = Math.ceil(size) + 1;
    function bandsOf(items, axis){
      var occ = new Uint8Array(SZ);
      items.forEach(function(p){
        var a = axis === 'y' ? p.y : p.x, b = a + (axis === 'y' ? p.h : p.w);
        for (var i = Math.max(0, Math.floor(a)), n = Math.min(SZ - 1, Math.ceil(b)); i <= n; i++) occ[i] = 1;
      });
      var segs = [], s = -1;
      for (var i = 0; i < SZ; i++){
        if (occ[i] && s < 0) s = i;
        if ((!occ[i] || i === SZ - 1) && s >= 0){ segs.push([s, i]); s = -1; }
      }
      var out = [];
      segs.forEach(function(sg){
        if (out.length && sg[0] - out[out.length - 1][1] < 8) out[out.length - 1][1] = sg[1];
        else out.push(sg.slice());
      });
      return out;
    }
    function mergeTo(segs, n){
      while (segs.length > n){
        var bi = 1, bg = 1e9;
        for (var i = 1; i < segs.length; i++){ var g = segs[i][0] - segs[i - 1][1]; if (g < bg){ bg = g; bi = i; } }
        segs[bi - 1][1] = segs[bi][1]; segs.splice(bi, 1);
      }
      return segs;
    }
    function inSeg(v, sg){ return v >= sg[0] - 1 && v <= sg[1] + 1; }
    function nearest(v, segs){
      var bi = -1, bd = 1e9;
      segs.forEach(function(sg, i){ if (!sg) return; var d = v < sg[0] ? sg[0] - v : v > sg[1] ? v - sg[1] : 0; if (d < bd){ bd = d; bi = i; } });
      return bi;
    }
    /* three rows (top / front+side / rear+side2), or two when a sheet has no
       top view (the Luton sheet) */
    /* rows come from the big shapes only (panels, glass, wheels): antennas and
       mirrors poke into the neighbouring row on tightly packed sheets */
    var big = pts.filter(function(p){ return p.w*p.h > 900; });
    var src = big.length > 10 ? big : pts;
    var yb = mergeTo(bandsOf(src, 'y'), 3);
    if (!yb.length) return null;
    /* two rows that touch read as one band: split a band much taller than its
       neighbour at its least-occupied line */
    while (yb.length < 3){
      var ti = 0;
      yb.forEach(function(sg, i){ if (sg[1] - sg[0] > yb[ti][1] - yb[ti][0]) ti = i; });
      var T = yb[ti], others = yb.filter(function(sg, i){ return i !== ti; });
      var ref = others.length ? Math.max.apply(null, others.map(function(sg){ return sg[1] - sg[0]; })) : (T[1] - T[0])/3;
      if (T[1] - T[0] < ref*1.6) break;
      var cnt = new Uint16Array(SZ);
      src.forEach(function(p){ for (var i = Math.max(T[0], Math.floor(p.y)), n = Math.min(T[1], Math.ceil(p.y + p.h)); i <= n; i++) cnt[i]++; });
      var lo = T[0] + Math.round((T[1] - T[0])*0.3), hi = T[0] + Math.round((T[1] - T[0])*0.7), cut = lo;
      for (var y = lo; y <= hi; y++) if (cnt[y] < cnt[cut]) cut = y;
      yb.splice(ti, 1, [T[0], cut], [cut + 1, T[1]]);
    }
    if (yb.length < 2) return null;
    if (yb.length === 2) yb.unshift(null);
    function row(i){ return yb[i] ? pts.filter(function(p){ return nearest(p.y + p.h/2, yb) === i; }) : []; }
    function two(items){
      var bi = items.filter(function(p){ return p.w*p.h > 900; });
      var xb = mergeTo(bandsOf(bi.length > 4 ? bi : items, 'x'), 2);
      if (xb.length < 2) return {left:items, right:items};
      return {
        left: items.filter(function(p){ return nearest(p.x + p.w/2, xb) === 0; }),
        right: items.filter(function(p){ return nearest(p.x + p.w/2, xb) === 1; })
      };
    }
    var m = two(row(1)), b = two(row(2));
    return { all:union(pts), top:union(row(0)), front:union(m.left), side:union(m.right), rear:union(b.left), side2:union(b.right) };
  }

  /* ---------- anchors + zones for one view ----------
     F is the bodywork frame. Everything a design references is a fraction of
     F, measured from the front for side views. `given` (photo manifests, or
     per-vehicle overrides) can pin any anchor or zone. */
  function makeView(k, crop, F, glass, tyres, given){
    given = given || {};
    var mirror = given.mirror != null ? !!given.mirror : (k === 'side2');
    var view = { k:k, crop:crop, F:F, mirror:mirror };
    function U(x){ return mirror ? (F.x + F.w - x)/F.w : (x - F.x)/F.w; }
    function V(y){ return (y - F.y)/F.h; }
    function norm(r){
      var a = U(r.x), b = U(r.x + r.w);
      return { u0:Math.min(a, b), u1:Math.max(a, b), v0:V(r.y), v1:V(r.y + r.h) };
    }
    /* lamp lenses share the windows' pale blue in these sheets: windows start
       in the upper body and are wider than any lens */
    var side = k === 'side' || k === 'side2';
    var G = glass.map(norm).filter(function(g){
      return side ? (g.v0 < 0.42 && g.u1 - g.u0 > 0.03 && g.v1 - g.v0 > 0.08)
                  : (g.u1 - g.u0 > 0.2 && g.v1 - g.v0 > 0.1);
    });
    var a = { ar: F.w / F.h };

    if (side){
      var T = tyres.filter(function(t){ var q = t.w / t.h; return q > 0.6 && q < 1.6 && t.h > F.h*0.18; }).map(norm);
      var front = G.filter(function(g){ return (g.u0 + g.u1)/2 < 0.55; });
      var rear = G.filter(function(g){ return (g.u0 + g.u1)/2 > 0.6 && g.v1 - g.v0 > 0.1; });
      a.cab = front.length ? Math.max.apply(null, front.map(function(g){ return g.u1; })) : 0.32;
      a.belt = front.length ? Math.max.apply(null, front.map(function(g){ return g.v1; })) : 0.42;
      a.glassBelt = G.length ? Math.max.apply(null, G.map(function(g){ return g.v1; })) : a.belt;
      a.rearGlass = rear.length > 0;
      var wc = T.map(function(t){ return (t.u0 + t.u1)/2; }).sort(function(x, y){ return x - y; });
      a.fw = wc.length ? wc[0] : 0.2;
      a.rw = wc.length > 1 ? wc[wc.length - 1] : 0.8;
      a.wt = T.length ? Math.min.apply(null, T.map(function(t){ return t.v0; })) : 0.62;
    } else {
      /* the windscreen / rear window is the topmost glass; lenses sit lower */
      var top = G.filter(function(g){ return g.v0 < 0.4; }).sort(function(x, y){ return x.v0 - y.v0; })[0];
      a.gb = top ? top.v1 : 0;
    }
    if (given.anchors) for (var ak in given.anchors) a[ak] = given.anchors[ak];

    var z = { body:{x0:0, y0:0, x1:1, y1:1} };
    if (side){
      /* panel = the clean cargo side; on glazed vehicles (car, minibus) and
         where the cab glass runs most of the length, fall back to the door
         skin below the windows, between the wheels */
      var cargo = { x0:a.cab + 0.035, y0:0.07, x1:0.94, y1:clamp(a.wt - 0.03, 0.4, 0.92) };
      if (a.rearGlass || cargo.x1 - cargo.x0 < 0.35)
        cargo = { x0:a.fw + 0.09, y0:clamp(a.glassBelt + 0.04, 0, 0.8), x1:a.rw - 0.09, y1:0.9 };
      z.panel = cargo;
    } else if (k === 'rear'){
      /* x inset clears the tail-light clusters (and mirrors, which count as body) */
      z.rear = a.gb > 0.25 ? {x0:0.17, y0:a.gb + 0.05, x1:0.83, y1:0.84} : {x0:0.17, y0:0.07, x1:0.83, y1:0.6};
    } else if (k === 'front'){
      z.bonnet = a.gb > 0.2 ? {x0:0.24, y0:a.gb + 0.03, x1:0.76, y1:a.gb + 0.14} : {x0:0.25, y0:0.45, x1:0.75, y1:0.56};
    } else if (k === 'top'){
      z.roof = {x0:0.3, y0:0.2, x1:0.92, y1:0.8};
    }
    if (given.zones) for (var zk in given.zones) z[zk] = given.zones[zk];
    view.a = a; view.zones = z;

    view.pt = function(u, v){ return [F.x + (mirror ? 1 - u : u)*F.w, F.y + v*F.h]; };
    view.box = function(zone, b){
      var Z = z[zone] || z.body;
      var u0 = Z.x0 + b.x*(Z.x1 - Z.x0), u1 = u0 + b.w*(Z.x1 - Z.x0);
      var v0 = Z.y0 + b.y*(Z.y1 - Z.y0), v1 = v0 + b.h*(Z.y1 - Z.y0);
      if (mirror){ var t = 1 - u1; u1 = 1 - u0; u0 = t; }
      return { x:F.x + u0*F.w, y:F.y + v0*F.h, w:(u1 - u0)*F.w, h:(v1 - v0)*F.h };
    };
    return view;
  }

  /* ---------- source 1: outline sheet (current vehicle SVGs) ---------- */
  /* tune (optional): per-view overrides where measuring gets a sheet wrong,
     e.g. {side:{zones:{panel:{x0:.55,y0:.4,x1:.95,y1:.75}}}} — side2 falls
     back to side */
  function fromOutline(host, txt, tune){
    tune = tune || {};
    host.innerHTML = txt;
    var svg = host.querySelector('svg');
    if (!svg) return null;
    var vb = (svg.getAttribute('viewBox') || '0 0 1368 1368').split(/[\s,]+/).map(Number);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = vb[2] + 'px'; svg.style.height = vb[3] + 'px';   /* 1:1 while measuring */

    /* watermark: full-bleed pattern fills, attribute or style form */
    svg.querySelectorAll('[fill^="url("]').forEach(function(el){ el.style.display = 'none'; });
    svg.querySelectorAll('rect,path,polygon').forEach(function(el){
      if ((el.getAttribute('style') || '').indexOf('fill:url(') > -1) el.style.display = 'none';
    });

    var id = 'vd5s' + (++uid);
    var base = mk('g', {id:id + '-base'});
    while (svg.firstChild) base.appendChild(svg.firstChild);
    svg.appendChild(base);

    var inv = svg.getScreenCTM().inverse();
    function rootRect(el){
      var b = el.getBoundingClientRect();
      var p1 = svg.createSVGPoint(); p1.x = b.left; p1.y = b.top;
      var p2 = svg.createSVGPoint(); p2.x = b.right; p2.y = b.bottom;
      var a = p1.matrixTransform(inv), c = p2.matrixTransform(inv);
      return {x:a.x, y:a.y, w:c.x - a.x, h:c.y - a.y};
    }

    /* classify: bodywork (light greys), glass (blue-tinted lights), tyres (near black) */
    var body = [], glass = [], tyres = [], pts = [], fills = [];
    base.querySelectorAll('path,polygon,polyline,rect,ellipse,circle,line').forEach(function(el){
      if (el.style.display === 'none') return;
      var r = rootRect(el);
      if (r.w < 0.5 && r.h < 0.5) return;
      if (r.w > vb[2]*0.6 && r.h > vb[3]*0.6) return;          /* page background / frame */
      var c = parseRgb(getComputedStyle(el).fill);
      if (!c) return;
      pts.push(r);   /* filled shapes only: stroked antennas bridge the rows on tight sheets */
      var mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]), L = lum(c);
      var f = {el:el, r:r, body:false};
      fills.push(f);
      if (mx - mn <= 8 && L >= 208){ f.body = true; body.push(f); }
      else if (L >= 170 && c[2] - c[0] >= 6) glass.push(r);
      else if (mx - mn <= 14 && L <= 60) tyres.push(r);
    });

    /* light alloy rims pass the bodywork test — drop anything inside a tyre */
    var wheels = tyres.filter(function(t){ var q = t.w / t.h; return t.w > 20 && q > 0.6 && q < 1.6; });
    body = body.filter(function(b){
      var rim = wheels.some(function(t){ return centreIn(b.r, t) && b.r.w < t.w*0.98; });
      if (rim) b.body = false;
      return !rim;
    });

    /* bodywork mask, re-drawn in the sheet's own paint order: body fills
       white, every other fill black. Panels are often drawn whole with glass,
       lights and trim on top, so later fills must cut the mask back out. */
    var defs = mk('defs', null, svg);
    var mask = mk('mask', {id:id + '-mask', maskUnits:'userSpaceOnUse', x:vb[0], y:vb[1], width:vb[2], height:vb[3]}, defs);
    var started = false;
    fills.forEach(function(f){
      if (f.body) started = true;
      if (!started) return;              /* black before the first body fill changes nothing */
      var c = f.el.cloneNode(false);
      ['id', 'class', 'style', 'clip-path', 'mask', 'filter'].forEach(function(n){ c.removeAttribute(n); });
      var ink = f.body ? '#fff' : '#000';
      c.setAttribute('fill', ink); c.setAttribute('stroke', ink); c.setAttribute('stroke-width', f.body ? '1.2' : '0.4');
      var m = inv.multiply(f.el.getScreenCTM());
      c.setAttribute('transform', 'matrix(' + [m.a, m.b, m.c, m.d, m.e, m.f].join(' ') + ')');
      mask.appendChild(c);
    });

    var R = computeRegions(pts, Math.max(vb[2], vb[3]));
    var views = {};
    if (R){
      ['top', 'front', 'side', 'rear', 'side2'].forEach(function(k){
        var reg = R[k]; if (!reg) return;
        var F = union(body.filter(function(b){ return centreIn(b.r, reg); }).map(function(b){ return b.r; })) || reg;
        views[k] = makeView(k, pad(reg, 6), F,
          glass.filter(function(r){ return centreIn(r, reg); }),
          tyres.filter(function(r){ return centreIn(r, reg); }),
          tune[k] || (k === 'side2' ? tune.side : null));
      });
    }

    return {
      svg:svg, vb:vb, maskId:id + '-mask', views:views,
      all: R ? pad(R.all, 6) : {x:vb[0], y:vb[1], w:vb[2], h:vb[3]},
      overlay: function(parent){
        var u = mk('use', {href:'#' + id + '-base'}, parent);
        u.style.mixBlendMode = 'multiply';
      }
    };
  }

  /* ---------- source 2: layers exported from the vehicle PSDs ----------
     manifest = { views: { side: { img, mask, shade?, hi?, w, h,
                                   frame?:[x,y,w,h] (0..1 of the image),
                                   mirror?, anchors?, zones? }, ... } }
     img   \u2014 the vehicle photo/render, as the customer should see it (white van)
     mask  \u2014 transparent PNG, opaque wherever vinyl may go (bodywork only)
     shade \u2014 optional shading layer (multiplied); defaults to img
     hi    \u2014 optional highlights/reflections layer (screened) */
  function fromPhotos(host, man){
    var order = ['side', 'side2', 'rear', 'front', 'top'];
    var keys = order.filter(function(k){ return man.views && man.views[k]; });
    var gap = 60, col = 0, x = 0, y = 0, rowH = 0, W = 0, place = {};
    keys.forEach(function(k){
      var v = man.views[k];
      if (col === 2){ col = 0; x = 0; y += rowH + gap; rowH = 0; }
      place[k] = {x:x, y:y, w:v.w, h:v.h};
      x += v.w + gap; W = Math.max(W, x - gap); rowH = Math.max(rowH, v.h); col++;
    });
    var H = y + rowH;
    var id = 'vd5s' + (++uid);
    host.innerHTML = '';
    var svg = mk('svg', {viewBox:'0 0 ' + W + ' ' + H, preserveAspectRatio:'xMidYMid meet'}, host);
    var defs = mk('defs', null, svg);
    var mask = mk('mask', {id:id + '-mask', maskUnits:'userSpaceOnUse', x:0, y:0, width:W, height:H}, defs);
    mask.style.maskType = 'alpha';
    var base = mk('g', {id:id + '-base'}, svg);
    var views = {};
    keys.forEach(function(k){
      var v = man.views[k], P = place[k];
      mk('image', {href:v.img, x:P.x, y:P.y, width:P.w, height:P.h}, base);
      mk('image', {href:v.mask, x:P.x, y:P.y, width:P.w, height:P.h}, mask);
      var fr = v.frame || [0, 0, 1, 1];
      var F = {x:P.x + fr[0]*P.w, y:P.y + fr[1]*P.h, w:fr[2]*P.w, h:fr[3]*P.h};
      views[k] = makeView(k, P, F, [], [], v);
    });
    return {
      svg:svg, vb:[0, 0, W, H], maskId:id + '-mask', views:views, all:{x:0, y:0, w:W, h:H},
      overlay: function(parent){
        var sh = mk('g', null, parent), hi = mk('g', null, parent);
        sh.style.mixBlendMode = 'multiply'; hi.style.mixBlendMode = 'screen';
        keys.forEach(function(k){
          var v = man.views[k], P = place[k];
          mk('image', {href:v.shade || v.img, x:P.x, y:P.y, width:P.w, height:P.h}, sh);
          if (v.hi) mk('image', {href:v.hi, x:P.x, y:P.y, width:P.w, height:P.h}, hi);
        });
      }
    };
  }

  /* ---------- default block layout (used where a design leaves a view out) ---------- */
  var DEFAULTS = {
    side: { blocks:[
      {b:'brand', z:'panel', x:0, y:0.02, w:1, h:0.36, arrange:'row'},
      {b:'list', z:'panel', x:0, y:0.47, w:0.5, h:0.44},
      {b:'contact', z:'panel', x:0.52, y:0.47, w:0.48, h:0.42, align:'right'}
    ]},
    rear: { blocks:[
      {b:'brand', z:'rear', x:0, y:0, w:1, h:0.5, arrange:'row', align:'center'},
      {b:'contact', z:'rear', x:0.08, y:0.58, w:0.84, h:0.38, align:'center'}
    ]},
    front: { blocks:[
      {b:'brand', z:'bonnet', x:0, y:0, w:1, h:1, arrange:'row', align:'center', only:['logo', 'name']}
    ]},
    top: { blocks:[] }
  };

  var PLACEHOLDER = {
    name:'BRAND NAME', services:'Your services', phone:'07123 456 789', web:'website.co.uk',
    email:'you@email.co.uk', insta:'yourbusiness', fb:'yourbusiness', tiktok:'yourbusiness',
    list:'Installation & Repairs\nMaintenance & Servicing\nFault Finding\nEmergency Callouts'
  };
  var SOCIAL = [['insta', '\u25CE '], ['fb', 'f\u2009 '], ['tiktok', '\u266A ']];

  /* ---------- drawing helpers ---------- */
  function pathD(view, cmds){
    var d = '';
    cmds.forEach(function(c){
      d += c[0];
      for (var i = 1; i < c.length; i += 2){ var p = view.pt(c[i], c[i + 1]); d += ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
      d += ' ';
    });
    return d;
  }

  function hexRgb(h){
    h = String(h || '').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, function(c){ return c + c; });
    return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
  }
  /* the colour a role is actually drawn in: the customer's pick, else the
     design default — except default dark lettering on a dark vehicle, which
     turns white so the preview never shows unreadable text */
  function colour(design, model, role){
    if (model.colours && model.colours[role]) return model.colours[role];
    var d = design.roles && design.roles[role];
    if (d && (role === 't' || role === 't2') && model.vehColour && lum(hexRgb(model.vehColour)) < 100 && lum(hexRgb(d)) < 110) return '#FFFFFF';
    return d || '#121215';
  }

  function context(design, model){
    var font = model.font || design.font || "'Montserrat',sans-serif";
    return {
      design:design, model:model, font:font,
      col: function(role){ return colour(design, model, role); },
      on: function(k){ var e = model.els[k]; return !!(e && e.on); },
      txt: function(k){
        var e = model.els[k], v = e && e.v ? String(e.v).trim() : '';
        v = v || PLACEHOLDER[k] || '';
        return (k === 'name' && design.upper !== false) ? v.toUpperCase() : v;
      },
      logoAspect: model.logo && model.logo.aspect ? model.logo.aspect : 1
    };
  }

  /* lines stacked top-down; each line shrinks to fit width w */
  function stack(parent, x, y, w, h, lines, ctx, anchor, minWeight){
    var g = mk('g', null, parent);
    if (!lines.length) return g;
    var W = 0; lines.forEach(function(l){ W += l.w; });
    var unit = h / Math.max(W*1.25, minWeight || 0);
    var cy = y;
    lines.forEach(function(l, i){
      var size = unit*l.w;
      var t = mk('text', {
        x:anchor === 'middle' ? x + w/2 : anchor === 'end' ? x + w : x,
        'text-anchor':anchor, 'font-size':size.toFixed(2),
        'font-family':l.font || ctx.font, 'font-weight':l.weight || 700, fill:l.colour
      }, g);
      var hl = l.halo || lines.halo;
      if (hl){ t.setAttribute('stroke', hl); t.setAttribute('stroke-linejoin', 'round'); t.style.paintOrder = 'stroke'; }
      t.textContent = l.text;
      var len = 0; try { len = t.getComputedTextLength(); } catch(e){}
      if (len > w && len > 0){ size = size*w/len; t.setAttribute('font-size', size.toFixed(2)); }
      if (hl) t.setAttribute('stroke-width', (size*0.08).toFixed(2));
      cy += size*(i ? 1.12 : 0.8);
      t.setAttribute('y', cy.toFixed(2));
    });
    return g;
  }

  function drawLogo(parent, x, y, w, h, ctx){
    if (ctx.model.logo && ctx.model.logo.url){
      mk('image', {href:ctx.model.logo.url, x:x, y:y, width:w, height:h, preserveAspectRatio:'xMidYMid meet'}, parent);
      return;
    }
    /* placeholder mark in the design's colours */
    var s = Math.min(w, h), cx = x + w/2, cy = y + h/2;
    mk('rect', {x:cx - s/2, y:cy - s/2, width:s, height:s, rx:s*0.18, fill:ctx.col('a')}, parent);
    var t = mk('text', {x:cx, y:cy + s*0.11, 'text-anchor':'middle', 'font-size':s*0.3, 'font-family':"'Montserrat',sans-serif", 'font-weight':800, fill:ctx.col('t')}, parent);
    t.textContent = 'LOGO';
  }

  function centreV(g, box){
    var bb; try { bb = g.getBBox(); } catch(e){ return; }
    if (!bb.height) return;
    g.setAttribute('transform', 'translate(0 ' + (box.y + box.h/2 - (bb.y + bb.height/2)).toFixed(2) + ')');
  }

  function drawBlock(parent, view, b, ctx){
    var box = view.box(b.z || 'body', b);
    var g = mk('g', {'class':'vd5-block', 'data-block':b.b}, parent);
    var c1 = ctx.col(b.c1 || 't'), c2 = ctx.col(b.c2 || 't2');
    var halo = b.halo ? ctx.col(b.halo) : null;   /* outline for lettering on busy artwork */
    var align = b.align || 'left';
    var anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
    function on(k){ return ctx.on(k) && (!b.only || b.only.indexOf(k) > -1); }

    if (b.b === 'brand'){
      var lines = [];
      lines.halo = halo;
      if (on('name')) lines.push({text:ctx.txt('name'), w:1, colour:c1});
      if (on('services')) lines.push({text:ctx.txt('services'), w:lines.length ? 0.4 : 0.7, colour:c2, weight:600});
      var logo = on('logo');
      if (!logo && !lines.length){ g.remove(); return; }
      var asp = ctx.logoAspect;
      if (b.arrange === 'stack'){
        var lhMax = lines.length ? box.h*0.56 : box.h;
        if (logo){
          var sw = Math.min(lhMax*asp, box.w), sh = sw/asp;
          var lx = anchor === 'middle' ? box.x + (box.w - sw)/2 : anchor === 'end' ? box.x + box.w - sw : box.x;
          drawLogo(g, lx, box.y, sw, sh, ctx);
          if (lines.length) stack(g, box.x, box.y + sh + box.h*0.05, box.w, box.h - sh - box.h*0.05, lines, ctx, anchor, 1.3);
        } else stack(g, box.x, box.y, box.w, box.h, lines, ctx, anchor, 1.3);
      } else {
        var used = 0, row = mk('g', null, g);
        if (logo){
          var lw = Math.min(box.h*asp, lines.length ? box.w*0.42 : box.w), lh = lw/asp;
          drawLogo(row, box.x, box.y + (box.h - lh)/2, lw, lh, ctx);
          used = lw + box.h*0.14;
        }
        if (lines.length){
          var tg = stack(row, box.x + used, box.y, box.w - used, box.h, lines, ctx, 'start', 1.3);
          centreV(tg, box);
        }
        /* centre / right-align the whole logo+text row inside the block */
        if (align !== 'left'){
          var bb = row.getBBox();
          var dx = align === 'center' ? box.x + box.w/2 - (bb.x + bb.width/2) : box.x + box.w - (bb.x + bb.width);
          row.setAttribute('transform', 'translate(' + dx.toFixed(2) + ' 0)');
        }
        return;
      }
      centreV(g, box);
      return;
    }

    var L = [];
    L.halo = halo;
    if (b.b === 'contact'){
      if (on('phone')) L.push({text:ctx.txt('phone'), w:1, colour:c1});
      if (on('web')) L.push({text:ctx.txt('web'), w:0.6, colour:c2});
      if (on('email')) L.push({text:ctx.txt('email'), w:0.52, colour:c2, weight:600});
      if (on('socials')){
        var any = false;
        SOCIAL.forEach(function(s){
          var e = ctx.model.els[s[0]], v = e && e.v ? String(e.v).trim() : '';
          if (v){ any = true; L.push({text:s[1] + v.replace(/^@/, ''), w:0.46, colour:c2, weight:600}); }
        });
        if (!any) L.push({text:SOCIAL.map(function(s){ return s[1].trim(); }).join(' ') + '  ' + PLACEHOLDER.insta, w:0.46, colour:c2, weight:600});
      }
      stack(g, box.x, box.y, box.w, box.h, L, ctx, anchor, 2.4);
    } else if (b.b === 'list'){
      if (on('list')) ctx.txt('list').split(/\n/).map(function(s){ return s.trim(); }).filter(Boolean).slice(0, 6).forEach(function(s){
        L.push({text:'\u2022 ' + s, w:1, colour:c2, weight:600});
      });
      stack(g, box.x, box.y, box.w, box.h, L, ctx, anchor, 4.6);
    }
    centreV(g, box);
  }

  function drawView(parent, view, design, ctx, debug){
    var key = view.k === 'side2' ? 'side' : view.k;
    var lay = (design.views && design.views[key]) || {};
    var g = mk('g', {'data-view':view.k}, parent);
    if (lay.art){
      var shapes = lay.art(view.a) || [];
      shapes.forEach(function(s){
        var attrs = {d:pathD(view, s.d), fill:ctx.col(s.r)};
        if (s.o != null) attrs.opacity = s.o;
        if (s.clip){
          var cid = 'vd5c' + (++uid), cp = mk('clipPath', {id:cid}, g);
          var p0 = view.pt(s.clip[0], s.clip[1]), p1 = view.pt(s.clip[2], s.clip[3]);
          mk('rect', {x:Math.min(p0[0], p1[0]), y:Math.min(p0[1], p1[1]), width:Math.abs(p1[0] - p0[0]), height:Math.abs(p1[1] - p0[1])}, cp);
          attrs['clip-path'] = 'url(#' + cid + ')';
        }
        mk('path', attrs, g);
      });
    }
    (lay.blocks || (DEFAULTS[key] || {}).blocks || []).forEach(function(b){ drawBlock(g, view, b, ctx); });
    if (debug){
      Object.keys(view.zones).forEach(function(zk){
        var r = view.box(zk, {x:0, y:0, w:1, h:1});
        mk('rect', {x:r.x, y:r.y, width:r.w, height:r.h, fill:'none', stroke:'#e0f', 'stroke-width':1.5, 'stroke-dasharray':'6 4'}, g);
      });
    }
  }

  /* ---------- public: render + view ---------- */
  function render(sheet, design, model){
    var svg = sheet.svg;
    var old = svg.querySelector('.vd5-layers');
    if (old) old.remove();
    var ctx = context(design, model);
    var vb = sheet.vb;
    /* one masked group: paint, art, then the vehicle multiplied on top */
    var L = mk('g', {'class':'vd5-layers', mask:'url(#' + sheet.maskId + ')'}, svg);
    mk('rect', {x:vb[0], y:vb[1], width:vb[2], height:vb[3], fill:model.vehColour || '#ffffff'}, L);
    var art = mk('g', {'class':'vd5-art'}, L);
    Object.keys(sheet.views).forEach(function(k){ drawView(art, sheet.views[k], design, ctx, model.debug); });
    sheet.overlay(L);
  }

  function setView(sheet, view, wrap){
    var svg = sheet.svg;
    var R = view === 'all' ? sheet.all : (sheet.views[view] && sheet.views[view].crop) || sheet.all;
    svg.setAttribute('viewBox', [R.x, R.y, R.w, R.h].map(function(n){ return n.toFixed(1); }).join(' '));
    /* size the element to the crop's aspect: SVG does not clip to its viewBox,
       so letterbox bands would show neighbouring views */
    var ratio = R.w / R.h, sw = wrap.clientWidth - 2, sh = wrap.clientHeight - 2;
    if (sw > 0 && sh > 0){
      var Wd = sw, Hd = Wd / ratio;
      if (Hd > sh){ Hd = sh; Wd = Hd*ratio; }
      svg.style.width = Math.floor(Wd) + 'px';
      svg.style.height = Math.floor(Hd) + 'px';
    }
  }

  window.VED5 = { fromOutline:fromOutline, fromPhotos:fromPhotos, render:render, setView:setView, colour:colour, PLACEHOLDER:PLACEHOLDER };
})();
