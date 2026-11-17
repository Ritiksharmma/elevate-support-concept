// The ELEVATE paperback in 3D, wrapped in its real cover: back, spine and front from one image.
import * as THREE from 'three';

function pageEdges() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#efe9df';
  g.fillRect(0, 0, 512, 64);
  for (let y = 0; y < 64; y += 2) {
    g.fillStyle = `rgba(120,100,80,${0.06 + Math.random() * 0.08})`;
    g.fillRect(0, y, 512, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createBook(renderer) {
  const W = 1.5, H = W / 0.766, T = 0.1;
  const geo = new THREE.BoxGeometry(W, H, T);
  const uv = geo.attributes.uv;
  const SPINE0 = 0.4906, SPINE1 = 0.5094;
  // face order in BoxGeometry: +x, -x, +y, -y, +z, -z (4 vertices each)
  const remap = (face, u0, u1) => { for (let i = face * 4; i < face * 4 + 4; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0)); };
  remap(1, SPINE0, SPINE1);
  remap(4, SPINE1, 1);
  remap(5, 0, SPINE0);
  uv.needsUpdate = true;
  const tex = new THREE.TextureLoader().load('assets/media/book-cover.webp');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const cover = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.35, envMapIntensity: 0.7 });
  const edges = new THREE.MeshStandardMaterial({ map: pageEdges(), roughness: 0.85 });
  const mesh = new THREE.Mesh(geo, [edges, cover, edges, edges, cover, cover]);
  const root = new THREE.Group();
  root.add(mesh);
  return {
    root, mesh,
    update(t, turn) {
      mesh.rotation.y = -0.45 + turn * Math.PI * 1.1 + Math.sin(t * 0.4) * 0.06;
      mesh.rotation.x = Math.sin(t * 0.3) * 0.05 - 0.05;
      mesh.rotation.z = Math.sin(t * 0.25) * 0.04;
      mesh.position.y = Math.sin(t * 0.6) * 0.06;
    },
  };
}
