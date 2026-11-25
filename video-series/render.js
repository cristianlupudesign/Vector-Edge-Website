/*
  Render an episode to MP4 (and export the finished logo as SVG for the 3D app).

    node render.js ep01-harris-build              full render
    node render.js ep01-harris-build --preview    open-in-browser preview server
    node render.js ep01-harris-build --frame 20   one PNG at 20 s (quick check)
    node render.js ep01-harris-build --fps 24     lower frame rate (faster)
    node render.js ve01-skill-builder --audio-only  rebuild just the sound (keeps the rendered frames)

  Output (in out/):
    <ep>-9x16.mp4            whole video, 1080 x 1920
    <ep>-main.mp4            everything up to the 3D hand-off (put your 3D clip after this)
    <ep>-outro.mp4           the end card (put this after your 3D clip)
    <ep>-9x16-whatsapp.mp4   smaller copy for WhatsApp / quick sharing
    <ep>-logo.svg            the finished vector (text converted to outlines) to import into the 3D app
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { buildSoundtrack } = require('./audio');

const ROOT = __dirname;
const args = process.argv.slice(2);
const EP = (args.find((a) => !a.startsWith('--')) || 'ep01-harris-build').replace(/[^a-z0-9-]/gi, '');
const flag = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const FPS = +flag('fps', 30);
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

let FFMPEG = 'ffmpeg';
try { const p = require('ffmpeg-static'); if (p && fs.existsSync(p)) FFMPEG = p; } catch (e) { /* use ffmpeg on PATH */ }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
function serve(port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'player.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

function run(cmd, a) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, a, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(err.slice(-2000)))));
  });
}

async function exportLogo(page) {
  const data = await page.evaluate(() => window.exportSVG());
  const opentype = require('opentype.js');
  const font = opentype.loadSync(path.join(ROOT, 'assets/fonts/bebas-neue-latin-400-normal.woff'));
  const parts = data.shapes.map((s) => `  <path id="${s.id}" d="${s.d}" fill="${s.fill}"/>`);
  for (const t of data.texts) {
    // Lay glyphs out with letter-spacing, then scale so the width matches the browser's layout.
    let x = 0;
    const glyphs = font.stringToGlyphs(t.text);
    const placed = glyphs.map((g, i) => {
      const at = x;
      x += (g.advanceWidth / font.unitsPerEm) * t.size + t.spacing;
      if (i < glyphs.length - 1) x += (font.getKerningValue(g, glyphs[i + 1]) / font.unitsPerEm) * t.size;
      return { g, at };
    });
    const k = t.width / x;
    const d = placed.map(({ g, at }) => g.getPath(t.x + at * k, t.y, t.size).toPathData(2)).join(' ');
    parts.push(`  <path id="${t.id}" d="${d}" fill="${t.fill}"/>`);
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">\n${parts.join('\n')}\n</svg>\n`;
  const file = path.join(OUT, `${EP}-logo.svg`);
  fs.writeFileSync(file, svg);
  console.log('Logo SVG  →', path.relative(ROOT, file));
}

// Van-wrap episodes: each side as SVG (text turned into outlines) + transparent PNG for the mockup app.
function textToPath(font, t) {
  let x = 0;
  const glyphs = font.stringToGlyphs(t.text);
  const placed = glyphs.map((g, i) => {
    const at = x;
    x += (g.advanceWidth / font.unitsPerEm) * t.size + t.spacing;
    if (i < glyphs.length - 1) x += (font.getKerningValue(g, glyphs[i + 1]) / font.unitsPerEm) * t.size;
    return { g, at };
  });
  const k = t.width / (x - t.spacing);
  return placed.map(({ g, at }) => g.getPath(t.x + at * k, t.y, t.size).toPathData(2)).join(' ');
}
async function exportPanels(page, browser) {
  const opentype = require('opentype.js');
  const font = opentype.loadSync(path.join(ROOT, 'assets/fonts/bebas-neue-latin-400-normal.woff'));
  const panels = await page.evaluate(() => window.exportPanels());
  let clipN = 0;
  const mat = (m) => (m && m.join(',') !== '1,0,0,1,0,0' ? ` transform="matrix(${m.join(' ')})"` : '');
  function emit(n, defs) {
    if (!n) return '';
    if (n.tag === 'g') {
      let clip = '';
      if (n.clip) { const id = 'c' + clipN++; defs.push(`<clipPath id="${id}"><path d="${n.clip.d}"${n.clip.transform ? ` transform="${n.clip.transform}"` : ''}/></clipPath>`); clip = ` clip-path="url(#${id})"`; }
      return `<g${mat(n.mat)}${clip}>${n.children.map((c) => emit(c, defs)).join('')}</g>`;
    }
    if (n.tag === 'path') return `<path d="${n.d}" fill="${n.fill}"${mat(n.mat)}/>`;
    if (n.tag === 'text') return `<path d="${textToPath(font, n)}" fill="${n.fill}"${mat(n.mat)}/>`;
    return '';
  }
  const shot = await browser.newPage({ deviceScaleFactor: 1 });
  for (const p of panels) {
    const defs = [];
    const body = emit(p.tree, defs);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${p.w}" height="${p.h}" viewBox="0 0 ${p.w} ${p.h}">\n<defs>${defs.join('')}</defs>\n${body}\n</svg>\n`;
    const base = path.join(OUT, `${EP}-${p.name}`);
    fs.writeFileSync(base + '.svg', svg);
    const scale = 4;
    await shot.setViewportSize({ width: p.w * scale, height: p.h * scale });
    await shot.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/^<\?xml[^>]*>/, '').replace(`width="${p.w}" height="${p.h}"`, `width="${p.w * scale}" height="${p.h * scale}"`)}</body></html>`);
    await shot.screenshot({ path: base + '.png', omitBackground: true });
    console.log('Panel     →', path.relative(ROOT, base) + '.svg / .png');
  }
  await shot.close();
}

// Engine 3 (real templates): per view, the vinyl graphics as SVG (text outlined, masked to the
// bodywork like the live designer) + transparent PNG, and a flat mockup PNG (paint + vinyl).
async function exportViews(page, browser, port) {
  const opentype = require('opentype.js');
  const font = opentype.loadSync(path.join(ROOT, 'assets/fonts/bebas-neue-latin-400-normal.woff'));
  const views = await page.evaluate(() => window.exportViews());
  const big = await browser.newPage({ viewport: { width: 1600, height: 1600 }, deviceScaleFactor: 1 });
  await big.goto(`http://127.0.0.1:${port}/player.html?ep=${EP}&render=1`);
  await big.waitForFunction(() => window.VE_READY || window.VE_ERROR, null, { timeout: 60000 });
  for (const v of views) {
    const c = v.crop;
    const body = v.items.map((n) => n.tag === 'path'
      ? `<path d="${n.d}" fill="${n.fill}"${n.rule && n.rule !== 'nonzero' ? ` fill-rule="${n.rule}"` : ''}/>`
      : `<path d="${textToPath(font, n)}" fill="${n.fill}"/>`).join('\n');
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- ${EP} ${v.name}: vinyl graphics only. Van paint ${v.paint}. Same coordinates as the Vector Edge template sheet. -->\n<svg xmlns="http://www.w3.org/2000/svg" width="${c.w.toFixed(2)}" height="${c.h.toFixed(2)}" viewBox="${c.x} ${c.y} ${c.w} ${c.h}">\n<defs>${v.maskHTML}</defs>\n<g mask="url(#${v.maskId})">\n${body}\n</g>\n</svg>\n`;
    const base = path.join(OUT, `${EP}-${v.name}`);
    fs.writeFileSync(base + '.svg', svg);
    for (const [mode, scale, file] of [['graphics', 6, base + '.png'], ['mockup', 4, base + '-mockup.png']]) {
      const size = await big.evaluate(([n, m, s]) => window.showExport(n, m, s), [v.name, mode, scale]);
      await big.setViewportSize({ width: Math.max(1600, size.w), height: Math.max(1600, size.h) });
      await big.locator('#expSvg').screenshot({ path: file, omitBackground: mode === 'graphics' });
    }
    console.log('View      →', path.relative(ROOT, base) + '.svg / .png / -mockup.png');
  }
  await big.close();
}

(async () => {
  if (!fs.existsSync(path.join(ROOT, 'episodes', EP + '.js'))) { console.error('No episode file: episodes/' + EP + '.js'); process.exit(1); }
  const port = 4000 + Math.floor(Math.random() * 2000);
  const srv = await serve(port);

  if (flag('preview', false)) {
    console.log(`Preview: http://127.0.0.1:${port}/player.html?ep=${EP}   (Ctrl+C to stop)`);
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('Page error:', e.message));
  await page.goto(`http://127.0.0.1:${port}/player.html?ep=${EP}&render=1`);
  await page.waitForFunction(() => window.VE_READY || window.VE_ERROR, null, { timeout: 60000 });
  const loadErr = await page.evaluate(() => window.VE_ERROR);
  if (loadErr) throw new Error(loadErr);
  await page.evaluate(() => window.VE_READY);
  const total = await page.evaluate(() => window.VE_TOTAL);
  const stages = await page.evaluate(() => window.VE_STAGES);
  const stage = page.locator('#stage');

  const single = flag('frame', null);
  if (single !== null) {
    const t = +single;
    await page.evaluate((x) => window.renderAt(x), t);
    const file = path.join(OUT, `${EP}-frame-${t}s.png`);
    await stage.screenshot({ path: file });
    console.log('Frame →', path.relative(ROOT, file));
    await browser.close(); srv.close();
    return;
  }

  const audioOnly = !!flag('audio-only', false);
  if (!audioOnly) {
    if (await page.evaluate(() => !!window.exportViews)) await exportViews(page, browser, port);
    else if (await page.evaluate(() => !!window.exportPanels)) await exportPanels(page, browser);
    else await exportLogo(page);
  }

  const silent = path.join(OUT, `${EP}-video.mp4`), full = path.join(OUT, `${EP}-9x16.mp4`);
  const t0 = Date.now();
  if (!audioOnly || !fs.existsSync(silent)) {
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg failed')))));
    const frames = Math.round(total * FPS);
    for (let f = 0; f < frames; f++) {
      await page.evaluate((x) => window.renderAt(x), f / FPS);
      const buf = await stage.screenshot({ type: 'jpeg', quality: 94 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % FPS === 0) process.stdout.write(`\r${EP} ${Math.round((f / frames) * 100)}%   `);
    }
    ff.stdin.end();
    await done;
  }
  const cut = await page.evaluate(() => window.VE_HANDOFF || window.VE_STAGES.outro.start);
  // Everything the soundtrack needs, saved so stitch.js can rebuild it around the 3D clip.
  const info = await page.evaluate(() => ({ total: window.VE_TOTAL, cut: window.VE_HANDOFF || window.VE_STAGES.outro.start, stages: window.VE_STAGES, sfx: window.VE_SFX || [], audio: window.VE_AUDIO || (window.EPISODE && window.EPISODE.audio) || null }));
  await browser.close();
  srv.close();
  fs.writeFileSync(path.join(OUT, `${EP}-audio.json`), JSON.stringify(info));
  const hasAudio = !!info.audio;
  if (hasAudio) {
    const track = buildSoundtrack(ROOT, info, path.join(OUT, `${EP}-soundtrack.m4a`), 0);
    await run(FFMPEG, ['-y', '-i', silent, '-i', track, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', full]);
  } else fs.copyFileSync(silent, full);
  console.log(`\rVideo     → ${path.relative(ROOT, full)} (${total.toFixed(1)} s${hasAudio ? ', music + voiceover + sound effects' : ', no sound'}, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);

  // Split at the 3D hand-off, and make a small WhatsApp copy.
  const main = path.join(OUT, `${EP}-main.mp4`), outro = path.join(OUT, `${EP}-outro.mp4`), wa = path.join(OUT, `${EP}-9x16-whatsapp.mp4`);
  const enc = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'];
  await run(FFMPEG, ['-y', '-i', full, '-t', cut.toFixed(3), ...enc, main]);
  await run(FFMPEG, ['-y', '-ss', cut.toFixed(3), '-i', full, ...enc, outro]);
  await run(FFMPEG, ['-y', '-i', full, '-vf', 'scale=720:1280', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', wa]);
  console.log('Split     →', path.relative(ROOT, main), '+', path.relative(ROOT, outro), `(3D clip goes between, at ${cut.toFixed(1)} s)`);
  console.log('WhatsApp  →', path.relative(ROOT, wa), `${(fs.statSync(wa).size / 1e6).toFixed(1)} MB`);
})().catch((e) => { console.error(e); process.exit(1); });
