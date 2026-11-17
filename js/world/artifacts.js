// Five service objects, one per practice, each floating over a titanium landing ring on the water.
// Consulting: a gyroscope. Training: rising steps. Automation: meshing gears.
// Advisory: a prism splitting a beam. Courses: a fan of glass pages.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from './mark.js';

function gearShape(teeth, ro, rr, hole) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [[a, rr], [a + step * 0.18, ro], [a + step * 0.48, ro], [a + step * 0.66, rr]];
    pts.forEach(([ang, r], j) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
    s.absarc(0, 0, rr, a + step * 0.66, a + step, false);
  }
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  s.holes.push(h);
  // lightening holes
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const c = new THREE.Path();
    c.absarc(Math.cos(a) * (hole + rr) / 2, Math.sin(a) * (hole + rr) / 2, (rr - hole) * 0.22, 0, Math.PI * 2, true);
    s.holes.push(c);
  }
  return s;
}

function landing(m) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 12, 160), m.titanium);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.42, 0.14).multiplyScalar(2.2), transparent: true, opacity: 0.0 });
  const glow = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.012, 8, 160), glowMat);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.035;
  g.add(glow);
  // radial ticks around the ring
  const tick = new THREE.BoxGeometry(0.02, 0.012, 0.12);
  const inst = new THREE.InstancedMesh(tick, m.titanium, 72);
  const d = new THREE.Object3D();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r = 1.38 + (i % 6 === 0 ? 0.04 : 0);
    d.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    d.rotation.set(0, -a + Math.PI / 2, 0);
    d.scale.set(1, 1, i % 6 === 0 ? 1.8 : 1);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  }
  g.add(inst);
  g.position.y = 0.04;
  return { g, glowMat };
}

function gyroscope(m) {
  const g = new THREE.Group();
  const rings = [];
  const specs = [[1.0, 0.05, m.orange], [0.8, 0.04, m.titanium], [0.6, 0.035, m.graphite]];
  specs.forEach(([r, t, mat]) => {
    const ring = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r, t, 20, 128), mat);
    ring.add(torus);
    // pivots where each ring is held by the next
    for (const s of [-1, 1]) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 16), m.titanium);
      pin.position.set(s * r, 0, 0);
      pin.rotation.z = Math.PI / 2;
      ring.add(pin);
    }
    g.add(ring);
    rings.push(ring);
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 48, 24), m.glass);
  const hot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), m.coreSoft);
  g.add(core, hot);
  // a needle through the axis
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.5, 8), m.titanium);
  g.add(axle);
  return {
    g,
    update(t) {
      rings[0].rotation.set(t * 0.4, 0, 0.3);
      rings[1].rotation.set(0, t * 0.7, 0);
      rings[2].rotation.set(t * 1.1, t * 0.5, 0);
      hot.rotation.set(t, t * 1.3, 0);
      g.rotation.z = Math.sin(t * 0.3) * 0.15;
    },
  };
}

function steps(m) {
  const g = new THREE.Group();
  const n = 11;
  const blocks = [];
  const geo = new RoundedBoxGeometry(0.62, 0.14, 0.32, 3, 0.04);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(geo, i === n - 1 ? m.orange : (i % 3 === 0 ? m.titanium : m.ceramic));
    const a = i * 0.52;
    b.position.set(Math.cos(a) * 0.55, -1.0 + i * 0.19, Math.sin(a) * 0.55);
    b.rotation.y = -a;
    g.add(b);
    blocks.push(b);
  }
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 24), m.glass);
  post.position.y = 0.0;
  g.add(post);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 12), m.core);
  cap.position.y = 1.18;
  g.add(cap);
  return { g, update(t) { g.rotation.y = t * 0.25; blocks.forEach((b, i) => { b.position.y = -1.0 + i * 0.19 + Math.sin(t * 1.2 - i * 0.5) * 0.015; }); } };
}

function gears(m) {
  const g = new THREE.Group();
  const ext = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 3, curveSegments: 10 };
  const big = new THREE.Mesh(new THREE.ExtrudeGeometry(gearShape(18, 0.78, 0.68, 0.14), ext).center(), m.titanium);
  const mid = new THREE.Mesh(new THREE.ExtrudeGeometry(gearShape(11, 0.5, 0.4, 0.1), ext).center(), m.orange);
  const small = new THREE.Mesh(new THREE.ExtrudeGeometry(gearShape(8, 0.36, 0.27, 0.07), ext).center(), m.glass);
  big.position.set(-0.32, 0.12, 0);
  mid.position.set(0.82, 0.32, 0.02);
  small.position.set(0.205, -0.79, 0.05);
  const hubGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 24);
  for (const gear of [big, mid, small]) {
    const hub = new THREE.Mesh(hubGeo, m.graphite);
    hub.rotation.x = Math.PI / 2;
    hub.position.copy(gear.position);
    g.add(hub);
  }
  g.add(big, mid, small);
  return {
    g,
    update(t) {
      big.rotation.z = t * 0.35;
      mid.rotation.z = -t * 0.35 * (18 / 11) + 0.14;
      small.rotation.z = -t * 0.35 * (18 / 8) + 0.2;
      g.rotation.y = Math.sin(t * 0.25) * 0.5;
    },
  };
}

function prism(m) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.62, 0.62, 1.5, 3, 1);
  const p = new THREE.Mesh(geo, m.glass);
  p.rotation.y = Math.PI / 6;
  g.add(p);
  // titanium end plates
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 3), m.titanium);
  plate.rotation.y = Math.PI / 6;
  const top = plate.clone(); top.position.y = 0.78;
  const bot = plate.clone(); bot.position.y = -0.78;
  g.add(top, bot);
  // a white beam in, an orange fan out
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.9, 0.8).multiplyScalar(3), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const inBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 8), beamMat);
  inBeam.rotation.z = Math.PI / 2;
  inBeam.position.set(-0.95, 0.05, 0);
  g.add(inBeam);
  const fan = new THREE.Group();
  const outColors = [[1, 0.35, 0.1], [1, 0.55, 0.2], [1, 0.75, 0.4], [0.6, 0.65, 1.0]];
  outColors.forEach((c, i) => {
    const mt = new THREE.MeshBasicMaterial({ color: new THREE.Color(...c).multiplyScalar(2.2), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 1.8, 8), mt);
    b.rotation.z = Math.PI / 2 - (i - 1.5) * 0.09;
    b.position.set(1.15, -0.02 - (i - 1.5) * 0.08, 0);
    fan.add(b);
  });
  g.add(fan);
  return { g, update(t) { g.rotation.y = Math.sin(t * 0.3) * 0.25; beamMat.opacity = 0.75 + Math.sin(t * 3) * 0.1; } };
}

function pages(m) {
  const g = new THREE.Group();
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 24), m.graphite);
  g.add(spine);
  const n = 9;
  const leaves = [];
  const geo = new RoundedBoxGeometry(0.95, 1.2, 0.02, 2, 0.01);
  geo.translate(0.5, 0, 0);
  for (let i = 0; i < n; i++) {
    const leaf = new THREE.Mesh(geo, i === 4 ? m.orange : (i % 2 ? m.frost : m.ceramic));
    g.add(leaf);
    leaves.push(leaf);
  }
  return {
    g,
    update(t) {
      const open = 0.55 + 0.45 * Math.sin(t * 0.45);
      leaves.forEach((l, i) => { l.rotation.y = -Math.PI * 0.1 - (i / (n - 1)) * Math.PI * (0.35 + 0.55 * open); });
      g.rotation.y = -0.35 + Math.sin(t * 0.2) * 0.25;
    },
  };
}

export const SERVICE_X = [-10, -5, 0, 5, 10];
export const SERVICE_Z = -58;

export function createArtifacts() {
  const m = materials();
  const root = new THREE.Group();
  const makers = [gyroscope, steps, gears, prism, pages];
  const items = makers.map((make, i) => {
    const holder = new THREE.Group();
    holder.position.set(SERVICE_X[i], 0, SERVICE_Z);
    const obj = make(m);
    obj.g.position.y = 2.3;
    holder.add(obj.g);
    const pad = landing(m);
    holder.add(pad.g);
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 3.5, 0);
    holder.add(anchor);
    root.add(holder);
    return { holder, obj, pad, anchor, lit: 0, want: 0 };
  });
  return {
    root, items,
    highlight(i) { items.forEach((it, j) => { it.want = j === i ? 1 : 0; }); },
    update(t, dt) {
      items.forEach((it, i) => {
        it.obj.update(t + i * 3);
        it.obj.g.position.y = 2.3 + Math.sin(t * 0.6 + i) * 0.06;
        it.lit += (it.want - it.lit) * (1 - Math.pow(0.02, dt));
        it.pad.glowMat.opacity = 0.15 + it.lit * 0.85;
      });
    },
  };
}
