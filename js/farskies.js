// Far Skies (1.5.0): the wider world past Grove and Reef. Hand-written lists (crops, fish, animals, biomes,
// villager names, dish types) are expanded with a fixed seed into islands, villagers, rescues and recipes, so
// every player gets the same world and old saves keep their indices: everything here is appended, never inserted.

import { SKIN_TONES, EYE_COLORS, HAIR_STYLES, HAIR_COLORS, TOPS, BOTTOMS, CLOTH_COLORS, SHOE_COLORS, BUILDS, FACES } from './look.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// ---------- hand-written content ----------
// New crops. needs: when their seeds appear in Sari's stall.
export const NEW_CROPS = [
  { id: 'chili', en: 'Chili', idn: 'Cabai', color: '#c8361f', grow: 90, yield: [3, 5], sell: 8, buy: 5 },
  { id: 'corn', en: 'Corn', idn: 'Jagung', color: '#e6b83a', grow: 130, yield: [2, 3], sell: 12, buy: 7 },
  { id: 'eggplant', en: 'Green eggplant', idn: 'Terong hijau', color: '#5f7d3c', grow: 120, yield: [2, 3], sell: 11, buy: 7 },
  { id: 'kangkung', en: 'Water spinach', idn: 'Kangkung', color: '#3f8a3a', grow: 50, yield: [3, 4], sell: 5, buy: 3 },
  { id: 'pumpkin', en: 'Pumpkin', idn: 'Labu', color: '#d9772a', grow: 200, yield: [1, 2], sell: 26, buy: 12, needs: 'bridge' },
  { id: 'cassava', en: 'Cassava', idn: 'Singkong', color: '#b98a5a', grow: 150, yield: [2, 4], sell: 10, buy: 6, needs: 'bridge' },
  { id: 'ginger', en: 'Ginger', idn: 'Jahe', color: '#c9a46a', grow: 110, yield: [2, 3], sell: 12, buy: 7, needs: 'bridge' },
  { id: 'rice', en: 'Rice', idn: 'Padi', color: '#d8c78a', grow: 160, yield: [3, 5], sell: 9, buy: 6, needs: 'bridge' },
  { id: 'strawberry', en: 'Strawberry', idn: 'Stroberi', color: '#d23a4a', grow: 140, yield: [3, 5], sell: 12, buy: 9, needs: 'dock' },
  { id: 'pineapple', en: 'Pineapple', idn: 'Nanas', color: '#e0a92a', grow: 240, yield: [1, 2], sell: 34, buy: 15, needs: 'dock' },
  { id: 'tea', en: 'Tea leaves', idn: 'Daun teh', color: '#4f7f3a', grow: 120, yield: [3, 4], sell: 10, buy: 7, needs: 'skyway' },
  { id: 'jasmine', en: 'Jasmine', idn: 'Melati', color: '#efe9d8', grow: 100, yield: [2, 4], sell: 13, buy: 8, needs: 'skyway' },
];
// Cultivars: each base crop has three named varieties, grown from seeds sold once the skyway is open.
const CULTIVARS = [
  { key: 'gold', en: 'Golden', idn: 'emas', tint: '#e3b021', grow: 1.2, sell: 1.6 },
  { key: 'mini', en: 'Dwarf', idn: 'mini', tint: '#9fc46a', grow: 0.7, sell: 1.1 },
  { key: 'giant', en: 'Giant', idn: 'raksasa', tint: '#5d8f45', grow: 1.6, sell: 2.2 },
  { key: 'sky', en: 'Sky', idn: 'langit', tint: '#7fa7b8', grow: 1.1, sell: 1.5 },
  { key: 'stripe', en: 'Striped', idn: 'belang', tint: '#f1ebdd', grow: 1.0, sell: 1.4 },
  { key: 'ember', en: 'Ember', idn: 'bara', tint: '#c0583a', grow: 1.3, sell: 1.8 },
];
// 27 new fish; with the minnow, carp and glass ray that makes 30.
export const NEW_FISH = [
  ['catfish', 'Cloud catfish', 'Lele awan', '#7d7466', 14], ['gourami', 'Gourami', 'Gurame', '#b8a27a', 22],
  ['tilapia', 'Tilapia', 'Nila', '#8c9196', 16], ['milkfish', 'Milkfish', 'Bandeng', '#c9d3d6', 20],
  ['patin', 'Silver patin', 'Patin perak', '#b0b8bc', 18], ['eel', 'Sky eel', 'Belut langit', '#5b6f4a', 28],
  ['koi', 'Koi', 'Koi', '#e07a3a', 40], ['betta', 'Betta', 'Cupang', '#c0583a', 24],
  ['arowana', 'Golden arowana', 'Arwana emas', '#d9a21b', 90], ['snapper', 'Red snapper', 'Kakap merah', '#c8452f', 34],
  ['grouper', 'Grouper', 'Kerapu', '#8a6a48', 38], ['mackerel', 'Mackerel', 'Tenggiri', '#6f8a96', 26],
  ['rabbitfish', 'Rabbitfish', 'Baronang', '#a8935a', 22], ['scad', 'Flying scad', 'Ikan layang', '#7fa7b8', 18],
  ['snakehead', 'Snakehead', 'Gabus', '#4f5a42', 30], ['clownfish', 'Clownfish', 'Ikan badut', '#e8762a', 36],
  ['seahorse', 'Seahorse', 'Kuda laut', '#d9a21b', 55], ['puffer', 'Puffer', 'Buntal', '#c9b27a', 32],
  ['sidat', 'Mist eel', 'Sidat kabut', '#6c7a74', 44], ['toman', 'Toman', 'Toman', '#3f5a48', 34],
  ['baung', 'Whisker fish', 'Baung', '#8a7a5a', 20], ['jelawat', 'Jelawat', 'Jelawat', '#c2c9a8', 24],
  ['sunfin', 'Sunfin', 'Sirip mentari', '#f2c14e', 48], ['dewfish', 'Dewdrop', 'Ikan embun', '#9fd3cf', 46],
  ['stormray', 'Storm ray', 'Pari badai', '#4f6b7a', 85], ['lanternfish', 'Lanternfish', 'Ikan lentera', '#f0d070', 60],
  ['mossback', 'Mossback', 'Punggung lumut', '#6f8f3a', 30],
];
// Animal species (12) and colour morphs (10): 120 animals to free from smog across the far islands.
export const SPECIES = [
  { id: 'duck', en: 'duck', idn: 'Bebek', shape: 'bird', size: 0.9, beak: '#d9a21b', flat: true },
  { id: 'rabbit', en: 'rabbit', idn: 'Kelinci', shape: 'quad', size: 0.7, ears: 'long', tail: 'puff' },
  { id: 'cat', en: 'cat', idn: 'Kucing', shape: 'quad', size: 0.8, ears: 'point', tail: 'long' },
  { id: 'sheep', en: 'sheep', idn: 'Domba', shape: 'quad', size: 1.05, ears: 'flop', tail: 'puff', wool: true },
  { id: 'buffalo', en: 'buffalo', idn: 'Kerbau', shape: 'quad', size: 1.3, ears: 'flop', tail: 'thin', horns: true },
  { id: 'kancil', en: 'mouse-deer', idn: 'Kancil', shape: 'quad', size: 0.75, ears: 'point', tail: 'puff', slim: true },
  { id: 'owl', en: 'owl', idn: 'Burung hantu', shape: 'bird', size: 0.8, beak: '#8a6a48', tufts: true },
  { id: 'frog', en: 'frog', idn: 'Katak', shape: 'frog', size: 0.6 },
  { id: 'otter', en: 'otter', idn: 'Berang-berang', shape: 'quad', size: 0.85, ears: 'round', tail: 'long', low: true },
  { id: 'hedgehog', en: 'hedgehog', idn: 'Landak', shape: 'quad', size: 0.65, ears: 'round', tail: 'none', spikes: true },
  { id: 'parrot', en: 'parrot', idn: 'Burung beo', shape: 'bird', size: 0.75, beak: '#2a2420', crest: true },
  { id: 'squirrel', en: 'squirrel', idn: 'Tupai', shape: 'quad', size: 0.6, ears: 'point', tail: 'bushy' },
];
export const MORPHS = [
  { en: 'Snowy', idn: 'salju', color: '#f1ede4', accent: '#c9c2b4' },
  { en: 'Cocoa', idn: 'cokelat', color: '#7a5636', accent: '#4f3a28' },
  { en: 'Ginger', idn: 'jahe', color: '#d9772a', accent: '#f1ebdd' },
  { en: 'Ash', idn: 'abu', color: '#8c9196', accent: '#5b6066' },
  { en: 'Honey', idn: 'madu', color: '#d9a21b', accent: '#8a5a33' },
  { en: 'Moss', idn: 'lumut', color: '#6f8f3a', accent: '#3f5a2a' },
  { en: 'Sky', idn: 'langit', color: '#7fa7b8', accent: '#3b5d8c' },
  { en: 'Coal', idn: 'arang', color: '#3a3632', accent: '#1d1d1b' },
  { en: 'Sandy', idn: 'pasir', color: '#d8c08a', accent: '#a8935a' },
  { en: 'Rusty', idn: 'karat', color: '#a8502e', accent: '#5a2f1e' },
];
// Biomes give each far island its colours, crops, fish and gifts.
export const BIOMES = [
  { id: 'meadow', top: '#8fbf6a', rim: '#93704c', under: '#8f8a80', leaf: ['#5d8f45', '#6a9c4c', '#78a656'], crystal: '#9fd3cf',
    crops: ['kangkung', 'corn', 'basil'], fish: ['tilapia', 'catfish', 'gourami', 'koi'], nodes: ['tree', 'tree', 'bush', 'rock', 'berrybush'] },
  { id: 'autumn', top: '#c9a24a', rim: '#8a5a33', under: '#8a7c6a', leaf: ['#d9772a', '#c0583a', '#e3b021'], crystal: '#f2c14e',
    crops: ['pumpkin', 'ginger', 'corn'], fish: ['snakehead', 'baung', 'mossback', 'toman'], nodes: ['tree', 'tree', 'rock', 'bush', 'scrap'] },
  { id: 'mesa', top: '#d8b07a', rim: '#a8502e', under: '#b0643c', leaf: ['#8f9a4a', '#a8b85c', '#6f7d3c'], crystal: '#f0d070',
    crops: ['cassava', 'chili', 'pineapple'], fish: ['sunfin', 'scad', 'puffer'], nodes: ['rock', 'rock', 'scrap', 'bush', 'tree'] },
  { id: 'frost', top: '#e8eef0', rim: '#9aa6ad', under: '#8c9aa3', leaf: ['#3f6b5a', '#4f7f6a', '#5b8f78'], crystal: '#bfe3ef',
    crops: ['tea', 'strawberry', 'kangkung'], fish: ['dewfish', 'sidat', 'patin', 'stormray'], nodes: ['tree', 'rock', 'rock', 'scrap', 'bush'] },
  { id: 'mangrove', top: '#6f9a5a', rim: '#5b4632', under: '#6c6a5a', leaf: ['#3f7d4e', '#4f8a3a', '#2f6e5a'], crystal: '#69c0c0',
    crops: ['rice', 'kangkung', 'eggplant'], fish: ['milkfish', 'eel', 'rabbitfish', 'clownfish', 'seahorse'], nodes: ['tree', 'bush', 'bush', 'berrybush', 'rock'] },
  { id: 'blossom', top: '#9cc77a', rim: '#93704c', under: '#8f8a80', leaf: ['#e8a0a0', '#f1c0b0', '#d98a7a'], crystal: '#f2c1b0',
    crops: ['jasmine', 'strawberry', 'tea'], fish: ['koi', 'betta', 'lanternfish', 'arowana'], nodes: ['tree', 'tree', 'berrybush', 'bush', 'rock'] },
  { id: 'reefrock', top: '#a8c48a', rim: '#7f8a8c', under: '#6f7d84', leaf: ['#4f8040', '#5d8f45', '#6a9c4c'], crystal: '#6cc3c1',
    crops: ['chili', 'eggplant', 'tomato'], fish: ['snapper', 'grouper', 'mackerel', 'clownfish'], nodes: ['rock', 'scrap', 'scrap', 'tree', 'bush'] },
  { id: 'grove', top: '#7fb05e', rim: '#7a5636', under: '#857d70', leaf: ['#3f6f35', '#4f8040', '#2f5f2a'], crystal: '#9fd3cf',
    crops: ['ginger', 'cassava', 'sunflower'], fish: ['jelawat', 'catfish', 'snakehead', 'eel'], nodes: ['tree', 'tree', 'tree', 'berrybush', 'bush'] },
];
const BIOME_NAMES = {
  meadow: { en: 'Meadow', idn: 'Padang' }, autumn: { en: 'Amber', idn: 'Kuning' }, mesa: { en: 'Mesa', idn: 'Cadas' },
  frost: { en: 'Frost', idn: 'Beku' }, mangrove: { en: 'Mangrove', idn: 'Bakau' }, blossom: { en: 'Blossom', idn: 'Kembang' },
  reefrock: { en: 'Cliff', idn: 'Tebing' }, grove: { en: 'Deepwood', idn: 'Rimba' },
};
const PLACE_NAMES = [
  ['Mist', 'Kabut'], ['Dew', 'Embun'], ['Dawn', 'Fajar'], ['Dusk', 'Senja'], ['Star', 'Bintang'], ['Moon', 'Bulan'],
  ['Wind', 'Angin'], ['Rain', 'Hujan'], ['Thunder', 'Petir'], ['Snow', 'Salju'], ['Sand', 'Pasir'], ['Moss', 'Lumut'],
  ['Fern', 'Pakis'], ['Bamboo', 'Bambu'], ['Pine', 'Cemara'], ['Ylang', 'Kenanga'], ['Jasmine', 'Melati'], ['Orchid', 'Anggrek'],
  ['Lotus', 'Teratai'], ['Sandalwood', 'Cendana'], ['Teak', 'Jati'], ['Banyan', 'Beringin'], ['Coconut', 'Kelapa'], ['Mango', 'Mangga'],
  ['Clove', 'Cengkeh'], ['Nutmeg', 'Pala'], ['Cinnamon', 'Kayu Manis'], ['Salt', 'Garam'], ['Flint', 'Batu Api'], ['Crystal', 'Kristal'],
  ['Rainbow', 'Pelangi'], ['Cloud', 'Mega'], ['Echo', 'Gema'], ['Ember', 'Bara'], ['Willow', 'Dedalu'], ['Pearl', 'Mutiara'],
  ['Amber', 'Damar'], ['Honey', 'Madu'], ['Kite', 'Layang'], ['Lantern', 'Lentera'],
];
const VILLAGER_NAMES = [
  'Ayu', 'Bagus', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko', 'Kartika', 'Lestari', 'Made', 'Nyoman',
  'Putu', 'Rani', 'Sinta', 'Tono', 'Utari', 'Wayan', 'Yanti', 'Zaki', 'Arif', 'Bunga', 'Dimas', 'Endah', 'Galih', 'Hana',
  'Ikhsan', 'Jaya', 'Kirana', 'Laras', 'Mega', 'Nanda', 'Oki', 'Pandu', 'Ratna', 'Surya', 'Tirta', 'Wulan',
];
// Dish types: each one pairs two ingredients from the lists below.
const DISHES = [
  { key: 'tumis', a: 'veg', b: 'veg', en: '{a} and {b} stir-fry', idn: 'Tumis {a} {b}', buff: 'grow', mult: 1.5 },
  { key: 'sup', a: 'fish', b: 'veg', en: '{a} soup with {b}', idn: 'Sup {a} {b}', buff: 'fish', mult: 1.6 },
  { key: 'sate', a: 'fish', b: 'veg', en: '{a} skewers with {b}', idn: 'Sate {a} {b}', buff: 'swift', mult: 1.7 },
  { key: 'pepes', a: 'fish', b: 'herb', en: 'Steamed {a} with {b}', idn: 'Pepes {a} {b}', buff: 'fish', mult: 1.8 },
  { key: 'jus', a: 'fruit', b: 'fruit', en: '{a} and {b} juice', idn: 'Jus {a} {b}', buff: 'swift', mult: 1.4 },
  { key: 'urap', a: 'veg', b: 'fruit', en: '{a} salad with {b}', idn: 'Urap {a} {b}', buff: 'gather', mult: 1.5 },
  { key: 'bubur', a: 'grain', b: 'veg', en: '{a} porridge with {b}', idn: 'Bubur {a} {b}', buff: 'grow', mult: 1.5 },
  { key: 'kari', a: 'fish', b: 'root', en: '{a} curry with {b}', idn: 'Kari {a} {b}', buff: 'gather', mult: 1.9 },
];
const ROLES = {
  veg: ['basil', 'tomato', 'chili', 'corn', 'eggplant', 'kangkung', 'pumpkin', 'cassava', 'ginger', 'tea'],
  herb: ['basil', 'chili', 'ginger', 'jasmine', 'tea'],
  fruit: ['berry', 'strawberry', 'pineapple', 'pumpkin', 'tomato', 'sunflower'],
  grain: ['rice', 'corn', 'cassava'],
  root: ['cassava', 'ginger', 'pumpkin', 'corn', 'eggplant'],
};

const FAR_ISLANDS = 40;
const BRIDGE_NEEDS = 'skyway';

export function expandWorld(D) {
  const { ITEMS, CROPS, RECIPES, NPCS, CRITTERS, SMOG_SPOTS, ISLANDS, BRIDGES, NODE_SPOTS, FIXTURES, FISH_SPOTS, PROJECTS, QUESTS } = D;

  // ----- crops -----
  NEW_CROPS.forEach((c) => {
    ITEMS[`seed_${c.id}`] = { en: `${c.en} seeds`, id: `Benih ${c.idn.toLowerCase()}`, kind: 'seed', sell: Math.max(1, Math.round(c.buy / 3)), buy: c.buy, color: mixHex(c.color, '#6f8f3a', 0.35), needs: c.needs };
    ITEMS[c.id] = { en: c.en, id: c.idn, kind: 'crop', sell: c.sell, color: c.color };
    CROPS[`seed_${c.id}`] = { crop: c.id, growSeconds: c.grow, yield: c.yield, xp: Math.round(c.grow / 15) + 2 };
  });
  const baseCrops = Object.keys(CROPS).map((seed) => CROPS[seed].crop);
  const cultRng = seeded(1501);
  baseCrops.forEach((crop, ci) => {
    const base = ITEMS[crop];
    const baseSeed = CROPS[`seed_${crop}`];
    const offset = Math.floor(cultRng() * CULTIVARS.length);
    for (let k = 0; k < 3; k += 1) {
      const cv = CULTIVARS[(offset + k * 2 + ci) % CULTIVARS.length];
      const id = `${crop}_${cv.key}`;
      if (ITEMS[id]) {
        continue;
      }
      ITEMS[`seed_${id}`] = { en: `${cv.en} ${base.en.toLowerCase()} seeds`, id: `Benih ${base.id.toLowerCase()} ${cv.idn}`, kind: 'seed', sell: 3, buy: 10 + Math.round(base.sell * 0.6), color: mixHex(base.color, cv.tint, 0.4), needs: BRIDGE_NEEDS };
      ITEMS[id] = { en: `${cv.en} ${base.en.toLowerCase()}`, id: `${base.id} ${cv.idn}`, kind: 'crop', sell: Math.round(base.sell * cv.sell), color: mixHex(base.color, cv.tint, 0.45) };
      CROPS[`seed_${id}`] = { crop: id, growSeconds: Math.round(baseSeed.growSeconds * cv.grow), yield: baseSeed.yield, xp: baseSeed.xp + 3 };
    }
  });

  // ----- fish -----
  NEW_FISH.forEach(([key, en, idn, color, sell]) => {
    ITEMS[`fish_${key}`] = { en, id: idn, kind: 'fish', sell, color };
  });

  // ----- dishes (cookstove recipes) -----
  const fishIds = Object.keys(ITEMS).filter((id) => ITEMS[id].kind === 'fish');
  const pool = { ...ROLES, fish: fishIds };
  const lower = (id) => ITEMS[id].en.toLowerCase();
  const lowerId = (id) => ITEMS[id].id.toLowerCase();
  const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  DISHES.forEach((dish) => {
    const as = pool[dish.a];
    const bs = pool[dish.b];
    as.forEach((a, ia) => {
      bs.forEach((b, ib) => {
        if (a === b || (dish.a === dish.b && ib <= ia)) {
          return;
        }
        const id = `dish_${dish.key}_${a.replace('fish_', '')}_${b.replace('fish_', '')}`;
        const value = ITEMS[a].sell + ITEMS[b].sell;
        ITEMS[id] = {
          en: capital(dish.en.replace('{a}', lower(a)).replace('{b}', lower(b))),
          id: dish.idn.replace('{a}', lowerId(a)).replace('{b}', lowerId(b)),
          kind: 'food', sell: Math.round(value * dish.mult) + 4, buff: dish.buff, color: mixHex(ITEMS[a].color, ITEMS[b].color, 0.5), dish: true,
        };
        RECIPES.push({ id, station: 'stove', skill: 'cook', level: Math.min(8, 1 + Math.floor(value / 22)), xp: 5 + Math.round(value / 10), energy: 2, in: { [a]: 1, [b]: 1 }, out: { [id]: 1 } });
      });
    });
  });

  // ----- the skyway project -----
  PROJECTS.push({
    id: 'skyway', need: { plank: 24, rope: 12, wire: 10, stone: 20 }, reward: 260, after: 'dock',
    en: 'Raise the skyway', id_: 'Bangun jalan langit',
    enBody: 'Rope bridges out to the Far Skies: forty wild islands, new villagers, and animals waiting in the smog.',
    idBody: 'Jembatan tali ke Langit Jauh: empat puluh pulau liar, warga baru, dan hewan yang menunggu di balik asap.',
  });

  // ----- archipelago layout -----
  const rng = seeded(2026);
  const islands = ISLANDS.map((i) => ({ ...i }));
  const bridgeSegs = BRIDGES.map((b) => seg(islands.find((i) => i.id === b.from), islands.find((i) => i.id === b.to), b.from, b.to));
  const roots = ['grove', 'reef'];
  const far = [];
  let tries = 0;
  while (far.length < FAR_ISLANDS && tries < 6000) {
    tries += 1;
    const fromId = far.length === 0 ? 'grove' : rng() < 0.15 ? pick(rng, roots) : pick(rng, far).id;
    const from = islands.find((i) => i.id === fromId);
    const r = 8 + rng() * 2.5;
    // grow outward: angle biased away from the origin
    const outward = Math.atan2(from.x, from.z);
    const angle = far.length === 0 ? Math.PI / 2 : outward + (rng() - 0.5) * 2.6;
    const gap = 7 + rng() * 4;
    const d = from.r + r + gap;
    const x = Math.round((from.x + Math.sin(angle) * d) * 10) / 10;
    const z = Math.round((from.z + Math.cos(angle) * d) * 10) / 10;
    const cand = { x, z, r };
    if (islands.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r + 5)) {
      continue;
    }
    if (Math.hypot(x, z) < 34) {
      continue;
    }
    const s = seg(from, cand, fromId, null);
    if (islands.some((o) => o.id !== fromId && distPointSeg(o.x, o.z, s) < o.r + 2)) {
      continue;
    }
    if (bridgeSegs.some((b) => b.from !== fromId && b.to !== fromId && segDist(s, b) < 4)) {
      continue;
    }
    const n = far.length;
    const biome = BIOMES[(n * 3 + Math.floor(rng() * 2)) % BIOMES.length];
    const place = PLACE_NAMES[n % PLACE_NAMES.length];
    const id = `far${n}`;
    const island = {
      id, x, z, r: Math.round(r * 10) / 10, needs: BRIDGE_NEEDS, far: true, biome: biome.id,
      en: `${place[0]} Isle`, idn: `Pulau ${place[1]}`,
      palette: { top: biome.top, rim: biome.rim, under: biome.under, leaf: biome.leaf, crystal: biome.crystal },
    };
    far.push(island);
    islands.push(island);
    const bridge = { id: `b_${id}`, from: fromId, to: id, width: 2.4, needs: BRIDGE_NEEDS };
    bridgeSegs.push(seg(from, island, fromId, id));
    ISLANDS.push(island);
    BRIDGES.push(bridge);
  }

  // skyway site at the grove end of the first far bridge
  const first = far[0];
  const grove = ISLANDS.find((i) => i.id === 'grove');
  const dir = Math.atan2(first.x - grove.x, first.z - grove.z);
  FIXTURES.push({ id: 'site_skyway', kind: 'site', x: round1(grove.x + Math.sin(dir) * (grove.r - 2.6)), z: round1(grove.z + Math.cos(dir) * (grove.r - 2.6)), project: 'skyway' });

  // ----- island contents -----
  BIOMES.forEach((b) => {
    FISH_SPOTS[`far_${b.id}`] = { table: b.fish.map((f, i) => [`fish_${f}`, (b.fish.length - i) / ((b.fish.length * (b.fish.length + 1)) / 2)]) };
  });
  const lookOf = (r) => ({
    build: pick(r, BUILDS), height: 1, face: pick(r, FACES), skin: pick(r, SKIN_TONES), eyes: pick(r, EYE_COLORS),
    hair: pick(r, HAIR_STYLES), hairColor: pick(r, HAIR_COLORS), accent: pick(r, CLOTH_COLORS), top: pick(r, TOPS),
    topColor: pick(r, CLOTH_COLORS), bottom: pick(r, BOTTOMS), bottomColor: pick(r, CLOTH_COLORS), shoes: pick(r, SHOE_COLORS),
  });
  let animal = 0;
  far.forEach((island, n) => {
    const biome = BIOMES.find((b) => b.id === island.biome);
    const r = seeded(9000 + n * 17);
    const taken = [];
    // keep bridge landings clear
    BRIDGES.filter((b) => b.from === island.id || b.to === island.id).forEach((b) => {
      const other = ISLANDS.find((i) => i.id === (b.from === island.id ? b.to : b.from));
      const a = Math.atan2(other.x - island.x, other.z - island.z);
      for (let k = 1; k <= 3; k += 1) {
        const dd = island.r - k * 1.6;
        taken.push({ x: island.x + Math.sin(a) * dd, z: island.z + Math.cos(a) * dd, r: 1.8 });
      }
    });
    const spot = (radius) => {
      for (let attempt = 0; attempt < 240; attempt += 1) {
        const a = r() * Math.PI * 2;
        const dd = Math.sqrt(r()) * (island.r - 1.9);
        const x = island.x + Math.sin(a) * dd;
        const z = island.z + Math.cos(a) * dd;
        if (taken.every((t) => Math.hypot(t.x - x, t.z - z) > t.r + radius)) {
          taken.push({ x, z, r: radius });
          return { x: round1(x), z: round1(z) };
        }
      }
      return null;
    };
    const hasNpc = n % 4 !== 3;
    const npcSpot = hasNpc ? spot(1.6) : null;
    if (npcSpot) {
      const p = npcSpot;
      const name = VILLAGER_NAMES[n % VILLAGER_NAMES.length];
      const wants = [...biome.crops, ...biome.fish.slice(0, 2).map((f) => `fish_${f}`)].filter((id) => ITEMS[id]);
      NPCS[`v_${island.id}`] = {
        name, color: pick(r, CLOTH_COLORS), island: island.id, x: p.x, z: p.z, look: lookOf(r), far: true,
        en: `Lives on ${island.en}. Trades in ${wants.slice(0, 3).map((id) => ITEMS[id].en.toLowerCase()).join(', ')}.`,
        idn: `Tinggal di ${island.idn}. Berdagang ${wants.slice(0, 3).map((id) => ITEMS[id].id.toLowerCase()).join(', ')}.`,
        wants, gift: { item: `seed_${biome.crops[0]}`, n: 5 },
      };
    }
    for (let k = 0; k < 3; k += 1) {
      const p = spot(1.9);
      if (!p) {
        continue;
      }
      const sp = SPECIES[animal % SPECIES.length];
      const morph = MORPHS[Math.floor(animal / SPECIES.length) % MORPHS.length];
      const critterId = `fa${animal}`;
      const gift = k === 0 ? { item: biome.crops[0], n: 2 } : k === 1 ? { item: `fish_${biome.fish[0]}`, n: 1 } : { item: pick(r, ['fiber', 'wood', 'stone', 'scrap', 'compost']), n: 3 };
      CRITTERS[critterId] = {
        en: `${morph.en} ${sp.en}`, idn: `${sp.idn} ${morph.idn}`, species: sp.id, color: morph.color, accent: morph.accent,
        home: { x: p.x, z: round1(p.z + 1.3) }, gift, far: true,
      };
      SMOG_SPOTS.push({ x: p.x, z: p.z, island: island.id, critter: critterId, far: true });
      animal += 1;
    }
    if (n % 5 === 0 || n % 5 === 2) {
      const p = spot(3.6);
      if (p) {
        FIXTURES.push({ id: `pond_${island.id}`, kind: 'pond', x: p.x, z: p.z, r: 2.1, spot: `far_${biome.id}` });
      }
    }
    for (let k = 0; k < 5; k += 1) {
      const p = spot(1.3);
      if (p) {
        NODE_SPOTS.push([biome.nodes[k % biome.nodes.length], p.x, p.z]);
      }
    }
  });

  // ----- new goals at the end of the list -----
  QUESTS.push(
    { id: 'q_skyway', target: 'site_skyway', reward: { credits: 80 }, en: 'Raise the skyway to the Far Skies', idn: 'Bangun jalan langit ke Langit Jauh',
      hint: 'After the reef dock, bring planks, rope, wire and stone to the skyway site on Grove Isle.', hintId: 'Setelah dermaga karang, bawa papan, tali, kawat dan batu ke lokasi jalan langit di Pulau Hutan.' },
    { id: 'q_far', target: 'smog', reward: { credits: 120 }, en: 'Free 10 animals in the Far Skies', idn: 'Bebaskan 10 hewan di Langit Jauh',
      hint: 'Each far island hides animals in its smog heaps. Clear them to set the animals free.', hintId: 'Tiap pulau jauh menyembunyikan hewan di tumpukan asap. Bersihkan untuk membebaskannya.' },
    { id: 'q_dishes', target: 'cookstove', reward: { credits: 100 }, en: 'Cook 5 different dishes', idn: 'Masak 5 hidangan berbeda',
      hint: 'Two ingredients make a dish at the solar cookstove. Try new pairs.', hintId: 'Dua bahan jadi satu hidangan di kompor surya. Coba pasangan baru.' },
  );
  return { islands: far.length, animals: animal };
}

const round1 = (v) => Math.round(v * 10) / 10;
function seg(a, b, from, to) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  return { ax: a.x + ux * (a.r - 1.2), az: a.z + uz * (a.r - 1.2), bx: b.x - ux * (b.r - 1.2), bz: b.z - uz * (b.r - 1.2), from, to };
}
function distPointSeg(x, z, s) {
  const vx = s.bx - s.ax;
  const vz = s.bz - s.az;
  const t = Math.max(0, Math.min(1, ((x - s.ax) * vx + (z - s.az) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(x - (s.ax + vx * t), z - (s.az + vz * t));
}
function segDist(p, q) {
  return Math.min(distPointSeg(p.ax, p.az, q), distPointSeg(p.bx, p.bz, q), distPointSeg(q.ax, q.az, p), distPointSeg(q.bx, q.bz, p));
}
