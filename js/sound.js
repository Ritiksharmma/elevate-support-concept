// Ambient sound, made in the browser (no files): wind over water and a low warm chord.
// Off until the visitor turns it on; the wind opens up as the camera rises.
export function createSound() {
  let ctx = null, master, wind, windGain, pad, padGain;
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // wind: looping noise through a slowly moving band-pass
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    wind = ctx.createBiquadFilter();
    wind.type = 'bandpass'; wind.frequency.value = 380; wind.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 160;
    lfo.connect(lfoAmt).connect(wind.frequency);
    src.connect(wind).connect(windGain).connect(master);
    // pad: A, E, A, C-sharp, softly detuned, through a low-pass
    pad = ctx.createBiquadFilter();
    pad.type = 'lowpass'; pad.frequency.value = 520; pad.Q.value = 0.4;
    padGain = ctx.createGain(); padGain.gain.value = 0.14;
    [110, 164.81, 220.4, 277.18].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f; o.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain(); g.gain.value = [0.5, 0.25, 0.22, 0.12][i];
      const trem = ctx.createOscillator(); trem.frequency.value = 0.05 + i * 0.03;
      const tAmt = ctx.createGain(); tAmt.gain.value = 0.08;
      trem.connect(tAmt).connect(g.gain);
      o.connect(g).connect(pad);
      o.start(); trem.start();
    });
    pad.connect(padGain).connect(master);
    src.start(); lfo.start();
  }
  let on = false;
  return {
    get on() { return on; },
    async toggle() {
      if (!ctx) build();
      on = !on;
      if (on) await ctx.resume();
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(on ? 0.22 : 0, now, on ? 0.8 : 0.25);
      if (!on) setTimeout(() => { if (!on) ctx.suspend(); }, 1200);
      return on;
    },
    altitude(y) {
      if (!ctx || !on) return;
      const k = Math.min(1, Math.max(0, (y - 2) / 30));
      wind.frequency.setTargetAtTime(380 + k * 900, ctx.currentTime, 0.5);
      windGain.gain.setTargetAtTime(0.45 + k * 0.35, ctx.currentTime, 0.5);
      pad.frequency.setTargetAtTime(520 + k * 1400, ctx.currentTime, 0.8);
    },
    pause() { if (ctx && on) ctx.suspend(); },
    resume() { if (ctx && on) ctx.resume(); },
  };
}
