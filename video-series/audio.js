/*
  Builds the soundtrack for an episode: music bed + voiceover + sound effects.

  - Music: one track (looped if the video is longer), dipped automatically under the voice.
  - Voiceover: one clip per scene, placed at EPISODE.audio.voAt[scene] seconds into that scene.
  - Levels: audio.voVolume (default 1.6), musicVolume (0.2), sfxVolume (0.35); final mix -14 LUFS.
  - Sound effects: generated here in code (no samples), from the cue list the engine makes
    (window.VE_SFX): key clicks, pen clicks, pencil, whooshes, pops, riser, chime, paint, booms.

  `gap` seconds of space can be opened at `gapAt` (the 3D hand-off) for stitch.js: the voice and
  effects shift past it, the music plays straight through it.
*/
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SR = 48000;
let FFMPEG = 'ffmpeg';
try { const p = require('ffmpeg-static'); if (p && fs.existsSync(p)) FFMPEG = p; } catch (e) { /* ffmpeg on PATH */ }

function ff(args) {
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', ...args], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + (r.stderr || '').toString().slice(-1500));
  return r.stdout;
}

// Decode any audio file to stereo float32 at 48 kHz.
function decode(file) {
  const buf = ff(['-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(SR), 'pipe:1']);
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

function writeWav(file, data) {
  const n = data.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(data[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, b);
}

// ---------- sound-effect synthesis ----------
function makeRng(seed) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; }; }

function synthEvent(ev, rnd) {
  const g = ev.gain == null ? 0.5 : ev.gain, p = ev.pitch || 1;
  const len = (s) => Math.max(1, Math.round(s * SR));
  let L, R, n;
  const mono = (fn, secs) => { n = len(secs); L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = fn(i, i / SR); R = L; };
  // simple one-pole filters
  const lp = (x, state, a) => (state.v += a * (x - state.v));
  switch (ev.type) {
    case 'key': { // keyboard tap: short filtered noise + body thump
      const st = { v: 0 };
      mono((i, t) => { const e = Math.exp(-t * 90); return g * e * (0.6 * lp(rnd(), st, 0.55) + 0.4 * Math.sin(2 * Math.PI * 180 * p * t)); }, 0.06);
      break;
    }
    case 'click': { // pen tool click: crisp tick
      mono((i, t) => g * Math.exp(-t * 260) * (0.5 * rnd() + 0.5 * Math.sin(2 * Math.PI * 2400 * p * t)), 0.03);
      break;
    }
    case 'pop': { // bubbly pop, pitch sweeps up
      mono((i, t) => { const f = (420 + 900 * Math.min(1, t / 0.06)) * p; return g * Math.exp(-t * 28) * Math.sin(2 * Math.PI * f * t); }, 0.16);
      break;
    }
    case 'thud': { // word landing
      mono((i, t) => g * (Math.exp(-t * 18) * Math.sin(2 * Math.PI * 70 * t) + 0.3 * Math.exp(-t * 120) * rnd()), 0.3);
      break;
    }
    case 'boom': { // low hit
      mono((i, t) => { const f = 48 + 40 * Math.exp(-t * 10); return g * (Math.exp(-t * 4.5) * Math.sin(2 * Math.PI * f * t) + 0.25 * Math.exp(-t * 60) * rnd()); }, 1.2);
      break;
    }
    case 'ding': { // done chime
      mono((i, t) => g * Math.exp(-t * 5) * (0.6 * Math.sin(2 * Math.PI * 1318 * t) + 0.3 * Math.sin(2 * Math.PI * 1976 * t) + 0.15 * Math.sin(2 * Math.PI * 2637 * t)), 0.9);
      break;
    }
    case 'whoosh': case 'swish': case 'marker': case 'riser': case 'paint': case 'pencil': {
      const d = ev.dur || 0.5;
      n = len(d); L = new Float32Array(n); R = new Float32Array(n);
      const sl = { v: 0 }, sr = { v: 0 }, hl = { v: 0 }, hr = { v: 0 };
      let stroke = 0, strokeT = 0, strokeLen = 0.1;
      for (let i = 0; i < n; i++) {
        const t = i / SR, u = t / d;
        let env, cut, pan = 0, x = rnd(), y = rnd(), tone = 0;
        if (ev.type === 'riser') { env = Math.pow(u, 1.6) * (u < 0.97 ? 1 : (1 - u) / 0.03); cut = 0.02 + 0.35 * u * u; tone = 0.25 * Math.sin(2 * Math.PI * (200 + 900 * u * u) * t); }
        else if (ev.type === 'paint') { env = Math.sin(Math.PI * Math.min(1, u)) * (0.7 + 0.3 * Math.sin(t * 40)); cut = 0.04; }
        else if (ev.type === 'marker') { env = Math.sin(Math.PI * u); cut = 0.25; }
        else if (ev.type === 'pencil') {
          // irregular strokes: on/off scratch bursts, bright, slightly gritty
          if (t >= strokeT + strokeLen) { strokeT = t; strokeLen = 0.05 + (rnd() + 1) * 0.07; stroke = (rnd() + 1) * 0.5 > 0.15 ? 0.6 + (rnd() + 1) * 0.2 : 0; }
          const sp = (t - strokeT) / strokeLen;
          env = stroke * Math.sin(Math.PI * Math.min(1, sp)) * Math.min(1, u * 20, (1 - u) * 20);
          cut = 0.6; x = x * (0.6 + 0.4 * Math.abs(Math.sin(t * 900)));
        } else { env = Math.sin(Math.PI * Math.min(1, u)) * Math.pow(1 - u, 0.5); cut = 0.03 + 0.25 * Math.sin(Math.PI * u); pan = (u - 0.5) * 0.8; }
        let a = lp(x, sl, cut), b = lp(y, sr, cut);
        if (ev.type === 'pencil') { a = x - lp(x, hl, 0.15); b = y - lp(y, hr, 0.15); }
        L[i] = g * env * (a * (1 - pan) + tone) * 1.4;
        R[i] = g * env * (b * (1 + pan) + tone) * 1.4;
      }
      break;
    }
    default: return null;
  }
  return { L, R, n };
}

function synthSfx(events, total, mapT, seed = 11) {
  const out = new Float32Array(Math.ceil(total * SR) * 2);
  const rnd = makeRng(seed);
  for (const ev of events) {
    const s = synthEvent(ev, rnd);
    if (!s) continue;
    const at = Math.round(mapT(ev.t) * SR);
    for (let i = 0; i < s.n; i++) {
      const j = (at + i) * 2;
      if (j + 1 >= out.length) break;
      out[j] += s.L[i]; out[j + 1] += s.R[i];
    }
  }
  return out;
}

/*
  info = { total, cut, stages, sfx, audio } (saved by render.js as out/<ep>-audio.json)
  Returns the path of the finished AAC track (length = info.total + gap).
*/
function buildSoundtrack(root, info, outFile, gap = 0) {
  const A = info.audio;
  const total = info.total + gap;
  const mapT = (t) => (gap && t >= info.cut - 1e-6 ? t + gap : t);
  const tmp = outFile.replace(/\.[a-z0-9]+$/i, '');

  // Voiceover track
  const vo = new Float32Array(Math.ceil(total * SR) * 2);
  const vv = (A && A.voVolume) || 1.6;
  if (A && A.voDir) {
    for (const [stage, at] of Object.entries(A.voAt || {})) {
      const f = path.join(root, A.voDir, stage + '.mp3');
      if (!fs.existsSync(f) || !info.stages[stage]) continue;
      const pcm = decode(f), off = Math.round(mapT(info.stages[stage].start + at) * SR) * 2;
      for (let i = 0; i < pcm.length && off + i < vo.length; i++) vo[off + i] += pcm[i] * vv;
    }
  }
  writeWav(tmp + '-vo.wav', vo);
  writeWav(tmp + '-sfx.wav', synthSfx(info.sfx || [], total, mapT));

  const music = A && A.music && fs.existsSync(path.join(root, A.music)) ? path.join(root, A.music) : null;
  const mv = (A && A.musicVolume) || 0.2, sv = (A && A.sfxVolume) || 0.35;
  const inputs = music ? ['-stream_loop', '-1', '-i', music] : ['-f', 'lavfi', '-i', `anullsrc=r=${SR}:cl=stereo`];
  const fadeOut = Math.max(0, total - 2.2).toFixed(2);
  const filter = [
    `[0:a]atrim=0:${total.toFixed(3)},asetpts=N/SR/TB,aresample=${SR},volume=${mv},afade=t=in:st=0:d=0.6,afade=t=out:st=${fadeOut}:d=2.2[m]`,
    `[1:a]asplit=2[v1][v2]`,
    `[m][v1]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450:makeup=1[md]`,
    `[2:a]volume=${sv}[s]`,
    // Mixed, then levelled to -14 LUFS (what Instagram, TikTok and YouTube expect).
    `[md][v2][s]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=${SR},alimiter=limit=0.89[a]`,
  ].join(';');
  ff([...inputs, '-i', tmp + '-vo.wav', '-i', tmp + '-sfx.wav', '-filter_complex', filter, '-map', '[a]', '-t', total.toFixed(3), '-c:a', 'aac', '-b:a', '192k', outFile]);
  fs.unlinkSync(tmp + '-vo.wav');
  fs.unlinkSync(tmp + '-sfx.wav');
  return outFile;
}

module.exports = { buildSoundtrack };
