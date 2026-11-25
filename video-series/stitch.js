/*
  Join an episode into one finished video:  main clip → your 3D clip(s) → outro.

    node stitch.js ep03-skill-builder path/to/3d-clip.mp4 [more-3d-clips.mp4 ...]

  Any 3D clip size or frame rate works: each one is fitted into 1080 x 1920 (9:16) on the
  Vector Edge charcoal background, at 30 fps. The soundtrack is rebuilt to fit: the music plays on
  under your 3D clip, and the voiceover and sound effects stay in sync either side of it.
  Output: out/<ep>-final.mp4  and  out/<ep>-final-whatsapp.mp4
*/
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { buildSoundtrack } = require('./audio');

let FFMPEG = 'ffmpeg';
try { const p = require('ffmpeg-static'); if (p && fs.existsSync(p)) FFMPEG = p; } catch (e) { /* ffmpeg on PATH */ }

const [ep, ...clips] = process.argv.slice(2);
if (!ep || !clips.length) {
  console.log('Usage: node stitch.js <episode-id> <3d-clip.mp4> [more clips...]');
  process.exit(1);
}
const OUT = path.join(__dirname, 'out');
const main = path.join(OUT, `${ep}-main.mp4`), outro = path.join(OUT, `${ep}-outro.mp4`);
for (const f of [main, outro, ...clips]) if (!fs.existsSync(f)) { console.error('Missing file: ' + f); process.exit(1); }

const parts = [main, ...clips, outro];
const args = ['-y', '-loglevel', 'error'];
parts.forEach((f) => args.push('-i', f));
// Each part fitted into 9:16 on charcoal, 30 fps, then joined (video only).
let filter = parts.map((f, i) => `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x2B2B2B,setsar=1,fps=30,format=yuv420p[v${i}]`).join(';');
filter += ';' + parts.map((_, i) => `[v${i}]`).join('') + `concat=n=${parts.length}:v=1:a=0[v]`;
const final = path.join(OUT, `${ep}-final.mp4`), silent = path.join(OUT, `${ep}-final-video.mp4`);
args.push('-filter_complex', filter, '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent);
let r = spawnSync(FFMPEG, args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status || 1);

// Length of a clip, read from ffmpeg's own output (works with ffmpeg-static, which has no ffprobe).
function duration(f) {
  const out = spawnSync(FFMPEG, ['-i', f], { encoding: 'utf8' }).stderr || '';
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(out);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}
const infoFile = path.join(OUT, `${ep}-audio.json`);
if (fs.existsSync(infoFile)) {
  const info = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
  const gap = clips.reduce((a, c) => a + duration(c), 0);
  const track = buildSoundtrack(__dirname, info, path.join(OUT, `${ep}-final-soundtrack.m4a`), gap);
  r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', silent, '-i', track, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
  fs.unlinkSync(silent);
} else fs.renameSync(silent, final);

const wa = path.join(OUT, `${ep}-final-whatsapp.mp4`);
r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', final, '-vf', 'scale=720:1280', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', wa], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status || 1);
console.log('Final     →', path.relative(__dirname, final));
console.log('WhatsApp  →', path.relative(__dirname, wa), `${(fs.statSync(wa).size / 1e6).toFixed(1)} MB`);
