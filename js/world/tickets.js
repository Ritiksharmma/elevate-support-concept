// Support tickets: hundreds of ceramic cards. At order 0 they are a storm, a tumbling vortex;
// at order 1 they file, one after another, into the Elevate orbit: three 90-degree arcs with nodes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from './mark.js';

const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

export function createTickets({ count = 1100, center = new THREE.Vector3(0, 4.5, -30) } = {}) {
  const m = materials();
  const geo = new RoundedBoxGeometry(0.34, 0.22, 0.018, 2, 0.02);
  // a printed ticket face: a header band, a status chip and lines of text
  const c = document.createElement('canvas');
  c.width = 256; c.height = 166;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, 256, 166);
  g.fillStyle = '#1F2632'; g.fillRect(0, 0, 256, 30);
  g.fillStyle = '#F2611D'; g.beginPath(); g.arc(18, 15, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(32, 12, 64, 6);
  g.fillStyle = '#F2611D'; g.fillRect(196, 9, 46, 12);
  g.fillStyle = 'rgba(31,38,50,0.55)';
  [[16, 48, 200], [16, 64, 168], [16, 80, 186], [16, 96, 120]].forEach(([x, y, w]) => g.fillRect(x, y, w, 6));
  g.fillStyle = 'rgba(31,38,50,0.25)';
  [[16, 122, 92], [16, 136, 140]].forEach(([x, y, w]) => g.fillRect(x, y, w, 5));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshPhysicalMaterial({ map: tex, color: '#ffffff', roughness: 0.4, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const root = new THREE.Group();
  root.position.copy(center);
  root.add(mesh);
  const white = new THREE.Color('#ffffff');
  const orange = new THREE.Color('#ffb08a');
  const navy = new THREE.Color('#8f9bb0');

  // the ordered formation: the logo at radius RO, cards stacked in rows across the band
  const RO = 4.2;
  const nodeAngles = [90, -30, 210].map((d) => (d * Math.PI) / 180);
  const items = [];
  const rows = 4;
  const perArc = Math.floor(count * 0.9 / 3 / rows);
  for (let i = 0; i < count; i++) {
    const it = {};
    // storm
    it.r = 2.5 + Math.pow(rand(), 0.6) * 9;
    it.y = (rand() - 0.5) * (3 + it.r * 0.6);
    it.th = rand() * Math.PI * 2;
    it.w = (0.25 + rand() * 0.35) / Math.sqrt(it.r * 0.4);
    it.axis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    it.spin = (rand() - 0.5) * 3;
    it.phase = rand() * 10;
    // order
    const slot = i;
    const arcIdx = slot % 3;
    const k = Math.floor(slot / 3);
    if (k < perArc * rows) {
      const along = (k % perArc) / (perArc - 1);
      const row = Math.floor(k / perArc);
      const a = nodeAngles[arcIdx] - along * (Math.PI / 2) * 0.96;
      const rr = RO + (row - (rows - 1) / 2) * 0.26;
      it.order = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, (row % 2) * 0.03);
      it.orderRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a - Math.PI / 2);
      it.delay = along * 0.55 + arcIdx * 0.08 + row * 0.04;
      it.color = row === 0 || row === rows - 1 ? orange : white;
    } else {
      // the rest gather into the three nodes as dense clusters
      const a = nodeAngles[arcIdx];
      const u = rand() * Math.PI * 2, v = Math.acos(2 * rand() - 1), rr = 0.15 + rand() * 0.45;
      it.order = new THREE.Vector3(Math.cos(a) * RO + rr * Math.sin(v) * Math.cos(u), Math.sin(a) * RO + rr * Math.sin(v) * Math.sin(u), rr * Math.cos(v));
      it.orderRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6, rand() * 6, rand() * 6));
      it.delay = 0.5 + rand() * 0.3;
      it.color = rand() < 0.5 ? orange : navy;
    }
    it.stormColor = rand() < 0.12 ? orange : white;
    it.c = new THREE.Color();
    items.push(it);
  }
  const p = new THREE.Vector3(), tmp = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), mtx = new THREE.Matrix4();
  for (let i = 0; i < count; i++) mesh.setColorAt(i, items[i].stormColor);

  let lastOrder = -1;
  return {
    root, mesh,
    update(t, order) {
      for (let i = 0; i < count; i++) {
        const it = items[i];
        const k = Math.min(1, Math.max(0, (order * 1.7 - it.delay) / 0.6));
        const e = k * k * (3 - 2 * k);
        // storm position
        const th = it.th + t * it.w;
        const wob = Math.sin(t * 0.7 + it.phase) * 0.4;
        p.set(Math.cos(th) * (it.r + wob), it.y + Math.sin(t * 0.5 + it.phase) * 0.5, Math.sin(th) * (it.r + wob) * 0.7);
        q.setFromAxisAngle(it.axis, t * it.spin + it.phase);
        if (e > 0) {
          const breathe = Math.sin(t * 0.8 + it.delay * 9) * 0.03;
          p.lerp(tmp.copy(it.order).multiplyScalar(1 + breathe), e);
          q.slerp(it.orderRot, e);
        }
        mtx.compose(p, q, s);
        mesh.setMatrixAt(i, mtx);
        if (Math.abs(order - lastOrder) > 0.001) { it.c.copy(it.stormColor).lerp(it.color, e); mesh.setColorAt(i, it.c); }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (Math.abs(order - lastOrder) > 0.001) { mesh.instanceColor.needsUpdate = true; lastOrder = order; }
      // the whole formation turns slowly toward the viewer as it orders
      root.rotation.y = (1 - order) * Math.sin(t * 0.1) * 0.3;
      root.rotation.z = -t * 0.02 * order;
    },
  };
}
