// The 3D world: floating islands, bridges, gathering nodes, machines, villagers, the pet, sky and weather.
// Everything is built from low-poly primitives at start-up, so there are no model downloads.

import * as THREE from '../vendor/three.module.min.js';
import { ISLANDS, BRIDGES, FIXTURES, NODE_SPOTS, NPCS, ITEMS, CROPS } from './data.js';
import {
  mulberry32, bridgeSegment, unlocked, nodeReady, timeOfDay, daylight, isRaining, projectDone, cropProgress,
  energyCapacity,
} from './state.js';

const materialCache = new Map();
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
export function makePerson(color, skin = '#d9b08c') {
  const g = new THREE.Group();
  const body = at(mesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 10), color), 0, 0.72, 0);
  const head = at(mesh(new THREE.SphereGeometry(0.29, 14, 10), skin), 0, 1.38, 0);
  const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const eyeL = at(mesh(eyeGeo, '#1d1d1b'), -0.1, 1.42, 0.26);
  const eyeR = at(mesh(eyeGeo, '#1d1d1b'), 0.1, 1.42, 0.26);
  const footGeo = new THREE.BoxGeometry(0.16, 0.1, 0.26);
  const footL = at(mesh(footGeo, '#3a3530'), -0.13, 0.05, 0.04);
  const footR = at(mesh(footGeo, '#3a3530'), 0.13, 0.05, 0.04);
  const hat = new THREE.Group();
  hat.position.y = 1.6;
  g.add(body, head, eyeL, eyeR, footL, footR, hat);
  g.userData = { body, head, footL, footR, hat, phase: 0 };
  return g;
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
function animatePerson(person, moving, dt, speed = 1) {
  const u = person.userData;
  u.phase += dt * (moving ? 9 * speed : 2);
  const swing = moving ? Math.sin(u.phase) * 0.12 : 0;
  u.footL.position.z = 0.04 + swing;
  u.footR.position.z = 0.04 - swing;
  u.body.position.y = 0.72 + (moving ? Math.abs(Math.sin(u.phase)) * 0.05 : Math.sin(u.phase) * 0.012);
  u.head.position.y = u.body.position.y + 0.66;
  u.hat.position.y = u.head.position.y + 0.22;
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
  const top = at(mesh(new THREE.CylinderGeometry(island.r, island.r * 0.98, 0.6, 48), '#8db36f'), 0, -0.3, 0);
  top.castShadow = false;
  const rim = at(mesh(new THREE.CylinderGeometry(island.r * 0.985, island.r * 0.9, 1.2, 48), '#93704c'), 0, -1.2, 0);
  const underGeo = jitter(new THREE.ConeGeometry(island.r * 0.9, island.r * 1.15, 14, 4), rng, 1.3, true);
  const under = at(mesh(underGeo, '#8f8a80'), 0, -1.8 - island.r * 0.575, 0);
  under.rotation.x = Math.PI;
  g.add(top, rim, under);
  // a few hanging roots and crystals under the island for silhouette
  for (let i = 0; i < 5; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = island.r * (0.3 + rng() * 0.4);
    const crystal = at(mesh(new THREE.OctahedronGeometry(0.4 + rng() * 0.3, 0), '#9fd3cf', { roughness: 0.4 }), Math.sin(a) * d, -3 - rng() * island.r * 0.5, Math.cos(a) * d);
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
function makeNode(type, rng) {
  const g = new THREE.Group();
  const ud = { type, parts: {} };
  if (type === 'tree') {
    const trunk = at(mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.2, 6), '#7a5636'), 0, 0.6, 0);
    const crown = new THREE.Group();
    const greens = ['#5d8f45', '#6a9c4c', '#4f8040', '#78a656'];
    const big = at(mesh(new THREE.IcosahedronGeometry(0.95, 0), greens[Math.floor(rng() * 4)]), 0, 1.7, 0);
    const small = at(mesh(new THREE.IcosahedronGeometry(0.65, 0), greens[Math.floor(rng() * 4)]), 0.35, 2.35, 0.1);
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
    const bush = at(mesh(new THREE.IcosahedronGeometry(0.55, 0), type === 'bush' ? '#7aa35a' : '#5d8f45'), 0, 0.38, 0);
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

  const world = {
    renderer, scene, camera, yaw: 0, zoom: 1, interactables: [], nodeMeshes: [], placedMeshes: new Map(),
    pickables: [], peers: new Map(), npcMeshes: {}, fixtureMeshes: {}, bridgeGroups: {}, unlockKey: '',
    reducedMotion: false, ghost: null, quality,
  };

  // islands
  const rng = mulberry32(42);
  ISLANDS.forEach((island) => scene.add(makeIsland(island, rng)));
  // little floating rocks for depth
  for (let i = 0; i < 9; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = 45 + rng() * 30;
    const chunk = at(mesh(jitter(new THREE.DodecahedronGeometry(1 + rng() * 1.6, 0), rng, 0.6, false), '#8f8a80'), Math.sin(a) * d, -4 + rng() * 10, Math.cos(a) * d - 10);
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
    register({ key: `f:${f.id}`, kind: f.kind, id: f.id, x: f.x, z: f.z, r: radius, project: f.project }, object);
  });

  // gathering nodes
  const nodeRng = mulberry32(7);
  NODE_SPOTS.forEach(([type, x, z], index) => {
    const object = at(makeNode(type, nodeRng), x, 0, z);
    object.rotation.y = nodeRng() * Math.PI * 2;
    scene.add(object);
    world.nodeMeshes[index] = object;
    register({ key: `n:${index}`, kind: 'node', nodeType: type, index, x, z, r: 1.35 }, object);
  });

  // villagers
  Object.entries(NPCS).forEach(([id, npc]) => {
    const person = at(makePerson(npc.color), npc.x, 0, npc.z);
    person.rotation.y = id === 'sari' ? 0 : Math.PI * 0.8;
    const label = at(makeLabel(npc.name), 0, 2.2, 0);
    person.add(label);
    if (id === 'sari') {
      setHat(person, 'hat_straw');
    } else if (id === 'bayu') {
      setHat(person, 'hat_cap');
    }
    scene.add(person);
    world.npcMeshes[id] = person;
    register({ key: `p:${id}`, kind: 'npc', id, x: npc.x, z: npc.z, r: 1.5 }, person);
  });

  // player and pet
  const player = makePerson('#3f7d4e');
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
    const key = ['bridge', 'tower', 'dock', 'lighthouse'].map((id) => (projectDone(s, id) ? 1 : 0)).join('');
    if (key === world.unlockKey) {
      return;
    }
    world.unlockKey = key;
    BRIDGES.forEach((bridge) => {
      if (world.bridgeGroups[bridge.id]) {
        scene.remove(world.bridgeGroups[bridge.id]);
      }
      const group = makeBridge(bridgeSegment(bridge), !unlocked(s, bridge.needs));
      world.bridgeGroups[bridge.id] = group;
      scene.add(group);
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
    const person = makePerson(info.color);
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

  world.setPlayerLook = (color, hat) => {
    player.userData.body.material = mat(color);
    setHat(player, hat);
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
    sky.copy(tmpColor);
    scene.fog.color.copy(tmpColor);
    const sunAngle = (tod - 0.25) * Math.PI * 2;
    sun.position.set(player.position.x + Math.cos(sunAngle) * 40, Math.max(6, Math.sin(sunAngle) * 50), player.position.z + 18);
    sun.target.position.set(player.position.x, 0, player.position.z);
    sun.intensity = 0.15 + 1.35 * light * (raining ? 0.55 : 1);
    sun.color.set(light < 0.4 ? '#ffd2a8' : '#fff4e0');
    hemi.intensity = 0.32 + 0.5 * light;
    hemi.color.set(light < 0.1 ? '#8fa6c8' : '#e8f2f6');

    // player
    player.position.set(s.pos.x, 0, s.pos.z);
    player.rotation.y = s.pos.f;
    animatePerson(player, moving, dt, speed);
    if (actionPulse > 0) {
      player.userData.body.rotation.x = Math.sin(actionPulse * Math.PI) * 0.25;
    } else {
      player.userData.body.rotation.x = 0;
    }
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
    const dist = 15 * world.zoom;
    camTarget.set(s.pos.x, 0.8, s.pos.z);
    camera.position.set(camTarget.x + Math.sin(world.yaw) * dist, camTarget.y + 12.5 * world.zoom, camTarget.z + Math.cos(world.yaw) * dist);
    camera.lookAt(camTarget);
  };

  world.render = () => renderer.render(scene, camera);
  world.photo = () => {
    renderer.render(scene, camera);
    return canvas.toDataURL('image/png');
  };
  world.setQuality(quality);
  return world;
}
