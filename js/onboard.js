// First-time flow: an illustrated, skippable how-to-play guide, then the character creator with a live 3D
// preview. Both can be reopened from Settings. Text comes from i18n; pictures are small in-game renders.

import { h, $ } from './ui.js';
import { t } from './i18n.js';
import { createPreview } from './character.js';
import {
  LOOK_OPTIONS, BUILDS, FACES, SKIN_TONES, EYE_COLORS, HAIR_STYLES, HAIR_COLORS, FACIAL_HAIR, TOPS, BOTTOMS,
  CLOTH_COLORS, SHOE_COLORS, STARTER_LOOKS, sanitizeLook, randomLook, sameLook,
} from './look.js';

// ---------- guide pictures ----------
// Real renders of the game world (tests/guide_shots.py), 800 x 450 WebP, cached by the service worker.
const GUIDE_PICS = ['g1', 'g2', 'g3', 'g4', 'g5'].map((name) => `assets/guide/${name}.webp`);

// ---------- guide ----------
let guideKeys = null;
export function showGuide({ onDone, doneLabel }) {
  const root = $('#guide');
  root.hidden = false;
  const total = GUIDE_PICS.length;
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
      h('div', { class: 'guide-art' }, h('img', { src: GUIDE_PICS[step], alt: '', width: 800, height: 450, decoding: 'async' })),
      h('h2', { class: 'guide-title', id: 'guideTitle', text: t(`g${step + 1}t`) }),
      h('p', { class: 'guide-body', text: t(`g${step + 1}b`) }),
      h('div', { class: 'guide-dots', 'aria-hidden': 'true' }, GUIDE_PICS.map((_, i) => h('span', { class: `dot${i === step ? ' on' : ''}` }))),
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
    if (GUIDE_PICS[step + 1]) {
      new Image().src = GUIDE_PICS[step + 1];
    }
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
