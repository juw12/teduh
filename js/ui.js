// Interface: HUD, dock, panels, title screen, fishing and build bars. DOM is built with h() and textContent,
// so names typed by other players can never inject markup.

import { ITEMS, RECIPES, PROJECTS, NPCS, SKILLS, QUESTS, PHRASES, MAX_LEVEL, xpForNext, AVATAR_COLORS, FRIEND_GIFT_AT, VERSION } from './data.js';
import * as S from './state.js';
import {
  t, itemName, skillName, projectName, projectBody, npcBlurb, questName, questHint, buffText, phraseText, getLang, islandName,
} from './i18n.js';
import { itemGlyph, itemTones } from './icons.js';

export const $ = (selector, root = document) => root.querySelector(selector);

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === false || value === null || value === undefined) {
      return;
    }
    if (key === 'class') {
      el.className = value;
    } else if (key === 'text') {
      el.textContent = value;
    } else if (key === 'html') {
      el.innerHTML = value; // only ever used with the static icon strings below
    } else if (key.startsWith('on')) {
      el.addEventListener(key.slice(2), value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value === true ? '' : value);
    }
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) {
      return;
    }
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return el;
}

const svg = (path) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
export const ICONS = {
  bag: svg('<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  build: svg('<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M10 21v-6h4v6"/>'),
  journal: svg('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>'),
  together: svg('<circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5"/><path d="M14 20c0-2.4 1.4-4 3-4s3 1.6 3 4"/>'),
  settings: svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  left: svg('<path d="M12 4v9"/><circle cx="12" cy="13" r="1.3"/><path d="M19.5 13.5c0 2.5-3.4 4.5-7.5 4.5s-7.5-2-7.5-4.5c0-1.2.8-2.3 2.1-3.1"/><path d="M4 8.5l2.6 1.9-1.4 2.8"/>'),
  right: svg('<path d="M12 4v9"/><circle cx="12" cy="13" r="1.3"/><path d="M4.5 13.5c0 2.5 3.4 4.5 7.5 4.5s7.5-2 7.5-4.5c0-1.2-.8-2.3-2.1-3.1"/><path d="M20 8.5l-2.6 1.9 1.4 2.8"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
  rain: svg('<path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 15H7z"/><path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2"/>'),
  bolt: svg('<path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z"/>'),
  coin: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6c0 2.4-5 1-5 3.4 0 1 1 1.5 2.5 1.5s2.5-.5 2.5-1.5"/>'),
  target: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'),
  check: svg('<path d="m5 12 4 4 10-10"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  zoomIn: svg('<circle cx="11" cy="11" r="6"/><path d="M11 8v6M8 11h6M16 16l4 4"/>'),
  zoomOut: svg('<circle cx="11" cy="11" r="6"/><path d="M8 11h6M16 16l4 4"/>'),
};

// Item icons replace plain colour dots: a small glyph on a soft tint of the item's own colour.
const swatch = (id) => h('span', { class: 'item-ico', style: { background: itemTones(id).tile }, html: itemGlyph(id, 16), 'aria-hidden': 'true' });
const itemTile = (id, size = 28) => h('span', { class: 'item-tile', style: { background: itemTones(id).tile }, html: itemGlyph(id, size), 'aria-hidden': 'true' });
const needList = (s, need) => h('ul', { class: 'need-chips' }, Object.entries(need).map(([id, n]) => {
  const have = S.count(s, id);
  const enough = have >= n;
  return h('li', { class: `need-chip${enough ? ' ok' : ' short'}`, title: t('inBag', { n: have }) },
    swatch(id),
    h('span', { class: 'need-name', text: `${n} ${itemName(id)}` }),
    enough
      ? h('span', { class: 'need-ok', html: ICONS.check, 'aria-label': t('inBag', { n: have }) })
      : h('span', { class: 'need-count', text: t('inBag', { n: have }) }));
}));

// ---------- panel frame ----------
let refreshCurrent = null;
export function openPanel(title, build, { size = 'md' } = {}) {
  const panel = $('#panel');
  panel.dataset.size = size;
  $('#panelTitle').textContent = title;
  refreshCurrent = () => {
    const body = $('#panelBody');
    const scroll = body.scrollTop;
    body.replaceChildren(build());
    body.scrollTop = scroll;
    // Show the bottom fade only when there is more to scroll to.
    requestAnimationFrame(() => body.classList.toggle('scrolls', body.scrollHeight > body.clientHeight + 4));
  };
  refreshCurrent();
  if (!panel.open) {
    panel.showModal();
    // Land focus on the title, not the close button, so no focus ring flashes on open.
    $('#panelTitle').focus({ preventScroll: true });
  }
}
export function refreshPanel() {
  if ($('#panel').open && refreshCurrent) {
    refreshCurrent();
  }
}
export function closePanel() {
  const panel = $('#panel');
  if (panel.open) {
    panel.close();
  }
  refreshCurrent = null;
}
export const panelOpen = () => $('#panel').open;
// The dock stays visible under an open panel and highlights the one in use.
export function markDock(id) {
  document.querySelectorAll('.dock-btn').forEach((btn) => {
    const on = btn.id === `dock-${id}`;
    btn.classList.toggle('active', on);
    if (on) {
      btn.setAttribute('aria-current', 'true');
    } else {
      btn.removeAttribute('aria-current');
    }
  });
}

function tabs(names, active, onPick) {
  return h('div', { class: 'tabs', role: 'tablist' }, names.map(([id, label]) => h('button', {
    class: `tab${id === active ? ' on' : ''}`, role: 'tab', 'aria-selected': id === active ? 'true' : 'false', type: 'button', onclick: () => onPick(id), text: label,
  })));
}

// ---------- toasts ----------
export function toast(text, kind = '') {
  const box = $('#toasts');
  const item = h('div', { class: `toast ${kind}`, text });
  box.append(item);
  while (box.children.length > 4) {
    box.firstChild.remove();
  }
  setTimeout(() => {
    item.classList.add('out');
    setTimeout(() => item.remove(), 400);
  }, 3200);
}

// ---------- HUD ----------
export function buildHud(game) {
  const dock = $('#dock');
  dock.replaceChildren(
    ...[['bag', 'B'], ['build', 'C'], ['journal', 'J'], ['together', ''], ['settings', '']].map(([id, key]) => h('button', {
      class: 'dock-btn', type: 'button', id: `dock-${id}`, 'aria-keyshortcuts': key || null, onclick: () => game.openNamed(id),
    }, h('span', { class: 'ico', html: ICONS[id] }), h('span', { class: 'dock-label', 'data-i18n': id, text: t(id) }))),
  );
  $('#camLeft').innerHTML = ICONS.left;
  $('#camRight').innerHTML = ICONS.right;
  $('#zoomIn').innerHTML = ICONS.zoomIn;
  $('#zoomOut').innerHTML = ICONS.zoomOut;
  $('#camLeft').onclick = () => game.turnCamera(-1);
  $('#camRight').onclick = () => game.turnCamera(1);
  $('#zoomIn').onclick = () => game.zoomCamera(-1);
  $('#zoomOut').onclick = () => game.zoomCamera(1);
  $('#actionBtn').onclick = () => game.actNearest();
  $('#panelClose').innerHTML = ICONS.close;
  $('#panelClose').setAttribute('aria-label', t('close'));
  $('#panelClose').onclick = () => closePanel();
  $('#goal').onclick = () => game.openNamed('journal');
  $('#panel').addEventListener('close', () => markDock(null));
}
export function relabelHud() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  $('#panelClose').setAttribute('aria-label', t('close'));
}

let lastHud = '';
export function updateHud(game, prompt) {
  const s = game.s;
  const tod = S.timeOfDay(s);
  const night = S.daylight(tod) < 0.08;
  const raining = S.isRaining(s);
  const cap = S.energyCapacity(s);
  const rate = S.energyRate(s);
  const quest = S.currentQuest(s);
  const island = S.islandAt(s.pos.x, s.pos.z);
  const key = [S.clockText(s), S.dayNumber(s), raining, night, Math.floor(s.energy), cap, rate > 0.001 ? 1 : rate < -0.001 ? -1 : 0, s.credits, s.quest, getLang(), island,
    prompt ? `${prompt.label}|${prompt.enabled}|${prompt.sub || ''}` : '', Object.keys(s.buffs).filter((b) => S.buffActive(s, b)).join()].join('|');
  if (key === lastHud) {
    return;
  }
  lastHud = key;
  $('#clock').textContent = S.clockText(s);
  $('#dayLabel').textContent = `${t('day')} ${S.dayNumber(s)}`;
  $('#placeLabel').textContent = island ? islandName(island) : '';
  $('#weatherIcon').innerHTML = raining ? ICONS.rain : night ? ICONS.moon : ICONS.sun;
  $('#weatherIcon').setAttribute('title', raining ? t('rain') : t('clear'));
  $('#energyIcon').innerHTML = ICONS.bolt;
  $('#energyFill').style.width = `${Math.round((s.energy / cap) * 100)}%`;
  $('#energyText').textContent = `${Math.floor(s.energy)} / ${cap}`;
  $('#energyTrend').textContent = rate > 0.001 ? `+${(rate * 60).toFixed(1)}/min` : rate < -0.001 ? `${(rate * 60).toFixed(1)}/min` : '';
  $('#energy').setAttribute('aria-label', `${t('energy')} ${Math.floor(s.energy)} / ${cap}`);
  $('#coinIcon').innerHTML = ICONS.coin;
  $('#coins').textContent = s.credits.toLocaleString();
  $('#coinsUnit').textContent = t('coins');
  $('#goalKicker').textContent = t('goal');
  $('#goalText').textContent = quest ? questName(quest) : t('allGoalsDone');
  $('#goalHint').textContent = quest ? questHint(quest) : '';
  $('#goalCount').textContent = `${Math.min(s.quest, QUESTS.length)}/${QUESTS.length}`;
  $('#goalBar').style.width = `${Math.round((Math.min(s.quest, QUESTS.length) / QUESTS.length) * 100)}%`;
  const btn = $('#actionBtn');
  if (prompt) {
    btn.hidden = false;
    btn.disabled = !prompt.enabled;
    $('#actionLabel').textContent = prompt.label;
    $('#actionSub').textContent = prompt.sub || '';
  } else {
    btn.hidden = true;
  }
  const buffs = $('#buffs');
  buffs.replaceChildren(...Object.keys(s.buffs).filter((b) => S.buffActive(s, b)).map((b) => h('span', { class: 'chip', text: buffText(b) })));
}
export const forceHud = () => {
  lastHud = '';
};

// ---------- title screen ----------
export function showTitle({ hasSave, settings, onContinue, onStart, onLang, onHowTo }) {
  const title = $('#title');
  title.hidden = false;
  const render = () => {
    const name = h('input', { id: 'nameInput', class: 'input', maxlength: '18', autocomplete: 'nickname', placeholder: 'Traveller', value: settings.name || '' });
    const form = h('form', {
      class: 'start-form', onsubmit: (event) => {
        event.preventDefault();
        onStart({ name: name.value, lang: getLang() });
      },
    },
    h('label', { class: 'field' }, h('span', { text: t('yourName') }), name),
    h('div', { class: 'field' }, h('span', { text: t('language') }), h('div', { class: 'seg' },
      ['en', 'id'].map((code) => h('button', {
        type: 'button', class: `seg-btn${getLang() === code ? ' on' : ''}`, 'aria-pressed': getLang() === code ? 'true' : 'false',
        onclick: () => {
          onLang(code);
          render();
        },
        text: code === 'en' ? 'English' : 'Bahasa Indonesia',
      })))),
    h('button', { class: hasSave ? 'btn' : 'btn primary', type: 'submit', id: 'startBtn', text: hasSave ? t('newGame') : t('start') }));
    title.replaceChildren(h('div', { class: 'title-card' },
      h('p', { class: 'eyebrow', text: t('eyebrow') }),
      h('h1', { class: 'title-name', text: 'Teduh' }),
      h('p', { class: 'title-tag', text: t('tagline') }),
      h('p', { class: 'title-sub', text: t('sub') }),
      hasSave ? h('button', { class: 'btn primary wide', type: 'button', id: 'continueBtn', onclick: onContinue, text: t('continue') }) : null,
      form,
      h('button', { class: 'btn ghost wide howto-btn', type: 'button', id: 'howToBtn', onclick: () => onHowTo?.(), text: t('howToPlay') }),
      h('p', { class: 'fine' }, `v${VERSION} · `, h('a', { href: 'https://github.com/juw12/teduh', target: '_blank', rel: 'noopener', text: 'GitHub' }), ' · MIT')));
  };
  render();
}
export function hideTitle() {
  $('#title').hidden = true;
}

// ---------- bag ----------
const KIND_ORDER = ['place', 'food', 'crop', 'fish', 'seed', 'part', 'raw', 'tool', 'wear'];
export function openBag(game) {
  markDock('bag');
  openPanel(t('bagTitle'), () => {
    const s = game.s;
    const ids = Object.keys(s.inv).filter((id) => s.inv[id] > 0 && ITEMS[id])
      .sort((a, b) => KIND_ORDER.indexOf(ITEMS[a].kind) - KIND_ORDER.indexOf(ITEMS[b].kind) || itemName(a).localeCompare(itemName(b)));
    const active = Object.keys(s.buffs).filter((b) => S.buffActive(s, b));
    if (!ids.length) {
      return h('div', { class: 'empty-state' }, h('span', { class: 'empty-ico', html: ICONS.bag }), h('p', { class: 'empty', text: t('empty') }));
    }
    const total = ids.reduce((sum, id) => sum + s.inv[id], 0);
    const groups = KIND_ORDER.map((kind) => [kind, ids.filter((id) => ITEMS[id].kind === kind)]).filter(([, list]) => list.length);
    const actionFor = (id) => {
      const item = ITEMS[id];
      if (item.kind === 'place') {
        return h('button', { class: 'btn tiny', type: 'button', onclick: () => game.startBuild(id), text: t('place') });
      }
      if (item.kind === 'food') {
        return h('button', { class: 'btn tiny', type: 'button', onclick: () => game.eat(id), text: t('eat') });
      }
      if (item.kind === 'wear') {
        return s.hat === id
          ? h('button', { class: 'btn tiny', type: 'button', onclick: () => game.wear(null), text: t('remove') })
          : h('button', { class: 'btn tiny', type: 'button', onclick: () => game.wear(id), text: t('wear') });
      }
      return null;
    };
    const hintFor = (id) => {
      const item = ITEMS[id];
      if (item.kind === 'food' && item.buff) {
        return buffText(item.buff);
      }
      if (item.kind === 'seed' && ITEMS[id.replace('seed_', '')]) {
        return t('growsInto', { crop: itemName(id.replace('seed_', '')) });
      }
      if (item.kind === 'crop' || item.kind === 'fish') {
        return t('sellsFor', { n: item.sell });
      }
      if (item.kind === 'raw' || item.kind === 'part') {
        const uses = [...new Set(RECIPES.filter((r) => r.in[id]).map((r) => itemName(Object.keys(r.out)[0])))];
        return uses.length ? t('usedFor', { list: uses.slice(0, 2).join(', ') + (uses.length > 2 ? ` +${uses.length - 2}` : '') }) : t(`hint_${item.kind}`);
      }
      return t(`hint_${item.kind}`);
    };
    return h('div', { class: 'bag' },
      h('p', { class: 'panel-summary' }, t('bagSummary', { kinds: ids.length, n: total })),
      active.length ? h('div', { class: 'note' }, h('strong', { text: `${t('buffActive')}: ` }), active.map(buffText).join(', ')) : null,
      groups.map(([kind, list]) => h('section', { class: 'bag-group' },
        h('h3', { class: 'group-h' }, h('span', { text: t(`kind_${kind}`) }), h('span', { class: 'group-n', text: `${list.length}` })),
        h('ul', { class: 'bag-grid' }, list.map((id) => h('li', { class: 'bag-item' },
          itemTile(id),
          h('span', { class: 'bag-text' }, h('strong', { text: itemName(id) }), h('span', { class: 'bag-hint', text: hintFor(id) })),
          h('span', { class: 'bag-qty num', text: `${s.inv[id]}` }),
          actionFor(id)))))));
  }, { size: 'lg' });
}

// ---------- crafting stations ----------
const stationFilter = {};
const STATE_RANK = { ok: 0, missing: 1, energy: 2, level: 3, locked: 4 };
export function openStation(game, station) {
  const titles = { bench: t('craftTitle'), stove: t('cookTitle'), compost: t('compostTitle') };
  openPanel(titles[station], () => {
    const s = game.s;
    const list = RECIPES.filter((r) => r.station === station)
      .map((recipe, order) => ({ recipe, order, state: S.recipeState(s, recipe) }))
      .sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || a.order - b.order);
    const readyCount = list.filter((entry) => entry.state === 'ok').length;
    const filter = stationFilter[station] || 'all';
    const shown = filter === 'ready' ? list.filter((entry) => entry.state === 'ok') : list;
    const pick = (id) => {
      stationFilter[station] = id;
      refreshPanel();
    };
    return h('div', {},
      h('div', { class: 'panel-tools' },
        h('div', { class: 'seg seg-sm', role: 'group' }, [['all', `${t('filterAll')} ${list.length}`], ['ready', `${t('filterReady')} ${readyCount}`]].map(([id, label]) => h('button', {
          type: 'button', class: `seg-btn${filter === id ? ' on' : ''}`, 'aria-pressed': filter === id ? 'true' : 'false', onclick: () => pick(id), text: label,
        }))),
        station === 'stove' ? h('span', { class: 'meta' }, h('span', { class: 'ico-inline', html: ICONS.bolt }), ` ${t('energy')} ${Math.floor(s.energy)} / ${S.energyCapacity(s)}`) : null),
      shown.length ? null : h('p', { class: 'empty', text: t('noneReady') }),
      h('ul', { class: 'recipes' }, shown.map(({ recipe, state }) => {
        const outId = Object.keys(recipe.out)[0];
        const outN = recipe.out[outId];
        const owned = S.count(s, outId);
        let reason = '';
        if (state === 'locked') {
          reason = t('needProject');
        } else if (state === 'level') {
          reason = t('needLevel', { skill: skillName(recipe.skill), n: recipe.level });
        } else if (state === 'energy') {
          reason = t('needEnergy', { n: recipe.energy });
        } else if (state === 'missing') {
          const short = Object.entries(recipe.in)
            .filter(([id, n]) => S.count(s, id) < n)
            .map(([id, n]) => `${n - S.count(s, id)} ${itemName(id)}`);
          reason = short.length ? t('needMore', { list: short.join(', ') }) : t('missing');
        }
        const ready = state === 'ok';
        return h('li', { class: `recipe${ready ? ' ready' : ' blocked'}` },
          h('div', { class: 'recipe-head' }, itemTile(outId, 26),
            h('span', { class: 'recipe-title' },
              h('strong', { text: `${itemName(outId)}${outN > 1 ? ` x${outN}` : ''}` }),
              h('span', { class: 'recipe-sub', text: owned ? t('inBagShort', { n: owned }) : t(`hint_${ITEMS[outId]?.kind || 'part'}`) }))),
          state === 'locked' ? null : needList(s, recipe.in),
          h('div', { class: 'recipe-foot' },
            ready
              ? h('span', { class: 'status-ok' }, h('span', { class: 'ico-inline', html: ICONS.check }), t('readyNow'))
              : h('span', { class: 'status-why', text: reason }),
            recipe.energy ? h('span', { class: 'meta energy-cost' }, h('span', { class: 'ico-inline', html: ICONS.bolt }), `${recipe.energy}`) : null,
            h('button', { class: `btn small${ready ? ' primary' : ''}`, type: 'button', disabled: !ready, onclick: () => game.craft(recipe.id), text: t('make') })));
      })));
  }, { size: 'lg' });
}

// ---------- seeds ----------
export function openSeeds(game, uid) {
  let compost = false;
  openPanel(t('chooseSeed'), () => {
    const s = game.s;
    const seeds = Object.keys(s.inv).filter((id) => ITEMS[id].kind === 'seed' && s.inv[id] > 0);
    if (!seeds.length) {
      return h('p', { class: 'empty', text: t('noSeeds') });
    }
    return h('div', {},
      S.count(s, 'compost') > 0 ? h('label', { class: 'check' }, h('input', {
        type: 'checkbox', onchange: (event) => {
          compost = event.target.checked;
        },
      }), h('span', { text: `${t('useCompost')} (${S.count(s, 'compost')})` })) : null,
      h('ul', { class: 'rows' }, seeds.map((id) => h('li', { class: 'row' }, swatch(id), h('span', { class: 'row-name', text: itemName(id) }),
        h('span', { class: 'qty', text: `${s.inv[id]}` }),
        h('button', { class: 'btn small primary', type: 'button', onclick: () => game.plant(uid, id, compost), text: t('actPlant') })))));
  });
}

// ---------- shop ----------
export function openShop(game, tab = 'buy') {
  let current = tab;
  openPanel(t('shopTitle'), () => {
    const s = game.s;
    const pick = (id) => {
      current = id;
      refreshPanel();
    };
    let body;
    if (current === 'buy') {
      body = h('ul', { class: 'rows' }, S.shopStock(s).map((id) => {
        const item = ITEMS[id];
        const owned = S.count(s, id);
        const wearOwned = item.kind === 'wear' && owned > 0;
        return h('li', { class: 'row' }, swatch(id), h('span', { class: 'row-name', text: itemName(id) }),
          h('span', { class: 'qty muted', text: `${t('owned')} ${owned}` }),
          h('button', { class: 'btn small', type: 'button', disabled: wearOwned || s.credits < item.buy, onclick: () => game.buy(id), text: `${t('buy')} ${item.buy}` }));
      }));
    } else {
      const ids = Object.keys(s.inv).filter((id) => s.inv[id] > 0 && ITEMS[id].sell > 0);
      body = ids.length ? h('ul', { class: 'rows' }, ids.map((id) => h('li', { class: 'row' }, swatch(id), h('span', { class: 'row-name', text: itemName(id) }),
        h('span', { class: 'qty', text: `${s.inv[id]} x ${ITEMS[id].sell}` }),
        h('span', { class: 'btn-pair' },
          h('button', { class: 'btn small', type: 'button', onclick: () => game.sell(id, 1), text: t('sell') }),
          h('button', { class: 'btn small ghost', type: 'button', onclick: () => game.sell(id, s.inv[id]), text: t('sellAll') }))))) : h('p', { class: 'empty', text: t('nothingToSell') });
    }
    return h('div', {}, h('p', { class: 'note' }, h('span', { class: 'ico-inline', html: ICONS.coin }), `${s.credits.toLocaleString()} ${t('coins')}`),
      tabs([['buy', t('buyTab')], ['sell', t('sellTab')]], current, pick), body);
  });
}

// ---------- community board ----------
export function openBoard(game, focus = null) {
  openPanel(t('boardTitle'), () => {
    const s = game.s;
    return h('ul', { class: 'cards' }, PROJECTS.map((project) => {
      const st = s.projects[project.id];
      const open = S.projectOpen(s, project);
      const remaining = S.projectRemaining(s, project.id);
      const fraction = S.projectFraction(s, project.id);
      const giveable = Object.entries(remaining).some(([id, n]) => n > 0 && S.count(s, id) > 0);
      const blocker = [project.after, project.after2].filter((id) => id && !S.projectDone(s, id)).map(projectName).join(', ');
      return h('li', { class: `card project${focus === project.id ? ' focus' : ''}${st.done ? ' done' : ''}`, id: `project-${project.id}` },
        h('div', { class: 'card-head' }, h('strong', { text: projectName(project.id) }),
          h('span', { class: 'qty muted', text: st.done ? t('done') : `${Math.round(fraction * 100)} %` })),
        h('p', { class: 'meta', text: projectBody(project.id) }),
        h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(fraction * 100)) },
          h('span', { style: { width: `${fraction * 100}%` } })),
        st.done ? null : open ? h('ul', { class: 'needs' }, Object.entries(project.need).map(([id, n]) => {
          const left = remaining[id];
          const have = S.count(s, id);
          return h('li', { class: left === 0 ? 'ok' : 'short' }, swatch(id), h('span', { text: `${n - left}/${n} ${itemName(id)}` }),
            left > 0 ? h('button', { class: 'btn tiny', type: 'button', disabled: have === 0, onclick: () => game.give(project.id, id, Math.min(have, left)), text: `${t('give')} ${Math.min(have, left)}` }) : h('span', { class: 'ico-inline ok', html: ICONS.check }));
        })) : h('p', { class: 'meta', text: t('lockedAfter', { name: blocker }) }),
        st.done || !open ? null : h('div', { class: 'card-foot' }, h('span', { class: 'meta', text: `${t('reward')}: ${project.reward} ${t('coins')}` }),
          h('button', { class: 'btn small primary', type: 'button', disabled: !giveable, onclick: () => game.giveAll(project.id), text: t('giveAll') })));
    }));
  }, { size: 'lg' });
  if (focus) {
    setTimeout(() => document.getElementById(`project-${focus}`)?.scrollIntoView({ block: 'nearest' }), 30);
  }
}

// ---------- villagers ----------
export function openNpc(game, npcId) {
  const npc = NPCS[npcId];
  openPanel(npc.name, () => {
    const s = game.s;
    const order = S.orderFor(s, npcId);
    const friend = s.friends[npcId];
    return h('div', {},
      h('p', { class: 'lede', text: npcBlurb(npcId) }),
      h('div', { class: 'meter-row' }, h('span', { class: 'meta', text: t('friendship') }),
        h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(friend.points) }, h('span', { style: { width: `${friend.points}%` } })),
        h('span', { class: 'qty muted', text: `${friend.points}` })),
      friend.gift ? null : h('p', { class: 'meta', text: `${FRIEND_GIFT_AT}: ${itemName(npc.gift.item)} x${npc.gift.n}` }),
      h('div', { class: 'card' },
        h('div', { class: 'card-head' }, h('strong', { text: t('orderTitle') })),
        order.done ? h('p', { class: 'meta', text: t('orderDone') }) : h('div', {},
          h('p', {}, swatch(order.item), ' ', t('orderAsk', { name: npc.name, n: order.n, item: itemName(order.item) })),
          h('div', { class: 'card-foot' },
            h('span', { class: 'meta', text: `${t('youHave')} ${S.count(s, order.item)} · ${t('reward')} ${order.reward} ${t('coins')}` }),
            h('button', { class: 'btn small primary', type: 'button', disabled: S.count(s, order.item) < order.n, onclick: () => game.fill(npcId), text: t('fill') })))),
      npcId === 'sari' ? h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => openShop(game, 'buy'), text: t('buyTab') }),
        h('button', { class: 'btn', type: 'button', onclick: () => openShop(game, 'sell'), text: t('sellTab') })) : null);
  });
}

// ---------- pet ----------
export function openPet(game) {
  openPanel(game.s.pet.name, () => {
    const s = game.s;
    return h('div', {},
      h('div', { class: 'meter-row' }, h('span', { class: 'meta', text: t('friendship') }),
        h('div', { class: 'bar' }, h('span', { style: { width: `${s.pet.happy}%` } })), h('span', { class: 'qty muted', text: `${s.pet.happy}` })),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => game.patPet(), text: `${t('actPet')} ${s.pet.name}` }),
        h('button', { class: 'btn', type: 'button', disabled: !S.count(s, 'fish_minnow') && !S.count(s, 'fish_carp'), onclick: () => game.feedPet(), text: t('feed') })));
  }, { size: 'sm' });
}

// ---------- journal ----------
export function openJournal(game, tab = 'goals') {
  markDock('journal');
  let current = tab;
  openPanel(t('journal'), () => {
    const s = game.s;
    const pick = (id) => {
      current = id;
      refreshPanel();
    };
    let body;
    if (current === 'goals') {
      body = h('ol', { class: 'goals' }, QUESTS.map((quest, i) => {
        const state = i < s.quest ? 'done' : i === s.quest ? 'now' : 'later';
        return h('li', { class: `goal-item ${state}` },
          h('span', { class: 'goal-mark', html: state === 'done' ? ICONS.check : '' }),
          h('div', {}, h('strong', { text: questName(quest) }), state === 'now' ? h('p', { class: 'meta', text: questHint(quest) }) : null));
      }));
    } else if (current === 'skills') {
      body = h('ul', { class: 'rows' }, SKILLS.map((skill) => {
        const st = s.skills[skill];
        const need = xpForNext(st.level);
        const pct = st.level >= MAX_LEVEL ? 100 : Math.round((st.xp / need) * 100);
        return h('li', { class: 'row skill' }, h('span', { class: 'row-name', text: skillName(skill) }),
          h('div', { class: 'bar' }, h('span', { style: { width: `${pct}%` } })),
          h('span', { class: 'qty', text: `${t('level')} ${st.level}` }));
      }));
    } else {
      const rows = [
        [t('day'), S.dayNumber(s)],
        [t('energy'), `${Math.floor(s.energy)} / ${S.energyCapacity(s)}`],
        [itemName('solar'), S.placedOf(s, 'solar').length],
        [itemName('turbine'), S.placedOf(s, 'turbine').length],
        [itemName('battery'), S.placedOf(s, 'battery').length],
        [itemName('planter'), S.placedOf(s, 'planter').length],
        [t('boardTitle'), `${PROJECTS.filter((p) => S.projectDone(s, p.id)).length}/${PROJECTS.length}`],
        [s.pet.name, `${s.pet.happy}/100`],
      ];
      body = h('dl', { class: 'facts' }, rows.map(([k, v]) => [h('dt', { text: k }), h('dd', { text: String(v) })]));
    }
    return h('div', {}, tabs([['goals', t('goals')], ['skills', t('skills')], ['island', t('stats')]], current, pick), body);
  }, { size: 'lg' });
}

// ---------- together ----------
export function openTogether(game) {
  markDock('together');
  openPanel(t('togetherTitle'), () => {
    const room = game.room;
    const code = h('input', { class: 'input code', id: 'roomCode', maxlength: '8', placeholder: 'ABC123', autocomplete: 'off', 'aria-label': t('roomCode') });
    if (!navigator.onLine) {
      return h('p', { class: 'empty', text: t('offlineOnly') });
    }
    if (room && room.connecting) {
      return h('p', { class: 'note', text: t('connecting') });
    }
    if (room && room.conn) {
      return h('div', {},
        h('p', { class: 'note', text: t('connected', { room: room.code === 'plaza' ? t('plaza') : room.code, n: room.conn.peerCount() }) }),
        room.code !== 'plaza' ? h('p', { class: 'code-big', text: room.code }) : null,
        h('h3', { class: 'sub-h', text: t('phrases') }),
        h('div', { class: 'chips' }, PHRASES.map((p) => h('button', { class: 'btn small', type: 'button', onclick: () => game.say(p.id), text: phraseText(p.id) }))),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => game.leaveRoom(), text: t('leaveRoom') })));
    }
    return h('div', {},
      h('p', { class: 'lede', text: t('togetherBody') }),
      h('div', { class: 'card' }, h('strong', { text: t('plaza') }), h('p', { class: 'meta', text: t('plazaBody') }),
        h('button', { class: 'btn primary', type: 'button', onclick: () => game.joinRoom('plaza'), text: t('plaza') })),
      h('div', { class: 'card' }, h('strong', { text: t('roomCode') }),
        h('div', { class: 'inline-form' }, code, h('button', { class: 'btn', type: 'button', onclick: () => game.joinRoom(code.value), text: t('joinRoom') })),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => game.joinRoom(null), text: t('createRoom') })));
  });
}

// ---------- settings ----------
export function openSettings(game) {
  markDock('settings');
  openPanel(t('settingsTitle'), () => {
    const st = game.settings;
    const seg = (label, options, value, onPick) => h('div', { class: 'field' }, h('span', { text: label }), h('div', { class: 'seg' },
      options.map(([v, text]) => h('button', { type: 'button', class: `seg-btn${v === value ? ' on' : ''}`, 'aria-pressed': v === value ? 'true' : 'false', onclick: () => onPick(v), text }))));
    const codeBox = h('textarea', { class: 'input code-area', readonly: true, rows: '3', 'aria-label': t('saveCode') });
    const loadBox = h('textarea', { class: 'input code-area', rows: '3', placeholder: 'TEDUH1...', 'aria-label': t('loadCode') });
    return h('div', { class: 'settings' },
      seg(t('language'), [['en', 'English'], ['id', 'Bahasa Indonesia']], getLang(), (v) => game.setLang(v)),
      seg(t('sound'), [[true, t('on')], [false, t('off')]], st.sound, (v) => game.setSetting('sound', v)),
      seg(t('quality'), [['high', t('qualityHigh')], ['low', t('qualityLow')]], st.quality, (v) => game.setSetting('quality', v)),
      seg(t('motion'), [[true, t('on')], [false, t('off')]], st.motion, (v) => game.setSetting('motion', v)),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', id: 'changeLookBtn', onclick: () => game.openCreator(), text: t('changeLook') }),
        h('button', { class: 'btn', type: 'button', id: 'guideBtn', onclick: () => game.openGuide(), text: t('howToPlay') })),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => game.photo(), text: t('photo') }),
        game.canInstall() ? h('button', { class: 'btn', type: 'button', onclick: () => game.install(), text: t('install') }) : null),
      h('h3', { class: 'sub-h', text: t('saveCode') }),
      h('p', { class: 'meta', text: t('saveCodeBody') }),
      codeBox,
      h('div', { class: 'btn-row' }, h('button', {
        class: 'btn small', type: 'button', onclick: async (event) => {
          codeBox.value = game.saveCode();
          codeBox.select();
          try {
            await navigator.clipboard.writeText(codeBox.value);
            event.target.textContent = t('copied');
          } catch {
            document.execCommand('copy');
          }
        }, text: t('copy'),
      })),
      h('h3', { class: 'sub-h', text: t('loadCode') }),
      loadBox,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn small', type: 'button', onclick: () => game.loadCode(loadBox.value), text: t('load') }),
        h('button', { class: 'btn small danger', type: 'button', onclick: () => game.reset(), text: t('resetGame') })),
      h('h3', { class: 'sub-h', text: t('controlsTitle') }),
      h('ul', { class: 'plain' }, ['controlsMove', 'controlsAct', 'controlsCam', 'controlsMenus'].map((k) => h('li', { text: t(k) }))),
      h('p', { class: 'fine' }, `Teduh v${VERSION} · `, h('a', { href: 'https://github.com/juw12/teduh', target: '_blank', rel: 'noopener', text: 'github.com/juw12/teduh' })));
  });
}

// ---------- fishing ----------
export function showFishing(on) {
  $('#fishing').hidden = !on;
  if (on) {
    $('#fishTitle').textContent = t('fishTitle');
    $('#fishHint').textContent = t('fishHint');
    $('#fishBtn').textContent = t('fishCast');
    $('#fishCancel').textContent = t('cancel');
  }
}
export function drawFishing(state) {
  $('#fishZone').style.left = `${state.zoneStart * 100}%`;
  $('#fishZone').style.width = `${state.zoneW * 100}%`;
  $('#fishMarker').style.left = `${state.pos * 100}%`;
  $('#fishTries').textContent = '';
  for (let i = 0; i < 3; i += 1) {
    $('#fishTries').append(h('span', { class: `try${i < state.misses ? ' used' : ''}` }));
  }
}

// ---------- build bar ----------
export function showBuildBar(game) {
  const bar = $('#buildbar');
  const b = game.build;
  if (!b) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const s = game.s;
  const placeables = Object.keys(s.inv).filter((id) => ITEMS[id].kind === 'place' && s.inv[id] > 0);
  const selected = b.moving ? s.placed.find((p) => p.uid === b.moving)?.type : b.type;
  bar.replaceChildren(
    h('div', { class: 'build-head' }, h('strong', { text: t('buildTitle') }), h('span', { class: 'meta', text: t('buildHint') })),
    b.selectedUid && !b.type && !b.moving ? h('div', { class: 'chips' },
      h('span', { class: 'meta', text: itemName(s.placed.find((p) => p.uid === b.selectedUid)?.type) }),
      h('button', { class: 'btn small', type: 'button', onclick: () => game.buildMove(b.selectedUid), text: t('move') }),
      h('button', { class: 'btn small', type: 'button', onclick: () => game.buildPickUp(b.selectedUid), text: t('pickUp') })) : null,
    placeables.length ? h('div', { class: 'chips scroll' }, placeables.map((id) => h('button', {
      type: 'button', class: `chip-btn${selected === id ? ' on' : ''}`, 'aria-pressed': selected === id ? 'true' : 'false', onclick: () => game.selectBuild(id),
    }, swatch(id), h('span', { text: `${itemName(id)} ${s.inv[id]}` })))) : (b.moving ? null : h('p', { class: 'meta', text: t('buildNothing') })),
    h('div', { class: 'btn-row' },
      selected ? h('button', { class: 'btn small', type: 'button', onclick: () => game.rotateBuild(), text: `${t('rotate')} (R)` }) : null,
      selected ? h('button', { class: 'btn small', type: 'button', onclick: () => game.placeAtCursor(), text: `${t('place')} (E)` }) : null,
      h('button', { class: 'btn small primary', type: 'button', onclick: () => game.endBuild(), text: t('exitBuild') })));
}
