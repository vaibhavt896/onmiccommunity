// node render.mjs --w 1920 --h 1080 --fps 60 --sub 3 --from 0 --to 12 --out out/hero-16x9.mp4
// node render.mjs --w 1920 --h 1080 --stills 0.3,0.9,1.7 --out out/stills
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const argv = process.argv;
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i > 0 ? argv[i + 1] : d; };
const W = +arg('w', 1920), H = +arg('h', 1080), FPS = +arg('fps', 60), SUB = +arg('sub', 1);
const FROM = +arg('from', 0), TO = +arg('to', 12), OUT = arg('out', 'out/film.mp4'), STILLS = arg('stills', '');
const CRF = arg('crf', '14'), SHUTTER = +arg('shutter', 0.5);
const PORT = 8800 + Math.floor(Math.random() * 500);

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGE ERROR', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html?w=${W}&h=${H}`);
await page.waitForFunction(() => window.ready).catch(() => {});
await page.evaluate(() => window.ready);
const cdp = await page.context().newCDPSession(page);
const shot = async (t) => {
  await page.evaluate((t) => window.seek(t), t);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  return Buffer.from(data, 'base64');
};

if (STILLS) {
  mkdirSync(OUT, { recursive: true });
  for (const s of STILLS.split(',')) {
    const t = +s; writeFileSync(`${OUT}/t${t.toFixed(2).padStart(5, '0')}.png`, await shot(t));
  }
  console.log('stills done');
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  // SUB subframes spread over the shutter interval, averaged → real motion blur
  const vf = SUB > 1 ? `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB` : `setpts=N/${FPS}/TB`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-i', '-',
    '-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round((TO - FROM) * FPS), t0 = Date.now();
  const FAST = await page.evaluate(() => window.FAST || [[0, 1e9]]);
  const isFast = (t) => FAST.some(([a, b]) => t >= a && t < b);
  const write = async (png) => { if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r)); };
  for (let f = 0; f < frames; f++) {
    const tf = FROM + f / FPS;
    if (SUB > 1 && !isFast(tf)) { const png = await shot(tf); for (let s = 0; s < SUB; s++) await write(png); }
    else for (let s = 0; s < SUB; s++) {
      const t = FROM + (f + (SUB > 1 ? (s / (SUB - 1) - 1) * SHUTTER : 0)) / FPS;
      await write(await shot(t));
    }
    if (f % FPS === 0) console.log(`${(f / FPS).toFixed(1)}s / ${(TO - FROM).toFixed(1)}s  (${((Date.now() - t0) / 1000).toFixed(0)}s elapsed)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('video done', OUT);
}
await browser.close();
server.kill();
