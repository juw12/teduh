// Teduh controller: game loop, input, interactions, build mode, fishing, saving, settings and rooms.

import { createWorld } from './world.js';
import * as S from './state.js';
import * as D from './data.js';
import { t, setLang, getLang, itemName, skillName, projectName, questName, phraseText } from './i18n.js';
import * as UI from './ui.js';
import { audio } from './audio.js';
import { joinTogether, makeRoomCode, cleanRoomCode, PLAZA } from './net.js';

const params = new URLSearchParams(location.search);
const TEST = params.has('test');
const SETTINGS_KEY = 'teduh.settings.v1';
const $ = UI.$;

// ---------- storage that never throws (private windows, sandboxed frames) ----------
const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

function loadSettings() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 700;
  const defaults = {
    sound: !TEST,
    quality: coarse && small ? 'low' : 'high',
    motion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    lang: (navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en',
    name: '',
  };
  try {
    return { ...defaults, ...JSON.parse(store.get(SETTINGS_KEY) || '{}') };
  } catch {
    return defaults;
  }
}

const settings = loadSettings();
const canvas = $('#scene');
const world = createWorld(canvas, { quality: settings.quality });
world.reducedMotion = settings.motion;
audio.setEnabled(settings.sound);

const game = {
  s: null,
  settings,
  world,
  room: null,
  build: null,
  fishing: null,
  rng: TEST ? S.mulberry32(1) : Math.random,
  moveTarget: null,
  pendingAct: null,
  pulse: 0,
  nearest: null,
  keys: new Set(),
  targetYaw: 0,
  targetZoom: 1,
};
const demo = S.newState({});

// ---------- feedback helpers ----------
function notifyLevel(skill) {
  if (skill) {
    UI.toast(t('levelUp', { skill: skillName(skill), n: S.level(game.s, skill) }), 'good');
    audio.play('success');
  }
}
let saveTimer = null;
function save() {
  if (game.s) {
    store.set(S.SAVE_KEY, S.serialize(game.s));
  }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 800);
}
function afterChange() {
  const s = game.s;
  S.checkQuests(s).forEach((quest) => {
    UI.toast(t('questDone', { name: questName(quest) }), 'good');
    audio.play('success');
  });
  if (S.projectDone(s, 'lighthouse') && !s.finaleShown) {
    s.finaleShown = true;
    UI.toast(t('finale'), 'good');
  }
  world.syncPlaced(s);
  world.refreshUnlocks(s);
  UI.refreshPanel();
  UI.forceHud();
  if (game.build) {
    UI.showBuildBar(game);
  }
  scheduleSave();
}
function handleEvents(events) {
  let changed = false;
  events.forEach((event) => {
    if (event.type === 'ripe') {
      UI.toast(t('ripe', { item: itemName(event.crop) }));
      changed = true;
    } else if (event.type === 'day') {
      UI.toast(t('newDay', { n: event.day }));
      changed = true;
    } else if (event.type === 'rainStart') {
      UI.toast(t('rainStart'));
      audio.setRain(true);
      changed = true;
    } else if (event.type === 'rainStop') {
      UI.toast(t('rainStop'));
      audio.setRain(false);
    } else if (event.type === 'petFind') {
      UI.toast(t('petFind', { item: itemName(event.item) }));
      changed = true;
    } else if (event.type === 'sprinkled') {
      changed = true;
    }
  });
  if (changed) {
    afterChange();
  }
}

// ---------- what can I do here? ----------
const NODE_LABELS = { tree: 'actChop', rock: 'actMine', scrap: 'actSalvage', bush: 'actGather', berrybush: 'actPick' };
function describe(entry) {
  const s = game.s;
  switch (entry.kind) {
    case 'node':
      return S.nodeReady(s, entry.index) ? { label: t(NODE_LABELS[entry.nodeType]), enabled: true } : { label: t('actRegrow'), enabled: false };
    case 'placed': {
      const p = s.placed.find((x) => x.uid === entry.uid);
      if (!p) {
        return null;
      }
      if (p.type === 'planter') {
        if (!p.crop) {
          return { label: t('actPlant'), enabled: true };
        }
        const crop = itemName(D.CROPS[p.crop.seed].crop);
        if (!p.crop.watered) {
          return { label: t('actWater'), enabled: true, sub: crop };
        }
        const progress = S.cropProgress(p.crop);
        return progress < 1
          ? { label: t('actGrowing'), enabled: false, sub: `${crop} ${Math.floor(progress * 100)} %` }
          : { label: t('actHarvest'), enabled: true, sub: crop };
      }
      if (p.type === 'cookstove') {
        return { label: t('actCook'), enabled: true };
      }
      if (p.type === 'composter') {
        return { label: t('actCompost'), enabled: true };
      }
      if (p.type === 'battery') {
        return { label: itemName('battery'), enabled: true, sub: `${Math.floor(s.energy)} / ${S.energyCapacity(s)}` };
      }
      return { label: itemName(p.type), enabled: true };
    }
    case 'house':
      return S.canRest(s) ? { label: t('actRest'), enabled: true } : { label: t('actHome'), enabled: true, sub: t('restNo') };
    case 'workbench':
      return { label: t('actCraft'), enabled: true };
    case 'pond':
    case 'reefpool':
      return { label: t('actFish'), enabled: true };
    case 'stall':
      return { label: t('actShop'), enabled: true };
    case 'board':
      return { label: t('actBoard'), enabled: true };
    case 'tower':
      return { label: t('actTower'), enabled: true, sub: projectName('tower') };
    case 'lighthouse':
      return { label: t('actLighthouse'), enabled: true, sub: projectName('lighthouse') };
    case 'site':
      return { label: t('actProject'), enabled: true, sub: projectName(entry.project) };
    case 'npc':
      return { label: `${t('actTalk')} ${D.NPCS[entry.id].name}`, enabled: true };
    case 'pet':
      return { label: `${t('actPet')} ${s.pet.name}`, enabled: true };
    default:
      return null;
  }
}

function faceTowards(entry) {
  const s = game.s;
  s.pos.f = Math.atan2(entry.x - s.pos.x, entry.z - s.pos.z);
}

function act(entry) {
  if (!entry || !game.s) {
    return;
  }
  audio.unlock();
  const s = game.s;
  faceTowards(entry);
  switch (entry.kind) {
    case 'node': {
      const result = S.gather(s, entry.index, game.rng);
      if (!result) {
        return;
      }
      game.pulse = 0.4;
      audio.play(entry.nodeType === 'bush' || entry.nodeType === 'berrybush' ? 'pick' : 'chop');
      UI.toast(t('got', { n: result.n, item: itemName(result.item) }));
      if (result.extra) {
        UI.toast(t('got', { n: 1, item: itemName(result.extra) }));
      }
      notifyLevel(result.levelUp);
      afterChange();
      return;
    }
    case 'placed': {
      const p = s.placed.find((x) => x.uid === entry.uid);
      if (!p) {
        return;
      }
      if (p.type === 'planter') {
        if (!p.crop) {
          UI.openSeeds(game, p.uid);
        } else if (!p.crop.watered) {
          S.water(s, p.uid);
          game.pulse = 0.4;
          audio.play('water');
          afterChange();
        } else if (S.cropProgress(p.crop) >= 1) {
          const result = S.harvest(s, p.uid, game.rng);
          game.pulse = 0.4;
          audio.play('pick');
          UI.toast(t('got', { n: result.n, item: itemName(result.item) }));
          notifyLevel(result.levelUp);
          afterChange();
        }
      } else if (p.type === 'cookstove') {
        UI.openStation(game, 'stove');
      } else if (p.type === 'composter') {
        UI.openStation(game, 'compost');
      } else if (p.type === 'battery' || p.type === 'solar' || p.type === 'turbine') {
        const rate = S.energyRate(s) * 60;
        UI.toast(`${t('energy')} ${Math.floor(s.energy)} / ${S.energyCapacity(s)} · ${rate >= 0 ? '+' : ''}${rate.toFixed(1)}/min`);
      } else {
        UI.toast(itemName(p.type));
      }
      return;
    }
    case 'house':
      if (S.canRest(s)) {
        S.rest(s, game.rng);
        UI.toast(t('restDone'), 'good');
        afterChange();
      } else {
        UI.toast(t('restNo'));
      }
      return;
    case 'workbench':
      UI.openStation(game, 'bench');
      return;
    case 'pond':
      game.startFishing('pond');
      return;
    case 'reefpool':
      game.startFishing('reef');
      return;
    case 'stall':
      UI.openShop(game);
      return;
    case 'board':
      UI.openBoard(game);
      return;
    case 'tower':
      UI.openBoard(game, 'tower');
      return;
    case 'lighthouse':
      UI.openBoard(game, 'lighthouse');
      return;
    case 'site':
      UI.openBoard(game, entry.project);
      return;
    case 'npc':
      UI.openNpc(game, entry.id);
      return;
    case 'pet':
      UI.openPet(game);
      return;
    default:
  }
}

// ---------- game actions used by the UI ----------
Object.assign(game, {
  actNearest() {
    if (game.nearest && describe(game.nearest)?.enabled) {
      act(game.nearest);
    }
  },
  openNamed(name) {
    if (!game.s) {
      return;
    }
    audio.unlock();
    if (name === 'bag') {
      UI.openBag(game);
    } else if (name === 'build') {
      if (game.build) {
        game.endBuild();
      } else {
        game.startBuild(null);
      }
    } else if (name === 'journal') {
      UI.openJournal(game);
    } else if (name === 'together') {
      UI.openTogether(game);
    } else if (name === 'settings') {
      UI.openSettings(game);
    }
  },
  turnCamera(dir) {
    game.targetYaw += dir * (Math.PI / 4);
  },
  zoomCamera(dir) {
    game.targetZoom = Math.max(0.55, Math.min(1.6, game.targetZoom + dir * 0.15));
  },
  craft(id) {
    const result = S.craft(game.s, id);
    if (!result) {
      return;
    }
    audio.play('craft');
    Object.entries(result.out).forEach(([item, n]) => UI.toast(t('got', { n, item: itemName(item) })));
    notifyLevel(result.levelUp);
    afterChange();
  },
  plant(uid, seed, compost) {
    if (S.plant(game.s, uid, seed, compost)) {
      audio.play('pick');
      UI.closePanel();
      afterChange();
    }
  },
  buy(id) {
    if (S.buy(game.s, id, 1)) {
      audio.play('coin');
      afterChange();
    }
  },
  sell(id, n) {
    if (S.sell(game.s, id, n)) {
      audio.play('coin');
      afterChange();
    }
  },
  fill(npcId) {
    const result = S.fillOrder(game.s, npcId);
    if (result) {
      audio.play('success');
      if (result.gift) {
        UI.toast(t('giftGot', { name: D.NPCS[npcId].name, n: result.gift.n, item: itemName(result.gift.item) }), 'good');
      }
      afterChange();
    }
  },
  give(projectId, item, n) {
    const result = S.contribute(game.s, projectId, item, n);
    if (result.given > 0) {
      audio.play('craft');
      if (game.room && game.room.conn) {
        game.room.conn.give(projectId, item, result.given);
      }
      if (result.finished) {
        UI.toast(t('projectFinished', { name: projectName(projectId) }), 'good');
        audio.play('success');
      }
      afterChange();
    }
  },
  giveAll(projectId) {
    const remaining = S.projectRemaining(game.s, projectId);
    Object.entries(remaining).forEach(([item, left]) => {
      const n = Math.min(left, S.count(game.s, item));
      if (n > 0) {
        game.give(projectId, item, n);
      }
    });
  },
  eat(id) {
    if (S.eat(game.s, id)) {
      audio.play('pick');
      afterChange();
    }
  },
  wear(id) {
    game.s.hat = id;
    world.setPlayerLook(game.s.color, id);
    if (game.room && game.room.conn) {
      game.room.conn.updateProfile({ hat: id });
    }
    afterChange();
  },
  patPet() {
    if (S.patPet(game.s)) {
      UI.toast(t('petPat'));
      audio.play('pick');
    }
    afterChange();
  },
  feedPet() {
    if (S.feedPet(game.s)) {
      UI.toast(t('petPat'));
      audio.play('pick');
    }
    afterChange();
  },

  // build mode
  startBuild(type) {
    UI.closePanel();
    game.build = { type: type || null, rot: 0, moving: null, selectedUid: null, hover: null };
    game.targetZoom = Math.max(game.targetZoom, 1.15);
    UI.showBuildBar(game);
  },
  selectBuild(id) {
    Object.assign(game.build, { type: id, moving: null, selectedUid: null });
    UI.showBuildBar(game);
  },
  rotateBuild() {
    if (game.build) {
      game.build.rot = (game.build.rot + 1) % 4;
    }
  },
  buildCell() {
    const s = game.s;
    if (game.build.hover) {
      return game.build.hover;
    }
    return { x: Math.round(s.pos.x + Math.sin(s.pos.f) * 1.6), z: Math.round(s.pos.z + Math.cos(s.pos.f) * 1.6) };
  },
  placeAt(cell) {
    const b = game.build;
    const s = game.s;
    if (b.moving) {
      if (S.movePlaced(s, b.moving, cell.x, cell.z, b.rot)) {
        b.moving = null;
        audio.play('craft');
        afterChange();
      } else {
        UI.toast(t('cantPlace'));
      }
    } else if (b.type) {
      if (S.place(s, b.type, cell.x, cell.z, b.rot)) {
        audio.play('craft');
        if (S.count(s, b.type) === 0) {
          b.type = null;
        }
        afterChange();
      } else {
        UI.toast(t('cantPlace'));
      }
    }
  },
  placeAtCursor() {
    if (game.build && (game.build.type || game.build.moving)) {
      game.placeAt(game.buildCell());
    }
  },
  buildMove(uid) {
    const p = game.s.placed.find((x) => x.uid === uid);
    if (!p) {
      return;
    }
    if (p.crop) {
      UI.toast(t('harvestFirst'));
      return;
    }
    Object.assign(game.build, { moving: uid, rot: p.rot || 0, selectedUid: null, type: null });
    UI.showBuildBar(game);
  },
  buildPickUp(uid) {
    if (S.pickUp(game.s, uid)) {
      game.build.selectedUid = null;
      afterChange();
    } else {
      UI.toast(t('harvestFirst'));
    }
  },
  endBuild() {
    game.build = null;
    world.setCursor(null);
    UI.showBuildBar(game);
  },

  // fishing
  startFishing(spot) {
    const zoneW = S.catchZone(game.s);
    game.fishing = { spot, pos: 0, dir: 1, speed: spot === 'reef' ? 1.2 : 0.85, zoneW, zoneStart: 0.12 + game.rng() * (0.76 - zoneW), misses: 0 };
    UI.showFishing(true);
    UI.drawFishing(game.fishing);
    $('#fishBtn').focus();
  },
  reel() {
    const f = game.fishing;
    if (!f) {
      return;
    }
    if (f.pos >= f.zoneStart && f.pos <= f.zoneStart + f.zoneW) {
      const result = S.landFish(game.s, f.spot, game.rng);
      UI.toast(t('fishGot', { item: itemName(result.fish) }), 'good');
      audio.play('success');
      notifyLevel(result.levelUp);
      game.endFishing();
      afterChange();
    } else {
      f.misses += 1;
      audio.play('miss');
      if (f.misses >= 3) {
        UI.toast(t('fishMiss'));
        game.endFishing();
      } else {
        f.zoneStart = 0.12 + game.rng() * (0.76 - f.zoneW);
      }
    }
  },
  endFishing() {
    game.fishing = null;
    UI.showFishing(false);
  },

  // together
  async joinRoom(code) {
    let room = code === null ? makeRoomCode() : code === PLAZA ? PLAZA : cleanRoomCode(code);
    if (!room) {
      return;
    }
    game.leaveRoom(true);
    game.room = { code: room, connecting: true, conn: null };
    UI.refreshPanel();
    try {
      const conn = await joinTogether(room, { name: game.s.name, color: game.s.color, hat: game.s.hat }, {
        join(id, info) {
          world.addPeer(id, info);
          UI.toast(t('joined', { name: info.name }));
          UI.refreshPanel();
        },
        leave(id) {
          UI.toast(t('left', { name: game.room?.conn?.peerName(id) || '' }));
          world.removePeer(id);
          UI.refreshPanel();
        },
        state(id, st) {
          world.updatePeer(id, st);
        },
        say(id, phraseId) {
          world.peerSay(id, phraseText(phraseId));
          UI.toast(`${game.room?.conn?.peerName(id)}: ${phraseText(phraseId)}`);
        },
        give(id, { p, item, n }) {
          const result = S.contributeRemote(game.s, p, item, n);
          if (result.given > 0) {
            UI.toast(t('gaveRemote', { name: game.room?.conn?.peerName(id), n: result.given, item: itemName(item), project: projectName(p) }), 'good');
            if (result.finished) {
              UI.toast(t('projectFinished', { name: projectName(p) }), 'good');
            }
            afterChange();
          }
        },
      });
      game.room = { code: room, conn };
    } catch (error) {
      console.warn('Together failed', error);
      game.room = null;
      UI.toast(t('offlineOnly'));
    }
    UI.refreshPanel();
  },
  leaveRoom(silent) {
    if (game.room && game.room.conn) {
      game.room.conn.leave();
    }
    [...world.peers.keys()].forEach((id) => world.removePeer(id));
    game.room = null;
    if (!silent) {
      UI.refreshPanel();
    }
  },
  say(phraseId) {
    if (game.room && game.room.conn) {
      game.room.conn.say(phraseId);
      world.selfSay(phraseText(phraseId));
    }
  },

  // settings
  setLang(code) {
    setLang(code);
    settings.lang = code;
    if (game.s) {
      game.s.lang = code;
    }
    store.set(SETTINGS_KEY, JSON.stringify(settings));
    UI.relabelHud();
    UI.forceHud();
    UI.refreshPanel();
    if (game.build) {
      UI.showBuildBar(game);
    }
    scheduleSave();
  },
  setSetting(key, value) {
    settings[key] = value;
    store.set(SETTINGS_KEY, JSON.stringify(settings));
    if (key === 'sound') {
      audio.setEnabled(value);
    } else if (key === 'quality') {
      world.setQuality(value);
    } else if (key === 'motion') {
      world.reducedMotion = value;
    }
    UI.refreshPanel();
  },
  setColor(color) {
    game.s.color = color;
    world.setPlayerLook(color, game.s.hat);
    if (game.room && game.room.conn) {
      game.room.conn.updateProfile({ color });
    }
    afterChange();
  },
  photo() {
    const link = document.createElement('a');
    link.href = world.photo();
    link.download = `teduh-day-${S.dayNumber(game.s)}.png`;
    link.click();
  },
  canInstall: () => Boolean(deferredInstall),
  install() {
    if (deferredInstall) {
      deferredInstall.prompt();
      deferredInstall = null;
      UI.refreshPanel();
    }
  },
  saveCode: () => S.toCode(game.s),
  loadCode(code) {
    try {
      const loaded = S.fromCode(code);
      enterGame(loaded, null);
      UI.closePanel();
      UI.toast(t('saved'), 'good');
      save();
    } catch {
      UI.toast(t('badCode'));
    }
  },
  reset() {
    if (window.confirm(t('resetConfirm'))) {
      store.remove(S.SAVE_KEY);
      location.reload();
    }
  },
});

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstall = event;
});

// ---------- movement ----------
const SOLID = { tree: 0.45, rock: 0.6, scrap: 0.5, bush: 0.4, berrybush: 0.4, house: 2.0, workbench: 0.95, stall: 1.45, board: 0.5, tower: 1.0, lighthouse: 1.3, npc: 0.4 };
function solidRadius(entry) {
  if (entry.kind === 'node') {
    return SOLID[entry.nodeType];
  }
  if (entry.kind === 'placed') {
    return entry.type === 'path' ? 0 : 0.42;
  }
  return SOLID[entry.kind] || 0;
}
function blocked(x, z, fromX, fromZ) {
  if (!S.walkable(game.s, x, z)) {
    return true;
  }
  for (const entry of world.interactables) {
    const r = solidRadius(entry);
    if (!r) {
      continue;
    }
    const d = Math.hypot(x - entry.x, z - entry.z);
    if (d < r && d < Math.hypot(fromX - entry.x, fromZ - entry.z)) {
      return true;
    }
  }
  return false;
}
function move(dt) {
  const s = game.s;
  let dx = 0;
  let dz = 0;
  const typing = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (!UI.panelOpen() && !game.fishing && !typing) {
    const k = game.keys;
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const side = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    if (fwd || side) {
      game.moveTarget = null;
      game.pendingAct = null;
      dx = -Math.sin(world.yaw) * fwd + Math.cos(world.yaw) * side;
      dz = -Math.cos(world.yaw) * fwd - Math.sin(world.yaw) * side;
    }
  }
  if (game.moveTarget) {
    const tx = game.moveTarget.x - s.pos.x;
    const tz = game.moveTarget.z - s.pos.z;
    const dist = Math.hypot(tx, tz);
    if (dist <= game.moveTarget.stop) {
      const pending = game.pendingAct;
      game.moveTarget = null;
      game.pendingAct = null;
      if (pending && describe(pending)?.enabled) {
        act(pending);
      }
    } else {
      dx = tx / dist;
      dz = tz / dist;
    }
  }
  const len = Math.hypot(dx, dz);
  if (len < 0.001) {
    return false;
  }
  dx /= len;
  dz /= len;
  const speed = 4.6 * (S.buffActive(s, 'swift') ? 1.4 : 1);
  const nx = s.pos.x + dx * speed * dt;
  const nz = s.pos.z + dz * speed * dt;
  let moved = false;
  if (!blocked(nx, nz, s.pos.x, s.pos.z)) {
    s.pos.x = nx;
    s.pos.z = nz;
    moved = true;
  } else if (!blocked(nx, s.pos.z, s.pos.x, s.pos.z)) {
    s.pos.x = nx;
    moved = true;
  } else if (!blocked(s.pos.x, nz, s.pos.x, s.pos.z)) {
    s.pos.z = nz;
    moved = true;
  }
  s.pos.f = Math.atan2(dx, dz);
  if (!moved && game.moveTarget) {
    const pending = game.pendingAct;
    game.moveTarget = null;
    game.pendingAct = null;
    if (pending && Math.hypot(pending.x - s.pos.x, pending.z - s.pos.z) - pending.r < 0.6 && describe(pending)?.enabled) {
      act(pending);
    }
  }
  return moved;
}

function findNearest() {
  const s = game.s;
  let best = null;
  let bestScore = Infinity;
  for (const entry of world.interactables) {
    const d = Math.hypot(entry.x - s.pos.x, entry.z - s.pos.z) - entry.r;
    if (d > 0) {
      continue;
    }
    const facing = Math.cos(Math.atan2(entry.x - s.pos.x, entry.z - s.pos.z) - s.pos.f);
    const score = d - facing * 0.5 + (entry.kind === 'pet' ? 0.6 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

function questTarget() {
  const s = game.s;
  const quest = S.currentQuest(s);
  if (!quest) {
    return null;
  }
  const near = (list) => list.reduce((best, e) => {
    const d = Math.hypot(e.x - s.pos.x, e.z - s.pos.z);
    return !best || d < best.d ? { x: e.x, z: e.z, d } : best;
  }, null);
  const target = quest.target;
  if (['tree', 'bush', 'scrap'].includes(target)) {
    return near(world.interactables.filter((e) => e.kind === 'node' && e.nodeType === target && S.nodeReady(s, e.index) && S.islandAt(e.x, e.z) === 'home'));
  }
  if (target === 'planter') {
    return near(world.interactables.filter((e) => e.kind === 'placed' && e.type === 'planter'));
  }
  if (target === 'npc') {
    return near(world.interactables.filter((e) => e.kind === 'npc'));
  }
  const fixture = world.interactables.find((e) => e.id === target || e.kind === target);
  return fixture ? { x: fixture.x, z: fixture.z } : null;
}

// ---------- input ----------
window.addEventListener('keydown', (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  const key = event.key.toLowerCase();
  if (!game.s) {
    return;
  }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    game.keys.add(key);
    if (!UI.panelOpen() && key.startsWith('arrow')) {
      event.preventDefault();
    }
    return;
  }
  if (UI.panelOpen()) {
    return;
  }
  if (key === 'e' || key === ' ') {
    if (event.target.tagName === 'BUTTON' && key === ' ') {
      return;
    }
    event.preventDefault();
    if (game.fishing) {
      game.reel();
    } else if (game.build) {
      game.placeAtCursor();
    } else {
      game.actNearest();
    }
  } else if (key === 'q') {
    game.turnCamera(-1);
  } else if (key === 'r') {
    if (game.build) {
      game.rotateBuild();
    } else {
      game.turnCamera(1);
    }
  } else if (key === 'b') {
    game.openNamed('bag');
  } else if (key === 'c') {
    game.openNamed('build');
  } else if (key === 'j') {
    game.openNamed('journal');
  } else if (key === 'escape') {
    if (game.fishing) {
      game.endFishing();
    } else if (game.build) {
      game.endBuild();
    }
  }
});
window.addEventListener('keyup', (event) => game.keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => game.keys.clear());

const pointers = new Map();
let pinchStart = null;
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('pointerdown', (event) => {
  audio.unlock();
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, sx: event.clientX, sy: event.clientY, t: performance.now(), button: event.button });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: game.targetZoom };
  }
});
canvas.addEventListener('pointermove', (event) => {
  const p = pointers.get(event.pointerId);
  if (p) {
    const dx = event.clientX - p.x;
    p.x = event.clientX;
    p.y = event.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      game.targetYaw -= dx * 0.004;
      if (pinchStart) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        game.targetZoom = Math.max(0.55, Math.min(1.6, pinchStart.zoom * (pinchStart.dist / Math.max(40, dist))));
      }
    } else if (p.button === 2) {
      game.targetYaw -= dx * 0.008;
    }
  }
  if (game.build && game.s && event.pointerType === 'mouse') {
    const hit = world.pick(event.clientX, event.clientY);
    game.build.hover = hit && hit.ground ? { x: Math.round(hit.ground.x), z: Math.round(hit.ground.z) } : null;
  }
});
function endPointer(event) {
  const p = pointers.get(event.pointerId);
  const wasSingle = pointers.size === 1;
  pointers.delete(event.pointerId);
  if (pointers.size < 2) {
    pinchStart = null;
  }
  if (!p || !wasSingle || p.button !== 0 || !game.s) {
    return;
  }
  const moved = Math.hypot(event.clientX - p.sx, event.clientY - p.sy);
  if (moved < 12 && performance.now() - p.t < 600) {
    handleTap(event.clientX, event.clientY);
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', (event) => {
  pointers.delete(event.pointerId);
  pinchStart = null;
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  game.targetZoom = Math.max(0.55, Math.min(1.6, game.targetZoom + Math.sign(event.deltaY) * 0.08));
}, { passive: false });

function handleTap(x, y) {
  const hit = world.pick(x, y);
  if (!hit || game.fishing) {
    return;
  }
  if (game.build) {
    const b = game.build;
    if (hit.kind === 'thing' && hit.entry.kind === 'placed' && !b.type && !b.moving) {
      b.selectedUid = hit.entry.uid;
      UI.showBuildBar(game);
      return;
    }
    if (hit.ground) {
      const cell = { x: Math.round(hit.ground.x), z: Math.round(hit.ground.z) };
      b.hover = cell;
      if (b.type || b.moving) {
        game.placeAt(cell);
      }
    }
    return;
  }
  if (hit.kind === 'thing') {
    const entry = hit.entry;
    game.moveTarget = { x: entry.x, z: entry.z, stop: Math.max(0.9, entry.r - 0.25) };
    game.pendingAct = entry;
  } else {
    game.moveTarget = { x: hit.x, z: hit.z, stop: 0.2 };
    game.pendingAct = null;
  }
}

// ---------- loop ----------
let last = performance.now();
let lastRender = 0;
let netTimer = 0;
let autosaveTimer = 0;
let titleSpin = 0;
function frame(now) {
  const rawDt = (now - last) / 1000;
  const dt = Math.min(0.05, rawDt);
  last = now;
  watchPerformance(Math.min(rawDt, 1));
  try {
    step(dt);
  } catch (error) {
    console.error(error);
  }
  // Test runs share a busy CPU with software WebGL: draw at most ~6 frames a second there.
  if (!TEST || now - lastRender > 160) {
    lastRender = now;
    world.render();
  }
  requestAnimationFrame(frame);
}
// Slow device? After 4 s of play, drop to light graphics once if frames average over 45 ms.
const perf = { time: 0, frames: 0, done: false };
function watchPerformance(rawDt) {
  if (perf.done || !game.s || settings.quality !== 'high') {
    return;
  }
  perf.time += rawDt;
  perf.frames += 1;
  if (perf.time > 4) {
    perf.done = true;
    if (perf.time / perf.frames > 0.045) {
      game.setSetting('quality', 'low');
      UI.toast(t('autoLow'));
    }
  }
}
function step(dt) {
  world.yaw += (game.targetYaw - world.yaw) * Math.min(1, dt * 8);
  world.zoom += (game.targetZoom - world.zoom) * Math.min(1, dt * 8);
  if (!game.s) {
    titleSpin += dt * 0.08;
    demo.clock = 60;
    demo.pos.x = Math.sin(titleSpin) * 3;
    demo.pos.z = Math.cos(titleSpin) * 3 - 6;
    world.yaw = titleSpin;
    world.zoom = 1.35;
    world.update(demo, dt, { moving: false });
    return;
  }
  const s = game.s;
  handleEvents(S.tick(s, dt, game.rng));
  const moving = move(dt);
  const island = S.islandAt(s.pos.x, s.pos.z);
  if (island && !s.stats.visited[island]) {
    s.stats.visited[island] = true;
    afterChange();
  }
  game.pulse = Math.max(0, game.pulse - dt);
  if (game.fishing) {
    const f = game.fishing;
    f.pos += f.dir * f.speed * dt;
    if (f.pos > 1) {
      f.pos = 1;
      f.dir = -1;
    } else if (f.pos < 0) {
      f.pos = 0;
      f.dir = 1;
    }
    UI.drawFishing(f);
  }
  game.nearest = game.build || game.fishing ? null : findNearest();
  const prompt = game.nearest ? describe(game.nearest) : null;
  world.setHighlight(game.nearest);
  const target = questTarget();
  world.setBeacon(target && Math.hypot(target.x - s.pos.x, target.z - s.pos.z) > 3 ? target : null);
  if (game.build) {
    const cell = game.buildCell();
    const type = game.build.moving ? s.placed.find((p) => p.uid === game.build.moving)?.type : game.build.type;
    world.setCursor(cell, type ? S.canPlace(s, cell.x, cell.z, game.build.moving) : true, type, game.build.rot);
  }
  world.update(s, dt, { moving, speed: S.buffActive(s, 'swift') ? 1.4 : 1, actionPulse: game.pulse });
  UI.updateHud(game, prompt);
  netTimer += dt;
  if (game.room && game.room.conn && netTimer > 0.15) {
    netTimer = 0;
    game.room.conn.sendState(s.pos);
  }
  autosaveTimer += dt;
  if (autosaveTimer > 10) {
    autosaveTimer = 0;
    save();
  }
}

// ---------- start ----------
function enterGame(state, offline) {
  game.s = state;
  setLang(state.lang);
  settings.lang = state.lang;
  world.setPlayerLook(state.color, state.hat);
  world.unlockKey = '';
  world.refreshUnlocks(state);
  world.syncPlaced(state);
  UI.hideTitle();
  $('#hud').hidden = false;
  UI.buildHud(game);
  UI.relabelHud();
  UI.forceHud();
  game.targetZoom = 1;
  game.targetYaw = 0;
  world.yaw = 0;
  if (offline) {
    UI.toast(`${t('awayTitle')}: ${t('awayBody', { min: Math.round(offline.seconds / 60), energy: offline.energy >= 0 ? `+${offline.energy}` : offline.energy, ripe: offline.ripe })}`, 'good');
  }
  afterChange();
}

function boot() {
  let saved = null;
  const text = store.get(S.SAVE_KEY);
  if (text) {
    try {
      saved = S.deserialize(text);
    } catch {
      saved = null;
    }
  }
  setLang(saved ? saved.lang : settings.lang);
  world.resize();
  window.addEventListener('resize', () => world.resize());
  $('#fishBtn').onclick = () => game.reel();
  $('#fishCancel').onclick = () => game.endFishing();
  $('#panel').addEventListener('close', () => UI.forceHud());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      save();
    }
  });
  window.addEventListener('pagehide', save);
  $('#boot').remove();

  if (TEST && params.has('autostart')) {
    enterGame(S.newState({ name: 'Tester', lang: params.get('lang') || 'en' }), null);
  } else {
    UI.showTitle({
      hasSave: Boolean(saved),
      settings,
      onContinue: () => {
        audio.unlock();
        enterGame(saved, S.applyOffline(saved, Date.now(), game.rng));
      },
      onStart: (options) => {
        if (saved && !window.confirm(t('resetConfirm'))) {
          return;
        }
        audio.unlock();
        settings.name = options.name;
        store.set(SETTINGS_KEY, JSON.stringify(settings));
        enterGame(S.newState(options), null);
        save();
      },
      onLang: (code) => {
        setLang(code);
        settings.lang = code;
        store.set(SETTINGS_KEY, JSON.stringify(settings));
      },
    });
  }
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && !TEST && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

if (TEST) {
  window.teduh = {
    game, S, D, world, t,
    startNew(options = {}) {
      enterGame(S.newState({ name: 'Tester', ...options }), null);
    },
    advance(seconds) {
      handleEvents(S.advance(game.s, seconds, game.rng));
      afterChange();
    },
    act(key) {
      act(world.interactables.find((e) => e.key === key));
    },
    teleport(x, z) {
      game.s.pos.x = x;
      game.s.pos.z = z;
    },
    describe: (key) => describe(world.interactables.find((e) => e.key === key)),
    nearestKey: () => (game.nearest ? game.nearest.key : null),
    afterChange,
  };
}

boot();
