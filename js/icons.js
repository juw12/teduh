// Item icons: one small line-and-fill glyph per item, tinted from the item's own colour in data.js.
// C = item colour, L = light tint, D = dark tone for outlines. Returned as static SVG strings.

import { ITEMS } from './data.js';

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(hex, target, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const out = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const HAT = '<path d="M3 16c0-1.5 4-2.5 9-2.5s9 1 9 2.5-4 2.5-9 2.5-9-1-9-2.5z" fill="C"/><path d="M7 14.2c0-4.2 2-7.2 5-7.2s5 3 5 7.2" fill="C"/>';
const BOWL = '<path d="M3 11h18c0 5-4 8-9 8s-9-3-9-8z" fill="C"/><path d="M8 11c0-2 1.5-3.5 3-3.5M13 11c.5-2 2-3 4-3"/>';
const FISH = '<path d="M3 12c3-5 9-6 13-3l5-3v12l-5-3c-4 3-10 2-13-3z" fill="C"/><circle cx="7.5" cy="11" r="1" fill="D"/>';
const SEED = '<path d="M6 3.5h12v17H6z" fill="L"/><path d="M6 7.5h12"/><ellipse cx="12" cy="14" rx="2.6" ry="3.6" fill="C"/>';

const GLYPHS = {
  wood: '<rect x="3" y="8" width="15" height="8" rx="1.5" fill="C"/><ellipse cx="18" cy="12" rx="3" ry="4" fill="L"/><ellipse cx="18" cy="12" rx="1.1" ry="1.7"/>',
  stone: '<path d="M4 17l2.5-7 5-3.5 5.5 2.5 3 8z" fill="C"/><path d="M11.5 6.5 10 12l-6 5M10 12l10 5"/>',
  scrap: '<path d="M12 3.5l7.4 4.25v8.5L12 20.5l-7.4-4.25v-8.5z" fill="C"/><circle cx="12" cy="12" r="3" fill="L"/>',
  fiber: '<path d="M12 20.5c0-6-1-10-4-15.5M12 20.5c0-5 1.5-9 5-13.5M12 20.5c-1-4-3.5-6.5-7.5-7.5M12 20.5c1-3.5 3.5-5.5 7.5-6" stroke-width="2"/>',
  plank: '<rect x="3" y="5.5" width="18" height="5.5" rx="1" fill="C"/><rect x="3" y="13" width="18" height="5.5" rx="1" fill="C"/><path d="M7 8.2h4M13 15.8h4"/>',
  rope: '<circle cx="11" cy="12" r="7.5" fill="C"/><circle cx="11" cy="12" r="4.5"/><circle cx="11" cy="12" r="1.5"/><path d="M18.5 12c0 4 1.5 6 2.5 7.5"/>',
  wire: '<rect x="5" y="3.5" width="14" height="3.5" rx="1" fill="L"/><rect x="5" y="17" width="14" height="3.5" rx="1" fill="L"/><rect x="7" y="7" width="10" height="10" fill="C"/><path d="M7 10.3h10M7 13.7h10"/>',
  compost: '<path d="M3 18.5c2-6 5-9.5 9-9.5s7 3.5 9 9.5z" fill="C"/><path d="M8 14.5h1M12.5 12.5h1M15 15.5h1"/>',
  seed_basil: SEED,
  seed_tomato: SEED,
  seed_sunflower: SEED,
  seed_berry: SEED,
  basil: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14z" fill="C"/><path d="M5 19 14 10"/>',
  tomato: '<circle cx="12" cy="13.5" r="7" fill="C"/><path d="M9 6.5l3 1.5 3-1.5M12 8V4.5"/>',
  sunflower: '<path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="C" stroke-width="2.6"/><circle cx="12" cy="12" r="5.5" fill="C"/><circle cx="12" cy="12" r="2.6" fill="D"/>',
  berry: '<circle cx="9" cy="14.5" r="4" fill="C"/><circle cx="15" cy="14.5" r="4" fill="C"/><circle cx="12" cy="9" r="4" fill="C"/><path d="M12 5V2.5"/>',
  fish_minnow: FISH,
  fish_carp: FISH,
  fish_ray: '<path d="M12 4c4 3 8 5 9 7-1 2-5 4-9 6-4-2-8-4-9-6 1-2 5-4 9-7z" fill="C"/><path d="M12 17v4.5"/><circle cx="10" cy="10" r=".9" fill="D"/><circle cx="14" cy="10" r=".9" fill="D"/>',
  salad: BOWL,
  fish_stew: BOWL,
  sun_tea: '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" fill="C"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M9 3.5c0 1 1 1.5 1 2.5M12.5 3.5c0 1 1 1.5 1 2.5"/>',
  berry_tart: '<path d="M3 14h18l-2 5H5z" fill="L"/><path d="M4 14c1-4 4.5-6 8-6s7 2 8 6z" fill="C"/>',
  planter: '<path d="M5 12h14l-1.5 8h-11z" fill="C"/><path d="M12 12V6.5M12 8.5c-2.5 0-4-1.5-4-3.5 2.5 0 4 1.5 4 3.5zM12 9.5c2.5 0 4-1.5 4-3.5-2.5 0-4 1.5-4 3.5z"/>',
  solar: '<path d="M4 5h16l-2 10H6z" fill="C"/><path d="M5 8.5h14.3M4.5 11.8h15M12 5v10M8.3 5l-.8 10M15.7 5l.8 10" stroke="L" stroke-width="1.1"/><path d="M12 15v5M9 20h6"/>',
  turbine: '<path d="M12 11v10M9.5 21h5"/><path d="M12 9V2.5M12 9l5.6 3.2M12 9l-5.6 3.2" stroke-width="2.6"/><circle cx="12" cy="9" r="1.8" fill="C"/>',
  battery: '<rect x="5" y="6" width="14" height="15" rx="2" fill="C"/><path d="M9 3.5h6V6H9z" fill="D"/><path d="M12.8 9.5 10 14h4l-2.8 4.5" stroke="L" stroke-width="1.8"/>',
  sprinkler: '<path d="M12 3c3.5 4.5 6 7.7 6 10.5a6 6 0 0 1-12 0C6 10.7 8.5 7.5 12 3z" fill="C"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" stroke="L"/>',
  cookstove: '<path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="C"/><path d="M2.5 10h19M9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5"/>',
  composter: '<path d="M5 8h14l-1.2 12H6.2z" fill="C"/><path d="M3.5 8h17M9.5 5h5v3M10 11v6M14 11v6"/>',
  lamp: '<path d="M12 10v11M9 21h6"/><path d="M8 3.5h8l-1 6.5H9z" fill="C"/>',
  bench: '<path d="M4 5.5h16v3.2H4z" fill="C"/><path d="M3 11h18v3H3z" fill="C"/><path d="M5 14v5M19 14v5M6 8.7V11M18 8.7V11"/>',
  fence: '<path d="M5 6l2-2 2 2v14H5zM15 6l2-2 2 2v14h-4z" fill="C"/><path d="M3 10h18M3 15h18"/>',
  path: '<ellipse cx="7" cy="17.5" rx="4" ry="2.5" fill="C"/><ellipse cx="15.5" cy="12" rx="4" ry="2.5" fill="C"/><ellipse cx="9" cy="6.5" rx="3.5" ry="2.2" fill="C"/>',
  flowerpot: '<path d="M7 13h10l-1.5 7h-7z" fill="C"/><path d="M12 10v3"/><circle cx="12" cy="7" r="3" fill="L"/>',
  birdhouse: '<path d="M6 10h12v10.5H6z" fill="L"/><path d="M12 3 3.5 10.5h17z" fill="C"/><circle cx="12" cy="14.5" r="2" fill="D"/>',
  hammock: '<path d="M4 3.5v17M20 3.5v17"/><path d="M4 8.5c4 7.5 12 7.5 16 0z" fill="C"/>',
  arch: '<path d="M5 21V11a7 7 0 0 1 14 0v10h-3V11a4 4 0 0 0-8 0v10z" fill="C"/><circle cx="8.5" cy="6.5" r="1.4" fill="L"/><circle cx="15.5" cy="6.5" r="1.4" fill="L"/>',
  rod2: '<path d="M4 20.5 18.5 4"/><path d="M18.5 4v11.5c0 2-1.5 3.5-3.5 3.5"/><circle cx="7" cy="17.3" r="2.2" fill="C"/>',
  hat_straw: HAT,
  hat_cap: '<path d="M4 15a8 8 0 0 1 16 0z" fill="C"/><path d="M12 15h9.5c0 1.6-1.5 2.5-3.5 2.5H12z" fill="C"/><circle cx="12" cy="6.6" r="1" fill="D"/>',
  hat_crown: '<path d="M3.5 15c3 2.2 14 2.2 17 0"/><circle cx="6" cy="13.5" r="2.2" fill="C"/><circle cx="12" cy="15" r="2.2" fill="C"/><circle cx="18" cy="13.5" r="2.2" fill="C"/><circle cx="9" cy="11" r="1.7" fill="L"/><circle cx="15" cy="11" r="1.7" fill="L"/>',
};

const FALLBACK = '<rect x="5" y="5" width="14" height="14" rx="3" fill="C"/>';

// Tile colours for an item: the glyph sits on a soft tint of its own colour.
export function itemTones(id) {
  const color = ITEMS[id]?.color || '#8c9196';
  return {
    color,
    light: mix(color, '#ffffff', 0.6),
    dark: mix(color, '#1d2823', 0.6),
    tile: mix(color, '#f8f3e8', 0.8),
  };
}

export function itemGlyph(id, size = 22) {
  const tones = itemTones(id);
  const body = (GLYPHS[id] || FALLBACK)
    .replace(/"C"/g, `"${tones.color}"`)
    .replace(/"L"/g, `"${tones.light}"`)
    .replace(/"D"/g, `"${tones.dark}"`);
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${tones.dark}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export const hasGlyph = (id) => Boolean(GLYPHS[id]);
