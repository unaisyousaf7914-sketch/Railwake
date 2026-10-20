type Bus = {
  jump: number;
  land: number;
  slide: number;
  coin: number;
  near: number;
  crash: number;
  combo: number;
  drop: number;
};

export type AudioBus = Bus;

export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let sfx: GainNode | null = null;
  let music: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;
  let nextBeat = 0;
  let step = 0;
  let started = false;

  const scale = [146.83, 174.61, 196, 220, 261.63, 293.66];
  const bass = [0, 0, 3, 0, 4, 3, 0, 5];

  function ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      sfx = ctx.createGain();
      music = ctx.createGain();
      sfx.gain.value = 0.55;
      music.gain.value = 0.16;
      master.gain.value = muted ? 0 : 1;
      sfx.connect(master);
      music.connect(master);
      master.connect(ctx.destination);
      const len = ctx.sampleRate * 1;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function envGain(at: number, peak: number, dur: number): GainNode | null {
    if (!ctx || !sfx) return null;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g.connect(sfx);
    return g;
  }

  function tone(freq: number, dur: number, type: OscillatorType, peak: number, slideTo?: number) {
    const ac = ctx;
    if (!ac) return;
    const at = ac.currentTime;
    const o = ac.createOscillator();
    const g = envGain(at, peak, dur);
    if (!g) return;
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), at + dur);
    o.connect(g);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  function burst(dur: number, peak: number, from: number, to: number) {
    const ac = ctx;
    if (!ac || !noise) return;
    const at = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noise;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, to), at + dur);
    const g = envGain(at, peak, dur);
    if (!g) return;
    src.connect(filter);
    filter.connect(g);
    src.start(at);
    src.stop(at + dur + 0.02);
  }

  function pumpMusic(ramp: number, active: boolean) {
    const ac = ctx;
    if (!ac || !music || !started) return;
    if (!active) return;
    const bpm = 92 + ramp * 46;
    const spb = 60 / bpm / 2;
    let guard = 0;
    while (nextBeat < ac.currentTime + 0.12 && guard++ < 8) {
      const note = bass[step % bass.length];
      const o = ac.createOscillator();
      const g = ac.createGain();
      const at = nextBeat;
      o.type = "triangle";
      o.frequency.setValueAtTime(scale[note] / (step % 8 === 4 ? 1 : 2), at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + spb * 0.9);
      o.connect(g);
      g.connect(music);
      o.start(at);
      o.stop(at + spb);
      if (step % 2 === 1 && noise) {
        const src = ac.createBufferSource();
        src.buffer = noise;
        const hg = ac.createGain();
        const hf = ac.createBiquadFilter();
        hf.type = "highpass";
        hf.frequency.value = 1800;
        hg.gain.setValueAtTime(0.04, at);
        hg.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
        src.connect(hf);
        hf.connect(hg);
        hg.connect(music);
        src.start(at);
        src.stop(at + 0.06);
      }
      nextBeat += spb;
      step++;
    }
  }

  return {
    unlock() {
      const ac = ensure();
      if (!ac) return;
      if (!started) {
        started = true;
        nextBeat = ac.currentTime + 0.05;
      }
    },
    setMuted(next: boolean) {
      muted = next;
      if (master && ctx) {
        master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
      }
    },
    resume() {
      if (ctx && ctx.state === "suspended") void ctx.resume();
    },
    play(bus: Bus, ramp: number, active: boolean) {
      if (!ctx) return;
      if (bus.jump) tone(520 + Math.random() * 40, 0.12, "square", 0.08, 760);
      if (bus.land) burst(0.1, 0.18, 420, 140);
      if (bus.slide) burst(0.16, 0.1, 900, 300);
      const coins = Math.min(3, bus.coin);
      for (let i = 0; i < coins; i++) {
        tone(660 + i * 40, 0.09, "triangle", 0.07, 990);
      }
      if (bus.near) tone(880, 0.07, "sine", 0.05, 1320);
      if (bus.combo) {
        tone(523, 0.08, "square", 0.05);
        tone(659, 0.1, "square", 0.05);
      }
      if (bus.drop) tone(220, 0.16, "sawtooth", 0.04, 110);
      if (bus.crash) {
        burst(0.4, 0.4, 800, 90);
        tone(180, 0.35, "sine", 0.2, 50);
      }
      bus.jump = 0;
      bus.land = 0;
      bus.slide = 0;
      bus.coin = 0;
      bus.near = 0;
      bus.crash = 0;
      bus.combo = 0;
      bus.drop = 0;
      pumpMusic(ramp, active);
    },
  };
}
