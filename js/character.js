// People in Teduh: a jointed, smooth-shaded human (hips, spine, neck, head, shoulders, elbows, wrists,
// hips, knees, ankles) with a real face (brow ridge, eyes with iris and lids, nose, lips, ears), ten hair
// styles including a hijab, and layered clothes (batik and sarong get a woven pattern). Everything is
// procedural, so there is nothing to download. The same rig walks, idles, breathes, blinks and swings tools.
// Also exports a small turntable renderer for the character creator.

import * as THREE from '../vendor/three.module.min.js';
import { sanitizeLook, HEIGHTS } from './look.js';

const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) {
    geoCache.set(key, make());
  }
  return geoCache.get(key);
}

const ROUGHNESS = { skin: 0.6, hair: 0.5, eye: 0.12, shoe: 0.55, dark: 0.5, cloth: 0.9 };
const matCache = new Map();

// Fine strand streaks, shared by every hair material and tinted by its colour, so hair reads as hair
// rather than as a painted shell. Lines run along the texture's v axis, which follows the scalp from the
// crown down on the sphere caps.
let strandTexture = null;
function strands() {
  if (strandTexture || typeof document === 'undefined') {
    return strandTexture;
  }
  const w = 256;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  g.fillStyle = '#d9d9d9';
  g.fillRect(0, 0, w, h);
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 520; i += 1) {
    const x = rand() * w;
    const light = rand() < 0.45;
    g.strokeStyle = light ? `rgba(255,255,255,${0.25 + rand() * 0.35})` : `rgba(0,0,0,${0.18 + rand() * 0.3})`;
    g.lineWidth = 0.6 + rand() * 1.1;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + (rand() - 0.5) * 6, h * 0.35, x + (rand() - 0.5) * 6, h * 0.7, x + (rand() - 0.5) * 4, h);
    g.stroke();
  }
  strandTexture = new THREE.CanvasTexture(canvas);
  strandTexture.wrapS = THREE.RepeatWrapping;
  strandTexture.wrapT = THREE.RepeatWrapping;
  strandTexture.repeat.set(3, 1);
  strandTexture.colorSpace = THREE.SRGBColorSpace;
  return strandTexture;
}

function mat(color, kind = 'cloth', extra = {}) {
  const key = `${kind}:${color}:${JSON.stringify(extra)}`;
  if (!matCache.has(key)) {
    const options = { color, roughness: ROUGHNESS[kind] ?? 0.9, metalness: 0, ...extra };
    if (kind === 'hair') {
      const map = strands();
      if (map) {
        // the streak map darkens the base a little, so lift the tint to keep the chosen shade
        options.map = map;
        options.color = shade(color, 0.08);
      }
    }
    matCache.set(key, new THREE.MeshStandardMaterial(options));
  }
  return matCache.get(key);
}

function shade(hex, amount) {
  const c = new THREE.Color(hex);
  if (amount < 0) {
    c.lerp(new THREE.Color('#000000'), -amount);
  } else {
    c.lerp(new THREE.Color('#ffffff'), amount);
  }
  return `#${c.getHexString()}`;
}
function mix(a, b, t) {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

// Woven cloth: a small canvas pattern, cached per colour pair.
function patternMat(base, accent, kind) {
  const key = `pattern:${kind}:${base}:${accent}`;
  if (matCache.has(key)) {
    return matCache.get(key);
  }
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = accent;
  g.fillStyle = accent;
  if (kind === 'batik') {
    // kawung-like motif: four leaf ovals around a dot, repeated
    g.lineWidth = 3;
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        const cx = 32 + x * 64;
        const cy = 32 + y * 64;
        for (let k = 0; k < 4; k += 1) {
          const a = (k * Math.PI) / 2 + Math.PI / 4;
          g.beginPath();
          g.ellipse(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, 13, 7, a, 0, Math.PI * 2);
          g.stroke();
        }
        g.beginPath();
        g.arc(cx, cy, 3.5, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 0.35;
    g.lineWidth = 1.5;
    for (let i = 0; i < size; i += 64) {
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(size, i);
      g.moveTo(i, 0);
      g.lineTo(i, size);
      g.stroke();
    }
  } else {
    // sarong: woven checks with a thin stripe
    g.globalAlpha = 0.55;
    for (let i = 0; i < size; i += 32) {
      g.fillRect(i, 0, 12, size);
      g.fillRect(0, i, size, 12);
    }
    g.globalAlpha = 0.9;
    g.lineWidth = 2;
    for (let i = 22; i < size; i += 32) {
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(size, i);
      g.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'batik' ? 3 : 4, kind === 'batik' ? 2 : 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  matCache.set(key, material);
  return material;
}

function part(geometry, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
}
const lathe = (key, points, segments = 28) => geo(`lathe:${key}`, () => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments));
const capsule = (r, len) => geo(`cap:${r}:${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 14));
const sphere = (r, w = 24, h = 16) => geo(`sph:${r}:${w}:${h}`, () => new THREE.SphereGeometry(r, w, h));
// A tapered limb, smooth along its whole length: top joint at y = 0, bottom joint at y = -len.
// rMid sits at a fraction `at` of the length, which gives a biceps, forearm, thigh or calf bulge.
const limb = (rTop, rMid, rBot, len, at = 0.3) => geo(`limb:${rTop}:${rMid}:${rBot}:${len}:${at}`, () => {
  const knots = [
    [0.001, -len - rBot * 0.95],
    [rBot * 0.72, -len - rBot * 0.62],
    [rBot, -len],
    [(rBot + rMid) * 0.5, -len * (0.5 + at * 0.5)],
    [rMid, -len * at],
    [rTop * 0.99, -len * 0.08],
    [rTop * 0.8, rTop * 0.22],
    [0.001, rTop * 0.34],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const smooth = new THREE.SplineCurve(knots).getPoints(30);
  smooth[0].x = 0.001;
  smooth[smooth.length - 1].x = 0.001;
  return new THREE.LatheGeometry(smooth, 22);
});
const sphereSeg = (key, args) => geo(`seg:${key}`, () => new THREE.SphereGeometry(1, 36, 22, ...args));

// Profiles, metres. Hips joint at y = 0.9; head centre ends at about 1.6; top of head about 1.73.
const PELVIS = [[0.001, -0.1], [0.09, -0.1], [0.145, -0.06], [0.158, 0], [0.152, 0.06], [0.142, 0.115]];
const TORSO = [[0.141, -0.02], [0.134, 0.04], [0.138, 0.12], [0.155, 0.22], [0.166, 0.3], [0.162, 0.35], [0.14, 0.39], [0.1, 0.415], [0.05, 0.425], [0.001, 0.428]];
const SKIRT = [[0.146, 0.11], [0.162, 0], [0.19, -0.2], [0.232, -0.42]];
const SARONG = [[0.146, 0.11], [0.162, 0], [0.18, -0.25], [0.19, -0.5], [0.196, -0.72]];
const HIJAB_DRAPE = [[0.097, -0.088], [0.112, -0.135], [0.148, -0.168], [0.19, -0.19], [0.212, -0.205], [0.218, -0.218]];

const BUILD_WIDTH = { slim: 0.9, average: 1, sturdy: 1.14 };
const FACE_SHAPES = {
  oval: { skull: [0.94, 1.17, 1.05], jaw: [1.0, 0.95, 1.08], jawY: -0.05 },
  round: { skull: [1.0, 1.12, 1.05], jaw: [1.12, 0.9, 1.08], jawY: -0.048 },
  square: { skull: [0.98, 1.15, 1.03], jaw: [1.17, 0.86, 1.05], jawY: -0.055 },
};

function buildHead(head, L, j) {
  const skinTone = L.skin;
  const skin = mat(skinTone, 'skin');
  const face = FACE_SHAPES[L.face];
  const skull = part(sphere(0.1, 36, 26), skin);
  skull.scale.set(...face.skull);
  const jaw = part(sphere(0.072, 30, 20), skin, 0, face.jawY - 0.01, 0.004);
  jaw.scale.set(face.jaw[0] * 0.98, face.jaw[1] * 0.95, face.jaw[2] * 0.93);
  const browRidge = part(sphere(0.05, 24, 12), skin, 0, 0.045, 0.074, false);
  browRidge.scale.set(1.5, 0.3, 0.42);
  head.add(skull, jaw, browRidge);

  // nose
  const bridge = part(capsule(0.0085, 0.036), skin, 0, -0.004, 0.097, false);
  bridge.rotation.x = 0.42;
  bridge.scale.set(1, 1, 0.8);
  const tip = part(sphere(0.0135, 16, 12), skin, 0, -0.027, 0.106, false);
  tip.scale.set(1.2, 0.85, 0.95);
  const wingGeo = sphere(0.0085, 12, 8);
  head.add(bridge, tip, part(wingGeo, skin, 0.012, -0.031, 0.1, false), part(wingGeo, skin, -0.012, -0.031, 0.1, false));

  // ears
  const earGeo = sphere(0.026, 14, 10);
  [1, -1].forEach((side) => {
    const ear = part(earGeo, mat(shade(skinTone, -0.06), 'skin'), side * 0.092, 0.0, -0.006, false);
    ear.scale.set(0.42, 1, 0.75);
    ear.rotation.y = side * 0.3;
    head.add(ear);
  });

  // eyes: white, iris cap, pupil cap, catchlight, upper lid with lash line (the lid rotates to blink)
  const white = mat('#f4f1ea', 'eye');
  const iris = mat(L.eyes, 'eye');
  const pupil = mat('#0d0b0a', 'eye');
  const shine = mat('#ffffff', 'eye', { emissive: '#ffffff', emissiveIntensity: 0.6 });
  const lidMat = mat(shade(skinTone, -0.04), 'skin');
  const lash = mat('#1b1512', 'dark');
  j.lids = [];
  [1, -1].forEach((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.036, 0.022, 0.08);
    eye.add(part(sphere(0.0155, 20, 14), white, 0, 0, 0, false));
    const irisCap = part(sphereSeg('iris', [0, Math.PI * 2, 0, 0.62]), iris, 0, 0, 0, false);
    irisCap.scale.setScalar(0.0158);
    irisCap.rotation.x = Math.PI / 2;
    const pupilCap = part(sphereSeg('pupil', [0, Math.PI * 2, 0, 0.27]), pupil, 0, 0, 0, false);
    pupilCap.scale.setScalar(0.0161);
    pupilCap.rotation.x = Math.PI / 2;
    const glint = part(sphere(0.0022, 8, 6), shine, side * 0.004 + 0.002, 0.004, 0.0158, false);
    const lid = new THREE.Group();
    lid.add(part(sphereSeg('lid', [0, Math.PI * 2, 0, Math.PI / 2]), lidMat, 0, 0, 0, false));
    lid.children[0].scale.setScalar(0.0168);
    const lashLine = part(geo('lash', () => new THREE.TorusGeometry(0.0168, 0.0016, 5, 18, Math.PI)), lash, 0, 0, 0, false);
    lashLine.rotation.x = Math.PI / 2;
    lid.add(lashLine);
    lid.rotation.x = -0.5;
    eye.add(irisCap, pupilCap, glint, lid);
    head.add(eye);
    j.lids.push(lid);
  });

  // brows
  const browGeo = capsule(0.0046, 0.03);
  [1, -1].forEach((side) => {
    const brow = part(browGeo, mat(L.hair === 'bald' || L.hair === 'hijab' ? shade(L.hairColor, 0) : L.hairColor, 'hair'), side * 0.037, 0.054, 0.1, false);
    brow.rotation.z = Math.PI / 2 + side * 0.12;
    head.add(brow);
  });

  // lips
  const lipColor = mix(skinTone, '#9a3f37', 0.35);
  const lipForward = L.facial === 'beard' ? 0.007 : 0;
  const upper = part(capsule(0.0045, 0.022), mat(lipColor, 'skin'), 0, -0.0535, 0.093 + lipForward, false);
  upper.rotation.z = Math.PI / 2;
  upper.scale.set(1, 1, 0.8);
  const lower = part(capsule(0.0058, 0.016), mat(shade(lipColor, 0.05), 'skin'), 0, -0.0605, 0.091 + lipForward, false);
  lower.rotation.z = Math.PI / 2;
  lower.scale.set(1, 1, 0.8);
  const line = part(geo('mouthline', () => new THREE.BoxGeometry(0.026, 0.0014, 0.003)), mat(shade(lipColor, -0.45), 'dark'), 0, -0.0572, 0.0965 + lipForward, false);
  head.add(upper, lower, line);

  buildHair(head, L, j);
  buildFacialHair(head, L, face);
}

function hairCap(head, material, radii, theta, tilt, y = 0.004) {
  const cap = part(sphereSeg(`cap${theta}`, [0, Math.PI * 2, 0, theta]), material, 0, y, -0.004);
  cap.scale.set(...radii);
  cap.rotation.x = tilt;
  head.add(cap);
  return cap;
}

function buildHair(head, L, j) {
  const hair = mat(L.hairColor, 'hair');
  const hairDouble = mat(L.hairColor, 'hair', { side: THREE.DoubleSide });
  const style = L.hair;
  if (style === 'bald') {
    return;
  }
  if (style === 'hijab') {
    const scarf = mat(L.accent, 'cloth', { side: THREE.DoubleSide });
    const radii = [0.116, 0.141, 0.129];
    const under = part(sphereSeg('cap1.3', [0, Math.PI * 2, 0, 1.3]), mat(shade(L.accent, -0.22), 'cloth'), 0, 0.004, -0.002);
    under.scale.set(0.1, 0.123, 0.111);
    under.rotation.x = -0.32;
    const top = part(sphereSeg('hijabTop', [0, Math.PI * 2, 0, 0.98]), scarf, 0, 0.004, -0.008);
    top.scale.set(...radii);
    const sides = part(sphereSeg('hijabSides', [Math.PI / 2 + 0.5, Math.PI * 2 - 1.0, 0.92, 1.72]), scarf, 0, 0.004, -0.008);
    sides.scale.set(...radii);
    const drape = part(lathe('hijabDrape', HIJAB_DRAPE, 36), scarf);
    drape.scale.set(1, 1, 0.8);
    drape.position.z = -0.006;
    head.add(under, top, sides, drape);
    return;
  }
  const cropped = style === 'crop';
  const radii = cropped ? [0.099, 0.122, 0.11] : [0.104, 0.128, 0.116];
  hairCap(head, cropped ? mat(shade(L.hairColor, 0.04), 'hair', { roughness: 0.8 }) : hair, radii, 1.48, -0.61);
  if (style === 'short') {
    const fringe = part(sphere(0.05, 20, 12), hair, 0.0, 0.088, 0.072);
    fringe.scale.set(1.55, 0.42, 0.62);
    fringe.rotation.x = -0.35;
    head.add(fringe);
  } else if (style === 'side') {
    const fringe = part(sphere(0.06, 24, 14), hair, 0.024, 0.086, 0.066);
    fringe.scale.set(1.45, 0.48, 0.9);
    fringe.rotation.z = -0.32;
    head.add(fringe);
  } else if (style === 'curly') {
    const curlGeo = geo('curl', () => new THREE.IcosahedronGeometry(0.024, 1));
    const count = 70;
    const axis = new THREE.Vector3(0, Math.cos(0.61), -Math.sin(0.61));
    for (let i = 0; i < count; i += 1) {
      const yv = 1 - (i / (count - 1)) * 2;
      const rad = Math.sqrt(1 - yv * yv);
      const a = i * 2.39996;
      const dir = new THREE.Vector3(Math.cos(a) * rad, yv, Math.sin(a) * rad);
      if (dir.angleTo(axis) > 1.45) {
        continue;
      }
      const curl = part(curlGeo, hair, dir.x * 0.112, 0.004 + dir.y * 0.136, -0.004 + dir.z * 0.124, false);
      curl.rotation.set(a, a * 0.7, 0);
      head.add(curl);
    }
  } else if (style === 'bob' || style === 'long') {
    const end = style === 'bob' ? 2.25 : 2.55;
    const curtain = part(sphereSeg(`curtain${end}`, [Math.PI / 2 + 0.78, Math.PI * 2 - 1.56, 0.9, end - 0.9]), hairDouble, 0, 0.004, -0.004);
    curtain.scale.set(0.113, 0.136, 0.123);
    head.add(curtain);
    if (style === 'long') {
      const back = part(capsule(0.05, 0.17), hair, 0, -0.205, -0.075);
      back.scale.set(2.05, 1, 0.55);
      back.rotation.x = 0.16;
      head.add(back);
      j.tail = back;
      j.tailRest = 0.16;
    }
  } else if (style === 'ponytail') {
    const tie = part(sphere(0.019, 12, 10), mat(shade(L.hairColor, -0.3), 'hair'), 0, 0.03, -0.118, false);
    const tail = new THREE.Group();
    tail.position.set(0, 0.03, -0.122);
    const strand = part(capsule(0.028, 0.15), hair, 0, -0.1, -0.012);
    strand.scale.set(1, 1, 0.85);
    tail.add(strand);
    tail.rotation.x = 0.35;
    head.add(tie, tail);
    j.tail = tail;
    j.tailRest = 0.35;
  } else if (style === 'bun') {
    const bun = part(sphere(0.047, 20, 14), hair, 0, 0.088, -0.083);
    bun.scale.set(1, 0.9, 1);
    const band = part(geo('bunband', () => new THREE.TorusGeometry(0.036, 0.006, 6, 20)), mat(shade(L.hairColor, -0.3), 'hair'), 0, 0.07, -0.07, false);
    band.rotation.x = Math.PI / 2 - 0.7;
    head.add(bun, band);
  }
}

function buildFacialHair(head, L, face) {
  if (L.facial === 'none' || L.hair === 'hijab') {
    return;
  }
  const hair = mat(L.hairColor, 'hair');
  if (L.facial === 'stubble') {
    const shell = part(sphere(0.0775, 30, 20), mat(L.hairColor, 'hair', { transparent: true, opacity: 0.32, depthWrite: false }), 0, face.jawY - 0.004, 0.019, false);
    shell.scale.set(...face.jaw);
    head.add(shell);
    return;
  }
  const moustache = part(capsule(0.0075, 0.034), hair, 0, -0.0445, 0.103, false);
  moustache.rotation.z = Math.PI / 2;
  head.add(moustache);
  if (L.facial === 'beard') {
    const beard = part(sphere(1, 30, 20), hair, 0, -0.077, 0.016);
    beard.scale.set(0.086, 0.07, 0.091);
    head.add(beard);
  }
}

function buildRig(look) {
  const L = sanitizeLook(look);
  const w = BUILD_WIDTH[L.build];
  const rig = new THREE.Group();
  const j = {};
  const skin = mat(L.skin, 'skin');
  const top = L.top === 'batik' ? patternMat(L.topColor, shade(L.accent, 0), 'batik') : mat(L.topColor, 'cloth');
  const topTrim = mat(shade(L.topColor, -0.18), 'cloth');
  const bottom = L.bottom === 'sarong' ? patternMat(L.bottomColor, L.accent, 'sarong') : mat(L.bottomColor, 'cloth');
  const shoe = mat(L.shoes, 'shoe');
  const sole = mat(shade(L.shoes, -0.45), 'dark');

  // hips and pelvis
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  rig.add(hips);
  j.hips = hips;
  const longSkirt = L.bottom === 'skirt' || L.bottom === 'sarong';
  const pelvis = part(lathe('pelvis', PELVIS), longSkirt ? bottom : bottom);
  pelvis.scale.set(w, 1, 0.72 * w);
  hips.add(pelvis);
  if (L.bottom === 'trousers' || L.bottom === 'shorts') {
    const belt = part(geo('belt', () => new THREE.TorusGeometry(0.143, 0.011, 6, 30)), mat('#3a2a1e', 'dark'), 0, 0.1, 0, false);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(w, 0.72 * w, 1);
    hips.add(belt);
  }
  if (longSkirt) {
    const skirt = part(lathe(L.bottom, L.bottom === 'skirt' ? SKIRT : SARONG, 32), L.bottom === 'skirt' ? mat(L.bottomColor, 'cloth', { side: THREE.DoubleSide }) : bottom);
    skirt.scale.set(w, 1, 0.82 * w);
    hips.add(skirt);
  }

  // spine and torso
  const spine = new THREE.Group();
  spine.position.y = 0.1;
  hips.add(spine);
  j.spine = spine;
  const torso = part(lathe('torso', TORSO), top);
  torso.scale.set(w, 1, 0.72 * w);
  spine.add(torso);
  j.torso = torso;
  j.torsoScale = [w, 0.72 * w];
  if (L.top !== 'tank') {
    const collar = part(geo('collar', () => new THREE.TorusGeometry(0.054, 0.012, 8, 22)), topTrim, 0, 0.41, 0.004, false);
    collar.rotation.x = Math.PI / 2 - 0.15;
    spine.add(collar);
  }
  if (L.top === 'jacket') {
    const shirt = part(capsule(0.03, 0.2), mat(L.accent, 'cloth'), 0, 0.23, 0.104 * w, false);
    shirt.scale.set(1, 1, 0.35);
    const zipL = part(geo('lapel', () => new THREE.BoxGeometry(0.012, 0.3, 0.012)), topTrim, 0.032, 0.21, 0.108 * w, false);
    const zipR = zipL.clone();
    zipR.position.x = -0.032;
    spine.add(shirt, zipL, zipR);
  }

  // neck and head
  const neck = new THREE.Group();
  neck.position.y = 0.42;
  spine.add(neck);
  j.neck = neck;
  neck.add(part(geo('neck', () => new THREE.CylinderGeometry(0.043, 0.05, 0.14, 18)), skin, 0, 0.05, 0));
  const head = new THREE.Group();
  head.position.set(0, 0.155, 0.006);
  neck.add(head);
  j.head = head;
  buildHead(head, L, j);

  // arms
  const longSleeve = L.top === 'long' || L.top === 'jacket';
  const shortSleeve = L.top === 'tee' || L.top === 'batik';
  j.arms = [];
  j.elbows = [];
  [1, -1].forEach((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.188 * w, 0.355, 0);
    shoulder.rotation.z = side * 0.07;
    spine.add(shoulder);
    // a rounded deltoid so the arm grows out of the shoulder instead of starting as a flat cylinder
    const deltoid = part(sphere(longSleeve || shortSleeve ? 0.052 : 0.048, 18, 12), longSleeve || shortSleeve ? top : skin, -side * 0.008, -0.014, 0, false);
    deltoid.scale.set(w, 0.9, 0.9 * w);
    shoulder.add(deltoid);
    const upper = part(longSleeve ? limb(0.054, 0.052, 0.044, 0.275, 0.35) : limb(0.048, 0.046, 0.034, 0.275, 0.38), longSleeve ? top : skin, 0, 0, 0);
    upper.scale.set(w, 1, w);
    shoulder.add(upper);
    if (shortSleeve) {
      const sleeve = part(capsule(0.056, 0.07), top, 0, -0.056, 0);
      sleeve.scale.set(w, 1, w);
      shoulder.add(sleeve);
    }
    const elbow = new THREE.Group();
    elbow.position.y = -0.275;
    elbow.rotation.x = -0.15;
    shoulder.add(elbow);
    const elbowBall = part(sphere(longSleeve ? 0.043 : 0.034, 14, 10), longSleeve ? top : skin, 0, 0, 0, false);
    elbowBall.scale.set(w, 1, w);
    elbow.add(elbowBall);
    const fore = part(longSleeve ? limb(0.044, 0.044, 0.037, 0.21, 0.3) : limb(0.035, 0.038, 0.025, 0.235, 0.24), longSleeve ? top : skin, 0, 0, 0);
    fore.scale.set(w, 1, w);
    elbow.add(fore);
    if (longSleeve) {
      const cuff = part(geo('cuff', () => new THREE.TorusGeometry(0.038, 0.008, 6, 16)), topTrim, 0, -0.205, 0, false);
      cuff.rotation.x = Math.PI / 2;
      elbow.add(cuff);
    }
    const wrist = new THREE.Group();
    wrist.position.y = -0.235;
    elbow.add(wrist);
    const palm = part(sphere(0.04, 18, 12), skin, 0, -0.04, 0.002);
    palm.scale.set(0.8, 1.0, 0.48);
    const thumb = part(capsule(0.0105, 0.03), skin, -side * 0.027, -0.038, 0.014, false);
    thumb.rotation.z = -side * 0.55;
    thumb.rotation.x = 0.3;
    wrist.add(palm, thumb);
    // four fingers, slightly curled and of natural lengths
    const fingerGeo = capsule(0.0082, 0.034);
    [[-0.021, 0.86], [-0.007, 1], [0.007, 0.97], [0.02, 0.8]].forEach(([x, length]) => {
      const finger = part(fingerGeo, skin, x * side, -0.088 + (1 - length) * 0.02, 0.006, false);
      finger.scale.set(1, length, 1);
      finger.rotation.x = 0.28;
      wrist.add(finger);
    });
    j.arms.push(shoulder);
    j.elbows.push(elbow);
  });

  // legs
  const covered = L.bottom === 'trousers';
  j.thighs = [];
  j.knees = [];
  j.ankles = [];
  [1, -1].forEach((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.085 * w, -0.03, 0);
    hips.add(hip);
    const thigh = part(covered ? limb(0.078, 0.072, 0.06, 0.41, 0.3) : limb(0.074, 0.068, 0.047, 0.41, 0.28), covered ? bottom : skin, 0, 0, 0);
    thigh.scale.set(w, 1, w);
    hip.add(thigh);
    if (L.bottom === 'shorts') {
      // an open, slightly flared tube from the hip to mid-thigh, so no seam or cap shows
      const leg = part(geo('shortsLeg', () => new THREE.LatheGeometry(
        [[0.086, -0.215], [0.084, -0.12], [0.083, -0.02], [0.08, 0.06], [0.07, 0.09]].map(([r, y]) => new THREE.Vector2(r, y)), 22)),
        bottom, 0, 0, 0);
      leg.scale.set(w, 1, w);
      hip.add(leg);
    }
    const knee = new THREE.Group();
    knee.position.y = -0.41;
    hip.add(knee);
    const kneeBall = part(sphere(covered ? 0.06 : 0.045, 16, 12), covered ? bottom : skin, 0, 0, 0.004, false);
    kneeBall.scale.set(w, 1, w);
    knee.add(kneeBall);
    const shin = part(covered ? limb(0.06, 0.058, 0.052, 0.38, 0.3) : limb(0.049, 0.054, 0.031, 0.39, 0.3), covered ? bottom : skin, 0, 0, 0);
    shin.scale.set(w, 1, w);
    knee.add(shin);
    const ankle = new THREE.Group();
    ankle.position.y = -0.41;
    knee.add(ankle);
    const foot = part(sphere(0.05, 18, 12), shoe, 0, -0.012, 0.042);
    foot.scale.set(1, 0.78, 2.3);
    const soleMesh = part(geo('sole', () => new THREE.BoxGeometry(0.098, 0.018, 0.245)), sole, 0, -0.043, 0.042, false);
    ankle.add(foot, soleMesh);
    j.thighs.push(hip);
    j.knees.push(knee);
    j.ankles.push(ankle);
  });

  rig.scale.setScalar(HEIGHTS[L.height]);
  return { rig, joints: j, look: L, stride: L.bottom === 'sarong' ? 0.28 : L.bottom === 'skirt' ? 0.38 : 0.46 };
}

// A person: the outer group keeps position and rotation in the world; the rig inside can be rebuilt.
export function makeCharacter(look) {
  const person = new THREE.Group();
  const hat = new THREE.Group();
  hat.scale.setScalar(0.42);
  person.userData = { hat, phase: Math.random() * 6, time: Math.random() * 5, walk: 0, blinkAt: 1 + Math.random() * 3 };
  applyLook(person, look);
  return person;
}

export function applyLook(person, look) {
  const u = person.userData;
  if (u.rig) {
    person.remove(u.rig);
  }
  const built = buildRig(look);
  u.rig = built.rig;
  u.joints = built.joints;
  u.look = built.look;
  u.stride = built.stride;
  u.body = built.joints.spine;
  u.head = built.joints.head;
  u.hat.position.set(0, 0.112, -0.004);
  built.joints.head.add(u.hat);
  person.add(built.rig);
}

// moving: walking this frame; speed: 1 walk, >1 run; action: 0..1 tool swing pulse
export function animateCharacter(person, moving, dt, speed = 1, action = 0) {
  const u = person.userData;
  const j = u.joints;
  if (!j) {
    return;
  }
  u.time += dt;
  u.walk += ((moving ? 1 : 0) - u.walk) * Math.min(1, dt * 8);
  if (moving) {
    u.phase += dt * 7.2 * Math.min(speed, 1.6);
  }
  const amt = u.walk;
  const t = u.time;
  const s = Math.sin(u.phase);
  const c = Math.cos(u.phase);
  const stride = u.stride;

  // legs: thighs swing, knees fold during the swing phase, ankles keep the foot near level
  const thighA = -s * stride * amt;
  const thighB = s * stride * amt;
  const kneeA = 0.04 + Math.max(0, c) * 0.85 * amt;
  const kneeB = 0.04 + Math.max(0, -c) * 0.85 * amt;
  j.thighs[0].rotation.x = thighA;
  j.thighs[1].rotation.x = thighB;
  j.knees[0].rotation.x = kneeA;
  j.knees[1].rotation.x = kneeB;
  j.ankles[0].rotation.x = -(thighA + kneeA) * 0.85;
  j.ankles[1].rotation.x = -(thighB + kneeB) * 0.85;

  // body: bob, hip sway and counter-rotating shoulders; idle breathing and weight shift
  const breathe = Math.sin(t * 1.7);
  j.hips.position.y = 0.9 - 0.022 * amt * Math.abs(s) - 0.004 * (1 - amt);
  j.hips.rotation.y = 0.07 * s * amt;
  j.hips.rotation.z = 0.02 * Math.sin(t * 0.5) * (1 - amt);
  j.spine.rotation.y = -0.12 * s * amt;
  j.spine.rotation.x = 0.04 * amt * speed + 0.22 * action;
  j.torso.scale.x = j.torsoScale[0] * (1 + 0.012 * breathe);
  j.torso.scale.z = j.torsoScale[1] * (1 + 0.016 * breathe);

  // arms swing against the legs; elbows bend more on the forward swing; a tool swing lifts both
  const idleSway = Math.sin(t * 0.9) * 0.03 * (1 - amt);
  j.arms[0].rotation.x = s * 0.42 * amt + idleSway - 1.25 * action;
  j.arms[1].rotation.x = -s * 0.42 * amt - idleSway - 1.6 * action;
  j.elbows[0].rotation.x = -0.15 - Math.max(0, -s) * 0.35 * amt - 0.5 * action;
  j.elbows[1].rotation.x = -0.15 - Math.max(0, s) * 0.35 * amt - 0.5 * action;

  // head: steady while walking, a slow look around while idle
  j.head.rotation.y = 0.1 * s * amt + Math.sin(t * 0.37) * 0.22 * (1 - amt);
  j.head.rotation.x = Math.sin(t * 0.23) * 0.05 * (1 - amt) - 0.04 * action;
  if (j.tail) {
    j.tail.rotation.x = j.tailRest + 0.1 * Math.sin(u.phase * 2) * amt + 0.03 * breathe;
  }

  // blink every few seconds
  if (t > u.blinkAt) {
    const k = (t - u.blinkAt) / 0.16;
    const closed = k >= 1 ? 0 : Math.sin(k * Math.PI);
    j.lids.forEach((lid) => {
      lid.rotation.x = -0.5 + closed * 1.75;
    });
    if (k >= 1) {
      u.blinkAt = t + 2.2 + Math.random() * 3.5;
    }
  }
}

// ---------- turntable for the character creator ----------
export function createPreview(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 30);
  scene.add(new THREE.HemisphereLight('#eef3f2', '#8a8c6a', 1.35));
  const fill = new THREE.DirectionalLight('#fff6ea', 0.9);
  fill.position.set(-0.6, 1.6, 3.2);
  scene.add(fill);
  const key = new THREE.DirectionalLight('#fff1dc', 2.2);
  key.position.set(1.6, 3.2, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -1.5;
  key.shadow.camera.right = 1.5;
  key.shadow.camera.top = 2.2;
  key.shadow.camera.bottom = -0.5;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#cfe3ff', 1.1);
  rim.position.set(-2, 2.4, -2.5);
  scene.add(rim);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), new THREE.MeshStandardMaterial({ color: '#7d8f57', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.94, 48), new THREE.MeshBasicMaterial({ color: '#e9e1cf' }));
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = 0.002;
  scene.add(edge);

  const person = makeCharacter(undefined);
  scene.add(person);
  const views = { body: { y: 0.95, dist: 4.6, look: 0.9 }, face: { y: 1.52, dist: 1.45, look: 1.5 } };
  let view = 'body';
  const cam = { y: views.body.y, dist: views.body.dist, look: views.body.look };
  let yaw = 0.3;
  let spin = 0.12;
  let dragging = null;
  let lastInput = 0;
  let running = true;
  let last = performance.now();

  const resize = () => {
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 400;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (observer) {
    observer.observe(canvas);
  }
  resize();

  const onDown = (event) => {
    dragging = { x: event.clientX, yaw };
    lastInput = performance.now();
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onMove = (event) => {
    if (dragging) {
      yaw = dragging.yaw + (event.clientX - dragging.x) * 0.012;
      lastInput = performance.now();
    }
  };
  const onUp = () => {
    dragging = null;
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const frame = (now) => {
    if (!running) {
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging && now - lastInput > 2500) {
      yaw += spin * dt;
    }
    const target = views[view];
    const k = Math.min(1, dt * 6);
    cam.y += (target.y - cam.y) * k;
    cam.dist += (target.dist - cam.dist) * k;
    cam.look += (target.look - cam.look) * k;
    person.rotation.y = yaw;
    animateCharacter(person, false, dt);
    camera.position.set(0, cam.y + cam.dist * 0.08, cam.dist);
    camera.lookAt(0, cam.look, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  return {
    setLook(look) {
      applyLook(person, look);
    },
    setView(next) {
      view = views[next] ? next : 'body';
      spin = view === 'face' ? 0 : 0.12;
      if (view === 'face') {
        yaw = 0;
      }
    },
    get view() {
      return view;
    },
    dispose() {
      running = false;
      observer?.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      renderer.dispose();
    },
  };
}
