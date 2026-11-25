/*
  Fit an episode's timing to its voiceover.

    node vo-plan.js ve02-kaleb-cooper

  For each scene that has a voiceover clip, it finds where the speech is (ffmpeg silencedetect),
  makes the scene long enough for the voice (never shorter than the animation needs), and sets each
  caption to appear when its sentence starts: a scene with 3 captions is split at its 2 longest
  pauses, so write the voiceover with a [pause 1s] between caption lines.

  Writes episodes/<episode>.timing.js, which the player loads after the episode file.
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

let FFMPEG = 'ffmpeg';
try { const p = require('ffmpeg-static'); if (p && fs.existsSync(p)) FFMPEG = p; } catch (e) { /* ffmpeg on PATH */ }

const ROOT = __dirname;
const ep = (process.argv[2] || '').replace(/[^a-z0-9-]/gi, '');
const file = path.join(ROOT, 'episodes', ep + '.js');
if (!ep || !fs.existsSync(file)) { console.log('Usage: node vo-plan.js <episode-id>'); process.exit(1); }

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'lib.js'), 'utf8'), ctx);
ctx.VE = ctx.window.VE;
vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
const EP = ctx.window.EPISODE;
const A = EP.audio || {};

// Shortest each scene can be, so its animation still fits.
const MIN = { intro: 2.8, brief: 6, sketch: 6.4, concept: 5.5, vector: 10, colour: 4.5, zoom: 4.5, van: 7, handoff: 2.5, outro: 4.5 };

// Speech start/end and the pauses inside it, from ffmpeg silencedetect.
function analyse(f) {
  const out = spawnSync(FFMPEG, ['-hide_banner', '-i', f, '-af', 'silencedetect=noise=-38dB:d=0.2', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const dur = +(/Duration: (\d+):(\d+):([\d.]+)/.exec(out) || [0, 0, 0, 0]).slice(1).reduce((a, v, i) => a + v * [3600, 60, 1][i], 0);
  const sil = [];
  const re = /silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g;
  let m;
  while ((m = re.exec(out))) sil.push([+m[1], +m[2]]);
  let start = 0, end = dur;
  const inner = [];
  for (const [a, b] of sil) {
    if (a < 0.05) start = b;
    else if (b >= dur - 0.05) end = a;
    else inner.push([a, b]);
  }
  return { start, end, inner };
}
// Caption i starts after the i-th longest pause (as many pauses as there are caption breaks).
function splits(info, n) {
  const pick = info.inner.slice().sort((x, y) => (y[1] - y[0]) - (x[1] - x[0])).slice(0, Math.max(0, n - 1)).sort((x, y) => x[0] - y[0]);
  return [info.start].concat(pick.map((p) => p[1]));
}

const durations = Object.assign({}, EP.durations);
const captionsAt = {};
const voAt = A.voAt || {};
for (const scene of Object.keys(durations)) {
  const f = A.voDir && path.join(ROOT, A.voDir, scene + '.mp3');
  if (!f || !fs.existsSync(f) || voAt[scene] == null) continue;
  const info = analyse(f), at = voAt[scene];
  const end = info.end;
  durations[scene] = +Math.max(MIN[scene] || 0, at + end + 0.45).toFixed(2);
  const caps = (EP.captions || {})[scene] || [];
  if (caps.length) {
    const st = splits(info, caps.length);
    captionsAt[scene] = caps.map((c, i) => +(at + (st[i] != null ? st[i] : st[st.length - 1])).toFixed(2));
    if (st.length < caps.length) console.log(`  note: ${scene} has ${caps.length} captions but only ${st.length} spoken parts`);
  }
  console.log(`${scene.padEnd(8)} voice ${end.toFixed(2)} s → scene ${durations[scene]} s, captions at ${(captionsAt[scene] || []).join(', ')}`);
}
const out = path.join(ROOT, 'episodes', ep + '.timing.js');
fs.writeFileSync(out, `// Made by vo-plan.js from the voiceover. Re-run it after changing the voice clips.\nwindow.EPISODE_TIMING = ${JSON.stringify({ durations, captionsAt }, null, 2)};\n`);
console.log('Timing →', path.relative(ROOT, out), `(total ${Object.values(durations).reduce((a, b) => a + b, 0).toFixed(1)} s)`);
