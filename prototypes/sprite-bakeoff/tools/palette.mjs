// PROTOTYPE: the spring ramps of the chosen Pond Style Kit (issue #70), dark end → light end, plus
// provisional koi and dragonfly ramps the kit never needed. Same OKLCH maths as the kit page.
export const RAMPS = {
  pad: { L: [.38, .80], C: [.09, .15], H: [165, 118], n: 12 },
  flower: { L: [.62, .95], C: [.11, .05], H: [350, 375], n: 12 },
  light: { L: [.86, .99], C: [.05, .03], H: [85, 95], n: 3 },
  glint: { L: [.86, 1], C: [.03, .005], H: [220, 95], n: 4 },
  water: { L: [.52, .80], C: [.06, .05], H: [232, 205], n: 12 },
  // Provisional, not in the kit: an orange koi with white patches, a blue-green dragonfly.
  koi: { L: [.42, .84], C: [.13, .15], H: [28, 70], n: 8 },
  koiW: { L: [.62, .98], C: [.03, .01], H: [250, 90], n: 5 },
  dfly: { L: [.30, .78], C: [.08, .12], H: [255, 190], n: 8 },
};

// Each sprite in the test set: target size in art pixels (lily kit sizes from issue #74) and the ramps it may use.
export const SLOTS = [
  { id: "padL", label: "Large lily pad", w: 27, h: 13, ramps: ["pad"], main: "pad" },
  { id: "padS", label: "Small lily pad", w: 17, h: 7, ramps: ["pad"], main: "pad" },
  { id: "flower", label: "Open flower", w: 11, h: 9, ramps: ["flower", "light", "pad"], main: "flower" },
  { id: "koi", label: "Koi", w: 18, h: 8, ramps: ["koi", "koiW"], main: "koi" },
  { id: "dfly1", label: "Dragonfly, frame 1", w: 13, h: 9, ramps: ["dfly", "glint"], main: "dfly" },
  { id: "dfly2", label: "Dragonfly, frame 2", w: 13, h: 9, ramps: ["dfly", "glint"], main: "dfly" },
];

const lerp = (a, b, t) => a + (b - a) * t;
export function oklch(L, C, h) {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
  const l_ = L + .3963377774 * a + .2158037573 * b, m_ = L - .1055613458 * a - .0638541728 * b, s_ = L - .0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const f = (x) => { x = Math.max(0, Math.min(1, x)); return Math.round(255 * (x <= .0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - .055)); };
  return [f(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s), f(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s), f(-.0041960863 * l - .7034186147 * m + 1.707614701 * s)];
}
export function oklab([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(.4122214708 * R + .5363325363 * G + .0514459929 * B), m = Math.cbrt(.2119034982 * R + .6806995451 * G + .1073969566 * B), s = Math.cbrt(.0883024619 * R + .2817188376 * G + .6299787005 * B);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
// ramp name → [[r,g,b], …] dark → light
export const COLS = Object.fromEntries(Object.entries(RAMPS).map(([k, s]) => [k, Array.from({ length: s.n }, (_, i) => {
  const t = s.n === 1 ? 1 : i / (s.n - 1);
  return oklch(lerp(s.L[0], s.L[1], t), lerp(s.C[0], s.C[1], t), lerp(s.H[0], s.H[1], t));
})]));
export const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
