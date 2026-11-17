// Still water at dawn: a real mirror (Reflector) broken by slow ripples, a sun path of glitter,
// and haze that thickens toward the horizon. On phones it falls back to sky colour without the mirror.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { NOISE_GLSL, SKY_GLSL } from './sky.js';

const vertexShader = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vUvR;
  varying vec3 vWorld;
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vUvR = textureMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const fragmentShader = (mirror) => /* glsl */ `
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform vec3 color;
  uniform vec3 uHaze;
  uniform float uFogDensity;
  varying vec4 vUvR;
  varying vec3 vWorld;
  ${NOISE_GLSL}
  ${SKY_GLSL}
  float waves(vec2 p){
    float t = uTime;
    float h = 0.0;
    h += sin(dot(p, vec2(0.62, 0.78)) * 0.55 + t * 0.42) * 0.55;
    h += sin(dot(p, vec2(-0.85, 0.52)) * 0.9 + t * 0.55) * 0.3;
    h += sin(dot(p, vec2(0.21, -0.97)) * 1.7 + t * 0.8) * 0.14;
    h += sin(dot(p, vec2(0.95, 0.3)) * 2.9 - t * 1.1) * 0.07;
    h += sin(dot(p, vec2(-0.4, -0.9)) * 4.3 + t * 1.4) * 0.035;
    h += (vnoise(p * 0.7 + vec2(t * 0.05, t * 0.03)) - 0.5) * 0.32 + (vnoise(p * 1.9 - vec2(t * 0.04, 0.0)) - 0.5) * 0.16;
    return h;
  }
  void main(){
    vec2 p = vWorld.xz;
    float e = 0.06;
    float h0 = waves(p);
    vec3 n = normalize(vec3(-(waves(p + vec2(e, 0.0)) - h0) / e * 0.06, 1.0, -(waves(p + vec2(0.0, e)) - h0) / e * 0.06));
    vec3 V = normalize(cameraPosition - vWorld);
    float dist = length(cameraPosition - vWorld);
    // calm the ripples with distance so the far water reads as glass
    n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(10.0, 140.0, dist)));
    vec3 R = reflect(-V, n);
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(V, n), 0.0), 5.0);
    vec3 refl = skyColor(normalize(vec3(R.x, abs(R.y), R.z)));
    ${mirror ? `
    vec4 uv = vUvR;
    uv.xy += n.xz * 0.22 * uv.w * (1.0 - smoothstep(20.0, 160.0, dist));
    vec2 st = uv.xy / uv.w;
    float inside = smoothstep(0.0, 0.12, st.x) * smoothstep(1.0, 0.88, st.x) * smoothstep(0.0, 0.08, st.y) * smoothstep(1.0, 0.92, st.y);
    vec4 m = texture2D(tDiffuse, clamp(st, 0.001, 0.999));
    refl = mix(refl, m.rgb, clamp(m.a, 0.0, 1.0) * inside);` : ''}
    vec3 deep = vec3(0.012, 0.016, 0.03);
    vec3 col = mix(deep, refl, clamp(fres * 1.15 + 0.1, 0.0, 1.0));
    // glitter along the sun path
    float g = pow(max(dot(R, uSunDir), 0.0), 900.0);
    float sparkle = smoothstep(0.55, 1.0, vnoise(p * 9.0 + uTime * 0.6));
    col += vec3(1.0, 0.6, 0.3) * g * (6.0 + sparkle * 30.0);
    // haze toward the horizon
    float fog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    col = mix(col, uHaze, fog);
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createWater({ sunDir, haze, mobile }) {
  // the plane is rotated as an object (not baked into the geometry): Reflector takes its mirror normal from the object's +Z
  const geo = new THREE.PlaneGeometry(1600, 1600);
  const uniforms = {
    tDiffuse: { value: null },
    color: { value: new THREE.Color(0xffffff) },
    textureMatrix: { value: new THREE.Matrix4() },
    uSunDir: { value: sunDir },
    uTime: { value: 0 },
    uHaze: { value: haze },
    uFogDensity: { value: 0.0065 },
  };
  if (!mobile) {
    const water = new Reflector(geo, {
      textureWidth: Math.round(window.innerWidth * 0.5),
      textureHeight: Math.round(window.innerHeight * 0.5),
      clipBias: 0.003,
      multisample: 0,
      shader: { name: 'ElevateWater', uniforms, vertexShader, fragmentShader: fragmentShader(true) },
    });
    // share the live uniforms (Reflector clones them)
    water.rotation.x = -Math.PI / 2;
    const u = water.material.uniforms;
    u.uSunDir.value = sunDir; u.uHaze.value = haze;
    return { mesh: water, uniforms: u, resize(w, h) { water.getRenderTarget().setSize(Math.round(w * 0.5), Math.round(h * 0.5)); } };
  }
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader: fragmentShader(false) });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, uniforms, resize() {} };
}
