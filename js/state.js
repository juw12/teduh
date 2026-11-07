// Teduh rules. Pure functions over a plain save object, so the whole game can be tested without a browser
// canvas and a save is just JSON. Nothing here touches the DOM or three.js.

import {
  VERSION, DAY_LENGTH, START_TIME_OF_DAY, ITEMS, CROPS, SKILLS, MAX_LEVEL, xpForNext, RECIPES, BUFFS, ENERGY,
  NODES, NODE_SPOTS, FISH_SPOTS, ISLANDS, BRIDGES, PROJECTS, NPCS, FRIEND_GIFT_AT, START_PLACED, START_INVENTORY,
  START_CREDITS, QUESTS, BUILD_KEEP_CLEAR, BUILD_ISLAND, FIXTURES,
} from './data.js';

export const SAVE_KEY = 'teduh.save.v1';
export const OFFLINE_CAP_SECONDS = 1800;

// ---------- random ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

// ---------- new game ----------
export function newState({ name = 'Traveller', color = '#3f7d4e', lang = 'en' } = {}) {
  const skills = {};
  SKILLS.forEach((skill) => {
    skills[skill] = { level: 1, xp: 0 };
  });
  let uid = 1;
  const placed = START_PLACED.map((p) => ({ ...p, uid: uid++ }));
  return {
    v: VERSION,
    name: cleanName(name),
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#3f7d4e',
    lang: lang === 'id' ? 'id' : 'en',
    hat: null,
    clock: 0,
    credits: START_CREDITS,
    inv: { ...START_INVENTORY },
    skills,
    placed,
    nextUid: uid,
    energy: 6,
    nodes: {},
    buffs: {},
    projects: Object.fromEntries(PROJECTS.map((p) => [p.id, { given: {}, done: false }])),
    friends: Object.fromEntries(Object.keys(NPCS).map((id) => [id, { points: 0, gift: false, doneDay: 0 }])),
    quest: 0,
    pet: { name: 'Kopi', happy: 60, lastPat: -999, lastFind: 0 },
    pos: { x: 0, z: 2.5, f: 0 },
    stats: {
      chopped: 0, gathered: {}, planted: 0, watered: 0, harvested: 0, crafted: {}, placed: {}, sold: 0,
      orders: 0, contributed: 0, fished: {}, cooked: 0, visited: { home: true }, decor: 0,
    },
    savedAt: Date.now(),
    created: Date.now(),
  };
}

export function cleanName(value) {
  const cleaned = String(value || '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 18);
  return cleaned || 'Traveller';
}

// ---------- time and weather ----------
export const timeOfDay = (s) => (s.clock / DAY_LENGTH + START_TIME_OF_DAY) % 1;
export const dayNumber = (s) => Math.floor(s.clock / DAY_LENGTH + START_TIME_OF_DAY) + 1;
export function daylight(tod) {
  return Math.max(0, Math.min(1, Math.sin((tod - 0.25) * Math.PI * 2) * 1.5));
}
export const isNight = (s) => daylight(timeOfDay(s)) < 0.08;

export function rainyDay(day) {
  if (day < 2) {
    return false; // the first day is always clear so new players learn in sunshine
  }
  return mulberry32(day * 9973 + 17)() < 0.28;
}
export function isRaining(s) {
  const tod = timeOfDay(s);
  return rainyDay(dayNumber(s)) && tod > 0.38 && tod < 0.62;
}
export function clockText(s) {
  const minutes = Math.floor(timeOfDay(s) * 24 * 60);
  const h = Math.floor(minutes / 60);
  const m = Math.floor((minutes % 60) / 10) * 10;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------- inventory ----------
export const count = (s, id) => s.inv[id] || 0;
export function addItem(s, id, n = 1) {
  if (!ITEMS[id] || n <= 0) {
    return 0;
  }
  s.inv[id] = (s.inv[id] || 0) + n;
  return n;
}
export function hasItems(s, need) {
  return Object.entries(need).every(([id, n]) => count(s, id) >= n);
}
export function takeItems(s, need) {
  if (!hasItems(s, need)) {
    return false;
  }
  Object.entries(need).forEach(([id, n]) => {
    s.inv[id] -= n;
    if (s.inv[id] <= 0) {
      delete s.inv[id];
    }
  });
  return true;
}

// ---------- skills ----------
export const level = (s, skill) => s.skills[skill].level;
export function addXp(s, skill, amount) {
  const entry = s.skills[skill];
  if (!entry || entry.level >= MAX_LEVEL) {
    return false;
  }
  entry.xp += amount;
  let levelled = false;
  while (entry.level < MAX_LEVEL && entry.xp >= xpForNext(entry.level)) {
    entry.xp -= xpForNext(entry.level);
    entry.level += 1;
    levelled = true;
  }
  if (entry.level >= MAX_LEVEL) {
    entry.xp = 0;
  }
  return levelled;
}

// ---------- unlocks ----------
export const projectDone = (s, id) => Boolean(s.projects[id] && s.projects[id].done);
export const unlocked = (s, needs) => !needs || projectDone(s, needs);
export function projectOpen(s, project) {
  return unlocked(s, project.after) && unlocked(s, project.after2);
}
export const islandOpen = (s, islandId) => unlocked(s, ISLANDS.find((i) => i.id === islandId).needs);

// ---------- map geometry (shared by the world and the tests) ----------
const islandById = Object.fromEntries(ISLANDS.map((i) => [i.id, i]));
export function bridgeSegment(bridge) {
  const a = islandById[bridge.from];
  const b = islandById[bridge.to];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  return {
    ax: a.x + ux * (a.r - 1.2), az: a.z + uz * (a.r - 1.2),
    bx: b.x - ux * (b.r - 1.2), bz: b.z - uz * (b.r - 1.2),
    ux, uz, width: bridge.width,
  };
}
function distToSegment(x, z, seg) {
  const vx = seg.bx - seg.ax;
  const vz = seg.bz - seg.az;
  const t = Math.max(0, Math.min(1, ((x - seg.ax) * vx + (z - seg.az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - (seg.ax + vx * t), z - (seg.az + vz * t));
}
export function islandAt(x, z) {
  const found = ISLANDS.find((i) => Math.hypot(x - i.x, z - i.z) < i.r);
  return found ? found.id : null;
}
export function walkable(s, x, z) {
  for (const island of ISLANDS) {
    if (islandOpen(s, island.id) && Math.hypot(x - island.x, z - island.z) < island.r - 0.7) {
      return !inWater(x, z);
    }
  }
  for (const bridge of BRIDGES) {
    if (unlocked(s, bridge.needs) && distToSegment(x, z, bridgeSegment(bridge)) < bridge.width / 2 - 0.25) {
      return true;
    }
  }
  return false;
}
function inWater(x, z) {
  return FIXTURES.some((f) => (f.kind === 'pond' || f.kind === 'reefpool') && Math.hypot(x - f.x, z - f.z) < f.r - 0.2);
}

// ---------- gathering ----------
export const nodeId = (index) => `n${index}`;
export function nodeReady(s, index) {
  const until = s.nodes[nodeId(index)];
  return !until || s.clock >= until;
}
export function gather(s, index, rng = Math.random) {
  const spot = NODE_SPOTS[index];
  if (!spot || !nodeReady(s, index)) {
    return null;
  }
  const node = NODES[spot[0]];
  let n = randInt(rng, node.amount[0], node.amount[1]);
  if (buffActive(s, 'gather') && rng() < 0.5) {
    n *= 2;
  }
  addItem(s, node.item, n);
  const result = { item: node.item, n, extra: null, levelUp: false };
  if (node.extra && rng() < node.extra.chance) {
    addItem(s, node.extra.item, 1);
    result.extra = node.extra.item;
  }
  result.levelUp = addXp(s, node.skill, node.xp) ? node.skill : false;
  s.nodes[nodeId(index)] = s.clock + node.respawn;
  s.stats.gathered[node.item] = (s.stats.gathered[node.item] || 0) + n;
  if (spot[0] === 'tree') {
    s.stats.chopped += 1;
  }
  return result;
}

// ---------- buffs ----------
export const buffActive = (s, id) => Boolean(s.buffs[id] && s.buffs[id] > s.clock);
export function eat(s, itemId) {
  const item = ITEMS[itemId];
  if (!item || item.kind !== 'food' || count(s, itemId) < 1) {
    return false;
  }
  takeItems(s, { [itemId]: 1 });
  s.buffs[item.buff] = s.clock + BUFFS[item.buff].seconds;
  return item.buff;
}

// ---------- placing (build mode) ----------
export function placedAt(s, x, z) {
  return s.placed.find((p) => p.x === x && p.z === z) || null;
}
export function canPlace(s, x, z, ignoreUid = null) {
  const island = ISLANDS.find((i) => i.id === BUILD_ISLAND);
  if (Math.hypot(x - island.x, z - island.z) > island.r - 1.6) {
    return false;
  }
  if (BUILD_KEEP_CLEAR.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) {
    return false;
  }
  if (NODE_SPOTS.some((n) => Math.hypot(x - n[1], z - n[2]) < 1.1)) {
    return false;
  }
  const other = placedAt(s, x, z);
  return !other || other.uid === ignoreUid;
}
export function place(s, type, x, z, rot = 0) {
  if (ITEMS[type]?.kind !== 'place' || count(s, type) < 1 || !canPlace(s, x, z)) {
    return null;
  }
  takeItems(s, { [type]: 1 });
  const item = { uid: s.nextUid++, type, x, z, rot };
  s.placed.push(item);
  s.stats.placed[type] = (s.stats.placed[type] || 0) + 1;
  if (ITEMS[type].decor) {
    s.stats.decor += 1;
  }
  if (['solar', 'turbine', 'battery', 'sprinkler'].includes(type)) {
    addXp(s, 'engineer', 5);
  }
  return item;
}
export function movePlaced(s, uid, x, z, rot) {
  const item = s.placed.find((p) => p.uid === uid);
  if (!item || !canPlace(s, x, z, uid)) {
    return false;
  }
  item.x = x;
  item.z = z;
  item.rot = rot;
  return true;
}
export function pickUp(s, uid) {
  const index = s.placed.findIndex((p) => p.uid === uid);
  if (index < 0) {
    return false;
  }
  const item = s.placed[index];
  if (item.crop) {
    return false; // harvest or wait first, so nobody loses a crop by accident
  }
  s.placed.splice(index, 1);
  addItem(s, item.type, 1);
  return true;
}
export const placedOf = (s, type) => s.placed.filter((p) => p.type === type);

// ---------- energy ----------
export function energyCapacity(s) {
  return ENERGY.baseCapacity + placedOf(s, 'battery').length * ENERGY.batteryCapacity;
}
export function energyRate(s) {
  const light = daylight(timeOfDay(s));
  const rain = isRaining(s);
  const solar = placedOf(s, 'solar').length * ENERGY.solarPerSecond * light * (rain ? ENERGY.rainSolarFactor : 1);
  const wind = placedOf(s, 'turbine').length * ENERGY.turbinePerSecond * (rain ? ENERGY.rainTurbineFactor : 1);
  const lamps = isNight(s) ? placedOf(s, 'lamp').length * ENERGY.lampPerSecond : 0;
  return solar + wind - lamps;
}

// ---------- crops ----------
export function cropDuration(crop) {
  return CROPS[crop.seed].growSeconds * (crop.fert ? 0.6 : 1);
}
export const cropProgress = (crop) => Math.min(1, crop.growth / cropDuration(crop));
export function plant(s, uid, seedId, useCompost = false) {
  const planter = s.placed.find((p) => p.uid === uid && p.type === 'planter');
  if (!planter || planter.crop || !CROPS[seedId] || count(s, seedId) < 1) {
    return false;
  }
  takeItems(s, { [seedId]: 1 });
  const fert = useCompost && count(s, 'compost') > 0 ? takeItems(s, { compost: 1 }) : false;
  planter.crop = { seed: seedId, growth: 0, watered: false, fert };
  s.stats.planted += 1;
  addXp(s, 'garden', 2);
  return true;
}
export function water(s, uid) {
  const planter = s.placed.find((p) => p.uid === uid);
  if (!planter || !planter.crop || planter.crop.watered) {
    return false;
  }
  planter.crop.watered = true;
  s.stats.watered += 1;
  return true;
}
export function harvest(s, uid, rng = Math.random) {
  const planter = s.placed.find((p) => p.uid === uid);
  if (!planter || !planter.crop || cropProgress(planter.crop) < 1) {
    return null;
  }
  const info = CROPS[planter.crop.seed];
  const bonus = level(s, 'garden') >= 5 ? 1 : 0;
  const n = randInt(rng, info.yield[0], info.yield[1]) + bonus;
  addItem(s, info.crop, n);
  if (info.bonusSeed) {
    addItem(s, planter.crop.seed, 1);
  }
  planter.crop = null;
  s.stats.harvested += 1;
  const levelUp = addXp(s, 'garden', info.xp) ? 'garden' : false;
  return { item: info.crop, n, levelUp };
}

// ---------- crafting and cooking ----------
export const recipeById = (id) => RECIPES.find((r) => r.id === id);
export function recipeState(s, recipe) {
  if (!unlocked(s, recipe.needs)) {
    return 'locked';
  }
  if (level(s, recipe.skill) < recipe.level) {
    return 'level';
  }
  if (recipe.energy && s.energy < recipe.energy) {
    return 'energy';
  }
  return hasItems(s, recipe.in) ? 'ok' : 'missing';
}
export function craft(s, recipeId) {
  const recipe = recipeById(recipeId);
  if (!recipe || recipeState(s, recipe) !== 'ok') {
    return null;
  }
  takeItems(s, recipe.in);
  if (recipe.energy) {
    s.energy -= recipe.energy;
  }
  Object.entries(recipe.out).forEach(([id, n]) => addItem(s, id, n));
  s.stats.crafted[recipe.id] = (s.stats.crafted[recipe.id] || 0) + 1;
  if (recipe.station === 'stove') {
    s.stats.cooked += 1;
  }
  return { out: recipe.out, levelUp: addXp(s, recipe.skill, recipe.xp) ? recipe.skill : false };
}

// ---------- shop ----------
export function shopStock(s) {
  return Object.entries(ITEMS)
    .filter(([, item]) => item.buy && unlocked(s, item.needs))
    .map(([id]) => id);
}
export function buy(s, id, n = 1) {
  const item = ITEMS[id];
  if (!item || !item.buy || !unlocked(s, item.needs) || s.credits < item.buy * n) {
    return false;
  }
  if (item.kind === 'wear' && count(s, id) > 0) {
    return false;
  }
  s.credits -= item.buy * n;
  addItem(s, id, n);
  return true;
}
export function sell(s, id, n = 1) {
  const item = ITEMS[id];
  if (!item || !item.sell || count(s, id) < n || n < 1) {
    return false;
  }
  takeItems(s, { [id]: n });
  s.credits += item.sell * n;
  s.stats.sold += n;
  return item.sell * n;
}

// ---------- villager orders ----------
export function orderFor(s, npcId, day = dayNumber(s)) {
  const npc = NPCS[npcId];
  const rng = mulberry32(day * 131 + Object.keys(NPCS).indexOf(npcId) * 7 + 3);
  const allowed = npc.wants.filter((id) => {
    if (id === 'berry' || id === 'berry_tart') {
      return projectDone(s, 'bridge');
    }
    if (id === 'fish_ray') {
      return projectDone(s, 'dock');
    }
    return true;
  });
  const item = allowed[Math.floor(rng() * allowed.length)];
  const kind = ITEMS[item].kind;
  let n = 1;
  if (kind === 'crop' || kind === 'raw') {
    n = randInt(rng, 2, 4);
  } else if (kind === 'part') {
    n = randInt(rng, 2, 3);
  } else if (kind === 'fish' && item !== 'fish_ray') {
    n = randInt(rng, 1, 2);
  }
  const reward = Math.round(ITEMS[item].sell * n * 1.6) + 6;
  const done = s.friends[npcId].doneDay === day;
  return { npc: npcId, item, n, reward, done, day };
}
export function fillOrder(s, npcId) {
  const order = orderFor(s, npcId);
  if (order.done || count(s, order.item) < order.n) {
    return null;
  }
  takeItems(s, { [order.item]: order.n });
  s.credits += order.reward;
  const friend = s.friends[npcId];
  friend.doneDay = order.day;
  friend.points = Math.min(100, friend.points + 10);
  s.stats.orders += 1;
  let gift = null;
  if (!friend.gift && friend.points >= FRIEND_GIFT_AT) {
    friend.gift = true;
    gift = NPCS[npcId].gift;
    addItem(s, gift.item, gift.n);
  }
  return { ...order, gift };
}

// ---------- community projects ----------
export const projectById = (id) => PROJECTS.find((p) => p.id === id);
export function projectRemaining(s, id) {
  const project = projectById(id);
  const given = s.projects[id].given;
  return Object.fromEntries(Object.entries(project.need).map(([item, n]) => [item, Math.max(0, n - (given[item] || 0))]));
}
export function projectFraction(s, id) {
  const project = projectById(id);
  const total = Object.values(project.need).reduce((a, b) => a + b, 0);
  const left = Object.values(projectRemaining(s, id)).reduce((a, b) => a + b, 0);
  return (total - left) / total;
}
function finishIfComplete(s, id) {
  const state = s.projects[id];
  if (!state.done && Object.values(projectRemaining(s, id)).every((n) => n === 0)) {
    state.done = true;
    s.credits += projectById(id).reward;
    return true;
  }
  return false;
}
// Give from your own bag. Returns { given, finished }.
export function contribute(s, id, item, n) {
  const project = projectById(id);
  if (!project || s.projects[id].done || !projectOpen(s, project)) {
    return { given: 0, finished: false };
  }
  const amount = Math.min(n, projectRemaining(s, id)[item] || 0, count(s, item));
  if (amount <= 0) {
    return { given: 0, finished: false };
  }
  takeItems(s, { [item]: amount });
  s.projects[id].given[item] = (s.projects[id].given[item] || 0) + amount;
  s.stats.contributed += amount;
  addXp(s, 'craft', Math.ceil(amount / 2));
  return { given: amount, finished: finishIfComplete(s, id) };
}
// A friend in your room gave materials: it counts toward your copy of the same project.
export function contributeRemote(s, id, item, n) {
  const project = projectById(id);
  const amount = Math.max(0, Math.min(Math.floor(Number(n) || 0), 20));
  if (!project || !project.need[item] || s.projects[id].done || !projectOpen(s, project) || amount === 0) {
    return { given: 0, finished: false };
  }
  const added = Math.min(amount, projectRemaining(s, id)[item]);
  s.projects[id].given[item] = (s.projects[id].given[item] || 0) + added;
  return { given: added, finished: added > 0 && finishIfComplete(s, id) };
}

// ---------- fishing ----------
export function catchZone(s) {
  let width = 0.16 + 0.015 * level(s, 'fish');
  if (count(s, 'rod2') > 0) {
    width += 0.06;
  }
  if (buffActive(s, 'fish')) {
    width += 0.08;
  }
  return Math.min(0.45, width);
}
export function rollFish(spot, rng = Math.random) {
  const table = FISH_SPOTS[spot].table;
  let roll = rng();
  for (const [fish, weight] of table) {
    roll -= weight;
    if (roll <= 0) {
      return fish;
    }
  }
  return table[table.length - 1][0];
}
export function landFish(s, spot, rng = Math.random) {
  const fish = rollFish(spot, rng);
  addItem(s, fish, 1);
  s.stats.fished[fish] = (s.stats.fished[fish] || 0) + 1;
  const levelUp = addXp(s, 'fish', fish === 'fish_ray' ? 25 : fish === 'fish_carp' ? 14 : 10) ? 'fish' : false;
  return { fish, levelUp };
}

// ---------- pet ----------
export function patPet(s) {
  if (s.clock - s.pet.lastPat < 20) {
    return false;
  }
  s.pet.lastPat = s.clock;
  s.pet.happy = Math.min(100, s.pet.happy + 8);
  return true;
}
export function feedPet(s) {
  const fish = ['fish_minnow', 'fish_carp'].find((id) => count(s, id) > 0);
  if (!fish) {
    return false;
  }
  takeItems(s, { [fish]: 1 });
  s.pet.happy = Math.min(100, s.pet.happy + 30);
  return fish;
}

// ---------- the clock: everything that changes with time ----------
// Returns a list of events for the UI ({type, ...}).
export function tick(s, dt, rng = Math.random) {
  const events = [];
  const dayBefore = dayNumber(s);
  const rainBefore = isRaining(s);
  s.clock += dt;
  const cap = energyCapacity(s);
  s.energy = Math.max(0, Math.min(cap, s.energy + energyRate(s) * dt));

  const raining = isRaining(s);
  const growthRate = buffActive(s, 'grow') ? 1.5 : 1;
  const sprinklers = placedOf(s, 'sprinkler');
  for (const p of s.placed) {
    if (p.type !== 'planter' || !p.crop) {
      continue;
    }
    if (!p.crop.watered && raining) {
      p.crop.watered = true;
    }
    if (!p.crop.watered && s.energy >= ENERGY.sprinklerCost &&
      sprinklers.some((sp) => Math.hypot(sp.x - p.x, sp.z - p.z) <= ENERGY.sprinklerRange)) {
      p.crop.watered = true;
      s.energy -= ENERGY.sprinklerCost;
      events.push({ type: 'sprinkled', uid: p.uid });
    }
    if (p.crop.watered) {
      const before = cropProgress(p.crop);
      p.crop.growth += dt * growthRate;
      if (before < 1 && cropProgress(p.crop) >= 1) {
        events.push({ type: 'ripe', uid: p.uid, crop: CROPS[p.crop.seed].crop });
      }
    }
  }

  // Kopi the pet sometimes finds something when happy
  if (s.pet.happy >= 60 && s.clock - s.pet.lastFind > 150) {
    s.pet.lastFind = s.clock;
    if (rng() < 0.6) {
      const found = ['scrap', 'fiber', 'seed_basil', 'stone'][Math.floor(rng() * 4)];
      addItem(s, found, 1);
      events.push({ type: 'petFind', item: found });
    }
  }
  if (s.clock % 60 < dt) {
    s.pet.happy = Math.max(20, s.pet.happy - 1);
  }

  if (dayNumber(s) !== dayBefore) {
    events.push({ type: 'day', day: dayNumber(s) });
  }
  if (raining !== rainBefore) {
    events.push({ type: raining ? 'rainStart' : 'rainStop' });
  }
  return events;
}

export function advance(s, seconds, rng = Math.random) {
  const events = [];
  let left = seconds;
  while (left > 0) {
    const step = Math.min(5, left);
    events.push(...tick(s, step, rng));
    left -= step;
  }
  return events;
}

// Time away from the game counts (up to 30 minutes), so crops ripen and batteries fill while you rest.
export function applyOffline(s, now = Date.now(), rng = Math.random) {
  const away = Math.max(0, Math.min(OFFLINE_CAP_SECONDS, (now - (s.savedAt || now)) / 1000));
  if (away < 20) {
    return null;
  }
  const before = { energy: s.energy, ripe: s.placed.filter((p) => p.crop && cropProgress(p.crop) >= 1).length };
  advance(s, away, rng);
  const ripe = s.placed.filter((p) => p.crop && cropProgress(p.crop) >= 1).length;
  return { seconds: Math.round(away), energy: Math.round(s.energy - before.energy), ripe: ripe - before.ripe };
}

// Sleep in the house until 06:00. Only at night.
export function canRest(s) {
  const tod = timeOfDay(s);
  return tod > 0.8 || tod < 0.22;
}
export function rest(s, rng = Math.random) {
  if (!canRest(s)) {
    return 0;
  }
  const tod = timeOfDay(s);
  const target = 0.25;
  const gap = ((target - tod + 1) % 1) * DAY_LENGTH;
  advance(s, gap, rng);
  return gap;
}

// ---------- guided goals ----------
const questChecks = {
  q_wood: (s) => s.stats.chopped >= 1,
  q_fiber: (s) => (s.stats.gathered.fiber || 0) >= 1,
  q_plant: (s) => s.stats.planted >= 1,
  q_water: (s) => s.stats.watered >= 1,
  q_scrap: (s) => (s.stats.gathered.scrap || 0) >= 1,
  q_wire: (s) => (s.stats.crafted.wire || 0) >= 1,
  q_solar: (s) => (s.stats.placed.solar || 0) >= 1,
  q_harvest: (s) => s.stats.harvested >= 1,
  q_market: (s) => Boolean(s.stats.visited.market),
  q_sell: (s) => s.stats.sold >= 1,
  q_order: (s) => s.stats.orders >= 1,
  q_project: (s) => s.stats.contributed >= 1,
  q_fish: (s) => Object.values(s.stats.fished).reduce((a, b) => a + b, 0) >= 1,
  q_cook: (s) => s.stats.cooked >= 1,
  q_decor: (s) => s.stats.decor >= 3,
  q_grove: (s) => Boolean(s.stats.visited.grove),
  q_tower: (s) => projectDone(s, 'tower'),
  q_ray: (s) => (s.stats.fished.fish_ray || 0) >= 1,
  q_light: (s) => projectDone(s, 'lighthouse'),
};
export const currentQuest = (s) => QUESTS[s.quest] || null;
// Completes every finished goal in order and returns them (rewards already paid).
export function checkQuests(s) {
  const finished = [];
  while (s.quest < QUESTS.length && questChecks[QUESTS[s.quest].id](s)) {
    const quest = QUESTS[s.quest];
    if (quest.reward.credits) {
      s.credits += quest.reward.credits;
    }
    Object.entries(quest.reward.items || {}).forEach(([id, n]) => addItem(s, id, n));
    finished.push(quest);
    s.quest += 1;
  }
  return finished;
}

// ---------- save ----------
export function serialize(s) {
  s.savedAt = Date.now();
  return JSON.stringify(s);
}
export function deserialize(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || typeof data.clock !== 'number' || !data.inv) {
    throw new Error('Not a Teduh save');
  }
  const base = newState({ name: data.name, color: data.color, lang: data.lang });
  const merged = { ...base, ...data };
  merged.stats = { ...base.stats, ...(data.stats || {}) };
  merged.skills = { ...base.skills, ...(data.skills || {}) };
  merged.projects = { ...base.projects, ...(data.projects || {}) };
  merged.friends = { ...base.friends, ...(data.friends || {}) };
  merged.pet = { ...base.pet, ...(data.pet || {}) };
  merged.inv = Object.fromEntries(Object.entries(data.inv).filter(([id, n]) => ITEMS[id] && Number.isFinite(n) && n > 0));
  merged.placed = (Array.isArray(data.placed) ? data.placed : []).filter((p) => ITEMS[p.type]?.kind === 'place');
  merged.nextUid = Math.max(merged.nextUid || 1, ...merged.placed.map((p) => p.uid + 1));
  merged.v = VERSION;
  return merged;
}
export function toCode(s) {
  const bytes = new TextEncoder().encode(serialize(s));
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return `TEDUH1.${btoa(binary)}`;
}
export function fromCode(code) {
  const clean = String(code || '').trim().replace(/^TEDUH1\./, '');
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return deserialize(new TextDecoder().decode(bytes));
}
