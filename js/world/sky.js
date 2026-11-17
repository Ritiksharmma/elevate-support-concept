// The dawn sky: a dome painted in Elevate's navy with an orange sun low on the horizon.
// The same dome is baked into the environment map, so every reflective part reflects this sky.
import * as THREE from 'three';

export const NOISE_GLSL = /* glsl */ `
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1,0)), u.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = m * p; a *= 0.5; } return s; }
`;

export const SKY_GLSL = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uTime;
  vec3 skyColor(vec3 d){
    float h = d.y;
    vec3 zenith = vec3(0.010, 0.014, 0.030);
    vec3 upper  = vec3(0.045, 0.045, 0.075);
    vec3 band   = vec3(0.34, 0.15, 0.09);
    vec3 low    = vec3(0.80, 0.32, 0.12);
    float s = max(dot(d, uSunDir), 0.0);
    // warm band hugs the horizon and widens toward the sun
    float spread = mix(0.05, 0.22, pow(s, 4.0));
    vec3 c = mix(band, upper, smoothstep(0.0, spread, h));
    c = mix(c, zenith, smoothstep(spread * 0.8, 0.85, h));
    c = mix(c, low, (1.0 - smoothstep(0.0, 0.06, abs(h))) * (0.35 + 0.65 * pow(s, 2.0)));
    // the sun, its corona and a wide haze
    c += vec3(1.0, 0.40, 0.12) * pow(s, 28.0) * 0.45;
    c += vec3(1.0, 0.52, 0.22) * pow(s, 400.0) * 2.2;
    c += vec3(1.0, 0.80, 0.60) * smoothstep(0.99975, 0.99992, s) * 14.0;
    // high streaks of cloud, lit from below by the sun
    if (h > 0.0) {
      vec2 q = d.xz / (h + 0.08);
      float n = fbm(q * vec2(0.55, 1.6) + vec2(uTime * 0.004, 0.0));
      float streak = smoothstep(0.52, 0.85, n) * smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.25, 0.6, h));
      vec3 lit = mix(vec3(0.20, 0.13, 0.16), vec3(1.0, 0.50, 0.24), pow(s, 2.5));
      c = mix(c, lit, streak * 0.55);
    }
    // below the horizon: the haze fades into the dark sea
    if (h < 0.0) c = mix(c, vec3(0.05, 0.05, 0.08), smoothstep(0.0, 0.25, -h));
    return c;
  }
`;

export function createSky(sunDir) {
  const uniforms = { uSunDir: { value: sunDir }, uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vDir;
      ${NOISE_GLSL}
      ${SKY_GLSL}
      void main(){ gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}

// Bake the sky into a PMREM environment so metals and glass reflect the same dawn.
export function bakeEnvironment(renderer, sunDir) {
  const envScene = new THREE.Scene();
  const { mesh } = createSky(sunDir);
  mesh.scale.setScalar(0.1);
  envScene.add(mesh);
  // a soft warm card low behind the camera so fronts are not black
  const card = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.28, 0.16), side: THREE.DoubleSide }));
  card.position.set(0, 4, 70);
  envScene.add(card);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(envScene, 0.02);
  pmrem.dispose();
  return rt.texture;
}
