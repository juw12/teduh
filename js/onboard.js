// First-time flow: an illustrated, skippable how-to-play guide, then the character creator with a live 3D
// preview. Both can be reopened from Settings. Text comes from i18n; drawings are inline SVG in the same
// line style as the HUD icons, so nothing is downloaded.

import { h, $ } from './ui.js';
import { t } from './i18n.js';
import { createPreview } from './character.js';
import {
  LOOK_OPTIONS, BUILDS, FACES, SKIN_TONES, EYE_COLORS, HAIR_STYLES, HAIR_COLORS, FACIAL_HAIR, TOPS, BOTTOMS,
  CLOTH_COLORS, SHOE_COLORS, STARTER_LOOKS, sanitizeLook, randomLook, sameLook,
} from './look.js';

// ---------- illustrations (320 x 180, ink lines, one accent) ----------
const INK = '#23302a';
const ACC = '#2f5d4a';
const SUN = '#c9951a';
const PAPER = '#efe7d6';
const SKY = '#d7e9ef';
const art = (body) => `<svg viewBox="0 0 320 180" role="img" aria-hidden="true" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="0" y="0" width="320" height="180" rx="10" fill="${SKY}" stroke="none"/><ellipse cx="160" cy="150" rx="140" ry="22" fill="#9fb77a" stroke="none"/>${body}</svg>`;
const person = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-58" r="9" fill="#c48a62"/><path d="M-9 -64 q9 -10 18 0" stroke="#3a2518" stroke-width="5"/><path d="M-11 -46 h22 l3 26 h-28z" fill="${ACC}"/><path d="M-8 -20 l-2 20 M8 -20 l2 20"/><path d="M-11 -44 l-7 20 M11 -44 l7 20"/></g>`;
const key = (x, y, label, w = 26) => `<g><rect x="${x}" y="${y}" width="${w}" height="26" rx="5" fill="#fffdf8"/><text x="${x + w / 2}" y="${y + 18}" text-anchor="middle" font-family="Figtree, sans-serif" font-size="13" font-weight="700" fill="${INK}" stroke="none">${label}</text></g>`;
const tree = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 0 v-30" stroke="#6b4a2e" stroke-width="7"/><circle cx="0" cy="-48" r="24" fill="#4f7d47"/><circle cx="-14" cy="-36" r="14" fill="#5d8c52"/></g>`;
const ILLUSTRATIONS = [
  art(`${person(110, 150)}<path d="M150 120 q30 -14 60 -4" stroke-dasharray="5 6"/><circle cx="222" cy="118" r="9" fill="#fffdf8"/><circle cx="222" cy="118" r="3" fill="${INK}"/>${key(236, 34, 'W')}${key(208, 64, 'A')}${key(236, 64, 'S')}${key(264, 64, 'D')}`),
  art(`${tree(220, 150)}${person(150, 152)}<rect x="96" y="38" width="96" height="36" rx="18" fill="${ACC}" stroke="none"/><text x="132" y="61" text-anchor="middle" font-family="Figtree, sans-serif" font-size="13" font-weight="700" fill="#fff" stroke="none">Chop</text>${key(160, 43, 'E')}`),
  art(`<rect x="24" y="96" width="150" height="58" rx="6" fill="#f8f3e8"/><text x="38" y="117" font-family="Figtree, sans-serif" font-size="10" font-weight="700" letter-spacing="1.4" fill="${ACC}" stroke="none">GOAL</text><text x="38" y="137" font-family="Fraunces, serif" font-size="14" font-weight="600" fill="${INK}" stroke="none">Chop a tree</text><path d="M246 140 v-110" stroke="${SUN}" stroke-width="10" opacity=".55"/><ellipse cx="246" cy="142" rx="20" ry="6" stroke="${SUN}" stroke-width="3"/>`),
  art(`<circle cx="62" cy="48" r="16" fill="${SUN}" stroke="none"/><path d="M62 22 v-8 M62 82 v-8 M36 48 h-8 M96 48 h-8"/><path d="M40 120 l40 -16 l26 22 l-40 16z" fill="#3b5d8c"/><path d="M73 138 v14"/><path d="M168 152 v-80"/><path d="M168 72 l-24 -14 M168 72 l26 -10 M168 72 l-2 28" stroke-width="3"/><circle cx="168" cy="72" r="4" fill="${INK}"/><rect x="214" y="104" width="34" height="48" rx="5" fill="#fffdf8"/><rect x="224" y="98" width="14" height="6" fill="${INK}"/><rect x="220" y="122" width="22" height="24" fill="${ACC}" stroke="none"/><path d="M106 128 h30 M186 128 h22" stroke-dasharray="4 5"/>`),
  art(`${person(118, 152)}${person(200, 152, 1.05)}<path d="M136 92 q24 -18 48 0" stroke-dasharray="4 5"/><rect x="104" y="20" width="112" height="34" rx="6" fill="#fffdf8"/><text x="160" y="43" text-anchor="middle" font-family="Figtree, sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="${INK}" stroke="none">KB7Q2M</text>`),
];

// ---------- guide ----------
let guideKeys = null;
export function showGuide({ onDone, doneLabel }) {
  const root = $('#guide');
  root.hidden = false;
  const total = ILLUSTRATIONS.length;
  let step = 0;
  const finish = () => {
    hideGuide();
    onDone?.();
  };
  const render = () => {
    const last = step === total - 1;
    root.replaceChildren(h('div', { class: 'guide-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'guideTitle' },
      h('div', { class: 'guide-head' },
        h('p', { class: 'eyebrow', text: t('guideStep', { n: step + 1, total }) }),
        h('button', { class: 'btn ghost tiny', type: 'button', id: 'guideSkip', onclick: finish, text: t('guideSkip') })),
      h('div', { class: 'guide-art', html: ILLUSTRATIONS[step] }),
      h('h2', { class: 'guide-title', id: 'guideTitle', text: t(`g${step + 1}t`) }),
      h('p', { class: 'guide-body', text: t(`g${step + 1}b`) }),
      h('div', { class: 'guide-dots', 'aria-hidden': 'true' }, ILLUSTRATIONS.map((_, i) => h('span', { class: `dot${i === step ? ' on' : ''}` }))),
      h('div', { class: 'guide-actions' },
        h('button', {
          class: 'btn', type: 'button', id: 'guideBack', disabled: step === 0, style: { visibility: step === 0 ? 'hidden' : 'visible' }, onclick: () => {
            step = Math.max(0, step - 1);
            render();
          }, text: t('guideBack'),
        }),
        h('button', {
          class: 'btn primary', type: 'button', id: 'guideNext', onclick: () => {
            if (last) {
              finish();
            } else {
              step += 1;
              render();
            }
          }, text: last ? (doneLabel || t('guideDone')) : t('guideNext'),
        }))));
    $('#guideNext', root).focus({ preventScroll: true });
  };
  guideKeys = (event) => {
    if (event.key === 'Escape') {
      finish();
    } else if (event.key === 'ArrowRight' && step < total - 1) {
      step += 1;
      render();
    } else if (event.key === 'ArrowLeft' && step > 0) {
      step -= 1;
      render();
    }
    event.stopPropagation();
  };
  window.addEventListener('keydown', guideKeys, true);
  render();
}
export function hideGuide() {
  $('#guide').hidden = true;
  if (guideKeys) {
    window.removeEventListener('keydown', guideKeys, true);
    guideKeys = null;
  }
}

// ---------- character creator ----------
const TABS = [
  ['body', [['build', BUILDS, 'chip'], ['height', LOOK_OPTIONS.height, 'chip'], ['skin', SKIN_TONES, 'swatch']]],
  ['face', [['face', FACES, 'chip'], ['eyes', EYE_COLORS, 'swatch'], ['facial', FACIAL_HAIR, 'chip']]],
  ['hair', [['hair', HAIR_STYLES, 'chip'], ['hairColor', HAIR_COLORS, 'swatch'], ['accent', CLOTH_COLORS, 'swatch']]],
  ['clothes', [['top', TOPS, 'chip'], ['topColor', CLOTH_COLORS, 'swatch'], ['bottom', BOTTOMS, 'chip'], ['bottomColor', CLOTH_COLORS, 'swatch'], ['shoes', SHOE_COLORS, 'swatch']]],
];
const LABEL = {
  build: 'lookBuild', height: 'lookHeight', skin: 'lookSkin', face: 'lookFace', eyes: 'lookEyes', facial: 'lookFacial',
  hair: 'lookHair', hairColor: 'lookHairColor', accent: 'lookAccent', top: 'lookTop', topColor: 'lookTopColor',
  bottom: 'lookBottom', bottomColor: 'lookBottomColor', shoes: 'lookShoes',
};
const optionName = (field, value) => t(`opt_${field === 'height' ? `h${value}` : field === 'top' && value === 'long' ? 'longtop' : value}`);

let preview = null;
let creatorKeys = null;
export function showCreator({ look, mode = 'new', onDone, onCancel }) {
  const root = $('#creator');
  root.hidden = false;
  let current = sanitizeLook(look);
  let tab = 'body';
  let view = 'body';
  const canvas = h('canvas', { class: 'creator-canvas', 'aria-label': t('creatorPreview') });
  const close = () => {
    hideCreator();
  };
  const panel = h('div', { class: 'creator-panel' });
  const viewRow = h('div', { class: 'creator-views' });
  const renderViews = () => {
    viewRow.replaceChildren(
      ...[['body', 'viewBody'], ['face', 'viewFace']].map(([id, label]) => h('button', {
        type: 'button', class: `seg-btn${view === id ? ' on' : ''}`, 'aria-pressed': view === id ? 'true' : 'false',
        onclick: () => {
          view = id;
          preview?.setView(id);
          renderViews();
        }, text: t(label),
      })),
      h('button', {
        type: 'button', class: 'seg-btn', id: 'creatorRandom', onclick: () => {
          current = randomLook();
          preview?.setLook(current);
          renderPanel();
        }, text: t('surprise'),
      }));
  };
  const field = (key, values, kind) => {
    const label = h('span', { class: 'creator-label', text: t(LABEL[key]) });
    const group = h('div', { class: kind === 'swatch' ? 'colors' : 'seg', role: 'radiogroup', 'aria-label': t(LABEL[key]) },
      values.map((value) => {
        const on = current[key] === value;
        const pick = () => {
          current = sanitizeLook({ ...current, [key]: value });
          if (key === 'hair' && value === 'hijab') {
            current.facial = 'none';
          }
          preview?.setLook(current);
          renderPanel();
          if (key === 'eyes' || key === 'face' || key === 'facial') {
            view = 'face';
            preview?.setView('face');
            renderViews();
          }
        };
        return kind === 'swatch'
          ? h('button', { type: 'button', class: `color${on ? ' on' : ''}`, role: 'radio', 'aria-checked': on ? 'true' : 'false', 'aria-label': `${t(LABEL[key])} ${value}`, style: { background: value }, onclick: pick })
          : h('button', { type: 'button', class: `seg-btn${on ? ' on' : ''}`, role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-value': String(value), onclick: pick, text: optionName(key, value) });
      }));
    return h('div', { class: 'creator-field' }, label, group);
  };
  const renderPanel = () => {
    const tabs = h('div', { class: 'creator-tabs', role: 'tablist' }, TABS.map(([id]) => h('button', {
      type: 'button', role: 'tab', class: `tab${tab === id ? ' on' : ''}`, 'aria-selected': tab === id ? 'true' : 'false', id: `creatorTab-${id}`,
      onclick: () => {
        tab = id;
        renderPanel();
      }, text: t(`tab_${id}`),
    })));
    const fields = TABS.find(([id]) => id === tab)[1]
      .filter(([key]) => !(key === 'facial' && current.hair === 'hijab'))
      .map(([key, values, kind]) => field(key, values, kind));
    if (tab === 'body') {
      // ready-made starting looks; each is a complete, editable outfit
      const presets = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': t('presets') }, STARTER_LOOKS.map((preset, index) => {
        const clean = sanitizeLook(preset);
        const on = sameLook(current, clean);
        return h('button', {
          type: 'button', class: `seg-btn${on ? ' on' : ''}`, role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-preset': String(index),
          onclick: () => {
            current = clean;
            preview?.setLook(current);
            renderPanel();
          }, text: t(`preset_${index}`),
        });
      }));
      fields.unshift(h('div', { class: 'creator-field' }, h('span', { class: 'creator-label', text: t('presets') }), presets));
    }
    const scroll = panel.querySelector('.creator-fields');
    const keepScroll = scroll ? scroll.scrollTop : 0;
    panel.replaceChildren(tabs, h('div', { class: 'creator-fields', role: 'tabpanel' }, fields));
    panel.querySelector('.creator-fields').scrollTop = keepScroll;
  };
  root.replaceChildren(h('div', { class: 'creator-shell', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'creatorTitle' },
    h('div', { class: 'creator-stage' }, canvas, viewRow),
    h('div', { class: 'creator-side' },
      h('header', { class: 'creator-head' },
        h('p', { class: 'eyebrow', text: t(mode === 'new' ? 'creatorEyebrow' : 'creatorEyebrowEdit') }),
        h('h2', { class: 'creator-title', id: 'creatorTitle', text: t('creatorTitle') }),
        h('p', { class: 'muted', text: t('creatorSub') })),
      panel,
      h('footer', { class: 'creator-foot' },
        h('button', {
          class: 'btn', type: 'button', id: 'creatorCancel', onclick: () => {
            close();
            onCancel?.();
          }, text: mode === 'new' ? t('guideBack') : t('cancel'),
        }),
        h('button', {
          class: 'btn primary', type: 'button', id: 'creatorDone', onclick: () => {
            const chosen = sanitizeLook(current);
            close();
            onDone?.(chosen);
          }, text: mode === 'new' ? t('begin') : t('saveLook'),
        })))));
  renderViews();
  renderPanel();
  try {
    preview = createPreview(canvas);
    preview.setLook(current);
  } catch {
    preview = null; // no WebGL: the choices still work, the game shows the result
  }
  creatorKeys = (event) => {
    if (event.key === 'Escape' && mode !== 'new') {
      close();
      onCancel?.();
    }
    event.stopPropagation();
  };
  window.addEventListener('keydown', creatorKeys, true);
  $('#creatorDone', root).focus({ preventScroll: true });
}
export function hideCreator() {
  $('#creator').hidden = true;
  preview?.dispose();
  preview = null;
  if (creatorKeys) {
    window.removeEventListener('keydown', creatorKeys, true);
    creatorKeys = null;
  }
}
export const creatorOpen = () => !$('#creator').hidden;
