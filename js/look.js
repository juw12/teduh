// What a person looks like, as plain data: the choices in the character creator, defaults, random looks,
// and a strict sanitiser so saves and friends' profiles can never inject odd values. No three.js here,
// so the save code and the network code can use it too. The meshes live in character.js.

export const BUILDS = ['slim', 'average', 'sturdy'];
export const HEIGHTS = [0.94, 0.97, 1, 1.03, 1.06];
export const FACES = ['oval', 'round', 'square'];
export const SKIN_TONES = ['#f3d5c0', '#e9bf9f', '#dba67f', '#c48a62', '#a96e48', '#8b5537', '#6c3f27', '#4b2b1b'];
export const EYE_COLORS = ['#3b2416', '#5a3a22', '#7a5a2e', '#4f6b3a', '#41698a', '#6b7680'];
export const HAIR_STYLES = ['short', 'crop', 'side', 'curly', 'bob', 'long', 'ponytail', 'bun', 'hijab', 'bald'];
export const HAIR_COLORS = ['#1c1714', '#3a2518', '#5e3b23', '#8a4a26', '#b98a4e', '#d8c08a', '#8c8a86', '#e4e0d8'];
export const FACIAL_HAIR = ['none', 'stubble', 'moustache', 'beard'];
export const TOPS = ['tee', 'long', 'tank', 'batik', 'jacket'];
export const BOTTOMS = ['trousers', 'shorts', 'skirt', 'sarong'];
// Earthy fabric colours that sit well in the world. The first six are the old avatar colours, so saves
// from v1.0 keep their shirt colour.
export const CLOTH_COLORS = [
  '#c0583a', '#d9a21b', '#3f7d4e', '#2f6e6a', '#3b5d8c', '#8a5a33',
  '#f1ebdd', '#2a2d2b', '#6f7d3c', '#9c3d2e', '#5b6f7c', '#c9b48a',
];
export const SHOE_COLORS = ['#2a2420', '#5a3d28', '#8a6a48', '#e8e2d4', '#3b4a44', '#6b2f24'];

export const DEFAULT_LOOK = Object.freeze({
  build: 'average',
  height: 2,
  face: 'oval',
  skin: SKIN_TONES[3],
  eyes: EYE_COLORS[1],
  hair: 'short',
  hairColor: HAIR_COLORS[1],
  facial: 'none',
  top: 'tee',
  topColor: CLOTH_COLORS[2],
  accent: CLOTH_COLORS[6],
  bottom: 'trousers',
  bottomColor: CLOTH_COLORS[10],
  shoes: SHOE_COLORS[1],
});

// field -> allowed values (used by the sanitiser, the creator and the random picker)
export const LOOK_OPTIONS = {
  build: BUILDS,
  height: [0, 1, 2, 3, 4],
  face: FACES,
  skin: SKIN_TONES,
  eyes: EYE_COLORS,
  hair: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  facial: FACIAL_HAIR,
  top: TOPS,
  topColor: CLOTH_COLORS,
  accent: CLOTH_COLORS,
  bottom: BOTTOMS,
  bottomColor: CLOTH_COLORS,
  shoes: SHOE_COLORS,
};

export function sanitizeLook(value, fallbackColor) {
  const look = { ...DEFAULT_LOOK };
  if (typeof fallbackColor === 'string' && CLOTH_COLORS.includes(fallbackColor.toLowerCase())) {
    look.topColor = fallbackColor.toLowerCase();
  }
  if (value && typeof value === 'object') {
    Object.entries(LOOK_OPTIONS).forEach(([key, allowed]) => {
      let v = value[key];
      if (typeof v === 'string') {
        v = v.toLowerCase();
      }
      if (allowed.includes(v)) {
        look[key] = v;
      }
    });
  }
  return look;
}

export function randomLook(rand = Math.random) {
  const pick = (list) => list[Math.floor(rand() * list.length) % list.length];
  const look = {};
  Object.entries(LOOK_OPTIONS).forEach(([key, allowed]) => {
    look[key] = pick(allowed);
  });
  // keep random people believable: mostly natural hair, beards only now and then
  if (rand() < 0.6) {
    look.facial = 'none';
  }
  if (look.hair === 'hijab') {
    look.facial = 'none';
  }
  look.height = 1 + Math.floor(rand() * 3);
  return sanitizeLook(look);
}

// Hand-picked starting looks for a new player: varied, coherent outfits that read well in the creator.
// Every value is from LOOK_OPTIONS, so each one survives sanitizeLook unchanged.
export const STARTER_LOOKS = [
  { build: 'average', height: 2, face: 'oval', skin: SKIN_TONES[3], eyes: EYE_COLORS[1], hair: 'short', hairColor: HAIR_COLORS[0], facial: 'none', top: 'batik', topColor: CLOTH_COLORS[3], accent: CLOTH_COLORS[6], bottom: 'trousers', bottomColor: CLOTH_COLORS[11], shoes: SHOE_COLORS[1] },
  { build: 'slim', height: 1, face: 'oval', skin: SKIN_TONES[2], eyes: EYE_COLORS[0], hair: 'hijab', hairColor: HAIR_COLORS[0], facial: 'none', top: 'long', topColor: CLOTH_COLORS[6], accent: CLOTH_COLORS[1], bottom: 'sarong', bottomColor: CLOTH_COLORS[2], shoes: SHOE_COLORS[2] },
  { build: 'average', height: 2, face: 'round', skin: SKIN_TONES[1], eyes: EYE_COLORS[1], hair: 'ponytail', hairColor: HAIR_COLORS[0], facial: 'none', top: 'tee', topColor: CLOTH_COLORS[0], accent: CLOTH_COLORS[6], bottom: 'skirt', bottomColor: CLOTH_COLORS[7], shoes: SHOE_COLORS[3] },
  { build: 'sturdy', height: 3, face: 'square', skin: SKIN_TONES[5], eyes: EYE_COLORS[0], hair: 'crop', hairColor: HAIR_COLORS[0], facial: 'stubble', top: 'jacket', topColor: CLOTH_COLORS[8], accent: CLOTH_COLORS[11], bottom: 'trousers', bottomColor: CLOTH_COLORS[7], shoes: SHOE_COLORS[0] },
  { build: 'slim', height: 2, face: 'oval', skin: SKIN_TONES[6], eyes: EYE_COLORS[1], hair: 'curly', hairColor: HAIR_COLORS[0], facial: 'none', top: 'tank', topColor: CLOTH_COLORS[1], accent: CLOTH_COLORS[6], bottom: 'shorts', bottomColor: CLOTH_COLORS[4], shoes: SHOE_COLORS[3] },
  { build: 'average', height: 3, face: 'square', skin: SKIN_TONES[0], eyes: EYE_COLORS[4], hair: 'side', hairColor: HAIR_COLORS[3], facial: 'beard', top: 'long', topColor: CLOTH_COLORS[10], accent: CLOTH_COLORS[6], bottom: 'trousers', bottomColor: CLOTH_COLORS[5], shoes: SHOE_COLORS[1] },
];

export function starterLook(rand = Math.random) {
  return sanitizeLook(STARTER_LOOKS[Math.floor(rand() * STARTER_LOOKS.length) % STARTER_LOOKS.length]);
}

export const sameLook = (a, b) => Object.keys(LOOK_OPTIONS).every((key) => a[key] === b[key]);
