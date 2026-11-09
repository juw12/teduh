// Teduh game content. Everything the rules (state.js) and the world (world.js) need lives here,
// so balancing the game means editing numbers in one file.

export const VERSION = '1.4.0';
export const DAY_LENGTH = 600; // seconds of play per in-game day (10 minutes)
export const START_TIME_OF_DAY = 0.3; // a new save starts in the early morning

// kind: raw | part | seed | crop | fish | food | place | tool | wear
// color: swatch colour in menus and the base colour of the 3D model where one exists
export const ITEMS = {
  wood: { en: 'Wood', id: 'Kayu', kind: 'raw', sell: 2, color: '#9b6a3f' },
  stone: { en: 'Stone', id: 'Batu', kind: 'raw', sell: 2, color: '#8c9196' },
  scrap: { en: 'Scrap metal', id: 'Besi bekas', kind: 'raw', sell: 3, color: '#b0643c' },
  fiber: { en: 'Plant fiber', id: 'Serat tanaman', kind: 'raw', sell: 1, color: '#a8b85c' },

  plank: { en: 'Plank', id: 'Papan', kind: 'part', sell: 6, color: '#c08a52' },
  rope: { en: 'Rope', id: 'Tali', kind: 'part', sell: 5, color: '#c9b27a' },
  wire: { en: 'Copper wire', id: 'Kawat tembaga', kind: 'part', sell: 8, color: '#c7793a' },
  compost: { en: 'Compost', id: 'Kompos', kind: 'part', sell: 4, color: '#5b4632' },

  seed_basil: { en: 'Basil seeds', id: 'Benih kemangi', kind: 'seed', sell: 1, buy: 4, color: '#6f8f3a' },
  seed_tomato: { en: 'Tomato seeds', id: 'Benih tomat', kind: 'seed', sell: 2, buy: 6, color: '#b8452f' },
  seed_sunflower: { en: 'Sunflower seeds', id: 'Benih bunga matahari', kind: 'seed', sell: 3, buy: 9, color: '#d9a21b' },
  seed_berry: { en: 'Berry seeds', id: 'Benih beri', kind: 'seed', sell: 4, buy: 12, color: '#8a2f45', needs: 'bridge' },

  basil: { en: 'Basil', id: 'Kemangi', kind: 'crop', sell: 7, color: '#4f8a2e' },
  tomato: { en: 'Tomato', id: 'Tomat', kind: 'crop', sell: 11, color: '#d2442b' },
  sunflower: { en: 'Sunflower', id: 'Bunga matahari', kind: 'crop', sell: 18, color: '#e3b021' },
  berry: { en: 'Sky berry', id: 'Beri langit', kind: 'crop', sell: 9, color: '#a3324f' },

  fish_minnow: { en: 'Sky minnow', id: 'Teri langit', kind: 'fish', sell: 12, color: '#7fa7b8' },
  fish_carp: { en: 'Cloud carp', id: 'Ikan mas awan', kind: 'fish', sell: 26, color: '#e08a3c' },
  fish_ray: { en: 'Glass ray', id: 'Pari kaca', kind: 'fish', sell: 60, color: '#6cc3c1' },

  salad: { en: 'Garden salad', id: 'Salad kebun', kind: 'food', sell: 40, color: '#6aa84f', buff: 'grow' },
  sun_tea: { en: 'Sun tea', id: 'Teh matahari', kind: 'food', sell: 30, color: '#d6a64a', buff: 'gather' },
  fish_stew: { en: 'Fish stew', id: 'Sup ikan', kind: 'food', sell: 58, color: '#c97b4a', buff: 'fish' },
  berry_tart: { en: 'Berry tart', id: 'Tar beri', kind: 'food', sell: 72, color: '#9c3550', buff: 'swift' },

  planter: { en: 'Planter', id: 'Pot tanam', kind: 'place', sell: 10, color: '#8a5a33' },
  solar: { en: 'Solar panel', id: 'Panel surya', kind: 'place', sell: 30, color: '#2c5470' },
  turbine: { en: 'Wind turbine', id: 'Turbin angin', kind: 'place', sell: 45, color: '#e8e4da', needs: 'tower' },
  battery: { en: 'Battery', id: 'Baterai', kind: 'place', sell: 34, color: '#3f6f52' },
  sprinkler: { en: 'Sprinkler', id: 'Penyiram', kind: 'place', sell: 22, color: '#5f8ea0' },
  cookstove: { en: 'Solar cookstove', id: 'Kompor surya', kind: 'place', sell: 24, color: '#7c7468' },
  composter: { en: 'Composter', id: 'Komposter', kind: 'place', sell: 18, color: '#6d5236' },
  lamp: { en: 'Lamp post', id: 'Tiang lampu', kind: 'place', sell: 16, color: '#f1d27a', decor: true },
  bench: { en: 'Bench', id: 'Bangku', kind: 'place', sell: 18, color: '#a5744a', decor: true },
  fence: { en: 'Fence', id: 'Pagar', kind: 'place', sell: 5, color: '#b58b5e', decor: true },
  path: { en: 'Stone path', id: 'Jalan batu', kind: 'place', sell: 2, color: '#a9a39a', decor: true },
  flowerpot: { en: 'Flower pot', id: 'Pot bunga', kind: 'place', sell: 22, color: '#c46a45', decor: true },
  birdhouse: { en: 'Birdhouse', id: 'Rumah burung', kind: 'place', sell: 20, color: '#d7b37a', decor: true },
  hammock: { en: 'Hammock', id: 'Tempat tidur gantung', kind: 'place', sell: 30, color: '#d9c7a0', decor: true },
  arch: { en: 'Flower arch', id: 'Gapura bunga', kind: 'place', sell: 48, color: '#7aa35a', decor: true },

  rod2: { en: 'Sturdy rod', id: 'Joran kuat', kind: 'tool', sell: 25, color: '#6b4b2a' },

  hat_straw: { en: 'Straw hat', id: 'Topi jerami', kind: 'wear', sell: 0, buy: 80, color: '#dcc07a' },
  hat_cap: { en: 'Field cap', id: 'Topi lapangan', kind: 'wear', sell: 0, buy: 60, color: '#3f6f8a' },
  hat_crown: { en: 'Flower crown', id: 'Mahkota bunga', kind: 'wear', sell: 0, buy: 220, color: '#e39a7a', needs: 'bridge' },
};

// growSeconds is play time once watered. Compost cuts it to 60 %.
export const CROPS = {
  seed_basil: { crop: 'basil', growSeconds: 60, yield: [2, 3], xp: 6 },
  seed_tomato: { crop: 'tomato', growSeconds: 110, yield: [2, 4], xp: 9 },
  seed_sunflower: { crop: 'sunflower', growSeconds: 170, yield: [1, 2], xp: 12, bonusSeed: true },
  seed_berry: { crop: 'berry', growSeconds: 140, yield: [3, 5], xp: 11 },
};

export const SKILLS = ['garden', 'forage', 'craft', 'engineer', 'fish', 'cook'];
export const MAX_LEVEL = 10;
export const xpForNext = (level) => 30 + 25 * level;

// station: bench (workbench), stove (solar cookstove), compost (composter)
export const RECIPES = [
  { id: 'plank', station: 'bench', skill: 'craft', level: 1, xp: 3, in: { wood: 2 }, out: { plank: 1 } },
  { id: 'rope', station: 'bench', skill: 'craft', level: 1, xp: 3, in: { fiber: 3 }, out: { rope: 1 } },
  { id: 'wire', station: 'bench', skill: 'engineer', level: 1, xp: 4, in: { scrap: 2 }, out: { wire: 1 } },
  { id: 'planter', station: 'bench', skill: 'craft', level: 1, xp: 6, in: { plank: 2, stone: 1 }, out: { planter: 1 } },
  { id: 'solar', station: 'bench', skill: 'engineer', level: 1, xp: 10, in: { wire: 2, scrap: 2, stone: 1 }, out: { solar: 1 } },
  { id: 'cookstove', station: 'bench', skill: 'craft', level: 2, xp: 10, in: { stone: 4, scrap: 2, wire: 1 }, out: { cookstove: 1 } },
  { id: 'sprinkler', station: 'bench', skill: 'engineer', level: 2, xp: 10, in: { scrap: 2, wire: 1, rope: 1 }, out: { sprinkler: 1 } },
  { id: 'battery', station: 'bench', skill: 'engineer', level: 3, xp: 14, in: { scrap: 3, wire: 2 }, out: { battery: 1 } },
  { id: 'turbine', station: 'bench', skill: 'engineer', level: 4, xp: 18, in: { plank: 3, wire: 3, scrap: 2 }, out: { turbine: 1 }, needs: 'tower' },
  { id: 'composter', station: 'bench', skill: 'craft', level: 2, xp: 8, in: { plank: 3, rope: 1 }, out: { composter: 1 } },
  { id: 'lamp', station: 'bench', skill: 'engineer', level: 2, xp: 7, in: { wire: 1, scrap: 1, plank: 1 }, out: { lamp: 1 } },
  { id: 'path', station: 'bench', skill: 'craft', level: 1, xp: 2, in: { stone: 2 }, out: { path: 2 } },
  { id: 'fence', station: 'bench', skill: 'craft', level: 1, xp: 3, in: { plank: 1, rope: 1 }, out: { fence: 2 } },
  { id: 'bench', station: 'bench', skill: 'craft', level: 2, xp: 6, in: { plank: 3 }, out: { bench: 1 } },
  { id: 'flowerpot', station: 'bench', skill: 'craft', level: 2, xp: 6, in: { stone: 2, sunflower: 1 }, out: { flowerpot: 1 } },
  { id: 'birdhouse', station: 'bench', skill: 'craft', level: 3, xp: 8, in: { plank: 2, rope: 1 }, out: { birdhouse: 1 } },
  { id: 'hammock', station: 'bench', skill: 'craft', level: 4, xp: 10, in: { rope: 4, plank: 2 }, out: { hammock: 1 } },
  { id: 'arch', station: 'bench', skill: 'craft', level: 5, xp: 14, in: { plank: 4, rope: 2, sunflower: 2 }, out: { arch: 1 } },
  { id: 'rod2', station: 'bench', skill: 'fish', level: 3, xp: 10, in: { plank: 2, rope: 2, wire: 1 }, out: { rod2: 1 } },

  { id: 'compost', station: 'compost', skill: 'garden', level: 1, xp: 3, in: { fiber: 3 }, out: { compost: 1 } },

  { id: 'salad', station: 'stove', skill: 'cook', level: 1, xp: 8, energy: 2, in: { basil: 2, tomato: 1 }, out: { salad: 1 } },
  { id: 'sun_tea', station: 'stove', skill: 'cook', level: 1, xp: 6, energy: 1, in: { sunflower: 1, basil: 1 }, out: { sun_tea: 1 } },
  { id: 'fish_stew', station: 'stove', skill: 'cook', level: 2, xp: 10, energy: 3, in: { fish_minnow: 1, tomato: 1, basil: 1 }, out: { fish_stew: 1 } },
  { id: 'berry_tart', station: 'stove', skill: 'cook', level: 3, xp: 12, energy: 3, in: { berry: 3, sunflower: 1 }, out: { berry_tart: 1 } },
];

export const BUFFS = {
  grow: { seconds: 180, en: 'Crops grow 50 % faster', id: 'Tanaman tumbuh 50 % lebih cepat' },
  gather: { seconds: 180, en: 'Chance of double gathering', id: 'Peluang hasil kumpul ganda' },
  fish: { seconds: 180, en: 'Wider catch zone when fishing', id: 'Zona tangkap lebih lebar' },
  swift: { seconds: 180, en: 'You walk 40 % faster', id: 'Jalan 40 % lebih cepat' },
};

// Energy (solarpunk core): panels and turbines fill the island battery; stoves, sprinklers and lamps use it.
export const ENERGY = {
  baseCapacity: 20,
  batteryCapacity: 40,
  solarPerSecond: 0.06, // at full daylight
  turbinePerSecond: 0.035, // day and night
  rainSolarFactor: 0.4,
  rainTurbineFactor: 1.5,
  lampPerSecond: 0.004, // per lamp, at night only
  sprinklerCost: 1,
  sprinklerRange: 2.6,
};

// Gathering nodes regrow after these many seconds of play.
export const NODES = {
  tree: { item: 'wood', amount: [2, 3], skill: 'forage', xp: 4, respawn: 90, extra: { item: 'seed_basil', chance: 0.12 } },
  rock: { item: 'stone', amount: [2, 3], skill: 'forage', xp: 4, respawn: 110 },
  scrap: { item: 'scrap', amount: [1, 2], skill: 'engineer', xp: 5, respawn: 130 },
  bush: { item: 'fiber', amount: [2, 3], skill: 'forage', xp: 3, respawn: 60 },
  berrybush: { item: 'berry', amount: [2, 3], skill: 'forage', xp: 5, respawn: 120, extra: { item: 'seed_berry', chance: 0.3 } },
};

export const FISH_SPOTS = {
  pond: { table: [['fish_minnow', 0.72], ['fish_carp', 0.28]] },
  reef: { table: [['fish_minnow', 0.3], ['fish_carp', 0.45], ['fish_ray', 0.25]] },
};

// Islands float in the sky. Locked islands open when their community project is finished.
export const ISLANDS = [
  { id: 'home', x: 0, z: 0, r: 13, en: 'Home Isle', idn: 'Pulau Rumah' },
  { id: 'market', x: 0, z: -31, r: 9.5, en: 'Market Isle', idn: 'Pulau Pasar' },
  { id: 'grove', x: 29, z: -9, r: 10, en: 'Grove Isle', idn: 'Pulau Hutan', needs: 'bridge' },
  { id: 'reef', x: -27, z: -19, r: 9, en: 'Reef Isle', idn: 'Pulau Karang', needs: 'dock' },
];

export const BRIDGES = [
  { id: 'b_market', from: 'home', to: 'market', width: 2.6 },
  { id: 'b_grove', from: 'home', to: 'grove', width: 2.6, needs: 'bridge' },
  { id: 'b_reef', from: 'market', to: 'reef', width: 2.6, needs: 'dock' },
];

// Community projects: everyone (you plus friends in your room) pours materials in; finishing one opens new places.
export const PROJECTS = [
  {
    id: 'bridge', need: { plank: 10, stone: 15, rope: 6 }, reward: 120,
    en: 'Mend the sky bridge', id_: 'Perbaiki jembatan langit',
    enBody: 'Rebuild the rope bridge to Grove Isle: berries, tall trees and a quiet glade.',
    idBody: 'Bangun lagi jembatan tali ke Pulau Hutan: beri, pohon tinggi dan padang yang tenang.',
  },
  {
    id: 'tower', need: { scrap: 15, wire: 8, plank: 6 }, reward: 150,
    en: 'Restore the wind tower', id_: 'Pulihkan menara angin',
    enBody: 'Bayu can teach you to build wind turbines once the old tower spins again.',
    idBody: 'Bayu bisa mengajari cara membuat turbin angin setelah menara tua berputar lagi.',
  },
  {
    id: 'dock', need: { plank: 16, stone: 12, rope: 8, scrap: 6 }, reward: 180, after: 'bridge',
    en: 'Build the reef dock', id_: 'Bangun dermaga karang',
    enBody: 'A walkway to Reef Isle, where the rare glass ray swims in the sky pool.',
    idBody: 'Jalan ke Pulau Karang, tempat pari kaca yang langka berenang di kolam langit.',
  },
  {
    id: 'lighthouse', need: { solar: 2, battery: 1, lamp: 3, wire: 6 }, reward: 300, after: 'dock', after2: 'tower',
    en: 'Light the lighthouse', id_: 'Nyalakan mercusuar',
    enBody: 'Power the old lighthouse with clean energy so every island glows at night.',
    idBody: 'Hidupkan mercusuar tua dengan energi bersih agar semua pulau bercahaya di malam hari.',
  },
];

export const NPCS = {
  sari: {
    name: 'Sari', color: '#c0583a', island: 'market', x: -3.2, z: -29.2,
    look: { build: 'average', height: 1, face: 'round', skin: '#c48a62', eyes: '#3b2416', hair: 'hijab', hairColor: '#1c1714', accent: '#c0583a', top: 'long', topColor: '#f1ebdd', bottom: 'sarong', bottomColor: '#8a5a33', shoes: '#5a3d28' },
    en: 'Runs the market stall. Buys anything, sells seeds and hats.',
    idn: 'Penjaga kios pasar. Membeli apa saja, menjual benih dan topi.',
    wants: ['basil', 'tomato', 'sunflower', 'berry', 'salad', 'sun_tea'],
    gift: { item: 'seed_sunflower', n: 6 },
  },
  bayu: {
    name: 'Bayu', color: '#2f6e6a', island: 'market', x: 4.6, z: -33.2,
    look: { build: 'sturdy', height: 3, face: 'square', skin: '#8b5537', eyes: '#3b2416', hair: 'short', hairColor: '#1c1714', facial: 'beard', top: 'jacket', topColor: '#2f6e6a', accent: '#f1ebdd', bottom: 'trousers', bottomColor: '#2a2d2b', shoes: '#2a2420' },
    en: 'Engineer. Keeps the islands running on sun and wind.',
    idn: 'Insinyur. Menjaga pulau tetap jalan dengan matahari dan angin.',
    wants: ['plank', 'wire', 'rope', 'stone', 'scrap'],
    gift: { item: 'battery', n: 1 },
  },
  lin: {
    name: 'Lin', color: '#3b5d8c', island: 'market', x: -5.2, z: -35.2,
    look: { build: 'slim', height: 1, face: 'oval', skin: '#e9bf9f', eyes: '#3b2416', hair: 'ponytail', hairColor: '#1c1714', top: 'batik', topColor: '#3b5d8c', accent: '#d9a21b', bottom: 'trousers', bottomColor: '#c9b48a', shoes: '#e8e2d4' },
    en: 'Fisher and cook. Knows every pool between the clouds.',
    idn: 'Nelayan dan juru masak. Tahu semua kolam di antara awan.',
    wants: ['fish_minnow', 'fish_carp', 'fish_stew', 'berry_tart', 'fish_ray'],
    gift: { item: 'rod2', n: 1 },
  },
};
export const FRIEND_GIFT_AT = 50; // friendship points (each order = 10)

// Things that are part of the world, not placed by the player (x, z in world units).
export const FIXTURES = [
  { id: 'house', kind: 'house', x: -6.5, z: 3.5 },
  { id: 'workbench', kind: 'workbench', x: -2.6, z: -3.4 },
  { id: 'pond', kind: 'pond', x: 6.2, z: 5.2, r: 2.4 },
  { id: 'stall', kind: 'stall', x: -3.2, z: -27.6 },
  { id: 'board', kind: 'board', x: 2.2, z: -26.4 },
  { id: 'tower', kind: 'tower', x: 5.6, z: -35.6 },
  { id: 'lighthouse', kind: 'lighthouse', x: -6.6, z: -37.2 },
  { id: 'reefpool', kind: 'reefpool', x: -28, z: -20, r: 3.8 },
  { id: 'site_bridge', kind: 'site', x: 11.6, z: -4.6, project: 'bridge' },
  { id: 'site_dock', kind: 'site', x: -8.2, z: -27.8, project: 'dock' },
];

// Gathering nodes, hand placed so paths and building space stay open.
export const NODE_SPOTS = [
  // Home Isle
  ['tree', -9.5, -3.5], ['tree', -8.6, -7.6], ['tree', -4.2, -9.6], ['tree', 9.4, -6.2],
  ['tree', 10.4, 1.4], ['tree', -10.8, 1.2], ['tree', 3.6, 10.2], ['tree', -2.4, 10.6],
  ['rock', -6.6, -8.4], ['rock', 8.6, 8.6], ['rock', -10.4, 5.6], ['rock', 1.8, -9.8],
  ['scrap', 7.2, -9.0], ['scrap', -3.2, 7.6], ['scrap', 10.6, -2.4],
  ['bush', -7.4, -1.2], ['bush', 2.6, 8.2], ['bush', 7.8, -3.6], ['bush', -1.6, -7.2], ['bush', -9.2, 8.0],
  // Market Isle
  ['tree', 6.6, -26.2], ['tree', -7.4, -30.6], ['rock', 7.2, -30.6], ['bush', -1.4, -36.4],
  // Grove Isle
  ['tree', 25.2, -14.8], ['tree', 33.4, -14.2], ['tree', 35.6, -7.4], ['tree', 31.8, -1.6],
  ['tree', 23.6, -4.4], ['tree', 28.6, -16.6], ['berrybush', 27.2, -9.6], ['berrybush', 31.4, -9.8],
  ['berrybush', 29.4, -5.6], ['berrybush', 33.8, -11.8], ['bush', 24.2, -9.4], ['bush', 36.2, -3.4],
  ['rock', 26.0, -1.6], ['rock', 34.6, -16.0],
  // Reef Isle
  ['scrap', -22.2, -14.6], ['scrap', -32.6, -15.4], ['scrap', -24.4, -24.6], ['rock', -31.6, -23.4],
  ['rock', -21.6, -20.2], ['rock', -29.8, -12.6],
];

// The starting layout of the player's island (grid cells are 1 world unit; items sit on cell centres).
export const START_PLACED = [
  { type: 'planter', x: 3, z: -3, rot: 0 },
  { type: 'planter', x: 5, z: -3, rot: 0 },
];
export const BUILD_ISLAND = 'home';
export const BUILD_KEEP_CLEAR = [
  // fixtures and the bridge landings stay free
  { x: -6.5, z: 3.5, r: 3.0 }, { x: -2.6, z: -3.4, r: 1.6 }, { x: 6.2, z: 5.2, r: 3.0 },
  { x: 0, z: -12, r: 2.2 }, { x: 11.6, z: -4.6, r: 2.4 },
];

// Clean skies: old smog heaps left on the islands. Clearing one recycles it into materials (nothing is
// wasted), lifts the haze a little and, when an island is fully clean, makes it bloom.
export const SMOG = {
  yields: [['scrap', 2, 3], ['stone', 1, 2], ['fiber', 1, 2]],
  wireChance: 0.35,
  skill: 'engineer',
  xp: 8,
  bloomReward: 40,
  radius: 1.3, // nothing can be built this close to a heap or an animal's home
};
export const SMOG_SPOTS = [
  { x: 5.5, z: 1.0, island: 'home' },
  { x: -5.0, z: -5.6, island: 'home', critter: 'hen' },
  { x: 3.2, z: 9.4, island: 'home' },
  { x: 2.4, z: -31.2, island: 'market' },
  { x: 29.2, z: -13.0, island: 'grove', critter: 'goat' },
  { x: 33.0, z: -6.0, island: 'grove' },
  { x: -33.2, z: -19.6, island: 'reef', critter: 'turtle' },
  { x: -21.4, z: -23.6, island: 'reef' },
];

// Animals trapped in smog heaps. Once rescued they live on Home Isle and leave a gift every morning.
export const CRITTERS = {
  hen: { en: 'Sky hen', idn: 'Ayam langit', home: { x: -5.0, z: 8.6 }, gift: { item: 'seed_tomato', n: 2 } },
  goat: { en: 'Cloud goat', idn: 'Kambing awan', home: { x: 8.4, z: -0.6 }, gift: { item: 'fiber', n: 4 } },
  turtle: { en: 'Moss turtle', idn: 'Kura-kura lumut', home: { x: -1.8, z: 10.0 }, gift: { item: 'compost', n: 2 } },
};

export const START_INVENTORY = { seed_basil: 4, wood: 2 };
export const START_CREDITS = 30;

export const AVATAR_COLORS = ['#c0583a', '#d9a21b', '#3f7d4e', '#2f6e6a', '#3b5d8c', '#8a5a33'];

// Guided goals. check(s) reads state; target names a place the guide beacon points to.
export const QUESTS = [
  { id: 'q_wood', target: 'tree', reward: { credits: 10 }, en: 'Chop a tree for wood', idn: 'Tebang pohon untuk kayu',
    hint: 'Walk to a tree and press the action button (or E).', hintId: 'Jalan ke pohon lalu tekan tombol aksi (atau E).' },
  { id: 'q_fiber', target: 'bush', reward: { credits: 10 }, en: 'Gather plant fiber from a bush', idn: 'Kumpulkan serat dari semak',
    hint: 'Bushes give fiber. Three fiber make a rope.', hintId: 'Semak memberi serat. Tiga serat jadi satu tali.' },
  { id: 'q_plant', target: 'planter', reward: { items: { seed_tomato: 2 } }, en: 'Plant basil in a planter', idn: 'Tanam kemangi di pot tanam',
    hint: 'Your two planters are next to the workbench.', hintId: 'Dua pot tanam ada di dekat meja kerja.' },
  { id: 'q_water', target: 'planter', reward: { credits: 10 }, en: 'Water the planter so it grows', idn: 'Siram pot agar tanaman tumbuh',
    hint: 'Crops only grow after watering. Rain and sprinklers water too.', hintId: 'Tanaman hanya tumbuh setelah disiram. Hujan dan penyiram juga menyiram.' },
  { id: 'q_scrap', target: 'scrap', reward: { credits: 10 }, en: 'Salvage scrap metal', idn: 'Ambil besi bekas',
    hint: 'Rusty piles hold scrap. Nothing here is wasted.', hintId: 'Tumpukan karat berisi besi bekas. Tidak ada yang terbuang.' },
  { id: 'q_wire', target: 'workbench', reward: { items: { scrap: 2 } }, en: 'Craft copper wire at the workbench', idn: 'Buat kawat tembaga di meja kerja',
    hint: 'Two scrap make one wire.', hintId: 'Dua besi bekas jadi satu kawat.' },
  { id: 'q_solar', target: 'workbench', reward: { credits: 25 }, en: 'Build and place a solar panel', idn: 'Buat dan pasang panel surya',
    hint: 'Craft it, then choose Place in your bag. It charges the island battery by day.', hintId: 'Buat, lalu pilih Pasang di tas. Panel mengisi baterai pulau di siang hari.' },
  { id: 'q_harvest', target: 'planter', reward: { credits: 15 }, en: 'Harvest your first crop', idn: 'Panen tanaman pertama',
    hint: 'A ready crop shows ripe fruit. Basil takes about a minute.', hintId: 'Tanaman siap panen terlihat berbuah. Kemangi butuh sekitar satu menit.' },
  { id: 'q_market', target: 'stall', reward: { credits: 10 }, en: 'Cross the bridge to Market Isle', idn: 'Seberangi jembatan ke Pulau Pasar',
    hint: 'The bridge starts at the north edge of your island.', hintId: 'Jembatan mulai dari tepi utara pulaumu.' },
  { id: 'q_sell', target: 'stall', reward: { credits: 10 }, en: 'Sell something at Sari\'s stall', idn: 'Jual sesuatu di kios Sari',
    hint: 'Sari buys anything. Prices never change, so there is no rush.', hintId: 'Sari membeli apa saja. Harga tetap, jadi tidak perlu terburu-buru.' },
  { id: 'q_order', target: 'npc', reward: { credits: 20 }, en: 'Fill a villager\'s order', idn: 'Penuhi pesanan warga',
    hint: 'Talk to Sari, Bayu or Lin. New orders arrive every morning.', hintId: 'Bicara dengan Sari, Bayu atau Lin. Pesanan baru datang tiap pagi.' },
  { id: 'q_project', target: 'board', reward: { credits: 15 }, en: 'Give materials to a community project', idn: 'Sumbang bahan untuk proyek warga',
    hint: 'The board on Market Isle lists what each project still needs.', hintId: 'Papan di Pulau Pasar menunjukkan kebutuhan tiap proyek.' },
  { id: 'q_smog', target: 'smog', reward: { credits: 15 }, en: 'Clear a smog heap', idn: 'Bersihkan tumpukan asap',
    hint: 'Grey heaps still smoke on every island. Clearing one recycles it into scrap, stone and fiber.', hintId: 'Tumpukan abu-abu masih berasap di tiap pulau. Membersihkannya mendaur ulang jadi besi, batu dan serat.' },
  { id: 'q_rescue', target: 'critter_smog', reward: { credits: 20 }, en: 'Rescue the sky hen from the smog', idn: 'Selamatkan ayam langit dari asap',
    hint: 'Something is clucking inside the heap by the workbench. Once free, she leaves seeds every morning.', hintId: 'Ada yang berkotek di tumpukan dekat meja kerja. Setelah bebas, ia meninggalkan benih tiap pagi.' },
  { id: 'q_fish', target: 'pond', reward: { credits: 15 }, en: 'Catch a fish in your pond', idn: 'Tangkap ikan di kolammu',
    hint: 'Stop the marker inside the green zone.', hintId: 'Hentikan penanda di dalam zona hijau.' },
  { id: 'q_cook', target: 'workbench', reward: { credits: 25 }, en: 'Build a solar cookstove and cook a meal', idn: 'Buat kompor surya dan masak',
    hint: 'Cooking uses stored energy. Meals give helpful boosts.', hintId: 'Memasak memakai energi tersimpan. Makanan memberi bonus.' },
  { id: 'q_decor', target: 'house', reward: { credits: 30 }, en: 'Place three decorations on your island', idn: 'Pasang tiga dekorasi di pulaumu',
    hint: 'Paths, fences, lamps and benches all count.', hintId: 'Jalan batu, pagar, lampu dan bangku semuanya dihitung.' },
  { id: 'q_grove', target: 'site_bridge', reward: { credits: 40 }, en: 'Finish the sky bridge and visit Grove Isle', idn: 'Selesaikan jembatan dan kunjungi Pulau Hutan',
    hint: 'Planks, stone and rope. Friends in your room can chip in.', hintId: 'Papan, batu dan tali. Teman di ruanganmu bisa ikut menyumbang.' },
  { id: 'q_tower', target: 'tower', reward: { credits: 40 }, en: 'Restore the wind tower', idn: 'Pulihkan menara angin',
    hint: 'Then build wind turbines: they work at night too.', hintId: 'Lalu buat turbin angin: tetap bekerja di malam hari.' },
  { id: 'q_ray', target: 'reefpool', reward: { credits: 60 }, en: 'Build the reef dock and catch a glass ray', idn: 'Bangun dermaga dan tangkap pari kaca',
    hint: 'Glass rays only live in the Reef Isle pool.', hintId: 'Pari kaca hanya hidup di kolam Pulau Karang.' },
  { id: 'q_light', target: 'lighthouse', reward: { credits: 100 }, en: 'Light the lighthouse', idn: 'Nyalakan mercusuar',
    hint: 'The last project. It needs everything you have learned.', hintId: 'Proyek terakhir. Butuh semua yang sudah kamu pelajari.' },
  { id: 'q_clean', target: 'smog', reward: { credits: 120 }, en: 'Clear every smog heap and free all three animals', idn: 'Bersihkan semua tumpukan asap dan bebaskan tiga hewan',
    hint: 'Eight heaps across four islands. The sky turns clear blue when the last one is gone.', hintId: 'Delapan tumpukan di empat pulau. Langit jadi biru jernih saat yang terakhir hilang.' },
];

// Preset phrases for playing together (no free text chat, so nobody can send anything unkind).
export const PHRASES = [
  { id: 'hi', en: 'Hello!', idn: 'Halo!' },
  { id: 'nice', en: 'Your island looks lovely', idn: 'Pulaumu indah sekali' },
  { id: 'thanks', en: 'Thank you!', idn: 'Terima kasih!' },
  { id: 'follow', en: 'Follow me', idn: 'Ikuti aku' },
  { id: 'project', en: 'Let us finish a project', idn: 'Ayo selesaikan proyek' },
  { id: 'bye', en: 'Good night, see you', idn: 'Selamat malam, sampai jumpa' },
];
