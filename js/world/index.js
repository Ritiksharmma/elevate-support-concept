// The world: one continuous scene the camera travels through as the page scrolls.
// Stations are camera poses tied to page sections; scroll gives a float index between them.
import * as THREE from 'three';
import { createSky, bakeEnvironment } from './sky.js';
import { createWater } from './water.js';
import { createMark } from './mark.js';
import { createPost } from './post.js';
import { createTickets } from './tickets.js';
import { createArtifacts } from './artifacts.js';
import { createClouds, CLOUD_Y } from './clouds.js';
import { createBook } from './book.js';
import { createFounders } from './founders.js';

export function createWorld(canvas, { mobile = false, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  // the 3D layer renders near 1x; the page text stays retina-sharp. A governor below tunes it to hold the frame rate.
  const PR_MAX = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.25);
  const PR_MIN = 0.6;
  // start from a pixel budget (about 1.6 million rendered pixels), so big screens do not begin with dropped frames
  let pr = Math.max(PR_MIN, Math.min(PR_MAX, 1, Math.sqrt(1.6e6 / (innerWidth * innerHeight))));
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(-0.32, 0.035, -1).normalize();
  const haze = new THREE.Color(0.20, 0.11, 0.08);
  scene.fog = new THREE.FogExp2(haze, 0.006);
  scene.environment = bakeEnvironment(renderer, sunDir);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1200);
  camera.position.set(0, 2.2, 8);

  const sky = createSky(sunDir);
  scene.add(sky.mesh);

  const water = createWater({ sunDir, haze, mobile });
  scene.add(water.mesh);
  if (water.mesh.onBeforeRender && !mobile) {
    // the mirror pass clears to transparent, so the water shader knows where nothing was reflected
    const orig = water.mesh.onBeforeRender.bind(water.mesh);
    water.mesh.onBeforeRender = (r, s, c) => {
      const a = r.getClearAlpha();
      r.setClearAlpha(0);
      orig(r, s, c);
      r.setClearAlpha(a);
    };
  }
  // the sky dome and the cloud sheets live on layer 1: the main camera sees them, the mirror camera does not
  sky.mesh.layers.set(1);
  camera.layers.enable(1);

  // key light: the low sun, warm, from behind; a cool fill from the front-left; a warm bounce from the water
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.62, 0.38), 2.4);
  sun.position.copy(sunDir).multiplyScalar(50);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(new THREE.Color(0.55, 0.62, 0.85), 0.7);
  fill.position.set(-6, 5, 10);
  scene.add(fill);
  const bounce = new THREE.HemisphereLight(new THREE.Color(0.25, 0.22, 0.3), new THREE.Color(0.35, 0.16, 0.08), 0.6);
  scene.add(bounce);

  const mark = createMark();
  mark.root.position.set(0, 2.25, 0);
  scene.add(mark.root);

  const tickets = createTickets({ count: mobile ? 600 : 1100, center: new THREE.Vector3(0, 4.6, -30) });
  scene.add(tickets.root);

  const artifacts = createArtifacts();
  scene.add(artifacts.root);

  const clouds = createClouds(sunDir);
  clouds.sheets.forEach((m) => m.layers.set(1));
  scene.add(clouds.root);

  const book = createBook(renderer);
  book.root.position.set(0, 31, -96);
  scene.add(book.root);

  // the founders' portraits, floating above the cloud where the founders section is read
  const founders = createFounders(renderer);
  founders.layout(mobile);
  founders.root.position.set(...(mobile ? [-1, 34.55, -92.5] : [1.5, 33.1, -93]));
  founders.root.lookAt(mobile ? new THREE.Vector3(-1, 33, -86) : new THREE.Vector3(-1, 33, -86));
  founders.root.visible = false;
  scene.add(founders.root);

  // the monument: the orbit again, vast, standing in the sky around the sun
  const beacon = createMark();
  beacon.root.scale.setScalar(13);
  beacon.root.position.copy(sunDir.clone().multiplyScalar(150)).add(new THREE.Vector3(0, 24, -96));
  beacon.root.lookAt(beacon.root.position.clone().sub(sunDir));
  scene.add(beacon.root);

  // dust: warm motes that drift around the camera
  const DUST = mobile ? 350 : 900;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 30; dustPos[i * 3 + 1] = Math.random() * 14; dustPos[i * 3 + 2] = (Math.random() - 0.5) * 30; }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec3 uCam; uniform float uPx; varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.13 + position.y) * 0.8; p.y += sin(uTime * 0.09 + position.x) * 0.5; p.z += cos(uTime * 0.11 + position.y) * 0.8;
        p = uCam + mod(p - uCam + 15.0, 30.0) - 15.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        vA = smoothstep(0.5, 2.0, d) * (1.0 - smoothstep(10.0, 15.0, d));
        gl_PointSize = clamp(uPx * 22.0 / max(d, 0.1), 0.0, 48.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision mediump float; varying float vA;
      void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(vec3(1.0, 0.62, 0.38) * a * vA * 0.9, 1.0); }`,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.layers.set(1);
  scene.add(dust);

  const post = createPost(renderer, scene, camera, { mobile });

  // glass lives on layer 2: the main camera sees it, the mirror camera does not (that would cost a second transmission pass)
  scene.traverse((o) => { if (o.isMesh && o.material && o.material.transmission > 0) o.layers.set(2); });
  camera.layers.enable(2);

  // ---------- frame-rate governor: step the 3D resolution down when frames run long, back up when there is room
  const gov = { refresh: 1, samples: [], hold: 3, history: [], probing: 0, probeEnd: 0, nextProbe: 6, ceiling: 9 };
  const fixedPR = +(new URLSearchParams(location.search).get('pr') || 0);
  function setPR(v) {
    pr = Math.max(PR_MIN, Math.min(PR_MAX, Math.round(v * 100) / 100));
    renderer.setPixelRatio(pr);
    post.composer.setPixelRatio(pr);
    resize();
  }
  if (fixedPR) setPR(fixedPR);
  function govern(rawDt, now) {
    if (fixedPR || rawDt <= 0 || rawDt > 0.25) return;
    gov.samples.push(rawDt);
    if (gov.samples.length < 50) return;
    const sorted = [...gov.samples].sort((a, b) => a - b);
    const avg = gov.samples.reduce((a, b) => a + b, 0) / gov.samples.length;
    const slow = gov.samples.filter((d) => d > gov.refresh * 1.5).length / gov.samples.length;
    // aim for 60fps: a faster screen (120Hz) is a bonus, never a reason to lower quality
    gov.refresh = Math.max(1 / 60, Math.min(gov.refresh, sorted[Math.floor(sorted.length * 0.1)]));
    gov.samples.length = 0;
    if (now < gov.hold) return;
    if ((avg > gov.refresh * 1.12 || slow > 0.08) && pr > PR_MIN) {
      // a failed probe means this is the ceiling: go back and stay
      // whatever level just ran long is the ceiling from now on: no probing back into it
      gov.ceiling = Math.min(gov.ceiling, pr);
      gov.probing = 0;
      setPR(pr - (avg > gov.refresh * 1.6 ? 0.2 : 0.1));
      gov.hold = now + 1.5;
      gov.history.push(['down', pr, +(avg * 1000).toFixed(1)]);
    } else if (gov.probing && now > gov.probeEnd) {
      gov.probing = 0;
      gov.history.push(['kept', pr]);
    } else if (!gov.probing && avg < gov.refresh * 1.03 && slow < 0.01 && pr + 0.1 <= Math.min(PR_MAX, gov.ceiling - 0.01) && now > gov.nextProbe) {
      gov.probing = pr + 0.1;
      setPR(pr + 0.1);
      gov.probeEnd = now + 5;
      gov.nextProbe = now + 12;
      gov.hold = now + 1;
      gov.history.push(['try', pr]);
    }
  }

  // ---------- camera stations
  const stations = [];
  const pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 34 };
  const want = { pos: new THREE.Vector3(0, 2.2, 8), target: new THREE.Vector3(0, 2.25, 0), fov: 34 };
  const look = new THREE.Vector3(0, 2.25, 0);
  let progress = 0;
  const pointer = new THREE.Vector2();
  const pointerEased = new THREE.Vector2();
  if (!reduced) addEventListener('pointermove', (e) => { pointer.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5); }, { passive: true });

  const ease = (x) => x * x * (3 - 2 * x);
  function poseAt(f) {
    const n = stations.length;
    if (!n) return;
    const i = Math.max(0, Math.min(n - 1, Math.floor(f)));
    const j = Math.min(n - 1, i + 1);
    const t = ease(Math.max(0, Math.min(1, f - i)));
    const a = stations[i], b = stations[j];
    want.pos.lerpVectors(a.pos, b.pos, t);
    want.target.lerpVectors(a.target, b.target, t);
    want.fov = a.fov + (b.fov - a.fov) * t;
    // an optional arc between stations, so moves feel flown rather than slid
    if (a.lift) want.pos.y += Math.sin(t * Math.PI) * a.lift;
  }

  // ---------- loop
  const clock = new THREE.Clock();
  let raf = 0, running = false, wanted = false, t = 0;
  const hooks = [];
  function frame() {
    raf = requestAnimationFrame(frame);
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 1 / 20);
    govern(rawDt, clock.elapsedTime);
    t += reduced ? dt * 0.25 : dt;
    poseAt(progress);
    const k = 1 - Math.pow(0.0015, dt);
    pointerEased.lerp(pointer, 1 - Math.pow(0.02, dt));
    pose.pos.lerp(want.pos, k);
    look.lerp(want.target, k);
    pose.fov += (want.fov - pose.fov) * k;
    camera.position.copy(pose.pos);
    camera.position.x += pointerEased.x * 0.35;
    camera.position.y -= pointerEased.y * 0.2;
    camera.lookAt(look);
    if (Math.abs(camera.fov - pose.fov) > 0.01) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    sky.mesh.position.copy(camera.position);
    sky.uniforms.uTime.value = t;
    water.uniforms.uTime.value = t;
    mark.update(t, api.open);
    beacon.update(t * 0.5, 0);
    if (api.ticketsOn) tickets.update(t, api.order);
    artifacts.update(t, dt);
    book.update(t, api.bookTurn);
    if (founders.root.visible) founders.update(t);
    clouds.uniforms.uTime.value = t;
    dustMat.uniforms.uTime.value = t;
    dustMat.uniforms.uCam.value.copy(camera.position);
    // altitude: thinner haze above the clouds, a white-out while passing through them
    const y = camera.position.y;
    const inCloud = Math.max(0, 1 - Math.abs(y - (CLOUD_Y + 1.6)) / 3.2);
    post.grade.uniforms.uHaze.value = Math.min(0.72, inCloud * 0.95);
    scene.fog.density = THREE.MathUtils.lerp(0.006, 0.0022, THREE.MathUtils.smoothstep(y, CLOUD_Y - 2, CLOUD_Y + 4));
    water.mesh.visible = y < CLOUD_Y - 0.5;
    mark.root.visible = y < CLOUD_Y + 6;
    tickets.root.visible = api.ticketsOn && y < CLOUD_Y;
    beacon.root.visible = y > CLOUD_Y + 1.5;
    for (const h of hooks) h(t, dt);
    post.grain.uniforms.uTime.value = t % 10;
    post.composer.render(dt);
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    post.composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    water.resize(w * pr * 0.8, h * pr * 0.8);
  }
  addEventListener('resize', resize);
  resize();
  pose.pos.copy(want.pos);

  const start = () => { if (running) return; running = true; clock.getDelta(); raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : wanted && start()));

  const api = {
    renderer, scene, camera, mark, stations, post, sunDir, hooks,
    quality: () => ({ pixelRatio: pr, refreshMs: +(gov.refresh * 1000).toFixed(1), changes: gov.history }),
    open: 0, order: 0, bookTurn: 0, ticketsOn: false, tickets, artifacts, book, beacon, clouds, water, sky, founders,
    setStations(list) {
      stations.length = 0;
      for (const s of list) stations.push({ pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target), fov: s.fov, lift: s.lift || 0 });
    },
    setStation(i, s) { if (stations[i]) { stations[i].pos.set(...s.pos); stations[i].target.set(...s.target); stations[i].fov = s.fov; } },
    fromPose(pos, target, fov) { pose.pos.set(...pos); look.set(...target); pose.fov = fov; camera.fov = fov; camera.updateProjectionMatrix(); },
    set progress(v) { progress = v; },
    get progress() { return progress; },
    jump() { poseAt(progress); pose.pos.copy(want.pos); look.copy(want.target); pose.fov = want.fov; },
    project(obj, out) {
      const v = new THREE.Vector3();
      obj.getWorldPosition(v);
      v.project(camera);
      out.x = (v.x * 0.5 + 0.5) * innerWidth;
      out.y = (-v.y * 0.5 + 0.5) * innerHeight;
      out.visible = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
      return out;
    },
    start() { wanted = true; start(); },
    stop() { wanted = false; stop(); },
    resize,
    async warm() { await renderer.compileAsync(scene, camera); },
  };
  return api;
}
