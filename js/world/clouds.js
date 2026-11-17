// A sea of cloud at y = 22: three layered sheets. From below they are a dim, warm ceiling;
// passing through them the screen whites out; from above they are lit gold by the low sun.
import * as THREE from 'three';
import { NOISE_GLSL } from './sky.js';

export const CLOUD_Y = 22;

export function createClouds(sunDir) {
  const root = new THREE.Group();
  const sheets = [];
  const uniforms = { uTime: { value: 0 }, uSunDir: { value: sunDir } };
  for (let i = 0; i < 2; i++) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      uniforms: { ...uniforms, uLayer: { value: i } },
      vertexShader: /* glsl */ `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime; uniform vec3 uSunDir; uniform float uLayer;
        varying vec3 vWorld;
        ${NOISE_GLSL}
        void main(){
          vec2 p = vWorld.xz * 0.018 + vec2(uTime * 0.004 + uLayer * 3.7, uLayer * 1.3);
          float n = fbm(p) * 0.68 + vnoise(p * 3.1 + 7.0) * 0.32;
          float d = smoothstep(0.38 - uLayer * 0.03, 0.75, n);
          float dist = length(cameraPosition.xz - vWorld.xz);
          d *= 1.0 - smoothstep(260.0, 520.0, dist);
          bool above = cameraPosition.y > vWorld.y;
          vec3 V = normalize(cameraPosition - vWorld);
          float sunSide = pow(max(dot(-V, uSunDir), 0.0), 6.0);
          vec3 top = mix(vec3(0.16, 0.11, 0.12), vec3(0.62, 0.32, 0.19), smoothstep(0.4, 0.95, n));
          top += vec3(1.0, 0.42, 0.14) * sunSide * 0.55 * smoothstep(0.45, 0.9, n);
          vec3 under = mix(vec3(0.06, 0.05, 0.07), vec3(0.32, 0.17, 0.11), smoothstep(0.4, 0.95, n));
          vec3 col = above ? top : under;
          // near the sheet, fade so the camera can pass through softly
          float near = smoothstep(0.0, 4.0, abs(cameraPosition.y - vWorld.y));
          gl_FragColor = vec4(col, d * (0.55 + 0.45 * near) * 0.97);
        }`,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100, 1, 1).rotateX(-Math.PI / 2), mat);
    mesh.position.y = CLOUD_Y + i * 2.0;
    mesh.renderOrder = 2;
    root.add(mesh);
    sheets.push(mesh);
  }
  return { root, uniforms, sheets };
}
