// On Mic — hero film. Every frame is a pure function of time: window.seek(t).
import * as THREE from 'three';

// ───────────────────────── format ─────────────────────────
const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);
const LAND = W >= H;
const U = Math.min(W, H) / 100;
const DUR = 12;
const C = { ink: '#0D0616', cream: '#FFF4E6', lime: '#C6FF3D', magenta: '#FF2E93', violet: '#4A1FE0', orange: '#FF7A2F', cyan: '#3FD0FF' };

// ───────────────────────── motion kit ─────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
function spring(t, k = 170, d = 26) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k), z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
const SNAP = [320, 30], FLASH = [900, 52], UI = [260, 25], DEF = [170, 26], HEAVY = [90, 20], PLAY = [240, 15], SOFT = [120, 22];
const sp = (t, p = DEF) => spring(t, p[0], p[1]);
const E = {
  inExpo: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  inQuart: x => x * x * x * x,
};
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ───────────────────────── DOM kit ─────────────────────────
const frame = document.getElementById('frame');
frame.style.width = W + 'px'; frame.style.height = H + 'px';
const bg = document.getElementById('bg'), back = document.getElementById('back'), front = document.getElementById('front');

function div(parent, style = {}, html = '') {
  const e = document.createElement('div');
  e.className = 'abs'; e.innerHTML = html; Object.assign(e.style, style);
  parent.appendChild(e); return e;
}
function put(e, x, y, s = 1, r = 0, o = 1, extra = '') {
  if (o <= 0.002 || s <= 0.0005) { e.style.visibility = 'hidden'; return; }
  e.style.visibility = 'visible';
  e.style.opacity = o >= 1 ? '' : o;
  e.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) ${extra} scale(${s}) rotate(${r}deg)`;
}
const hide = (...els) => els.forEach(e => { e.style.visibility = 'hidden'; });

const mctx = document.createElement('canvas').getContext('2d');
const FONTS = {
  anton: { css: '"Anton"', w: 400, st: 'normal' },
  serif: { css: '"Instrument Serif"', w: 400, st: 'italic' },
  mono: { css: '"Space Mono"', w: 700, st: 'normal' },
  sans: { css: '"DM Sans"', w: 500, st: 'normal' },
};
function metrics(txt, f) {
  const F = FONTS[f];
  mctx.font = `${F.st} ${F.w} 100px ${F.css}`;
  const m = mctx.measureText(txt);
  return { l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, aA: m.actualBoundingBoxAscent, aD: m.actualBoundingBoxDescent, fA: m.fontBoundingBoxAscent, fD: m.fontBoundingBoxDescent };
}
// Size that fits the ink box inside maxW × maxH
function fitSize(txt, f, maxW, maxH) {
  const m = metrics(txt, f);
  return Math.min(maxW / ((m.l + m.r) / 100), maxH / ((m.aA + m.aD) / 100));
}
// A text block whose box is the ink bounds (+pad). mask=true clips it so glyphs can rise in.
function text(parent, txt, f, size, color, { mask = true, chars = false, stroke = 0, strokeColor = C.ink, padK = 0.07 } = {}) {
  const F = FONTS[f], m = metrics(txt, f), k = size / 100, pad = size * padK + stroke;
  const w = (m.l + m.r) * k + pad * 2, h = (m.aA + m.aD) * k + pad * 2;
  const root = div(parent, { width: w + 'px', height: h + 'px', overflow: mask ? 'hidden' : 'visible' });
  const baseline = (size - (m.fA + m.fD) * k) / 2 + m.fA * k;
  const inner = div(root, {
    left: pad + m.l * k + 'px', top: pad + m.aA * k - baseline + 'px',
    font: `${F.st} ${F.w} ${size}px/1 ${F.css}`, color: stroke ? 'transparent' : color, whiteSpace: 'nowrap',
    ...(f === 'anton' || f === 'mono' ? { textTransform: 'uppercase' } : {}),
  });
  if (stroke) inner.style.setProperty('-webkit-text-stroke', `${stroke}px ${strokeColor}`);
  let spans = [];
  if (chars) {
    inner.innerHTML = [...txt].map(ch => `<span class="ch">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    spans = [...inner.querySelectorAll('.ch')];
  } else inner.textContent = txt;
  return { root, inner, spans, w, h, size };
}
const rise = (el, p, dist = 112) => { el.style.transform = `translateY(${(1 - p) * dist}%)`; };

// ───────────────────────── 3D ─────────────────────────
const canvas = document.getElementById('gl');
canvas.width = W; canvas.height = H;
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: Q.get('aa') !== '0', preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const FOV = LAND ? 30 : 38;
const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 300);
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

// Studio environment: black room with coloured light strips → brand-coloured reflections
(function makeEnv() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: 0x050208, side: THREE.BackSide })));
  const panel = (w, h, hex, k, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(14, 5, '#ffffff', 5.5, [0, 14, 3]);      // overhead softbox
  panel(2.2, 18, C.magenta, 4.2, [-13, 0, -1]);  // magenta strip, left
  panel(2.2, 18, C.lime, 2.8, [13, 1, -2]);      // lime strip, right
  panel(10, 3, C.violet, 3.0, [0, -10, 6]);      // violet floor bounce
  panel(5, 7, C.cream, 2.2, [7, 4, 12]);         // front key card
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.035).texture; pm.dispose();
})();
const rimM = new THREE.DirectionalLight(C.magenta, 3.2); rimM.position.set(-5, 2, -4); scene.add(rimM);
const rimL = new THREE.DirectionalLight(C.lime, 2.4); rimL.position.set(5, 1, -4); scene.add(rimL);
const key = new THREE.DirectionalLight(C.cream, 1.4); key.position.set(1, 5, 6); scene.add(key);

// Microphone (dynamic, ball grille). Head centre at origin, radius 1.
const micRoot = new THREE.Group(), micSpin = new THREE.Group();
micRoot.add(micSpin); scene.add(micRoot);
(function buildMic() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#fff'; g.lineWidth = 17;
  for (let i = -256; i <= 512; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
    g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke();
  }
  const alpha = new THREE.CanvasTexture(c); alpha.wrapS = alpha.wrapT = THREE.RepeatWrapping; alpha.repeat.set(30, 15); alpha.anisotropy = 8;
  const grille = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96),
    new THREE.MeshStandardMaterial({ color: 0xd5d7de, metalness: 1, roughness: 0.36, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide }));
  const foam = new THREE.Mesh(new THREE.SphereGeometry(0.9, 64, 48), new THREE.MeshStandardMaterial({ color: 0x0b0a0e, roughness: 0.95 }));
  const prof = [[0, -4.8], [0.40, -4.8], [0.43, -4.6], [0.47, -3.6], [0.56, -2.6], [0.68, -1.6], [0.80, -0.96], [0.865, -0.62], [0.865, -0.5], [0.72, -0.48]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 128),
    new THREE.MeshPhysicalMaterial({ color: 0x1a151f, metalness: 0.6, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.12 }));
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.872, 0.05, 32, 160), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1 }));
  band.rotation.x = Math.PI / 2; band.position.y = -0.55;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.024, 16, 160), new THREE.MeshBasicMaterial({ color: C.lime, toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.02;
  micSpin.add(grille, foam, body, band, ring);
})();

// Vinyl record. Radius 1. Face = +Y.
const vinylRoot = new THREE.Group(), vinylSpin = new THREE.Group();
vinylRoot.add(vinylSpin); scene.add(vinylRoot);
function circleTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function buildVinyl() {
  const grooves = circleTex(2048, (g, S) => {
    const cx = S / 2; g.fillStyle = '#09080b'; g.fillRect(0, 0, S, S);
    const r = rng(11);
    for (let rad = S * 0.17; rad < S * 0.497; rad += 1.6) {
      const f = rad / (S / 2);
      const gap = [0.52, 0.64, 0.76, 0.88].some(x => Math.abs(f - x) < 0.006);
      const v = gap ? 34 : 13 + r() * 9;
      g.strokeStyle = `rgb(${v},${v},${v + 3})`; g.lineWidth = gap ? 2.2 : 1;
      g.beginPath(); g.arc(cx, cx, rad, 0, Math.PI * 2); g.stroke();
    }
    g.strokeStyle = '#1d1b22'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cx, S * 0.497, 0, Math.PI * 2); g.stroke();
  });
  const top = new THREE.MeshPhysicalMaterial({ map: grooves, roughness: 0.36, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x0c0b0e, roughness: 0.25, metalness: 0.3 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.022, 256, 1), [edge, top, top]);
  const labelTex = circleTex(1024, (g, S) => {
      const cx = S / 2;
      g.fillStyle = C.orange; g.beginPath(); g.arc(cx, cx, cx, 0, Math.PI * 2); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 10; g.beginPath(); g.arc(cx, cx, cx * 0.9, 0, Math.PI * 2); g.stroke();
      g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = '400 250px Anton'; g.fillText('ON MIC', cx, cx - 20);
      g.font = 'italic 400 96px "Instrument Serif"'; g.fillText('open mic + jam nights', cx, cx + 110);
      g.font = '700 44px "Space Mono"';
      const ring = 'KANPUR ★ SIDE A ★ LIVE ★ KANPUR ★ SIDE A ★ LIVE ★ ';
      const R = cx * 0.8; [...ring].forEach((ch, i) => {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / ring.length);
        g.save(); g.translate(cx + Math.cos(a) * R, cx + Math.sin(a) * R); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
      });
      g.fillStyle = C.ink; g.beginPath(); g.arc(cx, cx, 26, 0, Math.PI * 2); g.fill();
  });
  const label = new THREE.Mesh(new THREE.CircleGeometry(0.335, 128), new THREE.MeshStandardMaterial({
    roughness: 0.55, map: labelTex, emissiveMap: labelTex, emissive: 0xffffff, emissiveIntensity: 0.55 }));
  label.rotation.x = -Math.PI / 2; label.position.y = 0.0115;
  vinylSpin.add(disc, label);
  // Stationary highlight: two opposed light wedges, like real vinyl under a key light
  const hl = new THREE.Mesh(new THREE.RingGeometry(0.345, 0.995, 256, 1), new THREE.MeshBasicMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85,
    map: circleTex(1024, (g, S) => {
      const cx = S / 2, cg = g.createConicGradient(0, cx, cx);
      const w = 0.035;
      [[0, 0], [0.25 - w * 3, 0], [0.25 - w, 0.16], [0.25, 0.55], [0.25 + w, 0.16], [0.25 + w * 3, 0], [0.75 - w * 3, 0], [0.75 - w, 0.12], [0.75, 0.42], [0.75 + w, 0.12], [0.75 + w * 3, 0], [1, 0]]
        .forEach(([p, a]) => cg.addColorStop(p, `rgba(255,244,230,${a})`));
      g.fillStyle = cg; g.fillRect(0, 0, S, S);
    }),
  }));
  hl.rotation.x = -Math.PI / 2; hl.position.y = 0.0125;
  vinylRoot.add(hl);
}

// ───────────────────────── scene elements ─────────────────────────
const flash = div(bg, { inset: 0, width: W + 'px', height: H + 'px', background: C.cream });
const haze = div(bg, { width: 1.6 * Math.max(W, H) + 'px', height: 1.6 * Math.max(W, H) + 'px', borderRadius: '50%',
  background: `radial-gradient(circle, rgba(74,31,224,.9) 0%, rgba(74,31,224,.42) 26%, rgba(13,6,22,0) 58%)` });
const warm = div(bg, { width: 1.3 * Math.max(W, H) + 'px', height: 1.3 * Math.max(W, H) + 'px', borderRadius: '50%',
  background: `radial-gradient(circle, rgba(255,122,47,.34) 0%, rgba(255,46,147,.12) 30%, rgba(13,6,22,0) 60%)` });

const coneTop = W * 0.06, coneBot = LAND ? W * 0.6 : W * 1.05;
// Volumetric spotlight, pre-baked once into an image (live CSS blur is far too slow to render)
const cone = div(back, { width: coneBot * 1.25 + 'px', height: H * 1.1 + 'px', transformOrigin: '50% 0%' });
(function bakeCone() {
  const cw = Math.round(coneBot * 1.25), ch = Math.round(H * 1.1);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  const layer = (wk, a0, a1, blur) => {
    const o = document.createElement('canvas'); o.width = cw; o.height = ch; const q = o.getContext('2d');
    const top = coneTop * wk / 2, bot = coneBot * 1.25 * wk * 0.4;
    const gr = q.createLinearGradient(0, 0, 0, ch);
    gr.addColorStop(0, `rgba(255,244,230,${a0})`); gr.addColorStop(0.38, `rgba(255,244,230,${a1})`); gr.addColorStop(0.88, 'rgba(255,244,230,0)');
    q.fillStyle = gr; q.beginPath(); q.moveTo(cw / 2 - top, 0); q.lineTo(cw / 2 + top, 0); q.lineTo(cw / 2 + bot, ch); q.lineTo(cw / 2 - bot, ch); q.closePath(); q.fill();
    g.filter = `blur(${blur * U}px)`; g.globalCompositeOperation = 'lighter'; g.drawImage(o, 0, 0); g.filter = 'none';
  };
  layer(1.0, 0.34, 0.10, 5); layer(0.62, 0.42, 0.12, 2.2);
  cone.style.background = `url(${c.toDataURL()}) no-repeat`; cone.style.backgroundSize = '100% 100%'; cone.style.mixBlendMode = 'screen';
})();
const hot = div(back, { width: 44 * U + 'px', height: 16 * U + 'px', borderRadius: '50%',
  background: 'radial-gradient(closest-side, rgba(255,255,255,1), rgba(255,244,230,.55) 35%, rgba(255,244,230,0))' });
const vignette = div(front, { inset: '0', width: W + 'px', height: H + 'px',
  background: 'radial-gradient(ellipse at center, rgba(13,6,22,0) 45%, rgba(8,3,14,.55) 100%)' });

const DOT = 2.4 * U;
const dot = div(front, { width: DOT + 'px', height: DOT + 'px', borderRadius: '50%', background: C.lime, boxShadow: `0 0 ${3 * U}px rgba(198,255,61,.55)` });
const ring1 = div(front, { width: '100px', height: '100px', borderRadius: '50%', boxSizing: 'border-box' });
const ring2 = div(front, { width: '100px', height: '100px', borderRadius: '50%', boxSizing: 'border-box' });

// Shot 2 type
const HEAD_D = LAND ? 7.8 : 10.6;                     // camera distance for the mic
const headR = (H / 2) / (HEAD_D * TAN);                // head radius on screen, px
let getT, onT, theT, micT;
// Shot 3 type
let openT, jamT, s3mono;
// Shot 4
const WORDS = [
  { t: 5.00, txt: 'SING', bg: C.magenta, fg: C.cream, f: 'anton', r: -3 },
  { t: 5.25, txt: 'RAP', bg: C.violet, fg: C.lime, f: 'anton', r: 4 },
  { t: 5.50, txt: 'poetry', bg: C.orange, fg: C.ink, f: 'serif', r: 0 },
  { t: 6.00, txt: 'STAND-UP', bg: C.ink, fg: C.lime, f: 'anton', stroke: true, r: 0 },
  { t: 6.25, txt: 'BEATBOX', bg: C.lime, fg: C.ink, f: 'anton', r: -4 },
  { t: 6.50, txt: 'GUITAR', bg: C.cyan, fg: C.ink, f: 'anton', r: 3 },
  { t: 7.00, txt: 'JUST VIBE.', bg: C.cream, fg: C.ink, f: 'anton', r: 0 },
];
let askT, ticker, ghostA, ghostB;
// Shot 5
let perf, card, cardInner, sticker, sheen, holo, redBar, lock, tItems = [], notchT, notchB;
const TBW = 1200, TBH = 500;                            // ticket design size
const TW = LAND ? W * 0.6 : W * 0.9, TS = TW / TBW, TH = TBH * TS;
// Shot 6
let yourT, turnT, s6mono, shine;

function buildType() {
  // Shot 2
  // GET / ON sit BEHIND the mic and tuck under the head: depth, not a caption
  if (LAND) {
    const side = W / 2 - headR * 0.8 - 7 * U;
    const s = Math.min(fitSize('GET', 'anton', side, H * 0.58), fitSize('ON', 'anton', side, H * 0.58));
    getT = text(back, 'GET', 'anton', s, C.cream, { chars: true });
    onT = text(back, 'ON', 'anton', s, C.cream, { chars: true });
  } else {
    const room = H / 2 - headR * 0.55 - 3 * U;
    const s = Math.min(fitSize('GET', 'anton', W * 0.9, room), fitSize('ON', 'anton', W * 0.9, room));
    getT = text(back, 'GET', 'anton', s, C.cream, { chars: true });
    onT = text(front, 'ON', 'anton', s, C.cream, { chars: true });   // in front of the handle
  }
  if (LAND) {
    const s = fitSize('THE MIC.', 'anton', W * 0.94, H * 0.8);
    theT = text(back, 'THE MIC.', 'anton', s, C.ink, { mask: false, stroke: 0.55 * U, strokeColor: C.ink });
  } else {
    const s = Math.min(fitSize('THE', 'anton', W * 0.9, H * 0.19), fitSize('MIC.', 'anton', W * 0.9, H * 0.19));
    theT = text(back, 'THE', 'anton', s, C.ink, { mask: false, stroke: 0.55 * U, strokeColor: C.ink });
    micT = text(back, 'MIC.', 'anton', s, C.ink, { mask: false, stroke: 0.55 * U, strokeColor: C.ink });
  }
  // Shot 3
  const s3 = LAND ? fitSize('+ jam nights', 'serif', W * 0.4, H * 0.2) : fitSize('+ jam nights', 'serif', W * 0.86, H * 0.12);
  openT = text(front, 'open mic', 'serif', s3, C.cream, { mask: true, padK: 0.12 });
  jamT = text(front, '+ jam nights', 'serif', s3, C.cream, { mask: true, padK: 0.12 });
  s3mono = text(front, 'OPEN STAGE ★ KANPUR', 'mono', 2.6 * U, C.lime, { chars: true });
  // Shot 4
  WORDS.forEach(w => {
    const maxW = LAND ? W * 0.86 : W * 0.9, maxH = LAND ? H * 0.62 : H * 0.34;
    const s = fitSize(w.txt, w.f, maxW, maxH);
    w.el = text(front, w.txt, w.f, s, w.fg, { chars: true, stroke: w.stroke ? 0.5 * U : 0, strokeColor: w.fg, padK: w.f === 'serif' ? 0.14 : 0.07 });
  });
  WORDS.forEach(w => { w.el.root.style.zIndex = 5; });
  askT = text(front, "WHAT'S YOUR THING?", 'mono', 3.3 * U, C.cream, { chars: true });
  ticker = text(front, 'SING ★ RAP ★ POETRY ★ STAND-UP ★ BEATBOX ★ GUITAR ★ JUST VIBE ★ '.repeat(4), 'mono', 2.2 * U, C.cream, { mask: false });
  const gs = LAND ? H * 0.34 : H * 0.2;
  ghostA = text(back, 'ADMIT ONE ★ ADMIT ONE ★ ADMIT ONE ★ ADMIT ONE ★', 'anton', gs, C.ink, { mask: false, stroke: 0.3 * U, strokeColor: 'rgba(13,6,22,.28)' });
  ghostB = text(back, 'ONE SEAT ★ ONE PERSON ★ ONE SEAT ★ ONE PERSON ★', 'anton', gs, C.ink, { mask: false, stroke: 0.3 * U, strokeColor: 'rgba(13,6,22,.28)' });
  // Shot 6
  if (LAND) {
    const s = fitSize('YOUR TURN.', 'anton', W * 0.86, H * 0.44);
    yourT = text(front, 'YOUR', 'anton', s, C.cream, { chars: true });
    turnT = text(front, 'TURN.', 'anton', s, C.magenta, { chars: true });
  } else {
    const s = Math.min(fitSize('YOUR', 'anton', W * 0.86, H * 0.3), fitSize('TURN.', 'anton', W * 0.86, H * 0.3));
    yourT = text(front, 'YOUR', 'anton', s, C.cream, { chars: true });
    turnT = text(front, 'TURN.', 'anton', s, C.magenta, { chars: true });
  }
  shine = div(front, { width: 16 * U + 'px', height: H * 1.2 + 'px', mixBlendMode: 'overlay', zIndex: 6,
    background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.95) 50%, rgba(255,255,255,0))' });
  s6mono = text(front, 'ON MIC ★ OPEN MIC + JAM NIGHTS ★ KANPUR', 'mono', (LAND ? 2.5 : 2.9) * U, C.cream, { chars: true });
  buildTicket();
}

function qrSvg(n = 25) {
  const r = rng(50), cell = 8, rects = [];
  const finder = (x, y) => rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${7 * cell}" height="${7 * cell}" fill="${C.ink}"/><rect x="${(x + 1) * cell}" y="${(y + 1) * cell}" width="${5 * cell}" height="${5 * cell}" fill="${C.cream}"/><rect x="${(x + 2) * cell}" y="${(y + 2) * cell}" width="${3 * cell}" height="${3 * cell}" fill="${C.ink}"/>`);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    if (!inF && r() > 0.52) rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${C.ink}"/>`);
  }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  return `<svg width="${n * cell}" height="${n * cell}" viewBox="0 0 ${n * cell} ${n * cell}">${rects.join('')}</svg>`;
}
function starSvg(size, pts = 18) {
  const R = size / 2, r = R * 0.83, p = [];
  for (let i = 0; i < pts * 2; i++) { const a = i * Math.PI / pts - Math.PI / 2, rr = i % 2 ? r : R - 4; p.push(`${R + Math.cos(a) * rr},${R + Math.sin(a) * rr}`); }
  return `<svg width="${size}" height="${size}"><polygon points="${p.join(' ')}" fill="${C.lime}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/></svg>`;
}
function buildTicket() {
  card = div(front, { boxSizing: 'border-box', background: C.cream, borderStyle: 'solid', borderColor: C.ink });
  const clip = div(card, { inset: '0', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit' });
  cardInner = div(clip, { width: TBW + 'px', height: TBH + 'px', transformOrigin: '0 0' });
  const mono = (txt, x, y, px, color = C.ink) => div(cardInner, { left: x + 'px', top: y + 'px', font: `700 ${px}px/1 "Space Mono"`, color, whiteSpace: 'nowrap' }, txt);
  const pill = (txt, bgc) => `<span style="font:700 22px/1 'Space Mono';color:${C.ink};background:${bgc};border:3px solid ${C.ink};border-radius:999px;padding:12px 20px;white-space:nowrap">${txt}</span>`;
  lock = div(cardInner, { left: '78px', top: '384px', width: '50px', height: '50px' },
    `<svg width="50" height="50" viewBox="0 0 50 50"><rect x="9" y="22" width="32" height="24" rx="6" fill="${C.ink}"/><path d="M16 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="${C.ink}" stroke-width="5"/><circle cx="25" cy="33" r="3.5" fill="${C.lime}"/></svg>`);
  redBar = div(cardInner, { left: '150px', top: '406px', width: '260px', height: '32px', borderRadius: '6px', background: C.ink, overflow: 'hidden' },
    `<div style="position:absolute;inset:0;width:300%;background:linear-gradient(100deg,rgba(255,255,255,0) 40%,rgba(255,244,230,.45) 50%,rgba(255,255,255,0) 60%)"></div>`);
  const box = div(cardInner, { left: '56px', top: '366px', width: '790px', height: '86px', boxSizing: 'border-box', border: `3px solid ${C.ink}`, borderRadius: '18px', background: '#fff' });
  cardInner.insertBefore(box, lock);
  tItems = [
    mono('ON MIC JAM ★ ADMIT ONE', 56, 54, 22),
    div(cardInner, { left: '700px', top: '40px', font: '700 22px/1 "Space Mono"', color: C.ink, background: C.lime, border: `3px solid ${C.ink}`, borderRadius: '999px', padding: '12px 18px' }, '1 SEAT'),
    div(cardInner, { left: '52px', top: '100px', font: '400 156px/1 "Anton"', color: C.ink, whiteSpace: 'nowrap' }, 'OPEN STAGE'),
    div(cardInner, { left: '56px', top: '292px', display: 'flex', gap: '14px' }, pill('ENTRY', C.cream) + pill('+ MOCKTAIL', C.lime) + pill('LIVE STAGE', C.cyan)),
    box, lock, mono('VENUE', 150, 382, 18, 'rgba(13,6,22,.55)'), redBar,
    div(cardInner, { left: '432px', top: '408px', font: '500 26px/1 "DM Sans"', color: C.ink, whiteSpace: 'nowrap' }, 'revealed in your pass'),
    div(cardInner, { left: '950px', top: '50px' }, qrSvg()),
    mono('SCAN AT THE DOOR', 952, 282, 17),
    mono('ONE SCAN.', 952, 322, 30), mono('ONE ENTRY.', 952, 362, 30),
  ];
  // perforation + notches (clipped by the card), arrive with the content
  perf = div(cardInner, { left: '0', top: '0', width: TBW + 'px', height: TBH + 'px' });
  div(perf, { left: '900px', top: '0', width: '0', height: TBH + 'px', borderLeft: `4px dashed rgba(13,6,22,.5)` });
  notchT = div(perf, { left: '870px', top: '-32px', width: '64px', height: '64px', borderRadius: '50%', background: C.magenta, border: `3px solid ${C.ink}`, boxSizing: 'border-box' });
  notchB = div(perf, { left: '870px', top: TBH - 32 + 'px', width: '64px', height: '64px', borderRadius: '50%', background: C.magenta, border: `3px solid ${C.ink}`, boxSizing: 'border-box' });
  sheen = div(clip, { inset: '0', width: '100%', height: '100%', mixBlendMode: 'soft-light',
    background: 'linear-gradient(105deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.95) 48%, rgba(255,255,255,0) 60%)', backgroundSize: '260% 100%' });
  holo = div(clip, { inset: '0', width: '100%', height: '100%', mixBlendMode: 'color-burn', opacity: 0.16,
    background: 'linear-gradient(115deg, #ff2e93, #ffd23f, #c6ff3d, #3fd0ff, #4a1fe0, #ff2e93)', backgroundSize: '300% 100%' });
  const SS = (LAND ? 25 : 32) * U;
  sticker = div(card, { width: SS + 'px', height: SS + 'px' },
    starSvg(SS) + `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font:400 ${SS * 0.2}px/0.92 Anton;color:${C.ink};text-align:center;transform:rotate(-8deg)">ONLY<br>50 SEATS</div>`);
}

// Dust motes in the spotlight
const dust = document.getElementById('dust'); dust.width = W; dust.height = H;
const dctx = dust.getContext('2d');
const MOTES = (() => { const r = rng(3); return Array.from({ length: 120 }, () => ({ x: r() - 0.5, y: r(), z: r(), ph: r() * 6.28, sp: 0.4 + r() })); })();
function drawDust(t, k) {
  dctx.clearRect(0, 0, W, H);
  if (k <= 0.01) return;
  for (const m of MOTES) {
    const y = ((m.y - t * 0.018 * m.sp) % 1 + 1) % 1;
    const wAt = lerp(coneTop, coneBot, y) * 0.9;
    const x = W / 2 + m.x * wAt + Math.sin(t * 0.9 + m.ph) * U * 0.8;
    const py = y * H;
    const sz = lerp(0.12, 1.1, Math.pow(m.z, 3)) * U;
    const a = k * lerp(0.9, 0.22, m.z) * (1 - y * 0.75) * (1 - Math.pow(Math.abs(m.x) * 2, 3));
    if (a <= 0.01) continue;
    const gr = dctx.createRadialGradient(x, py, 0, x, py, sz * (m.z > 0.7 ? 2.2 : 1.2));
    gr.addColorStop(0, `rgba(255,244,230,${a})`); gr.addColorStop(1, 'rgba(255,244,230,0)');
    dctx.fillStyle = gr; dctx.beginPath(); dctx.arc(x, py, sz * (m.z > 0.7 ? 2.2 : 1.2), 0, 6.283); dctx.fill();
  }
}

// ───────────────────────── the timeline ─────────────────────────
const CX = W / 2, CY = H / 2;
const allText = () => [getT, onT, theT, micT, openT, jamT, s3mono, askT, ticker, ghostA, ghostB, yourT, turnT, s6mono, ...WORDS.map(w => w.el)].filter(Boolean).map(x => x.root);

function seek(tIn) {
  const t = ((tIn % DUR) + DUR) % DUR;
  hide(flash, haze, warm, cone, hot, vignette, dot, ring1, ring2, card, sticker, shine, ...allText());
  if (t < 5.0 || t >= 10.0) put(vignette, CX, CY, 1);
  bg.style.background = C.ink;
  micRoot.visible = false; vinylRoot.visible = false;
  let dustK = 0;

  // ── SHOT 1 + 2: dot → shockwave → spotlight → mic → GET ON THE MIC.
  if (t < 0.34 || t >= 11.7) {
    let s = 1;
    if (t < 0.34) s = t < 0.25 ? 1 - 0.2 * E.inOutSine(seg(t, 0.04, 0.25)) : lerp(0.8, 0, E.inExpo(seg(t, 0.25, 0.33)));
    else s = E.outCubic(seg(t, 11.7, 11.96));
    put(dot, CX, CY, s);
  }
  if (t >= 0.25 && t < 1.2) {
    const D = Math.hypot(W, H) * 1.15;
    [[ring1, 0.25, C.lime, 0.9], [ring2, 0.31, C.magenta, 0.35]].forEach(([r, t0, col, th]) => {
      const p = E.outExpo(seg(t, t0, t0 + 0.8));
      const d = lerp(DOT, D, p);
      r.style.border = `${lerp(th * U, 0.12 * U, p)}px solid ${col}`;
      put(r, CX, CY, d / 100, 0, 1 - seg(t, t0 + 0.3, t0 + 0.8));
    });
    const fl = 0;
    put(flash, CX, CY, 1, 0, fl);
  }
  if (t >= 0.25 && t < 3.0) {
    micRoot.visible = true;
    const p = sp(t - 0.25, [135, 20]);
    const drop = !LAND && t >= 2.5 ? 0.95 : 0;                 // portrait: mic rises into the words
    micRoot.position.set(0, -drop, lerp(-70, 0, p));
    micRoot.rotation.set(0.32, lerp(-2.6, 0, p), -0.3);
    micSpin.rotation.y = 0.35 * t;
    let d = HEAD_D * (1 - 0.07 * E.inOutSine(seg(t, 0.8, 2.72)));
    d = lerp(d, 1.3, E.inQuart(seg(t, 2.62, 3.0)));
    const aim = -drop * E.inOutCubic(seg(t, 2.6, 2.86));
    camera.position.set(0, aim, d); camera.lookAt(0, aim, 0);
    const lime = t >= 2.5;
    scene.environmentIntensity = lime ? 0.2 : 1.0;
    rimM.intensity = lime ? 0.6 : 3.2; rimL.intensity = lime ? 0.3 : 2.4; key.intensity = lime ? 0.15 : 1.4;
  }
  if (t >= 0.5 && t < 2.5) {
    const on = t < 0.55 ? 1 : t < 0.6 ? 0.35 : t < 0.64 ? 1 : 0.92 + 0.08 * Math.sin(t * 9);
    const grow = sp(t - 0.5, SOFT);
    put(cone, CX, H * 0.54 - H * 0.04, 1, 0, on, `scaleY(${lerp(0.85, 1, grow)})`);
    put(hot, CX, -2 * U, 1, 0, on);
    put(haze, CX, CY + (LAND ? 0 : -headR * 0.2), lerp(0.55, 1, grow), 0, on * 0.95);
    dustK = on;
  }
  if (t >= 1.5 && t < 2.5) {
    const drift = 1 + 0.025 * (t - 1.5);
    [[getT, 1.5], [onT, 2.0]].forEach(([T, t0], i) => {
      if (t < t0) return;
      T.spans.forEach((ch, j) => rise(ch, sp(t - t0 - j * 0.03, SNAP)));
      const s = lerp(1.14, 1, sp(t - t0, SNAP)) * drift;
      if (LAND) put(T.root, i ? CX + headR * 0.8 + T.w / 2 : CX - headR * 0.8 - T.w / 2, CY + 1.5 * U, s);
      else put(T.root, CX, i ? CY + headR * 0.55 + T.h / 2 : CY - headR * 0.55 - T.h / 2, s);
    });
  }
  if (t >= 2.5 && t < 3.0) {
    bg.style.background = C.lime;
    const s = lerp(1.1, 1, sp(t - 2.5, SNAP)) * (1 + 0.03 * (t - 2.5));
    if (LAND) put(theT.root, CX, CY, s);
    else { put(theT.root, CX, H * 0.165, s); put(micT.root, CX, H * 0.165 + theT.h * 0.98, s); }
  }
  drawDust(t, dustK);

  // ── SHOT 3: vinyl
  if (t >= 3.0 && t < 5.0) {
    vinylRoot.visible = true;
    const pb = sp(t - 3.0, [62, 14]), tilt = sp(t - 3.05, [55, 13]);
    scene.environmentIntensity = lerp(0.04, 1.0, E.inOutCubic(tilt)) * (1 - 0.85 * E.outCubic(seg(t, 4.66, 4.86))); rimM.intensity = 2.2; rimL.intensity = 1.2; key.intensity = 0.55 * Math.pow(tilt, 2) * (1 - seg(t, 4.66, 4.86));
    const exit = E.inExpo(seg(t, 4.7, 5.0));
    const dFar = LAND ? 4.6 : 6.3;
    camera.position.set(0, 0, lerp(1.05, dFar, pb)); camera.lookAt(0, 0, 0);
    const ox = LAND ? 1.38 : 0, oy = LAND ? 0 : 0.95;
    vinylRoot.position.set(ox * pb - (LAND ? 9 : 7) * exit, oy * pb, 0);
    vinylRoot.rotation.set(Math.PI / 2 - 0.8 * tilt, 0, -0.28 * tilt);
    vinylSpin.rotation.y = -(t - 3.0) * 5.2 - 9 * E.inCubic(seg(t, 4.4, 5.0));
    put(warm, LAND ? CX + W * 0.18 : CX, LAND ? CY : CY - H * 0.14, lerp(0.6, 1, pb), 0, 0.9);
    const txX = LAND ? W * 0.27 : CX, exitX = -W * 0.7 * exit;
    const baseY = LAND ? CY : H * 0.73;
    [[openT, 3.42, -1], [jamT, 3.62, 1]].forEach(([T, t0, dir]) => {
      if (t < t0) return;
      const p = E.outExpo(seg(t, t0, t0 + 0.5));
      T.root.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
      const y = baseY + dir * T.h * 0.47 - (LAND ? 1.5 * U : 3 * U);
      put(T.root, txX + exitX + (1 - p) * -3 * U + (LAND ? (dir > 0 ? 3 * U : -3 * U) : 0), y, 1);
    });
    if (t >= 3.95) {
      s3mono.spans.forEach((ch, j) => rise(ch, sp(t - 3.95 - j * 0.012, SNAP)));
      put(s3mono.root, txX + exitX + (LAND ? 3 * U : 0), baseY + jamT.h + (LAND ? 1 * U : 2 * U), 1);
    }
  }

  // ── SHOT 4: what's your thing?
  if (t >= 5.0 && t < 7.62) {
    let i = WORDS.length - 1; while (i > 0 && t < WORDS[i].t) i--;
    const w = WORDS[i], lt = t - w.t;
    bg.style.background = w.bg;
    if (t < 7.5) {
      w.el.spans.forEach((ch, j) => rise(ch, sp(lt - j * 0.01, FLASH), 70));
      const s = lerp(1.16, 1, sp(lt, FLASH)) * (1 + 0.05 * lt);
      put(w.el.root, CX, CY + (LAND ? 2 * U : 0), s, w.r * (1 - sp(lt, FLASH) * 0.4));
      askT.root.firstChild.style.color = w.fg;
      askT.spans.forEach((ch, j) => rise(ch, sp(t - 5.0 - j * 0.01, SNAP)));
      put(askT.root, CX, LAND ? H * 0.12 : H * 0.28, 1);
      ticker.root.firstChild.style.color = w.fg;
      put(ticker.root, CX - (t - 5.0) * 24 * U, H - (LAND ? 6 : 9) * U, 1, 0, 0.75);
    }
  }

  // ── SHOT 5: the pass
  if (t >= 7.5 && t < 10.0) {
    bg.style.background = C.magenta;
    const gIn = sp(t - 7.6, SOFT);
    put(ghostA.root, CX - (t - 7.5) * 9 * U + (1 - gIn) * 20 * U, CY - (LAND ? H * 0.3 : H * 0.28), 1, 0, gIn);
    put(ghostB.root, CX + (t - 7.5) * 9 * U - (1 - gIn) * 20 * U, CY + (LAND ? H * 0.3 : H * 0.28), 1, 0, gIn);
    const m = sp(t - 7.5, [150, 21]);
    const cw = lerp(W, TW, m), ch = lerp(H, TH, m);
    const exit = E.inCubic(seg(t, 9.55, 10.0));
    const tilt = sp(t - 7.85, [70, 13]);
    let shake = 0;
    if (t > 9.04) shake = Math.exp(-(t - 9.04) * 13) * Math.sin((t - 9.04) * 42) * 1.3 * U;
    const rx = lerp(0, 13, tilt) + Math.sin(t * 1.3) * 2, ry = lerp(0, -22, tilt) + (t - 8) * 4 + 75 * exit;
    Object.assign(card.style, { width: cw + 'px', height: ch + 'px', borderRadius: lerp(0, 2.4 * U, m) + 'px', borderWidth: lerp(0, 0.45 * U, m) + 'px',
      boxShadow: `${lerp(0, 1.3 * U, m)}px ${lerp(0, 1.3 * U, m)}px 0 ${C.ink}` });
    put(card, CX - W * 0.35 * exit, CY + shake, 1 + 0.9 * exit, 0, 1, `perspective(${2.2 * Math.max(W, H)}px) rotateX(${rx}deg) rotateY(${ry}deg)`);
    cardInner.style.transform = `translate(${(cw - TW) / 2}px,${(ch - TH) / 2}px) scale(${TS})`;
    // JUST VIBE. squeezes into the card, then leaves before the content arrives
    if (t < 7.64) {
      const jv = WORDS[WORDS.length - 1].el;
      jv.spans.forEach(ch => rise(ch, 1));
      put(jv.root, CX, CY + (LAND ? 2 * U : 0), lerp(1, TW / W, m) * lerp(1.025, 0.8, seg(t, 7.5, 7.64)), 0, 1);
    }
    perf.style.opacity = clamp((t - 7.63) / 0.08);
    tItems.forEach((e, i) => {
      const a = sp(t - (7.62 + i * 0.03), UI);
      e.style.opacity = clamp(a * 1.6); e.style.transform = `translateY(${(1 - a) * 26}px) scale(${lerp(0.94, 1, a)})`;
    });
    const lockPop = t > 8.5 ? 1 + 0.35 * Math.exp(-(t - 8.5) * 9) * Math.sin((t - 8.5) * 30) : 1;
    lock.style.transform += ` scale(${lockPop})`;
    redBar.firstChild.style.transform = `translateX(${lerp(-66, 0, ((t - 8.2) * 0.55) % 1)}%)`;
    sheen.style.backgroundPosition = `${lerp(130, -30, E.inOutCubic(seg(t, 8.0, 9.4)))}% 0`;
    holo.style.backgroundPosition = `${(t - 7.5) * 30}% 0`;
    notchT.style.background = notchB.style.background = C.magenta;
    if (t >= 9.0) {
      const s = sp(t - 9.0, PLAY);
      put(sticker, cw - 5 * U, 3 * U, lerp(2.6, 1, s), lerp(-50, -12, s), clamp((t - 9.0) * 30));
    }
  }

  // ── SHOT 6: YOUR TURN. → collapse into the dot
  if (t >= 10.0 && t < 11.96) {
    const col = E.inExpo(seg(t, 11.56, 11.9)), antic = 1 + 0.03 * E.inOutSine(seg(t, 11.42, 11.56));
    const S = (1 + 0.035 * (t - 10)) * antic * (1 - col);
    put(haze, CX, CY, lerp(0.5, 0.9, sp(t - 10, SOFT)) * (1 - col), 0, 0.75);
    const gap = 3.2 * U;
    [[yourT, 10.0], [turnT, 10.5]].forEach(([T, t0], i) => {
      if (t < t0) return;
      T.spans.forEach((ch, j) => rise(ch, sp(t - t0 - j * 0.028, SNAP)));
      let x, y;
      if (LAND) { const total = yourT.w + gap + turnT.w; x = CX - total / 2 + (i ? yourT.w + gap + turnT.w / 2 : yourT.w / 2); y = CY - 2 * U; }
      else { x = CX; y = CY + (i ? 1 : -1) * (yourT.h / 2 + U) - 2 * U; }
      put(T.root, CX + (x - CX) * S, CY + (y - CY) * S, S * lerp(1.12, 1, sp(t - t0, SNAP)));
    });
    if (t >= 10.85 && t < 11.45) put(shine, lerp(-0.1 * W, 1.1 * W, E.inOutCubic(seg(t, 10.85, 11.45))), CY, 1, 16);
    if (t >= 11.0) {
      s6mono.spans.forEach((ch, j) => rise(ch, sp(t - 11.0 - j * 0.008, SNAP)));
      const y = LAND ? CY + yourT.h / 2 + 3 * U : CY + yourT.h + 3 * U;
      put(s6mono.root, CX, CY + (y - CY) * S, S);
    }
  }

  renderer.render(scene, camera);
  return true;
}

// ───────────────────────── boot ─────────────────────────
window.ready = (async () => {
  await Promise.all([
    document.fonts.load('400 100px Anton'), document.fonts.load('italic 400 100px "Instrument Serif"'),
    document.fonts.load('700 100px "Space Mono"'), document.fonts.load('500 100px "DM Sans"'),
  ]);
  await document.fonts.ready;
  buildVinyl();
  buildType();
  renderer.compile(scene, camera);
  micRoot.visible = true; vinylRoot.visible = true; renderer.render(scene, camera);
  window.seek = seek;
  // windows where motion is fast enough to need real motion blur (renderer spends subframes only here)
  window.FAST = [[0.2, 1.05], [1.45, 1.66], [1.95, 2.16], [2.45, 3.5], [4.55, 5.0], [5.0, 7.5], [7.45, 8.05], [8.45, 8.6], [8.95, 9.25], [9.45, 10.2], [10.45, 10.66], [10.8, 11.5], [11.4, 12.0]];
  if (!navigator.webdriver) {
    const t0 = performance.now();
    (function loop() { seek(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); })();
  }
  return true;
})();
