// The Elevate mark built as an instrument: three anodised-orange orbit arcs (the logo's geometry:
// each arc starts at a node and runs 90 degrees clockwise, 30-degree gaps), glass nodes with a
// glowing core, machined titanium tick rings, and a cast-glass "E" that the sunrise shines through.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const mats = {};
export function materials() {
  if (mats.orange) return mats;
  mats.orange = new THREE.MeshPhysicalMaterial({ color: '#F2611D', metalness: 0.85, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12, anisotropy: 0.5, anisotropyRotation: Math.PI / 2 });
  mats.titanium = new THREE.MeshPhysicalMaterial({ color: '#8b8f98', metalness: 1, roughness: 0.32, clearcoat: 0.4 });
  mats.graphite = new THREE.MeshPhysicalMaterial({ color: '#1F2632', metalness: 0.6, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  mats.ceramic = new THREE.MeshPhysicalMaterial({ color: '#eef0f3', metalness: 0, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.25, sheen: 0.3 });
  mats.glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.6, ior: 1.5, dispersion: 4, attenuationColor: new THREE.Color('#ffd7bf'), attenuationDistance: 2.4, specularIntensity: 1, envMapIntensity: 1.2 });
  mats.frost = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.32, transmission: 1, thickness: 0.4, ior: 1.45, attenuationColor: new THREE.Color('#ffc8a8'), attenuationDistance: 1.2 });
  mats.core = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.42, 0.14).multiplyScalar(6) });
  mats.coreSoft = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.5, 0.2).multiplyScalar(2.5) });
  return mats;
}

function eShape(w, h, t, mid) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, -h / 2 + t); s.lineTo(-w / 2 + t, -h / 2 + t);
  s.lineTo(-w / 2 + t, -t / 2); s.lineTo(-w / 2 + mid, -t / 2); s.lineTo(-w / 2 + mid, t / 2); s.lineTo(-w / 2 + t, t / 2);
  s.lineTo(-w / 2 + t, h / 2 - t); s.lineTo(w / 2, h / 2 - t); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
  return s;
}

export function createMark() {
  const m = materials();
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const R = 1.5;
  const arcs = [];
  const anchors = [];
  const nodeAngles = [90, -30, 210].map((d) => (d * Math.PI) / 180);
  // each arc is a machined band: an annular sector with round ends, extruded and chamfered
  const band = 0.17;
  const arcShape = (a0) => {
    const sh = new THREE.Shape();
    const a1 = a0 - Math.PI / 2;
    const ro = R + band / 2, ri = R - band / 2;
    sh.absarc(0, 0, ro, a0, a1, true);
    sh.absarc(Math.cos(a1) * R, Math.sin(a1) * R, band / 2, a1, a1 - Math.PI, true);
    sh.absarc(0, 0, ri, a1, a0, false);
    sh.absarc(Math.cos(a0) * R, Math.sin(a0) * R, band / 2, a0 + Math.PI, a0, true);
    return sh;
  };
  const nodeGlass = new THREE.SphereGeometry(0.21, 48, 24);
  const nodeCore = new THREE.SphereGeometry(0.085, 24, 12);
  const collarGeo = new THREE.TorusGeometry(0.21, 0.022, 12, 48);
  const slotGeo = new THREE.BoxGeometry(0.018, band * 0.82, 0.02);
  nodeAngles.forEach((a0, i) => {
    const g = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(arcShape(a0), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.022, bevelSegments: 4, curveSegments: 96 });
    geo.translate(0, 0, -0.05);
    g.add(new THREE.Mesh(geo, m.orange));
    // engraved index slots across the band face, front and back
    for (let f = 0.12; f < 0.92; f += 0.1) {
      const a = a0 - (Math.PI / 2) * f;
      for (const z of [0.081, -0.081]) {
        const sl = new THREE.Mesh(slotGeo, m.graphite);
        sl.position.set(Math.cos(a) * R, Math.sin(a) * R, z);
        sl.rotation.z = a - Math.PI / 2;
        g.add(sl);
      }
    }
    // the node: a glass bead with a hot core and a titanium collar
    const node = new THREE.Group();
    node.position.set(Math.cos(a0) * R, Math.sin(a0) * R, 0);
    node.add(new THREE.Mesh(nodeGlass, m.glass));
    node.add(new THREE.Mesh(nodeCore, m.core));
    const collar = new THREE.Mesh(collarGeo, m.titanium);
    collar.rotation.x = Math.PI / 2;
    node.add(collar);
    g.add(node);
    anchors.push(node);
    spin.add(g);
    arcs.push(g);
  });

  // two machined tick rings, front and back, like the logo's outer fragments
  const tickGeo = new THREE.BoxGeometry(0.028, 0.16, 0.05);
  const ticks = new THREE.InstancedMesh(tickGeo, m.titanium, 220);
  const dummy = new THREE.Object3D();
  let k = 0;
  const sectors = [[0.12, 0.95], [2.25, 3.05], [3.75, 4.55]];
  for (const [s0, s1] of sectors) {
    const n = Math.round((s1 - s0) / 0.04);
    for (let j = 0; j <= n && k < 220; j++) {
      const a = s0 + j * 0.04;
      const major = j % 5 === 0;
      const len = major ? 0.2 : 0.11;
      const r = R + 0.36 + len / 2;
      dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      dummy.rotation.set(0, 0, a - Math.PI / 2);
      dummy.scale.set(1, len / 0.16, 1);
      dummy.updateMatrix();
      ticks.setMatrixAt(k++, dummy.matrix);
    }
  }
  ticks.count = k;
  const dial = new THREE.Group();
  dial.add(ticks);
  // a hairline bearing ring that carries the ticks
  const bearing = new THREE.Mesh(new THREE.TorusGeometry(R + 0.33, 0.012, 8, 220), m.titanium);
  dial.add(bearing);
  root.add(dial);

  // the E, cast in glass, on a graphite spine
  const eGeo = new THREE.ExtrudeGeometry(eShape(0.8, 1.06, 0.23, 0.6), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.035, bevelSegments: 6, curveSegments: 4 });
  eGeo.center();
  const eMesh = new THREE.Mesh(eGeo, m.glass);
  const e = new THREE.Group();
  e.add(eMesh);
  // an inner filament: a thin glowing E inside the glass
  const fGeo = new THREE.ExtrudeGeometry(eShape(0.6, 0.86, 0.04, 0.44), { depth: 0.02, bevelEnabled: false });
  fGeo.center();
  const filament = new THREE.Mesh(fGeo, m.coreSoft);
  e.add(filament);
  root.add(e);

  return {
    root, spin, arcs, dial, e, filament, anchors,
    update(t, open) {
      // a slow orbit; "open" spreads the arcs apart and tilts them like a gyroscope
      spin.rotation.z = -t * 0.12;
      arcs.forEach((g, i) => {
        const a = nodeAngles[i] - Math.PI / 4;
        g.position.set(Math.cos(a) * open * 0.6, Math.sin(a) * open * 0.6, 0);
        g.rotation.set(Math.sin(t * 0.3 + i * 2) * 0.08 + open * (i - 1) * 0.5, Math.cos(t * 0.25 + i) * 0.08 + open * 0.4 * (i % 2 ? 1 : -1), 0);
      });
      dial.rotation.z = t * 0.05;
      dial.rotation.x = Math.sin(t * 0.2) * 0.05 + open * 0.9;
      e.rotation.y = Math.sin(t * 0.35) * 0.35;
      e.rotation.x = Math.sin(t * 0.27) * 0.06;
    },
  };
}

export { RoundedBoxGeometry };
