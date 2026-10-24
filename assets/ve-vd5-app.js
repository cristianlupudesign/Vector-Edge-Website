/* Vector Edge \u2014 Vehicle Designer v5 page controller.

   One state object for the whole session. Vehicle, design and view are just
   lenses on it: the customer's elements (logo, name, services, contact,
   socials), the colour picked for each colour role and the lettering font
   all live here, so changing design or vehicle never loses them. The state is
   also kept in localStorage, so a refresh does not wipe the customer's work.

   Needs: ve-vd5-engine.js (window.VED5), ve-vd5-library.js (window.VED5_LIB)
   and a <script type="application/json" id="vd5-config"> written by the page
   template (vehicles + price variants). Pricing, fitting-by-postcode and the
   cart flow are carried over from v4 unchanged. */
(function(){
  'use strict';
  var LIB = window.VED5_LIB, E = window.VED5;
  var cfgEl = document.getElementById('vd5-config');
  if (!LIB || !E || !cfgEl) return;
  var CFG = JSON.parse(cfgEl.textContent);
  var VEH = CFG.vehicles || [];
  var DESIGNS = LIB.DESIGNS;
  var PRICE_VARIANTS = CFG.priceVariants || {};
  var STORE_KEY = 've-vd5-state';

  function $(id){ return document.getElementById(id); }
  function vehOf(k){ for (var i = 0; i < VEH.length; i++) if (VEH[i].k === k) return VEH[i]; return VEH[0]; }
  function designOf(k){ for (var i = 0; i < DESIGNS.length; i++) if (DESIGNS[i].k === k) return DESIGNS[i]; return DESIGNS[0]; }
  function oracalName(h){
    h = (h || '').toUpperCase();
    for (var i = 0; i < LIB.ORACAL.length; i++) if (LIB.ORACAL[i].h === h) return LIB.ORACAL[i].n;
    return h;
  }

  /* ---------- state ---------- */
  var S = {
    vt: CFG.defaultVehicle || 'medium-van',
    dk: DESIGNS[0].k,
    view: 'side',
    vehColour: null,           /* {n,h} or null = white / as drawn */
    els: {},                   /* key -> {on, v} */
    logo: null,                /* {url, name, aspect} */
    colours: {},               /* role -> {n,h}, only roles the customer chose */
    font: '', fontLabel: '',
    make: '', reg: ''
  };
  LIB.ELEMENTS.forEach(function(e){
    S.els[e.k] = {on:e.on, v:''};
    (e.sub || []).forEach(function(s){ S.els[s[0]] = {on:true, v:''}; });
  });
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved){
      ['vt', 'dk', 'view', 'vehColour', 'logo', 'colours', 'font', 'fontLabel', 'make', 'reg'].forEach(function(k){ if (saved[k] !== undefined) S[k] = saved[k]; });
      Object.keys(saved.els || {}).forEach(function(k){ if (S.els[k]) S.els[k] = saved.els[k]; });
    }
  } catch(e){}
  if (!VEH.some(function(v){ return v.k === S.vt; })) S.vt = VEH[0].k;
  var saveTimer = null;
  function save(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){
      try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
      catch(e){ try { var s = JSON.parse(JSON.stringify(S)); s.logo = null; localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch(e2){} }
    }, 250);
  }

  /* ---------- preview ---------- */
  var host = $('vd-svgwrap');
  var sheets = {};             /* vehicle key -> prepared sheet (measured once) */
  var sheet = null;
  var loading = {};
  var drawTimer = null;

  function model(){
    var colours = {};
    Object.keys(S.colours).forEach(function(r){ colours[r] = S.colours[r].h; });
    return { els:S.els, logo:S.logo, colours:colours, font:S.font, vehColour:S.vehColour ? S.vehColour.h : null, debug:/[?&]vd5debug/.test(location.search) };
  }
  function draw(){
    clearTimeout(drawTimer);
    /* setTimeout, not requestAnimationFrame \u2014 rAF never fires in background tabs */
    drawTimer = setTimeout(function(){
      if (!sheet) return;
      E.render(sheet, designOf(S.dk), model());
      applyView();
    }, 0);
  }
  function applyView(){
    if (!sheet) return;
    if (S.view !== 'all' && !sheet.views[S.view]) S.view = 'side';
    E.setView(sheet, S.view, host);
    document.querySelectorAll('#vd-views .vd-vw').forEach(function(b){
      var v = b.getAttribute('data-v');
      b.classList.toggle('on', v === S.view);
      b.classList.toggle('vd-hide', v !== 'all' && !sheet.views[v]);
    });
  }

  function loadVehicle(){
    var v = vehOf(S.vt), key = v.k;
    if (sheets[key]){
      sheet = sheets[key];
      host.innerHTML = '';
      host.appendChild(sheet.svg);
      draw();
      return;
    }
    sheet = null;
    host.innerHTML = '<div class="vd-loading">Loading vehicle\u2026</div>';
    if (v.photo){
      sheets[key] = E.fromPhotos(host, v.photo);
      if (S.vt === key){ sheet = sheets[key]; draw(); }
      return;
    }
    if (loading[key]) return;
    loading[key] = true;
    fetch(v.outline).then(function(r){ return r.text(); }).then(function(txt){
      loading[key] = false;
      if (S.vt !== key) return;
      sheets[key] = E.fromOutline(host, txt, v.tune);
      sheet = sheets[key];
      draw();
    }).catch(function(){
      loading[key] = false;
      host.innerHTML = '<div class="vd-loading">Couldn\u2019t load this vehicle \u2014 refresh to try again.</div>';
    });
  }
  window.addEventListener('resize', applyView);
  document.querySelectorAll('#vd-views .vd-vw').forEach(function(b){
    b.addEventListener('click', function(){ S.view = b.getAttribute('data-v'); save(); applyView(); });
  });

  /* ---------- 01 vehicle ---------- */
  var vwrap = $('vd-vans');
  VEH.forEach(function(v){
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'vd-van'; c.setAttribute('data-vt', v.k);
    c.innerHTML = '<span class="t">' + v.n + '</span><span class="p">' + v.sub + (v.price ? ' \u00B7 from \u00A3' + v.price : '') + '</span>';
    c.addEventListener('click', function(){ selectVehicle(v.k); });
    vwrap.appendChild(c);
  });
  function selectVehicle(k){
    S.vt = k; save();
    document.querySelectorAll('#vd-vans .vd-van').forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-vt') === k); });
    updPrice();
    loadVehicle();
  }

  var vcol = $('vd-vcol');
  function markVcol(){
    vcol.querySelectorAll('.vd-chip').forEach(function(x){
      var h = x.getAttribute('data-h');
      x.classList.toggle('on', S.vehColour ? h === S.vehColour.h : h === '#FFFFFF');
    });
  }
  LIB.VCOLOURS.forEach(function(c){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'vd-chip'; b.setAttribute('data-h', c.h);
    b.style.background = c.h; b.title = c.n; b.setAttribute('aria-label', c.n);
    b.addEventListener('click', function(){ S.vehColour = c.h === '#FFFFFF' ? null : c; save(); markVcol(); buildColours(); draw(); });
    vcol.appendChild(b);
  });
  var custom = document.createElement('input');
  custom.type = 'color'; custom.value = '#dddddd'; custom.title = 'Custom colour'; custom.className = 'vd-custom';
  custom.addEventListener('input', function(){ S.vehColour = {n:custom.value, h:custom.value}; save(); markVcol(); buildColours(); draw(); });
  vcol.appendChild(custom);

  $('vd-make').value = S.make;
  $('vd-reg').value = S.reg;
  $('vd-make').addEventListener('input', function(){ S.make = this.value; save(); });
  $('vd-reg').addEventListener('input', function(){ this.value = this.value.toUpperCase(); S.reg = this.value; save(); });

  /* ---------- 02 design ---------- */
  var dwrap = $('vd-designs');
  DESIGNS.forEach(function(d){
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'vd-card'; c.setAttribute('data-k', d.k);
    var dots = Object.keys(d.roles).filter(function(r){ return r !== 't' && r !== 't2' && r !== 'w'; })
      .map(function(r){ return '<i style="background:' + d.roles[r] + '"></i>'; }).join('');
    c.innerHTML = '<span class="sw">' + dots + '</span><span class="n">' + d.n + '</span><span class="d">' + d.d + '</span>';
    c.addEventListener('click', function(){ selectDesign(d.k); });
    dwrap.appendChild(c);
  });
  function selectDesign(k){
    S.dk = k; save();
    document.querySelectorAll('#vd-designs .vd-card').forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-k') === k); });
    buildColours();
    fontBtnLabel();
    draw();
  }

  /* ---------- 03 elements: one list, every design ---------- */
  var ewrap = $('vd-els');
  LIB.ELEMENTS.forEach(function(e){
    var row = document.createElement('div');
    row.className = 'vd-el'; row.setAttribute('data-el', e.k);
    var head = document.createElement('label');
    head.className = 'vd-el-head';
    head.innerHTML = '<input type="checkbox" class="vd-tgl"><span class="vd-el-n">' + e.n + '</span>';
    row.appendChild(head);
    var tgl = head.querySelector('input');
    tgl.checked = !!S.els[e.k].on;
    var body = document.createElement('div');
    body.className = 'vd-el-body';
    if (e.k === 'logo'){
      body.innerHTML = '<input type="file" id="vd-logo" accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg">' +
        '<div class="vd-logo-actions"><span class="vd-note" id="vd-logo-name"></span><button type="button" id="vd-logo-clear">Remove logo</button></div>';
    } else if (e.sub){
      e.sub.forEach(function(s){
        var w = document.createElement('div'); w.className = 'vd-el-sub';
        w.innerHTML = '<span>' + s[1] + '</span>';
        var inp = document.createElement('input');
        inp.type = 'text'; inp.maxLength = 24; inp.placeholder = 'yourbusiness'; inp.value = S.els[s[0]].v || '';
        inp.addEventListener('input', function(){ S.els[s[0]].v = inp.value; save(); draw(); });
        w.appendChild(inp); body.appendChild(w);
      });
    } else {
      var f = document.createElement(e.multi ? 'textarea' : 'input');
      if (!e.multi) f.type = 'text';
      if (e.max) f.maxLength = e.max;
      if (e.multi) f.rows = 4;
      f.placeholder = e.ph || '';
      f.value = S.els[e.k].v || '';
      f.addEventListener('input', function(){ S.els[e.k].v = f.value; save(); draw(); });
      body.appendChild(f);
    }
    row.appendChild(body);
    function sync(){ row.classList.toggle('off', !S.els[e.k].on); }
    tgl.addEventListener('change', function(){ S.els[e.k].on = tgl.checked; save(); sync(); draw(); });
    sync();
    ewrap.appendChild(row);
  });

  /* logo: trim transparent margins (so every logo sizes the same in its
     slot), measure aspect, keep as data URL in the shared state */
  function logoLabel(){
    $('vd-logo-name').textContent = S.logo ? S.logo.name : 'No logo yet \u2014 a placeholder mark shows where it goes.';
    $('vd-logo-clear').classList.toggle('vd-hide', !S.logo);
  }
  function trimPng(url, done){
    var img = new Image();
    img.onload = function(){
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h){ done(url, 1); return; }
      var sc = Math.min(1, 1600 / Math.max(w, h)), cw = Math.round(w*sc), ch = Math.round(h*sc);
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, cw, ch);
      try {
        var d = cx.getImageData(0, 0, cw, ch).data, x0 = cw, y0 = ch, x1 = -1, y1 = -1;
        for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) if (d[(y*cw + x)*4 + 3] > 8){
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (x1 < 0){ done(url, w/h); return; }
        var tw = x1 - x0 + 1, th = y1 - y0 + 1, out = document.createElement('canvas');
        out.width = tw; out.height = th;
        out.getContext('2d').drawImage(cv, x0, y0, tw, th, 0, 0, tw, th);
        done(out.toDataURL('image/png'), tw/th);
      } catch(e){ done(url, w/h); }
    };
    img.onerror = function(){ done(url, 1); };
    img.src = url;
  }
  $('vd-logo').addEventListener('change', function(){
    var f = this.files && this.files[0];
    if (!f) return;
    if (!/\.(png|svg|jpe?g)$/i.test(f.name)){ $('vd-msg').textContent = 'PNG, SVG or JPG, please.'; return; }
    var rd = new FileReader();
    rd.onload = function(){
      trimPng(rd.result, function(url, aspect){
        S.logo = {url:url, name:f.name, aspect:aspect || 1};
        S.els.logo.on = true;
        document.querySelector('.vd-el[data-el="logo"] .vd-tgl').checked = true;
        document.querySelector('.vd-el[data-el="logo"]').classList.remove('off');
        save(); logoLabel(); draw();
      });
    };
    rd.readAsDataURL(f);
  });
  $('vd-logo-clear').addEventListener('click', function(){
    S.logo = null; $('vd-logo').value = '';
    save(); logoLabel(); draw();
  });
  logoLabel();

  /* ---------- 04 colours (by role) + font ---------- */
  function buildColours(){
    var d = designOf(S.dk), box = $('vd-slots');
    box.innerHTML = '';
    var m = model();
    Object.keys(d.roles).forEach(function(role){
      var chosen = S.colours[role];
      var cur = E.colour(d, m, role);
      var div = document.createElement('div'); div.className = 'vd-slot';
      div.innerHTML = '<div class="sl-head"><span class="sl-cur" style="background:' + cur + '"></span><span class="sl-name">' +
        (LIB.ROLE_NAMES[role] || role) + ' \u00B7 ' + (chosen ? chosen.n : oracalName(cur) + (cur === d.roles[role] ? ' (as designed)' : ' (auto, for your vehicle colour)')) + '</span></div>';
      var row = document.createElement('div'); row.className = 'vd-swrow';
      LIB.ORACAL.forEach(function(c){
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'vd-chip' + (cur.toUpperCase() === c.h ? ' on' : '');
        b.style.background = c.h; b.title = c.n; b.setAttribute('aria-label', c.n);
        b.addEventListener('click', function(){ S.colours[role] = c; save(); buildColours(); draw(); });
        row.appendChild(b);
      });
      div.appendChild(row); box.appendChild(div);
    });
    $('vd-col-reset').classList.toggle('vd-hide', !Object.keys(S.colours).length);
  }
  $('vd-col-reset').addEventListener('click', function(){ S.colours = {}; save(); buildColours(); draw(); });

  var fontBtn = $('vd-fontbtn'), fontMenu = $('vd-fontmenu');
  function designFontLabel(){
    var ff = designOf(S.dk).font || '';
    var m = /'([^']+)'/.exec(ff);
    return 'As designed (' + (m ? m[1] : 'default') + ')';
  }
  function fontBtnLabel(){
    fontBtn.textContent = S.font ? S.fontLabel : designFontLabel();
    fontBtn.style.fontFamily = S.font || designOf(S.dk).font || '';
    fontMenu.querySelectorAll('.vd-fontopt').forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-ff') === S.font); });
  }
  function fontOpt(label, value){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'vd-fontopt'; b.setAttribute('data-ff', value);
    b.textContent = label; if (value) b.style.fontFamily = value;
    b.addEventListener('click', function(){
      S.font = value; S.fontLabel = label; save();
      fontMenu.classList.add('vd-hide');
      fontBtnLabel(); draw();
    });
    return b;
  }
  fontMenu.appendChild(fontOpt('As designed', ''));
  LIB.FONTS.forEach(function(grp){
    var h = document.createElement('div'); h.className = 'vd-fontgrp'; h.textContent = grp.g; fontMenu.appendChild(h);
    grp.items.forEach(function(it){ fontMenu.appendChild(fontOpt(it[0], it[1])); });
  });
  fontBtn.addEventListener('click', function(e){ e.stopPropagation(); fontMenu.classList.toggle('vd-hide'); });
  document.addEventListener('click', function(e){ if (!$('vd-fontpick').contains(e.target)) fontMenu.classList.add('vd-hide'); });

  /* ---------- 05 fitting (v4 model: distance from the Ruislip workshop) ---------- */
  var FIT = {
    lat:51.566309, lng:-0.415905, roadFactor:1.35,
    r1:11, r2:28, r3:72,   /* straight-line miles ~ 30 min / 1 hr / 2 hr */
    bands:[
      {name:'Zone 1 \u00B7 within ~30 min', price:80},
      {name:'Zone 2 \u00B7 within ~1 hr', price:110},
      {name:'Zone 3 \u00B7 within ~2 hrs', price:140}
    ]
  };
  var fitMode = 'supply', fitCharge = 0, fitBandName = '', fitPostcode = '', fitPriced = false;
  var fitResEl = $('vd-fitresult');
  function setFitResult(cls, html){ fitResEl.className = 'vd-fitresult' + (cls ? ' ' + cls : ''); fitResEl.innerHTML = html; }
  function haversineMiles(aLat, aLng, bLat, bLng){
    var R = 3958.8, tr = Math.PI/180, dLat = (bLat - aLat)*tr, dLng = (bLng - aLng)*tr;
    var h = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(aLat*tr)*Math.cos(bLat*tr)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return 2*R*Math.asin(Math.sqrt(h));
  }
  function estMinutes(mi){
    if (mi <= FIT.r1) return Math.max(10, Math.round(30*mi/FIT.r1));
    if (mi <= FIT.r2) return Math.round(30 + 30*(mi - FIT.r1)/(FIT.r2 - FIT.r1));
    if (mi <= FIT.r3) return Math.round(60 + 60*(mi - FIT.r2)/(FIT.r3 - FIT.r2));
    return Math.round(120*mi/FIT.r3);
  }
  function driveLabel(mins){
    if (mins < 60) return 'about ' + (Math.round(mins/5)*5) + ' min away';
    var h = Math.floor(mins/60), m = Math.round((mins % 60)/15)*15;
    if (m === 60){ h++; m = 0; }
    return 'about ' + h + (m ? '\u00BC\u00BD\u00BE'.charAt(m/15 - 1) : '') + ' hr' + (h > 1 || m ? 's' : '') + ' away';
  }
  function setFitMode(mode){
    fitMode = mode;
    document.querySelectorAll('#vd-fitmode .vd-fitopt').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-fit') === mode); });
    $('vd-fitpc').classList.toggle('vd-hide', mode === 'supply');
    updPrice();
  }
  document.querySelectorAll('#vd-fitmode .vd-fitopt').forEach(function(b){
    b.addEventListener('click', function(){ setFitMode(b.getAttribute('data-fit')); });
  });
  function checkPostcode(){
    var raw = ($('vd-postcode').value || '').replace(/\s+/g, '').toUpperCase();
    var isFull = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(raw), isOut = /^[A-Z]{1,2}\d[A-Z\d]?$/.test(raw);
    if (!isFull && !isOut){ fitPriced = false; fitCharge = 0; setFitResult('err', 'That doesn\u2019t look like a UK postcode \u2014 try the full postcode, e.g. UB8 1AA.'); updPrice(); return; }
    setFitResult('', 'Checking\u2026');
    fetch((isFull ? 'https://api.postcodes.io/postcodes/' : 'https://api.postcodes.io/outcodes/') + raw)
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data.status !== 200 || !data.result || data.result.latitude == null){
          fitPriced = false; fitCharge = 0; setFitResult('err', 'We couldn\u2019t find that postcode \u2014 check it and try again.'); updPrice(); return;
        }
        fitPostcode = data.result.postcode || (data.result.outcode + ' area');
        var miles = haversineMiles(FIT.lat, FIT.lng, data.result.latitude, data.result.longitude)*FIT.roadFactor;
        var mins = estMinutes(miles);
        var idx = miles <= FIT.r1 ? 0 : miles <= FIT.r2 ? 1 : miles <= FIT.r3 ? 2 : 3;
        if (idx === 3){
          fitPriced = false; fitCharge = 0; fitBandName = '';
          setFitResult('warn', '<strong>' + fitPostcode + '</strong> is beyond our regular fitting range (' + driveLabel(mins) + '). Choose <strong>Supply only</strong>, or <a href="/pages/get-a-quote" style="color:inherit;text-decoration:underline;">ask us for a fitting quote</a>.');
          updPrice(); return;
        }
        var band = FIT.bands[idx];
        fitBandName = band.name; fitCharge = band.price; fitPriced = true;
        setFitResult('ok', '<strong>' + fitPostcode + '</strong> \u2014 ' + driveLabel(mins) + '. Fitting ' + band.name + ' \u00B7 <strong>+\u00A3' + band.price + '</strong>.');
        updPrice();
      })
      .catch(function(){ fitPriced = false; fitCharge = 0; setFitResult('err', 'Postcode lookup is unavailable right now \u2014 message us your postcode and we\u2019ll confirm.'); updPrice(); });
  }
  $('vd-pccheck').addEventListener('click', checkPostcode);
  $('vd-postcode').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); checkPostcode(); } });
  $('vd-postcode').addEventListener('input', function(){
    this.value = this.value.toUpperCase();
    if (fitPriced){ fitPriced = false; fitCharge = 0; setFitResult('', 'Press Check for an updated fitting price.'); updPrice(); }
  });

  /* ---------- price + cart ---------- */
  function fittingCharge(){ return (fitMode === 'fitted' && fitPriced) ? fitCharge : 0; }
  function price(){ return (vehOf(S.vt).price || 0) + fittingCharge(); }
  function updPrice(){
    var v = vehOf(S.vt), canBuy = !!v.price;
    $('vd-add').classList.toggle('vd-hide', !canBuy);
    $('vd-quote').classList.toggle('vd-hide', canBuy);
    $('vd-pp').textContent = canBuy ? '\u00A3' + price() : 'POA';
    var sub = 'Supply only';
    if (!canBuy) sub = 'Quoted individually';
    else if (fitMode === 'fitted') sub = fitPriced ? 'Fitted \u2014 ' + fitBandName : 'Fitted \u2014 add your postcode';
    $('vd-pt').textContent = sub;
  }

  $('vd-add').addEventListener('click', function(){
    var btn = this, msg = $('vd-msg');
    if (!S.make.trim() && !S.reg.trim()){
      msg.textContent = 'Add your make & model \u2014 or just your registration \u2014 so we cut it to fit.';
      var mk = $('vd-make'); mk.focus(); mk.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    if (fitMode === 'fitted' && !fitPriced){
      msg.textContent = 'Enter your postcode and press Check to price fitting \u2014 or switch to Supply only.';
      var pc = $('vd-postcode'); pc.focus(); pc.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    var total = price(), variantId = PRICE_VARIANTS[total];
    if (!variantId){ msg.textContent = 'That combination isn\u2019t available to buy online yet \u2014 send us a quick quote and we\u2019ll sort it.'; return; }
    var d = designOf(S.dk);
    function txt(k){ var e = S.els[k]; return e && e.on && e.v ? String(e.v).trim() : ''; }
    var m = model();
    var colourList = Object.keys(d.roles).map(function(role){
      var c = S.colours[role];
      return (LIB.ROLE_NAMES[role] || role) + ': ' + (c ? c.n : oracalName(E.colour(d, m, role))) + ' (Oracal 651)';
    }).join('; ');
    var included = LIB.ELEMENTS.filter(function(e){ return S.els[e.k].on; }).map(function(e){ return e.n; }).join(', ');
    var socials = S.els.socials.on ? [['insta', 'IG'], ['fb', 'FB'], ['tiktok', 'TikTok']].map(function(s){
      var v = S.els[s[0]].v; return v ? s[1] + ' ' + v : '';
    }).filter(Boolean).join(' \u00B7 ') : '';
    var props = {
      'Design': d.n,
      'Vehicle': vehOf(S.vt).n,
      'Vehicle colour': S.vehColour ? (S.vehColour.n || S.vehColour.h) : 'White / as shown',
      'Make & model': S.make.trim(),
      'Registration': S.reg.trim(),
      'Fitting': (fitMode === 'fitted' && fitPriced) ? ('Fitted \u00B7 ' + fitBandName + ' (+\u00A3' + fitCharge + ')' + (fitPostcode ? ' \u00B7 ' + fitPostcode : '')) : 'Supply only \u2014 delivered UK-wide',
      'Elements': included,
      'Business name': txt('name'),
      'Tagline': txt('services'),
      'Services list': txt('list').replace(/\s*\n\s*/g, ' / '),
      'Phone': txt('phone'),
      'Website': txt('web'),
      'Email': txt('email'),
      'Socials': socials,
      'Design colours': colourList,
      'Logo file': (S.els.logo.on && S.logo) ? S.logo.name + ' \u2014 we will contact you for the file' : '',
      'Lettering font': S.font ? S.fontLabel : '',
      'Designer': 'v5',
      'Designer price': '\u00A3' + total
    };
    Object.keys(props).forEach(function(k){ if (!props[k]) delete props[k]; });
    btn.disabled = true; msg.textContent = 'Adding to cart...';
    fetch('/cart/add.js', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:variantId, quantity:1, properties:props})
    }).then(function(r){
      if (!r.ok) throw new Error();
      msg.textContent = 'Added. Taking you to the cart...';
      window.location.href = '/cart';
    }).catch(function(){
      btn.disabled = false;
      msg.textContent = 'Something went wrong \u2014 try again or request a free mockup.';
    });
  });

  /* ---------- go ---------- */
  if (document.fonts){
    if (document.fonts.ready) document.fonts.ready.then(draw);
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', draw);
  }
  markVcol();
  selectDesign(S.dk);
  selectVehicle(S.vt);
})();
