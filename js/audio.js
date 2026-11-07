// Small synthesised soundscape (no audio files): soft wind, a few pentatonic chimes, short action sounds.

let ctx = null;
let master = null;
let windGain = null;
let enabled = true;
let chimeTimer = null;

function ensure() {
  if (ctx || !enabled) {
    return Boolean(ctx);
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return false;
  }
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  // wind: filtered noise with a slow swell
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.2;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  windGain = ctx.createGain();
  windGain.gain.value = 0.16;
  noise.connect(filter).connect(windGain).connect(master);
  noise.start();
  scheduleChime();
  return true;
}

const SCALE = [392, 440, 523.25, 587.33, 659.25, 783.99];
function tone(freq, { time = 0, dur = 0.6, type = 'sine', vol = 0.12 } = {}) {
  if (!ctx || !enabled) {
    return;
  }
  const start = ctx.currentTime + time;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}
function scheduleChime() {
  clearTimeout(chimeTimer);
  chimeTimer = setTimeout(() => {
    if (ctx && enabled && document.visibilityState === 'visible') {
      const base = SCALE[Math.floor(Math.random() * SCALE.length)];
      tone(base, { dur: 2.2, vol: 0.05 });
      tone(base * 1.5, { time: 0.25, dur: 1.8, vol: 0.03 });
    }
    scheduleChime();
  }, 9000 + Math.random() * 12000);
}

export const audio = {
  unlock() {
    if (ensure() && ctx.state === 'suspended') {
      ctx.resume();
    }
  },
  setEnabled(value) {
    enabled = value;
    if (master) {
      master.gain.value = value ? 0.5 : 0;
    }
    if (value) {
      this.unlock();
    }
  },
  setRain(raining) {
    if (windGain && ctx) {
      windGain.gain.setTargetAtTime(raining ? 0.32 : 0.16, ctx.currentTime, 1.5);
    }
  },
  play(name) {
    if (!ctx || !enabled) {
      return;
    }
    if (name === 'chop') {
      tone(180, { dur: 0.12, type: 'triangle', vol: 0.18 });
      tone(140, { time: 0.08, dur: 0.12, type: 'triangle', vol: 0.12 });
    } else if (name === 'pick') {
      tone(660, { dur: 0.18, vol: 0.1 });
      tone(880, { time: 0.07, dur: 0.2, vol: 0.08 });
    } else if (name === 'craft') {
      tone(523.25, { dur: 0.25, type: 'triangle', vol: 0.1 });
      tone(659.25, { time: 0.1, dur: 0.3, type: 'triangle', vol: 0.1 });
    } else if (name === 'coin') {
      tone(987.77, { dur: 0.12, vol: 0.08 });
      tone(1318.5, { time: 0.08, dur: 0.25, vol: 0.07 });
    } else if (name === 'success') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { time: i * 0.1, dur: 0.5, vol: 0.08 }));
    } else if (name === 'water') {
      tone(300, { dur: 0.3, type: 'sine', vol: 0.06 });
      tone(420, { time: 0.1, dur: 0.3, type: 'sine', vol: 0.05 });
    } else if (name === 'miss') {
      tone(330, { dur: 0.25, type: 'triangle', vol: 0.08 });
      tone(247, { time: 0.12, dur: 0.3, type: 'triangle', vol: 0.08 });
    }
  },
};
