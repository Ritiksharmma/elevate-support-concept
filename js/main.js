// Elevate Support v3: the page is a journey through one world.
// Lenis smooths the scroll; each [data-station] section is a camera pose; scroll position between
// station centres gives a float index the world eases toward.
import { initRoute, SERVICES } from './route.js';
import { createSound } from './sound.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const root = document.documentElement;

/* ---------- camera poses, one per station (world units; the water is y = 0) */
const SX = [-10, -5, 0, 5, 10], SZ = -58;
const POSES = {
  hero: { pos: [-1.55, 2.05, 8.8], target: [-1.55, 2.3, 0], fov: 34 },
  storm: { pos: [0, 4.3, -12.5], target: [0, 4.7, -30], fov: 46 },
  order: { pos: [4.4, 4.6, -9], target: [4.4, 4.6, -30], fov: 40 },
  svc0: { pos: [SX[0] + 1.3, 2.5, SZ + 8.2], target: [SX[0] + 1.7, 2.3, SZ], fov: 34 },
  svc1: { pos: [SX[1] + 1.3, 2.5, SZ + 8.2], target: [SX[1] + 1.7, 2.3, SZ], fov: 34 },
  svc2: { pos: [SX[2] + 1.3, 2.5, SZ + 8.2], target: [SX[2] + 1.7, 2.3, SZ], fov: 34 },
  svc3: { pos: [SX[3] + 1.3, 2.5, SZ + 8.2], target: [SX[3] + 1.7, 2.3, SZ], fov: 34 },
  svc4: { pos: [SX[4] + 1.3, 2.5, SZ + 8.2], target: [SX[4] + 1.7, 2.3, SZ], fov: 34 },
  route: { pos: [SX[2] - 1.6, 3.4, SZ + 9.5], target: [SX[2] - 2.5, 2.0, SZ], fov: 36 },
  m0: { pos: [0, 3.2, -64], target: [14, 6, -110], fov: 44 },
  m1: { pos: [-1, 11, -68], target: [12, 14, -112], fov: 46 },
  m2: { pos: [-2, 19.4, -74], target: [8, 22, -118], fov: 48 },
  m3: { pos: [-3, 29.5, -80], target: [-20, 30.5, -130], fov: 46 },
  book: { pos: [1.15, 31.1, -90.6], target: [1.1, 31, -96], fov: 36 },
  founders: { pos: [-1, 33, -86], target: [-4, 30, -200], fov: 46 },
  voice: { pos: [-4, 35, -96], target: [-38, 31, -220], fov: 44 },
  contact: { pos: [-14, 29.5, -150], target: [-46, 33.5, -239], fov: 46 },
};
if (mobile) {
  // on a tall screen each subject sits in the upper half, above the copy
  ['svc0', 'svc1', 'svc2', 'svc3', 'svc4'].forEach((k, i) => { POSES[k] = { pos: [SX[i], 3.0, SZ + 10.5], target: [SX[i], 1.0, SZ], fov: 50 }; });
  POSES.hero = { pos: [0, 1.4, 13], target: [0, 0.2, 0], fov: 46 };
  POSES.storm = { pos: [0, 4.3, -13], target: [0, 6, -30], fov: 56 };
  POSES.order = { pos: [0, 4.0, -4], target: [0, 1.2, -30], fov: 58 };
  POSES.book = { pos: [0, 31.3, -87.8], target: [0, 29.0, -96], fov: 52 };
  POSES.contact = { pos: [-14, 29.5, -150], target: [-46, 37, -239], fov: 56 };
  POSES.founders = { pos: [-1, 33, -86], target: [-1, 29.6, -200], fov: 46 };
}

/* ---------- WebGL check */
const canvas = $('[data-world]');
const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
if (!hasGL) root.classList.add('no-webgl');

/* ---------- phone menu */
const menuBtn = $('[data-menu]');
const nav = $('#nav');
const closeMenu = () => { if (menuBtn.getAttribute('aria-expanded') === 'true') { menuBtn.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); } };
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* ---------- smooth scroll */
gsap.registerPlugin(ScrollTrigger);
const lenis = reduced ? null : new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, prevent: () => false });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  const resync = () => { if (Math.abs(window.scrollY - lenis.animatedScroll) > 40 && !lenis.isScrolling) lenis.scrollTo(window.scrollY, { immediate: true, force: true }); };
  addEventListener('scroll', resync, { passive: true });
}

/* ---------- stations: where each sits in the document */
const stationEls = $$('[data-station]');
const names = stationEls.map((el) => el.dataset.station);
const idx = Object.fromEntries(names.map((n, i) => [n, i]));
let centres = [];
function measure() { centres = stationEls.map((el) => { const r = el.getBoundingClientRect(); return r.top + scrollY + r.height / 2; }); }
function stationFloat() {
  const c = scrollY + innerHeight / 2;
  if (c <= centres[0]) return 0;
  for (let i = 0; i < centres.length - 1; i++) {
    if (c < centres[i + 1]) return i + (c - centres[i]) / (centres[i + 1] - centres[i]);
  }
  return centres.length - 1;
}
measure();
addEventListener('resize', measure);
document.fonts?.ready.then(measure);

/* anchor links land a station in the middle of the screen */
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const el = id === '#top' ? $('#top') : $(id);
  if (!el) return;
  e.preventDefault();
  closeMenu();
  const st = el.matches('[data-station]') ? el : el.querySelector('[data-station]') || el;
  const r = st.getBoundingClientRect();
  const y = id === '#top' ? 0 : r.top + scrollY + r.height / 2 - innerHeight / 2;
  if (lenis) lenis.scrollTo(y, { duration: 2.2 }); else scrollTo(0, y);
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}));

/* ---------- hero headline: words rise in */
const h1 = $('[data-split]');
if (h1 && !reduced) {
  const words = h1.textContent.trim().split(' ');
  h1.setAttribute('aria-label', h1.textContent.trim());
  h1.innerHTML = words.map((w) => `<span data-word aria-hidden="true"><span>${w}</span></span>`).join(' ');
}

/* ---------- reveals */
const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-in'); else if (e.boundingClientRect.top > 0) e.target.classList.remove('is-in'); }), { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
$$('[data-reveal]').forEach((el) => io.observe(el));

/* ---------- chrome: altitude, hint, sound */
const altEl = $('[data-alt]');
const hint = $('[data-hint]');
const sound = createSound();
const soundBtn = $('[data-sound]');
soundBtn.addEventListener('click', async () => {
  const on = await sound.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  $('[data-sound-label]').textContent = on ? 'Sound on' : 'Sound off';
});
document.addEventListener('visibilitychange', () => (document.hidden ? sound.pause() : sound.resume()));

/* ---------- HUD labels pinned to objects */
const hud = $('[data-hud]');
const lines = $('[data-hud-lines]');
const labels = [];
function label(obj, title, sub, show, opts = {}) {
  const el = document.createElement('div');
  el.className = 'hud-label';
  el.innerHTML = `<b>${title}</b>${sub ? `<span>${sub}</span>` : ''}`;
  hud.appendChild(el);
  const ns = 'http://www.w3.org/2000/svg';
  const ln = document.createElementNS(ns, 'line');
  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('r', '2.5');
  lines.append(ln, dot);
  const l = { obj, el, ln, dot, show, dx: opts.dx ?? 46, dy: opts.dy ?? -46, op: 0, p: { x: 0, y: 0, visible: false }, hot: opts.hot };
  labels.push(l);
  return l;
}

/* ---------- the world */
let world = null;
const loader = $('[data-loader]');
const count = $('[data-load-count]');
let shown = 0;
const counter = setInterval(() => { shown = Math.min(shown + 3 + Math.random() * 7, world ? 100 : 88); count.textContent = Math.round(shown); }, 60);

function finishLoading() {
  clearInterval(counter);
  count.textContent = '100';
  loader.classList.add('is-done');
  if (!reduced) {
    gsap.from('[data-word] > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.09, delay: 0.35, onComplete: () => h1.classList.add('is-set') });
    gsap.from('[data-rise]', { y: 22, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.7 });
  }
}

let routed = 2;
const routePose = (i) => (mobile ? { pos: [SX[i], 3.4, SZ + 11.5], target: [SX[i], 0.4, SZ], fov: 50 } : { pos: [SX[i] - 1.6, 3.4, SZ + 9.5], target: [SX[i] - 2.5, 2.0, SZ], fov: 36 });
const routeApi = initRoute({ reduced, onRoute: (i) => { routed = i; if (world) world.setStation(idx.route, routePose(i)); } });

async function boot() {
  if (!hasGL) { finishLoading(); return; }
  const { createWorld } = await import('./world/index.js');
  world = createWorld(canvas, { mobile, reduced });
  POSES.route = routePose(routed);
  world.setStations(names.map((n) => POSES[n]));

  const svcTitles = [
    ['Gyroscope', 'strategy that holds its balance'],
    ['Rising steps', 'skills built a level at a time'],
    ['Gear train', 'repetitive work, mechanised'],
    ['Prism', 'one decision, seen in every light'],
    ['Leaves', 'learning that turns at its own pace'],
  ];
  const near = (name, w = 0.5) => (f) => 1 - Math.min(1, Math.max(0, (Math.abs(f - idx[name]) - w * 0.4) / (w * 0.6)));
  const heroLabels = [['AI', 'where it earns trust'], ['Automation', 'what wastes time'], ['Leadership', 'a culture that lasts']];
  if (!mobile) world.mark.anchors.forEach((a, i) => label(a, heroLabels[i][0], heroLabels[i][1], (f) => (f < 0.35 ? 1 - f / 0.35 : 0), { dx: 46, dy: i === 0 ? -40 : 44 }));
  world.artifacts.items.forEach((it, i) => {
    label(it.anchor, `Fig. ${i + 1}  ${svcTitles[i][0]}`, svcTitles[i][1], near(`svc${i}`, 0.5), { dx: 40, dy: -30 });
    label(it.anchor, `Routed to ${SERVICES[i].name}`, svcTitles[i][0], (f) => (routed === i ? near('route', 0.6)(f) : 0), { dx: 40, dy: -30, hot: i });
  });

  if (!mobile) world.founders.anchors.forEach((a, i) => label(a, ['Hemant Verma', 'Fabio De Moraes'][i], 'Co-founder', near('founders', 0.6), { dx: 18, dy: 30 }));
  await world.warm();
  world.progress = stationFloat();
  world.jump();
  // the opening: fly in from further out over the water
  if (!reduced && stationFloat() < 0.2) world.fromPose([0, 3.6, 30], [0, 2.6, 0], 30);
  world.start();
  window.__ready = true;
  window.__quality = world.quality;
  if (location.search.includes('debug')) window.__world = world;
  finishLoading();
}

/* ---------- per-frame: scroll float, world params, HUD */
let fSmooth = 0;
function tick() {
  if (!world) return;
  const f = stationFloat();
  fSmooth = f;
  world.progress = f;
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  world.open = clamp01(f / 1) * 0.0;
  world.order = clamp01((f - idx.storm) / (idx.order - idx.storm) * 1.15);
  world.ticketsOn = f > 0.25 && f < idx.route + 0.5;
  world.bookTurn = clamp01((f - idx.book + 0.6) / 1.4);
  world.book.root.visible = Math.abs(f - idx.book) < 0.8;
  world.founders.root.visible = Math.abs(f - idx.founders) < 0.85;
  world.artifacts.root.visible = f > idx.storm + 0.3 && f < idx.m0 + 0.6;
  // the routed service lights during the demo; during the services, the one in view
  if (Math.abs(f - idx.route) < 0.6) world.artifacts.highlight(routed);
  else if (f > idx.svc0 - 0.5 && f < idx.svc4 + 0.5) world.artifacts.highlight(Math.round(f - idx.svc0));
  else world.artifacts.highlight(-1);

  const y = world.camera.position.y;
  altEl.textContent = `${y.toFixed(1)} m`;
  sound.altitude(y);
  hint.classList.toggle('is-gone', scrollY > 40);

  for (const l of labels) {
    let want = l.show(f);
    if (want > 0) world.project(l.obj, l.p); else l.p.visible = false;
    if (!l.p.visible) want = 0;
    l.op += (want - l.op) * 0.18;
    const o = l.op < 0.01 ? 0 : l.op;
    l.el.style.opacity = o;
    l.ln.style.opacity = o;
    l.dot.style.opacity = o;
    if (!o) continue;
    const hot = l.hot !== undefined && l.hot === routed;
    l.el.classList.toggle('is-hot', hot);
    const x = l.p.x, yy = l.p.y;
    const lx = x + l.dx, ly = yy + l.dy;
    l.el.style.transform = `translate(${lx + (l.dx < 0 ? -6 : 6)}px, ${ly - 8}px)`;
    l.ln.setAttribute('x1', x); l.ln.setAttribute('y1', yy); l.ln.setAttribute('x2', lx); l.ln.setAttribute('y2', ly);
    l.dot.setAttribute('cx', x); l.dot.setAttribute('cy', yy);
  }
}
gsap.ticker.add(tick);

boot().catch((err) => { console.error(err); root.classList.add('no-webgl'); finishLoading(); });
