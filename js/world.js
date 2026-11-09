// The 3D world: floating islands, bridges, gathering nodes, machines, villagers, the pet, sky and weather.
// Everything is built from low-poly primitives at start-up, so there are no model downloads.

import * as THREE from '../vendor/three.module.min.js';
import { ISLANDS, BRIDGES, FIXTURES, NODE_SPOTS, NPCS, ITEMS, CROPS, SMOG_SPOTS, CRITTERS } from './data.js';
import { SPECIES } from './farskies.js';

const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((sp) => [sp.id, sp]));
import { makeCharacter, applyLook, animateCharacter } from './character.js';
import { sanitizeLook } from './look.js';
import {
  mulberry32, bridgeSegment, unlocked, nodeReady, timeOfDay, daylight, isRaining, projectDone, cropProgress,
  energyCapacity, smogCleared, critterRescued, skyClarity,
} from './state.js';

const materialCache = new Map();
const HAZE = new THREE.Color('#a49d8c');
const SKY_TOP = new THREE.Color('#3f7fb8');
const SKY_NIGHT = new THREE.Color('#14243f');
const CLOUD_WHITE = new THREE.Color('#f6f8f8');
function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.92, metalness: 0, ...extra }));
  }
  return materialCache.get(key);
}
function mesh(geometry, color, extra) {
  const m = new THREE.Mesh(geometry, mat(color, extra));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function at(object, x, y, z) {
  object.position.set(x, y, z);
  return object;
}

// ---------- people ----------
// Realistic, customisable people live in character.js; a bare colour (old saves, old friends) becomes a look.
export function makePerson(lookOrColor) {
  const look = typeof lookOrColor === 'string' ? sanitizeLook(null, lookOrColor) : sanitizeLook(lookOrColor);
  return makeCharacter(look);
}
export function setHat(person, hatId) {
  const slot = person.userData.hat;
  slot.clear();
  if (hatId === 'hat_straw') {
    slot.add(at(mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.05, 16), '#dcc07a'), 0, 0, 0));
    slot.add(at(mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.22, 12), '#d2b46a'), 0, 0.12, 0));
  } else if (hatId === 'hat_cap') {
    slot.add(at(mesh(new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#3f6f8a'), 0, -0.06, 0));
    slot.add(at(mesh(new THREE.BoxGeometry(0.34, 0.03, 0.24), '#35607a'), 0, -0.05, 0.28));
  } else if (hatId === 'hat_crown') {
    const colors = ['#e39a7a', '#f1d27a', '#f4f0e6', '#c0583a'];
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2;
      slot.add(at(mesh(new THREE.IcosahedronGeometry(0.07, 0), colors[i % colors.length]), Math.sin(a) * 0.26, -0.08, Math.cos(a) * 0.26));
    }
  }
}
function animatePerson(person, moving, dt, speed = 1, action = 0) {
  animateCharacter(person, moving, dt, speed, action);
}

function makePet() {
  const g = new THREE.Group();
  const body = at(mesh(new THREE.SphereGeometry(0.28, 12, 9), '#d98a4a'), 0, 0.32, 0);
  body.scale.set(1, 0.9, 1.2);
  const belly = at(mesh(new THREE.SphereGeometry(0.2, 10, 8), '#f4ead8'), 0, 0.26, 0.14);
  const head = at(mesh(new THREE.SphereGeometry(0.2, 12, 9), '#d98a4a'), 0, 0.58, 0.2);
  const earGeo = new THREE.ConeGeometry(0.07, 0.16, 4);
  const earL = at(mesh(earGeo, '#b86c33'), -0.11, 0.76, 0.18);
  const earR = at(mesh(earGeo, '#b86c33'), 0.11, 0.76, 0.18);
  const tail = at(mesh(new THREE.ConeGeometry(0.1, 0.42, 6), '#f4ead8'), 0, 0.42, -0.36);
  tail.rotation.x = -1.0;
  const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
  const eyeL = at(mesh(eyeGeo, '#1d1d1b'), -0.07, 0.62, 0.38);
  const eyeR = at(mesh(eyeGeo, '#1d1d1b'), 0.07, 0.62, 0.38);
  g.add(body, belly, head, earL, earR, tail, eyeL, eyeR);
  g.userData = { tail, phase: 0 };
  return g;
}

// ---------- clean skies: smog heaps, rescued animals and island blooms ----------

// Far Skies animals: one parametric model per body plan, coloured by morph.
function makeAnimal(def) {
  const g = new THREE.Group();
  const sp = SPECIES_BY_ID[def.species];
  const c = def.color;
  const a = def.accent;
  const s = sp.size;
  const eyeGeo = new THREE.SphereGeometry(0.03 * s + 0.008, 6, 6);
  if (sp.shape === 'bird') {
    const body = at(mesh(new THREE.SphereGeometry(0.24 * s, 10, 8), c), 0, 0.32 * s, 0);
    body.scale.set(1, sp.flat ? 0.75 : 1.05, sp.flat ? 1.35 : 1);
    const head = at(mesh(new THREE.SphereGeometry(0.15 * s, 10, 8), c), 0, 0.6 * s, sp.flat ? 0.22 * s : 0.05 * s);
    const beak = at(mesh(new THREE.ConeGeometry(0.05 * s, (sp.flat ? 0.16 : 0.1) * s, 5), sp.beak), 0, 0.58 * s, (sp.flat ? 0.38 : 0.2) * s);
    beak.rotation.x = Math.PI / 2;
    if (sp.flat) {
      beak.scale.set(1.4, 1, 0.5);
    }
    const wingGeo = new THREE.SphereGeometry(0.13 * s, 8, 6);
    const wingL = at(mesh(wingGeo, a), -0.2 * s, 0.34 * s, -0.02);
    const wingR = at(mesh(wingGeo, a), 0.2 * s, 0.34 * s, -0.02);
    wingL.scale.set(0.45, 0.9, 1.4);
    wingR.scale.set(0.45, 0.9, 1.4);
    g.add(body, head, beak, wingL, wingR);
    if (sp.tufts) {
      const tuftGeo = new THREE.ConeGeometry(0.04 * s, 0.12 * s, 4);
      g.add(at(mesh(tuftGeo, a), -0.08 * s, 0.75 * s, 0.03), at(mesh(tuftGeo, a), 0.08 * s, 0.75 * s, 0.03));
    }
    if (sp.crest) {
      const crest = at(mesh(new THREE.ConeGeometry(0.05 * s, 0.18 * s, 4), a), 0, 0.78 * s, 0);
      crest.rotation.x = -0.4;
      g.add(crest);
    }
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.14 * s, 5);
    g.add(at(mesh(legGeo, sp.beak), -0.07 * s, 0.07 * s, 0), at(mesh(legGeo, sp.beak), 0.07 * s, 0.07 * s, 0));
    const ez = (sp.flat ? 0.33 : 0.17) * s;
    g.add(at(mesh(eyeGeo, '#1d1d1b'), -0.07 * s, 0.64 * s, ez), at(mesh(eyeGeo, '#1d1d1b'), 0.07 * s, 0.64 * s, ez));
    return g;
  }
  if (sp.shape === 'frog') {
    const body = at(mesh(new THREE.SphereGeometry(0.25 * s, 10, 8), c), 0, 0.16 * s, 0);
    body.scale.set(1.2, 0.7, 1);
    const eyeBall = new THREE.SphereGeometry(0.08 * s, 8, 6);
    g.add(body, at(mesh(eyeBall, c), -0.12 * s, 0.32 * s, 0.12 * s), at(mesh(eyeBall, c), 0.12 * s, 0.32 * s, 0.12 * s));
    g.add(at(mesh(eyeGeo, '#1d1d1b'), -0.12 * s, 0.35 * s, 0.18 * s), at(mesh(eyeGeo, '#1d1d1b'), 0.12 * s, 0.35 * s, 0.18 * s));
    const legGeo = new THREE.SphereGeometry(0.09 * s, 6, 5);
    [[-0.22, -0.1], [0.22, -0.1], [-0.16, 0.16], [0.16, 0.16]].forEach(([x, z]) => {
      const leg = at(mesh(legGeo, a), x * s, 0.06 * s, z * s);
      leg.scale.set(1.3, 0.5, 1.2);
      g.add(leg);
    });
    return g;
  }
  // four-legged
  const h = sp.low ? 0.22 : sp.slim ? 0.42 : 0.34;
  const bodyGeo = sp.wool ? new THREE.IcosahedronGeometry(0.32 * s, 1) : new THREE.SphereGeometry(0.26 * s, 10, 8);
  const body = at(mesh(bodyGeo, sp.wool ? '#f1ede4' : c), 0, h * s + 0.12 * s, 0);
  body.scale.set(sp.slim ? 0.8 : 1, sp.low ? 0.75 : 0.9, sp.low ? 1.7 : 1.35);
  const head = at(mesh(new THREE.SphereGeometry(0.17 * s, 10, 8), c), 0, (h + 0.32) * s, 0.36 * s);
  g.add(body, head);
  const legGeo = new THREE.CylinderGeometry(0.045 * s, 0.04 * s, h * s + 0.06, 6);
  [[-0.13, -0.2], [0.13, -0.2], [-0.13, 0.2], [0.13, 0.2]].forEach(([x, z]) => g.add(at(mesh(legGeo, a), x * s, (h * s + 0.06) / 2, z * s)));
  const earY = (h + 0.47) * s;
  if (sp.ears === 'long') {
    const earGeo = new THREE.CylinderGeometry(0.035 * s, 0.05 * s, 0.32 * s, 6);
    g.add(at(mesh(earGeo, c), -0.07 * s, earY + 0.1 * s, 0.33 * s), at(mesh(earGeo, c), 0.07 * s, earY + 0.1 * s, 0.33 * s));
  } else if (sp.ears === 'point') {
    const earGeo = new THREE.ConeGeometry(0.06 * s, 0.13 * s, 4);
    g.add(at(mesh(earGeo, c), -0.09 * s, earY, 0.34 * s), at(mesh(earGeo, c), 0.09 * s, earY, 0.34 * s));
  } else if (sp.ears === 'flop') {
    const earGeo = new THREE.BoxGeometry(0.14 * s, 0.04 * s, 0.08 * s);
    g.add(at(mesh(earGeo, a), -0.18 * s, (h + 0.36) * s, 0.36 * s), at(mesh(earGeo, a), 0.18 * s, (h + 0.36) * s, 0.36 * s));
  } else {
    const earGeo = new THREE.SphereGeometry(0.05 * s, 6, 5);
    g.add(at(mesh(earGeo, a), -0.11 * s, earY - 0.04 * s, 0.34 * s), at(mesh(earGeo, a), 0.11 * s, earY - 0.04 * s, 0.34 * s));
  }
  if (sp.horns) {
    const hornGeo = new THREE.TorusGeometry(0.12 * s, 0.025 * s, 5, 10, Math.PI);
    const horns = at(mesh(hornGeo, '#d8d0bc'), 0, (h + 0.45) * s, 0.36 * s);
    g.add(horns);
  }
  if (sp.wool) {
    g.add(at(mesh(new THREE.IcosahedronGeometry(0.12 * s, 1), '#f1ede4'), 0, (h + 0.46) * s, 0.33 * s));
  }
  if (sp.spikes) {
    const spikeGeo = new THREE.ConeGeometry(0.03 * s, 0.14 * s, 4);
    for (let i = 0; i < 12; i += 1) {
      const ang = (i / 12) * Math.PI;
      const spike = at(mesh(spikeGeo, a), Math.cos(ang) * 0.2 * s, (h + 0.12) * s + Math.sin(ang) * 0.2 * s, -0.05 * s + (i % 3) * 0.08 * s);
      spike.rotation.z = ang - Math.PI / 2;
      g.add(spike);
    }
  }
  if (sp.tail === 'long' || sp.tail === 'thin') {
    const tail = at(mesh(new THREE.CylinderGeometry(0.025 * s, 0.04 * s, 0.35 * s, 5), sp.tail === 'thin' ? a : c), 0, (h + 0.2) * s, -0.42 * s);
    tail.rotation.x = -0.9;
    g.add(tail);
  } else if (sp.tail === 'bushy') {
    const tail = at(mesh(new THREE.SphereGeometry(0.15 * s, 8, 6), c), 0, (h + 0.32) * s, -0.36 * s);
    tail.scale.set(0.8, 1.6, 0.8);
    g.add(tail);
  } else if (sp.tail === 'puff') {
    g.add(at(mesh(new THREE.SphereGeometry(0.07 * s, 6, 5), '#f1ede4'), 0, (h + 0.16) * s, -0.36 * s));
  }
  g.add(at(mesh(eyeGeo, '#1d1d1b'), -0.07 * s, (h + 0.36) * s, 0.5 * s), at(mesh(eyeGeo, '#1d1d1b'), 0.07 * s, (h + 0.36) * s, 0.5 * s));
  g.add(at(mesh(new THREE.SphereGeometry(0.03 * s, 6, 5), '#2a2420'), 0, (h + 0.3) * s, 0.53 * s));
  return g;
}
export function makeCritter(type, def = null) {
  if (def && def.species) {
    return makeAnimal(def);
  }
  const g = new THREE.Group();
  if (type === 'hen') {
    const body = at(mesh(new THREE.SphereGeometry(0.22, 10, 8), '#f4f0e6'), 0, 0.3, 0);
    body.scale.set(1, 0.9, 1.25);
    const head = at(mesh(new THREE.SphereGeometry(0.13, 10, 8), '#f4f0e6'), 0, 0.53, 0.18);
    const comb = at(mesh(new THREE.BoxGeometry(0.04, 0.09, 0.12), '#c0583a'), 0, 0.67, 0.17);
    const beak = at(mesh(new THREE.ConeGeometry(0.04, 0.1, 5), '#d9a21b'), 0, 0.52, 0.33);
    beak.rotation.x = Math.PI / 2;
    const tail = at(mesh(new THREE.ConeGeometry(0.1, 0.22, 5), '#e8e2d4'), 0, 0.42, -0.25);
    tail.rotation.x = -0.9;
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.16, 5);
    g.add(body, head, comb, beak, tail, at(mesh(legGeo, '#d9a21b'), -0.07, 0.08, 0), at(mesh(legGeo, '#d9a21b'), 0.07, 0.08, 0));
    const eyeGeo = new THREE.SphereGeometry(0.022, 6, 6);
    g.add(at(mesh(eyeGeo, '#1d1d1b'), -0.07, 0.56, 0.28), at(mesh(eyeGeo, '#1d1d1b'), 0.07, 0.56, 0.28));
  } else if (type === 'goat') {
    const body = at(mesh(new THREE.BoxGeometry(0.42, 0.34, 0.7), '#ece6d6'), 0, 0.5, 0);
    const head = at(mesh(new THREE.BoxGeometry(0.24, 0.26, 0.3), '#ece6d6'), 0, 0.72, 0.42);
    const nose = at(mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), '#b9a58a'), 0, 0.66, 0.6);
    const hornGeo = new THREE.ConeGeometry(0.04, 0.2, 5);
    const hornL = at(mesh(hornGeo, '#8c7a5a'), -0.08, 0.92, 0.36);
    const hornR = at(mesh(hornGeo, '#8c7a5a'), 0.08, 0.92, 0.36);
    hornL.rotation.x = -0.5;
    hornR.rotation.x = -0.5;
    const beard = at(mesh(new THREE.ConeGeometry(0.04, 0.12, 5), '#d8d0bc'), 0, 0.55, 0.58);
    beard.rotation.x = Math.PI;
    const legGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.34, 6);
    g.add(body, head, nose, hornL, hornR, beard);
    [[-0.14, -0.24], [0.14, -0.24], [-0.14, 0.24], [0.14, 0.24]].forEach(([x, z]) => g.add(at(mesh(legGeo, '#6b5a48'), x, 0.17, z)));
    const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
    g.add(at(mesh(eyeGeo, '#1d1d1b'), -0.1, 0.78, 0.57), at(mesh(eyeGeo, '#1d1d1b'), 0.1, 0.78, 0.57));
  } else {
    const shell = at(mesh(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#5f7d3f'), 0, 0.1, 0);
    shell.scale.y = 0.75;
    const rim = at(mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 14), '#7f6a45'), 0, 0.1, 0);
    const moss = at(mesh(new THREE.SphereGeometry(0.12, 8, 6), '#8db36f'), 0.06, 0.32, -0.04);
    moss.scale.y = 0.5;
    const head = at(mesh(new THREE.SphereGeometry(0.1, 8, 7), '#9aae72'), 0, 0.14, 0.4);
    const legGeo = new THREE.SphereGeometry(0.07, 6, 5);
    g.add(shell, rim, moss, head);
    [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]].forEach(([x, z]) => g.add(at(mesh(legGeo, '#9aae72'), x, 0.05, z)));
    const eyeGeo = new THREE.SphereGeometry(0.018, 6, 6);
    g.add(at(mesh(eyeGeo, '#1d1d1b'), -0.05, 0.18, 0.48), at(mesh(eyeGeo, '#1d1d1b'), 0.05, 0.18, 0.48));
  }
  g.userData.type = type;
  return g;
}
function makeFlower(rng) {
  const g = new THREE.Group();
  const colors = ['#e3b021', '#f4f0e6', '#e39a7a', '#c0583a', '#f1d27a'];
  const h = 0.16 + rng() * 0.16;
  g.add(at(mesh(new THREE.CylinderGeometry(0.015, 0.015, h, 4), '#4f8a2e'), 0, h / 2, 0));
  g.add(at(mesh(new THREE.IcosahedronGeometry(0.06 + rng() * 0.03, 0), colors[Math.floor(rng() * colors.length)]), 0, h + 0.03, 0));
  return g;
}
function makeSmogHeap(rng, critter) {
  const g = new THREE.Group();
  const heap = new THREE.Group();
  const junk = ['#5d5a52', '#6b5f50', '#4a4844', '#7a6a58'];
  for (let i = 0; i < 6; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = rng() * 0.5;
    heap.add(at(mesh(jitter(new THREE.DodecahedronGeometry(0.26 + rng() * 0.2, 0), rng, 0.08, false), junk[i % junk.length]), Math.sin(a) * d, 0.18 + rng() * 0.22, Math.cos(a) * d));
  }
  const barrel = at(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 10), '#8a5a3c'), 0.5, 0.2, -0.2);
  barrel.rotation.z = 1.2;
  const pipe = at(mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12, Math.PI), '#6f6a62'), -0.45, 0.22, 0.3);
  const stain = at(new THREE.Mesh(new THREE.CircleGeometry(1.15, 20), new THREE.MeshStandardMaterial({ color: '#6e6a5e', roughness: 1, transparent: true, opacity: 0.8 })), 0, 0.025, 0);
  stain.rotation.x = -Math.PI / 2;
  stain.receiveShadow = true;
  heap.add(barrel, pipe, stain);
  const haze = new THREE.Group();
  const hazeMat = new THREE.MeshStandardMaterial({ color: '#8d877b', transparent: true, opacity: 0.36, depthWrite: false, roughness: 1, flatShading: true });
  for (let i = 0; i < 4; i += 1) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 + rng() * 0.2, 0), hazeMat);
    puff.position.set((rng() - 0.5) * 0.6, 0.85 + i * 0.36, (rng() - 0.5) * 0.6);
    puff.userData.base = puff.position.y;
    puff.userData.phase = rng() * Math.PI * 2;
    haze.add(puff);
  }
  heap.add(haze);
  let peek = null;
  if (critter) {
    peek = makeCritter(critter);
    peek.scale.setScalar(0.85);
    peek.position.set(0.1, 0.3, 0.6);
    peek.rotation.y = 0.5;
    heap.add(peek);
  }
  // what is left after cleaning: fresh grass and a few flowers
  const after = new THREE.Group();
  const grass = at(mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.04, 16), '#9cc47a'), 0, 0.02, 0);
  grass.castShadow = false;
  after.add(grass);
  for (let i = 0; i < 7; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = 0.2 + rng() * 0.6;
    after.add(at(makeFlower(rng), Math.sin(a) * d, 0.03, Math.cos(a) * d));
  }
  after.visible = false;
  g.add(heap, after);
  g.userData = { heap, after, haze, peek, cleared: false };
  return g;
}
function makeBloom(island, rng) {
  const g = new THREE.Group();
  for (let i = 0; i < 28; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = island.r * (0.55 + rng() * 0.35);
    g.add(at(makeFlower(rng), island.x + Math.sin(a) * d, 0, island.z + Math.cos(a) * d));
  }
  return g;
}

// ---------- labels ----------
function makeLabel(text, { bg = 'rgba(28,36,33,0.78)', fg = '#fbf7ee', size = 30 } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const width = Math.ceil(ctx.measureText(text).width) + 28;
  canvas.width = width;
  canvas.height = size + 20;
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = bg;
  const r = 12;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, canvas.height, r);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 14, canvas.height / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false, transparent: true }));
  const scale = 0.011;
  sprite.scale.set(width * scale, canvas.height * scale, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// ---------- islands and fixtures ----------
function jitter(geometry, rng, amount, keepTop) {
  const pos = geometry.attributes.position;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    maxY = Math.max(maxY, pos.getY(i));
  }
  const seen = new Map();
  for (let i = 0; i < pos.count; i += 1) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (keepTop && Math.abs(pos.getY(i) - maxY) < 1e-3) {
      continue;
    }
    if (!seen.has(key)) {
      seen.set(key, [(rng() - 0.5) * amount, (rng() - 0.5) * amount, (rng() - 0.5) * amount]);
    }
    const [dx, dy, dz] = seen.get(key);
    pos.setXYZ(i, pos.getX(i) + dx, pos.getY(i) + dy, pos.getZ(i) + dz);
  }
  geometry.computeVertexNormals();
  return geometry;
}
function makeIsland(island, rng) {
  const g = new THREE.Group();
  const pal = island.palette || { top: '#8db36f', rim: '#93704c', under: '#8f8a80', crystal: '#9fd3cf' };
  g.userData.islandBody = true;
  const top = at(mesh(new THREE.CylinderGeometry(island.r, island.r * 0.98, 0.6, 48), pal.top), 0, -0.3, 0);
  top.castShadow = false;
  const rim = at(mesh(new THREE.CylinderGeometry(island.r * 0.985, island.r * 0.9, 1.2, 48), pal.rim), 0, -1.2, 0);
  const underGeo = jitter(new THREE.ConeGeometry(island.r * 0.9, island.r * 1.15, 14, 4), rng, 1.3, true);
  const under = at(mesh(underGeo, pal.under), 0, -1.8 - island.r * 0.575, 0);
  under.rotation.x = Math.PI;
  g.add(top, rim, under);
  // a few hanging roots and crystals under the island for silhouette
  for (let i = 0; i < 5; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = island.r * (0.3 + rng() * 0.4);
    const crystal = at(mesh(new THREE.OctahedronGeometry(0.4 + rng() * 0.3, 0), pal.crystal, { roughness: 0.4 }), Math.sin(a) * d, -3 - rng() * island.r * 0.5, Math.cos(a) * d);
    crystal.scale.y = 2;
    g.add(crystal);
  }
  return at(g, island.x, 0, island.z);
}
function makeWater(r, color = '#6fb0c0') {
  const g = new THREE.Group();
  const water = at(new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.1 })), 0, 0.02, 0);
  water.rotation.x = -Math.PI / 2;
  water.receiveShadow = true;
  const deep = at(new THREE.Mesh(new THREE.CircleGeometry(r * 0.55, 24), new THREE.MeshStandardMaterial({ color: '#4f8fa3', roughness: 0.3 })), 0, 0.03, 0);
  deep.rotation.x = -Math.PI / 2;
  g.add(water, deep);
  const rng = mulberry32(Math.round(r * 100));
  const count = Math.round(r * 7);
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + rng() * 0.2;
    const stone = at(mesh(new THREE.DodecahedronGeometry(0.22 + rng() * 0.16, 0), '#a7a29a'), Math.sin(a) * (r + 0.1), 0.05, Math.cos(a) * (r + 0.1));
    stone.scale.y = 0.6;
    g.add(stone);
  }
  g.userData.water = water;
  return g;
}
function makeHouse() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(3.2, 2.1, 2.6), '#efe6d2'), 0, 1.05, 0));
  const roof = at(mesh(new THREE.ConeGeometry(2.6, 1.4, 4), '#b5553a'), 0, 2.8, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.2, 1, 1);
  g.add(roof);
  g.add(at(mesh(new THREE.BoxGeometry(0.8, 1.3, 0.08), '#7a5636'), 0.5, 0.65, 1.32));
  g.add(at(mesh(new THREE.BoxGeometry(0.7, 0.55, 0.08), '#bfe0ea', { roughness: 0.3 }), -0.8, 1.25, 1.32));
  const panel = at(mesh(new THREE.BoxGeometry(1.4, 0.06, 0.9), '#2c5470', { roughness: 0.35 }), -0.5, 2.85, 0.45);
  panel.rotation.x = -0.6;
  g.add(panel);
  // vine box under the window
  g.add(at(mesh(new THREE.BoxGeometry(1.0, 0.25, 0.3), '#8a5a33'), -0.8, 0.85, 1.45));
  for (let i = 0; i < 4; i += 1) {
    g.add(at(mesh(new THREE.IcosahedronGeometry(0.16, 0), '#5d8f45'), -1.2 + i * 0.27, 1.02, 1.45));
  }
  return g;
}
function makeWorkbench() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(1.7, 0.12, 0.85), '#a5744a'), 0, 0.82, 0));
  [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]].forEach(([x, z]) => {
    g.add(at(mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), '#7a5636'), x, 0.4, z));
  });
  g.add(at(mesh(new THREE.BoxGeometry(0.3, 0.2, 0.25), '#5f6a70'), -0.55, 0.98, 0.1));
  g.add(at(mesh(new THREE.BoxGeometry(0.6, 0.05, 0.12), '#c7793a'), 0.3, 0.91, 0.05));
  g.add(at(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8), '#8c9196'), 0.55, 1.03, -0.2));
  return g;
}
function makeStall() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(2.6, 0.9, 1.0), '#a5744a'), 0, 0.45, 0));
  [[-1.2, -0.45], [1.2, -0.45], [-1.2, 0.45], [1.2, 0.45]].forEach(([x, z]) => {
    g.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 6), '#7a5636'), x, 1.15, z));
  });
  const canopy = at(mesh(new THREE.BoxGeometry(2.9, 0.1, 1.5), '#e3b021'), 0, 2.3, 0.1);
  canopy.rotation.x = 0.18;
  g.add(canopy);
  ['#d2442b', '#4f8a2e', '#e3b021', '#a3324f'].forEach((c, i) => {
    g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5), '#c08a52'), -0.9 + i * 0.6, 1.02, 0.1));
    for (let k = 0; k < 3; k += 1) {
      g.add(at(mesh(new THREE.IcosahedronGeometry(0.1, 0), c), -1.0 + i * 0.6 + k * 0.1, 1.2, 0.1 + (k % 2) * 0.1));
    }
  });
  return g;
}
function makeBoard() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), '#7a5636'), -0.95, 1.0, 0));
  g.add(at(mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), '#7a5636'), 0.95, 1.0, 0));
  g.add(at(mesh(new THREE.BoxGeometry(2.0, 1.2, 0.08), '#c08a52'), 0, 1.35, 0));
  [[-0.5, 1.5], [0.3, 1.55], [-0.2, 1.1], [0.6, 1.12]].forEach(([x, y]) => {
    g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.35, 0.02), '#f6f1e4'), x, y, 0.06));
  });
  return g;
}
function makeTower() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CylinderGeometry(0.3, 0.8, 7, 4), '#d8d2c4'), 0, 3.5, 0));
  g.add(at(mesh(new THREE.BoxGeometry(0.6, 0.5, 1.0), '#c9c2b2'), 0, 7.1, 0));
  const blades = new THREE.Group();
  blades.position.set(0, 7.1, 0.55);
  for (let i = 0; i < 3; i += 1) {
    const blade = at(mesh(new THREE.BoxGeometry(0.22, 2.6, 0.05), '#f4f0e6'), 0, 1.3, 0);
    const holder = new THREE.Group();
    holder.rotation.z = (i / 3) * Math.PI * 2;
    holder.add(blade);
    blades.add(holder);
  }
  g.add(blades);
  g.userData.blades = blades;
  return g;
}
function makeLighthouse() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CylinderGeometry(0.8, 1.15, 6, 14), '#f1ece2'), 0, 3, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.7, 14), '#b5553a'), 0, 2.2, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(0.86, 0.92, 0.7, 14), '#b5553a'), 0, 4.4, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.15, 14), '#3d3a35'), 0, 6.05, 0));
  const lamp = at(new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshStandardMaterial({ color: '#d8d2c4', emissive: '#000000' })), 0, 6.6, 0);
  g.add(lamp);
  g.add(at(mesh(new THREE.ConeGeometry(0.85, 0.8, 14), '#3d3a35'), 0, 7.35, 0));
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2;
  beam.position.set(7, 0, 0);
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 6.6;
  beamPivot.add(beam);
  beamPivot.visible = false;
  g.add(beamPivot);
  g.userData = { lamp, beamPivot };
  return g;
}
function makeSite() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), '#7a5636'), 0, 0.7, 0));
  g.add(at(mesh(new THREE.BoxGeometry(0.9, 0.55, 0.06), '#e3b021'), 0, 1.3, 0.05));
  for (let i = 0; i < 4; i += 1) {
    g.add(at(mesh(new THREE.BoxGeometry(1.4, 0.08, 0.28), '#c08a52'), 0.7, 0.05 + i * 0.09, -0.6 + (i % 2) * 0.1));
  }
  return g;
}
function makeBridge(seg, broken) {
  const g = new THREE.Group();
  const len = Math.hypot(seg.bx - seg.ax, seg.bz - seg.az);
  const angle = Math.atan2(seg.ux, seg.uz);
  const plankCount = Math.floor(len / 0.42);
  for (let i = 0; i <= plankCount; i += 1) {
    if (broken && i > 3 && i < plankCount - 3) {
      continue;
    }
    const t = i / plankCount;
    const plank = at(mesh(new THREE.BoxGeometry(seg.width, 0.1, 0.32), i % 3 === 0 ? '#b58b5e' : '#a5744a'), 0, 0.02, 0);
    const holder = new THREE.Group();
    holder.position.set(seg.ax + (seg.bx - seg.ax) * t, -0.03, seg.az + (seg.bz - seg.az) * t);
    holder.rotation.y = angle;
    holder.add(plank);
    g.add(holder);
  }
  if (!broken) {
    [-1, 1].forEach((side) => {
      const px = -seg.uz * side * (seg.width / 2);
      const pz = seg.ux * side * (seg.width / 2);
      const rail = mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 5), '#c9b27a');
      rail.position.set((seg.ax + seg.bx) / 2 + px, 0.75, (seg.az + seg.bz) / 2 + pz);
      rail.rotation.order = 'YXZ';
      rail.rotation.y = angle;
      rail.rotation.x = Math.PI / 2;
      g.add(rail);
      for (let i = 0; i <= 4; i += 1) {
        const t = i / 4;
        g.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.85, 6), '#7a5636'), seg.ax + (seg.bx - seg.ax) * t + px, 0.38, seg.az + (seg.bz - seg.az) * t + pz));
      }
    });
  }
  return g;
}

// ---------- nodes ----------
function makeNode(type, rng, palette = null) {
  const g = new THREE.Group();
  const ud = { type, parts: {} };
  if (type === 'tree') {
    const trunk = at(mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.2, 6), '#7a5636'), 0, 0.6, 0);
    const crown = new THREE.Group();
    const greens = palette ? palette.leaf : ['#5d8f45', '#6a9c4c', '#4f8040', '#78a656'];
    const big = at(mesh(new THREE.IcosahedronGeometry(0.95, 0), greens[Math.floor(rng() * greens.length)]), 0, 1.7, 0);
    const small = at(mesh(new THREE.IcosahedronGeometry(0.65, 0), greens[Math.floor(rng() * greens.length)]), 0.35, 2.35, 0.1);
    crown.add(big, small);
    g.add(trunk, crown);
    ud.parts = { trunk, crown };
    g.scale.setScalar(0.9 + rng() * 0.35);
  } else if (type === 'rock') {
    const rock = at(mesh(new THREE.DodecahedronGeometry(0.6, 0), '#9ea3a6'), 0, 0.32, 0);
    rock.scale.set(1, 0.7, 0.9);
    rock.rotation.y = rng() * 3;
    const pebble = at(mesh(new THREE.DodecahedronGeometry(0.28, 0), '#8c9196'), 0.55, 0.14, 0.2);
    g.add(rock, pebble);
    ud.parts = { main: rock };
  } else if (type === 'scrap') {
    const pile = new THREE.Group();
    pile.add(at(mesh(new THREE.BoxGeometry(0.7, 0.3, 0.5), '#b0643c', { roughness: 0.7, metalness: 0.2 }), 0, 0.15, 0));
    const pipe = at(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8), '#8c9196', { metalness: 0.3 }), 0.1, 0.38, 0.1);
    pipe.rotation.z = 1.2;
    pile.add(pipe);
    const plate = at(mesh(new THREE.BoxGeometry(0.5, 0.05, 0.4), '#6f7478', { metalness: 0.3 }), -0.25, 0.36, -0.1);
    plate.rotation.z = 0.4;
    pile.add(plate);
    const gear = at(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), '#c7793a', { metalness: 0.3 }), 0.3, 0.33, -0.2);
    gear.rotation.x = 1.2;
    pile.add(gear);
    g.add(pile);
    ud.parts = { main: pile };
  } else if (type === 'bush' || type === 'berrybush') {
    const bush = at(mesh(new THREE.IcosahedronGeometry(0.55, 0), palette ? palette.leaf[type === 'bush' ? 0 : 1] : type === 'bush' ? '#7aa35a' : '#5d8f45'), 0, 0.38, 0);
    bush.scale.set(1.1, 0.8, 1);
    g.add(bush);
    const berries = new THREE.Group();
    if (type === 'berrybush') {
      for (let i = 0; i < 7; i += 1) {
        const a = rng() * Math.PI * 2;
        berries.add(at(mesh(new THREE.SphereGeometry(0.08, 6, 5), '#a3324f'), Math.sin(a) * 0.5, 0.3 + rng() * 0.35, Math.cos(a) * 0.45));
      }
    } else {
      for (let i = 0; i < 4; i += 1) {
        const a = rng() * Math.PI * 2;
        const blade = at(mesh(new THREE.ConeGeometry(0.05, 0.6, 4), '#a8b85c'), Math.sin(a) * 0.45, 0.55, Math.cos(a) * 0.45);
        berries.add(blade);
      }
    }
    g.add(berries);
    ud.parts = { main: bush, extra: berries };
  }
  ud.ready = true;
  g.userData = ud;
  return g;
}
function setNodeReady(group, ready) {
  const { type, parts } = group.userData;
  if (group.userData.ready === ready) {
    return;
  }
  group.userData.ready = ready;
  if (type === 'tree') {
    parts.crown.visible = ready;
    parts.trunk.scale.y = ready ? 1 : 0.3;
    parts.trunk.position.y = ready ? 0.6 : 0.18;
    if (ready) {
      group.userData.grow = 0;
    }
  } else if (type === 'rock' || type === 'scrap') {
    parts.main.scale.multiplyScalar(ready ? 1 / 0.35 : 0.35);
  } else {
    parts.extra.visible = ready;
    parts.main.scale.set(ready ? 1.1 : 0.6, ready ? 0.8 : 0.45, ready ? 1 : 0.6);
  }
}

// ---------- placeables ----------
function makeCrop(seed, progress) {
  const g = new THREE.Group();
  const info = CROPS[seed];
  const color = ITEMS[info.crop].color;
  if (progress < 0.34) {
    for (let i = 0; i < 3; i += 1) {
      g.add(at(mesh(new THREE.ConeGeometry(0.05, 0.18, 4), '#7aa35a'), -0.2 + i * 0.2, 0.09, (i % 2) * 0.12 - 0.06));
    }
    return g;
  }
  const leafScale = progress < 1 ? 0.6 + progress * 0.4 : 1;
  if (info.crop === 'sunflower') {
    const stem = at(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9 * leafScale, 5), '#5d8f45'), 0, 0.45 * leafScale, 0);
    g.add(stem);
    if (progress >= 1) {
      const head = at(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12), '#e3b021'), 0, 0.95, 0.05);
      head.rotation.x = 1.2;
      const centre = at(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), '#6d5236'), 0, 0.96, 0.08);
      centre.rotation.x = 1.2;
      g.add(head, centre);
    } else {
      g.add(at(mesh(new THREE.IcosahedronGeometry(0.14, 0), '#6a9c4c'), 0, 0.9 * leafScale, 0));
    }
    return g;
  }
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2;
    g.add(at(mesh(new THREE.IcosahedronGeometry(0.17 * leafScale, 0), info.crop === 'basil' ? '#5f9e3c' : '#5d8f45'), Math.sin(a) * 0.18, 0.18 * leafScale, Math.cos(a) * 0.18));
  }
  if (progress >= 1 && info.crop !== 'basil') {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      g.add(at(mesh(new THREE.SphereGeometry(info.crop === 'tomato' ? 0.09 : 0.06, 8, 6), color), Math.sin(a) * 0.26, 0.26 + (i % 2) * 0.1, Math.cos(a) * 0.26));
    }
  }
  if (progress >= 1 && info.crop === 'basil') {
    g.add(at(mesh(new THREE.IcosahedronGeometry(0.2, 0), '#78b850'), 0, 0.38, 0));
  }
  return g;
}
export function makePlaceable(type) {
  const g = new THREE.Group();
  const ud = { type };
  const wood = '#a5744a';
  const darkWood = '#7a5636';
  if (type === 'planter') {
    g.add(at(mesh(new THREE.BoxGeometry(0.92, 0.32, 0.92), '#8a5a33'), 0, 0.16, 0));
    const soil = at(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.78), new THREE.MeshStandardMaterial({ color: '#6b523a', flatShading: true })), 0, 0.33, 0);
    g.add(soil);
    const crop = new THREE.Group();
    crop.position.y = 0.35;
    g.add(crop);
    ud.soil = soil;
    ud.crop = crop;
    ud.cropKey = '';
  } else if (type === 'solar') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6), '#5f6a70'), 0, 0.35, 0));
    const panel = at(mesh(new THREE.BoxGeometry(1.0, 0.05, 0.72), '#2c5470', { roughness: 0.3, metalness: 0.2 }), 0, 0.78, 0);
    panel.rotation.x = -0.5;
    const frame = at(mesh(new THREE.BoxGeometry(1.06, 0.03, 0.78), '#d8d2c4'), 0, 0.76, 0);
    frame.rotation.x = -0.5;
    g.add(frame, panel);
  } else if (type === 'turbine') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.09, 2.4, 6), '#f4f0e6'), 0, 1.2, 0));
    g.add(at(mesh(new THREE.BoxGeometry(0.16, 0.16, 0.36), '#e8e4da'), 0, 2.42, 0));
    const blades = new THREE.Group();
    blades.position.set(0, 2.42, 0.2);
    for (let i = 0; i < 3; i += 1) {
      const holder = new THREE.Group();
      holder.rotation.z = (i / 3) * Math.PI * 2;
      holder.add(at(mesh(new THREE.BoxGeometry(0.1, 0.9, 0.02), '#f4f0e6'), 0, 0.45, 0));
      blades.add(holder);
    }
    g.add(blades);
    ud.spin = blades;
  } else if (type === 'battery') {
    g.add(at(mesh(new THREE.BoxGeometry(0.62, 0.72, 0.5), '#3f6f52'), 0, 0.36, 0));
    g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6), '#c7793a'), -0.15, 0.77, 0));
    g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6), '#8c9196'), 0.15, 0.77, 0));
    const level = at(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.02), new THREE.MeshStandardMaterial({ color: '#cfe8a8', emissive: '#7fbf4f', emissiveIntensity: 0.6 })), 0, 0.36, 0.26);
    g.add(level);
    ud.level = level;
  } else if (type === 'sprinkler') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.2, 8), '#5f6a70'), 0, 0.1, 0));
    g.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), '#8c9196'), 0, 0.4, 0));
    const head = new THREE.Group();
    head.position.y = 0.62;
    const arm = at(mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), '#5f8ea0'), 0, 0, 0);
    head.add(arm);
    g.add(head);
    ud.spin2 = head;
  } else if (type === 'cookstove') {
    g.add(at(mesh(new THREE.BoxGeometry(0.85, 0.6, 0.6), '#7c7468'), 0, 0.3, 0));
    g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.4), '#3d3a35'), 0, 0.62, 0));
    const dish = at(mesh(new THREE.ConeGeometry(0.45, 0.2, 14, 1, true), '#d8d2c4', { metalness: 0.4, roughness: 0.3, side: THREE.DoubleSide }), 0, 0.95, -0.25);
    dish.rotation.x = -2.4;
    g.add(dish);
    g.add(at(mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.16, 10), '#3d3a35'), 0, 0.72, 0));
  } else if (type === 'composter') {
    for (let i = 0; i < 4; i += 1) {
      g.add(at(mesh(new THREE.BoxGeometry(0.8, 0.14, 0.8), i % 2 ? '#6d5236' : '#7a5636'), 0, 0.1 + i * 0.17, 0));
    }
    g.add(at(mesh(new THREE.BoxGeometry(0.66, 0.06, 0.66), '#3f3024'), 0, 0.72, 0));
  } else if (type === 'lamp') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.7, 6), '#3d3a35'), 0, 0.85, 0));
    const bulb = at(new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: '#f1d27a', emissive: '#f1c55a', emissiveIntensity: 0 })), 0, 1.78, 0);
    g.add(bulb);
    g.add(at(mesh(new THREE.ConeGeometry(0.24, 0.16, 8), '#3d3a35'), 0, 1.97, 0));
    ud.bulb = bulb;
  } else if (type === 'bench') {
    g.add(at(mesh(new THREE.BoxGeometry(1.0, 0.08, 0.38), wood), 0, 0.42, 0));
    g.add(at(mesh(new THREE.BoxGeometry(1.0, 0.36, 0.06), wood), 0, 0.68, -0.18));
    [-0.42, 0.42].forEach((x) => g.add(at(mesh(new THREE.BoxGeometry(0.07, 0.42, 0.34), darkWood), x, 0.21, 0)));
  } else if (type === 'fence') {
    [-0.45, 0.45].forEach((x) => g.add(at(mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), darkWood), x, 0.4, 0)));
    g.add(at(mesh(new THREE.BoxGeometry(1.0, 0.08, 0.05), '#b58b5e'), 0, 0.55, 0));
    g.add(at(mesh(new THREE.BoxGeometry(1.0, 0.08, 0.05), '#b58b5e'), 0, 0.3, 0));
  } else if (type === 'path') {
    const tile = at(mesh(new THREE.BoxGeometry(0.96, 0.04, 0.96), '#b3ada3'), 0, 0.02, 0);
    tile.castShadow = false;
    g.add(tile);
    [[-0.2, -0.2], [0.22, 0.12], [-0.1, 0.28]].forEach(([x, z]) => {
      const s = at(mesh(new THREE.BoxGeometry(0.3, 0.03, 0.26), '#9a948a'), x, 0.05, z);
      s.castShadow = false;
      g.add(s);
    });
  } else if (type === 'flowerpot') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.4, 10), '#c46a45'), 0, 0.2, 0));
    ['#e3b021', '#f4f0e6', '#e39a7a'].forEach((c, i) => {
      const a = (i / 3) * Math.PI * 2;
      g.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), '#5d8f45'), Math.sin(a) * 0.1, 0.55, Math.cos(a) * 0.1));
      g.add(at(mesh(new THREE.IcosahedronGeometry(0.1, 0), c), Math.sin(a) * 0.1, 0.78, Math.cos(a) * 0.1));
    });
  } else if (type === 'birdhouse') {
    g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 6), darkWood), 0, 0.65, 0));
    g.add(at(mesh(new THREE.BoxGeometry(0.4, 0.38, 0.36), '#d7b37a'), 0, 1.45, 0));
    const roof = at(mesh(new THREE.ConeGeometry(0.36, 0.26, 4), '#b5553a'), 0, 1.77, 0);
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    g.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), '#3d3a35'), 0, 1.48, 0.19));
  } else if (type === 'hammock') {
    [-0.48, 0.48].forEach((x) => g.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.2, 6), darkWood), x, 0.6, 0)));
    const cloth = at(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10, 1, true, Math.PI * 0.75, Math.PI * 0.5), '#d9c7a0', { side: THREE.DoubleSide }), 0, 0.9, 0);
    cloth.rotation.z = Math.PI / 2;
    g.add(cloth);
  } else if (type === 'arch') {
    [-0.45, 0.45].forEach((x) => g.add(at(mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), darkWood), x, 0.85, 0)));
    const top = at(mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 14, Math.PI), '#7aa35a'), 0, 1.7, 0);
    g.add(top);
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 9) * Math.PI;
      g.add(at(mesh(new THREE.IcosahedronGeometry(0.09, 0), i % 2 ? '#e39a7a' : '#5d8f45'), Math.cos(a) * 0.45, 1.7 + Math.sin(a) * 0.45, 0.04));
    }
  }
  g.userData = ud;
  return g;
}

// ---------- the world ----------
const SKY_KEYS = [
  [0.0, '#1a2430'], [0.2, '#25344a'], [0.25, '#d9a684'], [0.31, '#b9dbe6'], [0.5, '#a8d4e6'],
  [0.69, '#b8d6df'], [0.75, '#e0a07c'], [0.81, '#2b3a50'], [1.0, '#1a2430'],
];
function skyColor(tod, out) {
  for (let i = 0; i < SKY_KEYS.length - 1; i += 1) {
    const [t0, c0] = SKY_KEYS[i];
    const [t1, c1] = SKY_KEYS[i + 1];
    if (tod >= t0 && tod <= t1) {
      return out.set(c0).lerp(new THREE.Color(c1), (tod - t0) / (t1 - t0));
    }
  }
  return out.set(SKY_KEYS[0][1]);
}

export function createWorld(canvas, { quality = 'high' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const sky = new THREE.Color('#a8d4e6');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 45, 120);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

  const hemi = new THREE.HemisphereLight('#e8f2f6', '#6f6553', 0.7);
  const sun = new THREE.DirectionalLight('#fff4e0', 1.4);
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -24;
  sc.right = 24;
  sc.top = 24;
  sc.bottom = -24;
  sc.near = 1;
  sc.far = 120;
  sun.shadow.bias = -0.0008;
  scene.add(hemi, sun, sun.target);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  // sky dome: a soft vertical gradient instead of one flat colour
  const skyUniforms = {
    top: { value: new THREE.Color('#5d9cc4') },
    horizon: { value: new THREE.Color('#a8d4e6') },
    bottom: { value: new THREE.Color('#eef3f4') },
  };
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(360, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vDir; void main() { float h = vDir.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(min(h * 1.7, 1.0), 0.75)) : mix(horizon, bottom, min(-h * 3.0, 1.0)); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  }));
  skyDome.renderOrder = -10;
  skyDome.frustumCulled = false;
  scene.add(skyDome);
  // a sea of cloud far below the islands; fog melts it into the horizon
  const cloudSea = new THREE.Mesh(new THREE.CircleGeometry(520, 48), new THREE.MeshBasicMaterial({ color: '#eef3f4' }));
  cloudSea.rotation.x = -Math.PI / 2;
  cloudSea.position.y = -44;
  scene.add(cloudSea);

  const world = {
    renderer, scene, camera, yaw: 0, zoom: 1, interactables: [], nodeMeshes: [], placedMeshes: new Map(),
    pickables: [], peers: new Map(), npcMeshes: {}, fixtureMeshes: {}, bridgeGroups: {}, unlockKey: '',
    reducedMotion: false, ghost: null, quality, farGroups: {},
  };

  // islands
  const rng = mulberry32(42);
  ISLANDS.forEach((island) => scene.add(makeIsland(island, rng)));
  // little floating rocks for depth
  for (let i = 0; i < 9; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = 45 + rng() * 30;
    const chunk = at(mesh(jitter(new THREE.DodecahedronGeometry(1 + rng() * 1.6, 0), rng, 0.6, false), '#8f8a80'), Math.sin(a) * d, -4 + rng() * 10, Math.cos(a) * d - 10);
    if (ISLANDS.some((isl) => Math.hypot(isl.x - chunk.position.x, isl.z - chunk.position.z) < isl.r + 9)) {
      continue;
    }
    const cap = at(mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.3, 8), '#8db36f'), 0, 0.9, 0);
    chunk.add(cap);
    scene.add(chunk);
  }
  // clouds
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 22; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < puffs; k += 1) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + rng() * 1.6, 0), cloudMat);
      puff.position.set(k * 1.8 - puffs, rng() * 0.8, rng() * 1.5);
      puff.scale.y = 0.6;
      cloud.add(puff);
    }
    const below = i < 14;
    cloud.position.set(-90 + rng() * 180, below ? -16 + rng() * 9 : 14 + rng() * 8, -100 + rng() * 150);
    cloud.userData.speed = 0.4 + rng() * 0.8;
    clouds.add(cloud);
  }
  scene.add(clouds);

  // rain
  const rainCount = 900;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i += 1) {
    rainPos[i * 3] = (rng() - 0.5) * 40;
    rainPos[i * 3 + 1] = rng() * 20;
    rainPos[i * 3 + 2] = (rng() - 0.5) * 40;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: '#d7e6ee', size: 0.09, transparent: true, opacity: 0.7, depthWrite: false }));
  rain.visible = false;
  scene.add(rain);

  function register(entry, object) {
    world.interactables.push(entry);
    if (object) {
      object.traverse((child) => {
        child.userData.key = entry.key;
      });
      world.pickables.push(object);
    }
    entry.object = object;
    return entry;
  }

  // fixtures
  FIXTURES.forEach((f) => {
    let object = null;
    let radius = 1.8;
    if (f.kind === 'house') {
      object = makeHouse();
      radius = 2.6;
    } else if (f.kind === 'workbench') {
      object = makeWorkbench();
      radius = 1.5;
    } else if (f.kind === 'pond' || f.kind === 'reefpool') {
      object = makeWater(f.r, f.kind === 'reefpool' ? '#69c0c0' : '#6fb0c0');
      radius = f.r + 1.1;
    } else if (f.kind === 'stall') {
      object = makeStall();
      radius = 2.0;
    } else if (f.kind === 'board') {
      object = makeBoard();
      radius = 1.7;
    } else if (f.kind === 'tower') {
      object = makeTower();
      radius = 2.2;
    } else if (f.kind === 'lighthouse') {
      object = makeLighthouse();
      radius = 2.4;
    } else if (f.kind === 'site') {
      object = makeSite();
      radius = 1.9;
    }
    at(object, f.x, 0, f.z);
    if (f.kind === 'house') {
      object.rotation.y = 0.5;
    }
    scene.add(object);
    world.fixtureMeshes[f.id] = object;
    register({ key: `f:${f.id}`, kind: f.kind, id: f.id, x: f.x, z: f.z, r: radius, project: f.project, spot: f.spot }, object);
  });

  // gathering nodes
  const nodeRng = mulberry32(7);
  NODE_SPOTS.forEach(([type, x, z], index) => {
    const home = ISLANDS.find((i) => Math.hypot(x - i.x, z - i.z) < i.r);
    const object = at(makeNode(type, nodeRng, home && home.palette ? home.palette : null), x, 0, z);
    object.rotation.y = nodeRng() * Math.PI * 2;
    scene.add(object);
    world.nodeMeshes[index] = object;
    register({ key: `n:${index}`, kind: 'node', nodeType: type, index, x, z, r: 1.35 }, object);
  });

  // smog heaps (clean skies)
  const smogRng = mulberry32(11);
  world.smogMeshes = [];
  world.smogEntries = [];
  SMOG_SPOTS.forEach((spot, index) => {
    const object = at(makeSmogHeap(smogRng, spot.critter), spot.x, 0, spot.z);
    object.rotation.y = smogRng() * Math.PI * 2;
    scene.add(object);
    world.smogMeshes[index] = object;
    world.smogEntries[index] = register({ key: `s:${index}`, kind: 'smog', index, critter: spot.critter || null, island: spot.island, x: spot.x, z: spot.z, r: 1.45 }, object);
  });
  // rescued animals live on Home Isle
  world.critterMeshes = {};
  world.critterEntries = {};
  Object.entries(CRITTERS).forEach(([id, critter], i) => {
    const object = at(makeCritter(id, critter), critter.home.x, 0, critter.home.z);
    object.visible = false;
    object.userData.phase = i * 2.1;
    scene.add(object);
    world.critterMeshes[id] = object;
    world.critterEntries[id] = register({ key: `c:${id}`, kind: 'critter', id, x: critter.home.x, z: critter.home.z, r: 1.15, hidden: true }, object);
  });
  world.bloomGroups = {};
  world.syncClean = (s) => {
    SMOG_SPOTS.forEach((spot, index) => {
      const object = world.smogMeshes[index];
      const cleared = smogCleared(s, index);
      world.smogEntries[index].hidden = cleared;
      if (object.userData.cleared !== cleared) {
        object.userData.cleared = cleared;
        object.userData.heap.visible = !cleared;
        object.userData.after.visible = cleared;
      }
    });
    Object.keys(CRITTERS).forEach((id) => {
      const rescued = critterRescued(s, id);
      world.critterMeshes[id].visible = rescued;
      world.critterEntries[id].hidden = !rescued;
    });
    ISLANDS.forEach((island) => {
      if (s.blooms && s.blooms[island.id] && !world.bloomGroups[island.id]) {
        world.bloomGroups[island.id] = makeBloom(island, mulberry32(island.x * 31 + island.z * 7 + 5));
        scene.add(world.bloomGroups[island.id]);
      }
    });
  };

  // villagers
  Object.entries(NPCS).forEach(([id, npc]) => {
    const person = at(makePerson(npc.look || npc.color), npc.x, 0, npc.z);
    person.rotation.y = id === 'sari' ? 0 : Math.PI * 0.8;
    const label = at(makeLabel(npc.name), 0, 2.2, 0);
    person.add(label);
    if (id === 'bayu') {
      setHat(person, 'hat_cap');
    }
    scene.add(person);
    world.npcMeshes[id] = person;
    register({ key: `p:${id}`, kind: 'npc', id, x: npc.x, z: npc.z, r: 1.5 }, person);
  });

  // player and pet
  const player = makePerson(null);
  scene.add(player);
  world.player = player;
  const pet = makePet();
  scene.add(pet);
  world.pet = pet;
  const petEntry = register({ key: 'pet', kind: 'pet', x: 0, z: 0, r: 1.1 }, pet);

  // highlight ring and guide beacon
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 40), new THREE.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  const beacon = new THREE.Group();
  const beam = at(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.45, depthWrite: false })), 0, 3.5, 0);
  const beaconRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32), new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.9, depthWrite: false }));
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.05;
  beacon.add(beam, beaconRing);
  beacon.visible = false;
  scene.add(beacon);

  // build grid cursor
  const cursor = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.98), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
  cursor.rotation.x = -Math.PI / 2;
  cursor.visible = false;
  scene.add(cursor);

  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  world.setQuality = (q) => {
    world.quality = q;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1));
    renderer.shadowMap.enabled = q === 'high';
    sun.castShadow = q === 'high';
    materialCache.forEach((m) => {
      m.needsUpdate = true;
    });
    world.resize();
  };
  world.resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  world.refreshUnlocks = (s) => {
    const key = ['bridge', 'tower', 'dock', 'lighthouse', 'skyway'].map((id) => (projectDone(s, id) ? 1 : 0)).join('');
    if (key === world.unlockKey) {
      return;
    }
    world.unlockKey = key;
    BRIDGES.forEach((bridge) => {
      const holder = world.farGroups[bridge.to] || scene;
      if (world.bridgeGroups[bridge.id]) {
        world.bridgeGroups[bridge.id].parent.remove(world.bridgeGroups[bridge.id]);
      }
      const group = makeBridge(bridgeSegment(bridge), !unlocked(s, bridge.needs));
      world.bridgeGroups[bridge.id] = group;
      holder.add(group);
    });
    FIXTURES.filter((f) => f.kind === 'site').forEach((f) => {
      world.fixtureMeshes[f.id].visible = !projectDone(s, f.project);
    });
    const tower = world.fixtureMeshes.tower.userData.blades;
    tower.rotation.x = projectDone(s, 'tower') ? 0 : 0.5;
    tower.children[2].visible = projectDone(s, 'tower');
  };

  world.syncPlaced = (s) => {
    const seen = new Set();
    s.placed.forEach((p) => {
      seen.add(p.uid);
      let object = world.placedMeshes.get(p.uid);
      if (!object || object.userData.type !== p.type) {
        if (object) {
          scene.remove(object);
        }
        object = makePlaceable(p.type);
        scene.add(object);
        world.placedMeshes.set(p.uid, object);
        const entry = { key: `u:${p.uid}`, kind: 'placed', uid: p.uid, type: p.type, x: p.x, z: p.z, r: 1.05 };
        object.traverse((child) => {
          child.userData.key = entry.key;
        });
        object.userData.type = p.type;
        world.interactables.push(entry);
        world.pickables.push(object);
        object.userData.entry = entry;
      }
      object.position.set(p.x, 0, p.z);
      object.rotation.y = (p.rot || 0) * (Math.PI / 2);
      object.userData.entry.x = p.x;
      object.userData.entry.z = p.z;
      if (p.type === 'planter') {
        const crop = p.crop;
        const stage = crop ? (cropProgress(crop) >= 1 ? 2 : cropProgress(crop) >= 0.34 ? 1 : 0) : -1;
        const cropKey = crop ? `${crop.seed}:${stage}` : '';
        const ud = object.userData;
        if (ud.cropKey !== cropKey) {
          ud.cropKey = cropKey;
          ud.crop.clear();
          if (crop) {
            ud.crop.add(makeCrop(crop.seed, stage === 2 ? 1 : stage === 1 ? 0.6 : 0.1));
          }
        }
        ud.soil.material.color.set(crop && crop.watered ? '#3f3024' : '#6b523a');
      }
    });
    [...world.placedMeshes.keys()].forEach((uid) => {
      if (!seen.has(uid)) {
        const object = world.placedMeshes.get(uid);
        scene.remove(object);
        world.placedMeshes.delete(uid);
        world.interactables = world.interactables.filter((e) => e.key !== `u:${uid}`);
        world.pickables = world.pickables.filter((o) => o !== object);
      }
    });
  };

  world.setHighlight = (entry) => {
    ring.visible = Boolean(entry);
    if (entry) {
      ring.position.set(entry.x, 0.04, entry.z);
      const r = Math.min(3.2, Math.max(0.7, entry.r * 0.75));
      ring.scale.set(r, r, r);
    }
  };
  world.setBeacon = (point) => {
    beacon.visible = Boolean(point);
    if (point) {
      beacon.position.set(point.x, 0, point.z);
    }
  };
  world.setCursor = (cell, ok, type, rot = 0) => {
    cursor.visible = Boolean(cell);
    if (world.ghost && (!cell || world.ghost.userData.type !== type)) {
      scene.remove(world.ghost);
      world.ghost = null;
    }
    if (!cell) {
      return;
    }
    cursor.position.set(cell.x, 0.03, cell.z);
    cursor.material.color.set(ok ? '#e8f5d0' : '#f2b8a8');
    if (type) {
      if (!world.ghost) {
        world.ghost = makePlaceable(type);
        world.ghost.userData.type = type;
        world.ghost.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false });
            child.castShadow = false;
          }
        });
        scene.add(world.ghost);
      }
      world.ghost.position.set(cell.x, 0, cell.z);
      world.ghost.rotation.y = rot * (Math.PI / 2);
      world.ghost.traverse((child) => {
        if (child.isMesh) {
          child.material.color.set(ok ? '#d8f0c0' : '#f0a898');
        }
      });
    }
  };

  world.pick = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(world.pickables, true);
    const hit = hits.find((h) => h.object.userData.key && h.object.visible);
    const point = new THREE.Vector3();
    const onGround = raycaster.ray.intersectPlane(ground, point);
    const groundPoint = onGround ? { x: point.x, z: point.z } : null;
    if (hit) {
      const entry = world.interactables.find((e) => e.key === hit.object.userData.key);
      if (entry) {
        return { kind: 'thing', entry, ground: groundPoint };
      }
    }
    return groundPoint ? { kind: 'ground', ...groundPoint, ground: groundPoint } : null;
  };

  // peers (other players in your room)
  world.addPeer = (id, info) => {
    if (world.peers.has(id)) {
      return;
    }
    const person = makePerson(info.look || info.color);
    setHat(person, info.hat);
    const label = at(makeLabel(info.name, { bg: 'rgba(250,247,240,0.92)', fg: '#1f2a26' }), 0, 2.15, 0);
    person.add(label);
    person.position.set(0, 0, 2);
    scene.add(person);
    world.peers.set(id, { person, target: { x: 0, z: 2, f: 0 }, bubble: null, bubbleUntil: 0, moving: false });
  };
  world.updatePeer = (id, st) => {
    const peer = world.peers.get(id);
    if (peer) {
      peer.target = st;
    }
  };
  world.removePeer = (id) => {
    const peer = world.peers.get(id);
    if (peer) {
      scene.remove(peer.person);
      world.peers.delete(id);
    }
  };
  world.peerSay = (id, text) => {
    const peer = world.peers.get(id);
    if (!peer) {
      return;
    }
    if (peer.bubble) {
      peer.person.remove(peer.bubble);
    }
    peer.bubble = at(makeLabel(text, { bg: 'rgba(255,255,255,0.95)', fg: '#1f2a26', size: 28 }), 0, 2.7, 0);
    peer.person.add(peer.bubble);
    peer.bubbleUntil = elapsed + 5;
  };
  let selfBubble = null;
  let selfBubbleUntil = 0;
  world.selfSay = (text) => {
    if (selfBubble) {
      player.remove(selfBubble);
    }
    selfBubble = at(makeLabel(text, { bg: 'rgba(255,255,255,0.95)', fg: '#1f2a26', size: 28 }), 0, 2.5, 0);
    player.add(selfBubble);
    selfBubbleUntil = elapsed + 5;
  };

  world.setPlayerLook = (look, hat) => {
    applyLook(player, typeof look === 'string' ? sanitizeLook(null, look) : look);
    setHat(player, hat);
  };
  world.updatePeerLook = (id, info) => {
    const peer = world.peers.get(id);
    if (peer) {
      applyLook(peer.person, info.look || sanitizeLook(null, info.color));
      setHat(peer.person, info.hat);
    }
  };

  const tmpColor = new THREE.Color();
  const camTarget = new THREE.Vector3();
  let elapsed = 0;
  world.update = (s, dt, { moving = false, speed = 1, actionPulse = 0 } = {}) => {
    elapsed += dt;
    const tod = timeOfDay(s);
    const light = daylight(tod);
    const raining = isRaining(s);
    skyColor(tod, tmpColor);
    if (raining) {
      tmpColor.lerp(new THREE.Color('#8a979f'), 0.45 * light);
    }
    // smog haze: a warm grey veil that lifts as heaps are cleared
    const clarity = skyClarity(s);
    tmpColor.lerp(HAZE, (1 - clarity) * 0.16 * (0.35 + 0.65 * light));
    scene.fog.near = 38 + 7 * clarity;
    scene.fog.far = 100 + 20 * clarity;
    sky.copy(tmpColor);
    scene.fog.color.copy(tmpColor);
    const sunAngle = (tod - 0.25) * Math.PI * 2;
    sun.position.set(player.position.x + Math.cos(sunAngle) * 40, Math.max(6, Math.sin(sunAngle) * 50), player.position.z + 18);
    sun.target.position.set(player.position.x, 0, player.position.z);
    sun.intensity = 0.15 + 1.35 * light * (raining ? 0.55 : 1);
    sun.color.set(light < 0.4 ? '#ffd2a8' : '#fff4e0');
    hemi.intensity = 0.32 + 0.5 * light;
    hemi.color.set(light < 0.1 ? '#8fa6c8' : '#e8f2f6');
    if (world.artTick) {
      world.artClock(dt);
      world.artTick(tod, light, tmpColor);
    }

    // player
    player.position.set(s.pos.x, 0, s.pos.z);
    player.rotation.y = s.pos.f;
    animatePerson(player, moving, dt, speed, actionPulse > 0 ? Math.sin(actionPulse * Math.PI) : 0);
    if (selfBubble && elapsed > selfBubbleUntil) {
      player.remove(selfBubble);
      selfBubble = null;
    }

    // pet follows a step behind
    const behindX = s.pos.x - Math.sin(s.pos.f) * 1.3 + Math.cos(s.pos.f) * 0.6;
    const behindZ = s.pos.z - Math.cos(s.pos.f) * 1.3 - Math.sin(s.pos.f) * 0.6;
    const pdx = behindX - pet.position.x;
    const pdz = behindZ - pet.position.z;
    const pdist = Math.hypot(pdx, pdz);
    if (pdist > 6) {
      pet.position.set(behindX, 0, behindZ);
    } else if (pdist > 0.3) {
      const step = Math.min(pdist, dt * (2 + pdist * 2.2));
      pet.position.x += (pdx / pdist) * step;
      pet.position.z += (pdz / pdist) * step;
      pet.rotation.y = Math.atan2(pdx, pdz);
    }
    pet.userData.phase += dt * (pdist > 0.3 ? 12 : 3);
    pet.position.y = pdist > 0.3 ? Math.abs(Math.sin(pet.userData.phase)) * 0.18 : 0;
    pet.userData.tail.rotation.z = Math.sin(pet.userData.phase * 0.7) * 0.4;
    petEntry.x = pet.position.x;
    petEntry.z = pet.position.z;

    // smog haze drifts; rescued animals potter around their favourite spot
    world.syncClean(s);
    world.smogMeshes.forEach((object) => {
      if (object.userData.cleared || world.reducedMotion) {
        return;
      }
      object.userData.haze.children.forEach((puff) => {
        puff.position.y = puff.userData.base + Math.sin(elapsed * 0.8 + puff.userData.phase) * 0.12;
        puff.rotation.y += dt * 0.3;
      });
      if (object.userData.peek) {
        object.userData.peek.rotation.y = 0.5 + Math.sin(elapsed * 1.6) * 0.35;
      }
    });
    Object.entries(world.critterMeshes).forEach(([id, object]) => {
      if (!object.visible) {
        return;
      }
      const home = CRITTERS[id].home;
      const ph = object.userData.phase + (world.reducedMotion ? 0 : elapsed * 0.35);
      const nx = home.x + Math.sin(ph) * 0.8;
      const nz = home.z + Math.cos(ph * 0.8) * 0.6;
      const dx = nx - object.position.x;
      const dz = nz - object.position.z;
      if (Math.hypot(dx, dz) > 0.0005) {
        object.rotation.y = Math.atan2(dx, dz);
      }
      object.position.set(nx, world.reducedMotion ? 0 : Math.abs(Math.sin(elapsed * 4 + object.userData.phase)) * 0.04, nz);
      world.critterEntries[id].x = nx;
      world.critterEntries[id].z = nz;
    });

    // villagers idle
    Object.values(world.npcMeshes).forEach((npc) => animatePerson(npc, false, dt));

    // peers glide toward their last reported position
    world.peers.forEach((peer) => {
      const dx = peer.target.x - peer.person.position.x;
      const dz = peer.target.z - peer.person.position.z;
      const d = Math.hypot(dx, dz);
      peer.moving = d > 0.05;
      if (d > 8) {
        peer.person.position.set(peer.target.x, 0, peer.target.z);
      } else if (peer.moving) {
        const step = Math.min(d, dt * 6);
        peer.person.position.x += (dx / d) * step;
        peer.person.position.z += (dz / d) * step;
        peer.person.rotation.y = Math.atan2(dx, dz);
      }
      animatePerson(peer.person, peer.moving, dt);
      if (peer.bubble && elapsed > peer.bubbleUntil) {
        peer.person.remove(peer.bubble);
        peer.bubble = null;
      }
    });

    // nodes regrow
    world.nodeMeshes.forEach((object, index) => {
      setNodeReady(object, nodeReady(s, index));
      if (object.userData.type === 'tree' && object.userData.ready && object.userData.grow !== undefined && object.userData.grow < 1) {
        object.userData.grow = Math.min(1, object.userData.grow + dt * 2);
        object.userData.parts.crown.scale.setScalar(0.3 + 0.7 * object.userData.grow);
      }
    });

    // machines
    const night = light < 0.08;
    const batteryLevel = s.energy / energyCapacity(s);
    world.placedMeshes.forEach((object) => {
      const ud = object.userData;
      if (ud.spin && !world.reducedMotion) {
        ud.spin.rotation.z += dt * (raining ? 4 : 2.4);
      }
      if (ud.spin2 && !world.reducedMotion) {
        ud.spin2.rotation.y += dt * 3;
      }
      if (ud.bulb) {
        ud.bulb.material.emissiveIntensity = night && s.energy > 0.05 ? 1.6 : 0;
      }
      if (ud.level) {
        ud.level.scale.y = Math.max(0.05, batteryLevel);
        ud.level.position.y = 0.11 + 0.25 * Math.max(0.05, batteryLevel);
      }
    });
    world.syncPlaced(s);

    // wind tower and lighthouse
    const tower = world.fixtureMeshes.tower.userData.blades;
    if (projectDone(s, 'tower') && !world.reducedMotion) {
      tower.rotation.z += dt * 1.2;
    }
    const lighthouse = world.fixtureMeshes.lighthouse.userData;
    const lit = projectDone(s, 'lighthouse');
    lighthouse.lamp.material.emissive.set(lit ? '#ffd877' : '#000000');
    lighthouse.lamp.material.emissiveIntensity = lit ? (night ? 2 : 0.8) : 0;
    lighthouse.beamPivot.visible = lit && light < 0.35;
    if (lit && !world.reducedMotion) {
      lighthouse.beamPivot.rotation.y += dt * 0.6;
    }

    // clouds drift
    clouds.children.forEach((cloud) => {
      if (!world.reducedMotion) {
        cloud.position.x += dt * cloud.userData.speed;
      }
      if (cloud.position.x > 100) {
        cloud.position.x = -100;
      }
    });

    // rain
    rain.visible = raining;
    if (raining) {
      const pos = rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        let y = pos.getY(i) - dt * 16;
        if (y < 0) {
          y += 20;
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      rain.position.set(player.position.x, 0, player.position.z);
    }

    // highlight pulse, beacon bob
    ring.material.opacity = 0.55 + Math.sin(elapsed * 4) * 0.25;
    beacon.rotation.y += dt;
    beaconRing.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.12);

    // pond shimmer
    ['pond', 'reefpool'].forEach((id) => {
      const water = world.fixtureMeshes[id].userData.water;
      water.material.color.set(night ? '#2f5560' : id === 'reefpool' ? '#69c0c0' : '#6fb0c0');
    });

    // camera
    // zoomed out: the calm 40 degree overview; zoomed in: a low, over-the-shoulder view of the people
    const close = Math.min(1, Math.max(0, (world.zoom - 0.28) / 0.72));
    const dist = 15 * world.zoom;
    camTarget.set(s.pos.x, 0.8 + (1 - close) * 0.55, s.pos.z);
    camera.position.set(camTarget.x + Math.sin(world.yaw) * dist, camTarget.y + dist * (0.3 + 0.533 * close), camTarget.z + Math.cos(world.yaw) * dist);
    camera.lookAt(camTarget);
  };

  world.render = () => renderer.render(scene, camera);
  world.photo = () => {
    renderer.render(scene, camera);
    return canvas.toDataURL('image/png');
  };

  // grass tufts on every island, one instanced draw call
  const tuftGeo = new THREE.ConeGeometry(0.07, 0.38, 3);
  tuftGeo.translate(0, 0.19, 0);
  const tufts = [];
  const grassRng = mulberry32(77);
  const waters = FIXTURES.filter((f) => f.r);
  ISLANDS.forEach((island) => {
    const n = Math.round(island.r * island.r * 0.55);
    const base = new THREE.Color(island.palette ? island.palette.top : '#8db36f');
    for (let i = 0; i < n; i += 1) {
      const a = grassRng() * Math.PI * 2;
      const d = Math.sqrt(grassRng()) * (island.r - 0.9);
      const x = island.x + Math.sin(a) * d;
      const z = island.z + Math.cos(a) * d;
      if (waters.some((f) => Math.hypot(x - f.x, z - f.z) < f.r + 0.4)) {
        continue;
      }
      tufts.push({ x, z, s: 0.6 + grassRng() * 0.8, turn: grassRng() * 6.28, color: base.clone().offsetHSL(0, 0.03, -0.07 - grassRng() * 0.1) });
    }
  });
  const grass = new THREE.InstancedMesh(tuftGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), tufts.length);
  const dummy = new THREE.Object3D();
  tufts.forEach((tuft, i) => {
    dummy.position.set(tuft.x, 0, tuft.z);
    dummy.rotation.set(0, tuft.turn, 0);
    dummy.scale.set(tuft.s, tuft.s, tuft.s);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    grass.setColorAt(i, tuft.color);
  });
  grass.frustumCulled = false;
  scene.add(grass);

  // fireflies drift around you after dusk
  const flyCount = 42;
  const flyBase = new Float32Array(flyCount * 3);
  for (let i = 0; i < flyCount; i += 1) {
    flyBase[i * 3] = (grassRng() - 0.5) * 22;
    flyBase[i * 3 + 1] = 0.4 + grassRng() * 2.2;
    flyBase[i * 3 + 2] = (grassRng() - 0.5) * 22;
  }
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyBase.slice(), 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: '#f6e27a', size: 0.17, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  flies.frustumCulled = false;
  scene.add(flies);

  // Far Skies: each far island's contents sit in one container so whole islands can be culled by distance.
  const farIslands = ISLANDS.filter((i) => i.far);
  farIslands.forEach((island) => {
    const group = new THREE.Group();
    group.userData.island = island;
    world.farGroups[island.id] = group;
  });
  [...scene.children].forEach((child) => {
    if (child.userData.islandBody || child === player || child === pet) {
      return;
    }
    const island = farIslands.find((i) => Math.hypot(child.position.x - i.x, child.position.z - i.z) < i.r + 0.5);
    if (island) {
      world.farGroups[island.id].add(child);
    }
  });
  const farGroupList = Object.values(world.farGroups);
  farGroupList.forEach((group) => scene.add(group));
  world.cullFar = (x, z) => {
    farGroupList.forEach((group) => {
      const island = group.userData.island;
      group.visible = Math.hypot(island.x - x, island.z - z) < 70 + island.r;
    });
  };
  world.artTick = (tod, light, color) => {
    skyDome.position.copy(camera.position);
    const night = Math.max(0, Math.min(1, (0.4 - light) * 3));
    skyUniforms.horizon.value.copy(color).lerp(SKY_NIGHT, 0.45 * night);
    skyUniforms.top.value.copy(color).lerp(SKY_TOP, 0.25 + 0.35 * light).lerp(SKY_NIGHT, 0.8 * night).multiplyScalar(0.55 + 0.45 * light);
    skyUniforms.bottom.value.copy(color).lerp(CLOUD_WHITE, 0.45 * light).lerp(SKY_NIGHT, 0.5 * night);
    cloudSea.material.color.copy(skyUniforms.bottom.value);
    cloudSea.position.x = player.position.x;
    cloudSea.position.z = player.position.z;
    flies.material.opacity = night * 0.95;
    flies.visible = night > 0.01;
    if (flies.visible) {
      const pos = flyGeo.attributes.position;
      for (let i = 0; i < flyCount; i += 1) {
        const t = elapsedArt + i * 1.7;
        pos.array[i * 3] = player.position.x + flyBase[i * 3] + Math.sin(t * 0.5) * 0.8;
        pos.array[i * 3 + 1] = flyBase[i * 3 + 1] + Math.sin(t * 0.9) * 0.25;
        pos.array[i * 3 + 2] = player.position.z + flyBase[i * 3 + 2] + Math.cos(t * 0.4) * 0.8;
      }
      pos.needsUpdate = true;
    }
    world.cullFar(player.position.x, player.position.z);
  };
  let elapsedArt = 0;
  world.artClock = (dt) => {
    elapsedArt += dt;
  };
  world.setQuality(quality);
  return world;
}
