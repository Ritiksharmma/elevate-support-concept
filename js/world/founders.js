// The founders: two portrait plaques floating above the cloud, framed in titanium with an orange
// edge, like the rest of the instruments. The photos are the founders' own, from Elevate's site.
import * as THREE from 'three';
import { materials } from './mark.js';

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, h / 2 - r); s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, h / 2); s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -h / 2 + r); s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function plaque(url, renderer, m) {
  const W = 1.3, H = 1.625, R = 0.08;
  const g = new THREE.Group();
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // the print: a rounded photo face; uv mapped from the shape's own coordinates
  const face = new THREE.ShapeGeometry(roundedRect(W, H, R), 8);
  const uv = face.attributes.uv, pos = face.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
  const photo = new THREE.MeshPhysicalMaterial({
    map: tex, emissiveMap: tex, emissive: new THREE.Color('#fff1e6'), emissiveIntensity: 0.62,
    roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.12, envMapIntensity: 0.5,
  });
  const print = new THREE.Mesh(face, photo);
  print.position.z = 0.032;
  g.add(print);
  // titanium frame: a rounded slab slightly larger than the print
  const frameShape = roundedRect(W + 0.12, H + 0.12, R + 0.05);
  frameShape.holes.push(roundedRect(W - 0.02, H - 0.02, R));
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 6 }), m.titanium);
  frame.position.z = -0.005;
  g.add(frame);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(W + 0.1, H + 0.1, R + 0.05), 6), m.graphite);
  back.rotation.y = Math.PI;
  back.position.z = -0.01;
  g.add(back);
  // an orange edge strip along the bottom, and a node bead, as on the logo
  const strip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.62, 0.035, 0.03), m.orange);
  strip.position.set(-W * 0.19 + 0.02, -H / 2 - 0.12, 0.02);
  g.add(strip);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 10), m.core);
  bead.position.set(W * 0.17, -H / 2 - 0.12, 0.02);
  g.add(bead);
  const anchor = new THREE.Object3D();
  anchor.position.set(-W / 2 + 0.02, -H / 2 - 0.12, 0.02);
  g.add(anchor);
  return { g, anchor };
}

export function createFounders(renderer) {
  const m = materials();
  const root = new THREE.Group();
  const hemant = plaque('assets/media/founder-hemant.webp', renderer, m);
  const fabio = plaque('assets/media/founder-fabio.webp', renderer, m);
  root.add(hemant.g, fabio.g);
  return {
    root,
    anchors: [hemant.anchor, fabio.anchor],
    layout(mobile) {
      const gap = mobile ? 0.82 : 0.88;
      hemant.g.position.set(-gap, 0, 0);
      fabio.g.position.set(gap, -0.12, -0.25);
      root.scale.setScalar(mobile ? 0.5 : 1);
    },
    update(t) {
      hemant.g.rotation.set(Math.sin(t * 0.4) * 0.03, 0.16 + Math.sin(t * 0.3) * 0.05, 0.015);
      fabio.g.rotation.set(Math.sin(t * 0.35 + 1) * 0.03, -0.12 + Math.sin(t * 0.27 + 2) * 0.05, -0.02);
      hemant.g.position.y = Math.sin(t * 0.6) * 0.05;
      fabio.g.position.y = -0.12 + Math.sin(t * 0.55 + 1.3) * 0.05;
    },
  };
}
