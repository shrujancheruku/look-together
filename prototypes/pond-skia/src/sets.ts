// Layer sets the app can switch between. The image-tool bake-off adds its sets here under
// blind labels (A, B, C), each made by tools/gen-standins.tsx's layout or by hand to the same
// scene.json shape.
export type Season = "spring" | "autumn";
export type Layers = Record<"sky" | "bank" | "water" | "wash" | "line", number>;
export type LayerSet = { label: string; width: number; height: number; seasons: Record<Season, Layers>; sprites: number };

const standin = require("../assets/sets/standin/scene.json");
const standinHalf = require("../assets/sets/standin-half/scene.json");

export const SETS: LayerSet[] = [
  {
    label: "Stand-in (full res)", width: standin.pixels.width, height: standin.pixels.height,
    seasons: {
      spring: { sky: require("../assets/sets/standin/spring/sky.webp"), bank: require("../assets/sets/standin/spring/bank.webp"), water: require("../assets/sets/standin/spring/water.webp"), wash: require("../assets/sets/standin/spring/wash.webp"), line: require("../assets/sets/standin/spring/line.webp") },
      autumn: { sky: require("../assets/sets/standin/autumn/sky.webp"), bank: require("../assets/sets/standin/autumn/bank.webp"), water: require("../assets/sets/standin/autumn/water.webp"), wash: require("../assets/sets/standin/autumn/wash.webp"), line: require("../assets/sets/standin/autumn/line.webp") },
    },
    sprites: require("../assets/sets/standin/sprites.webp"),
  },
  {
    label: "Stand-in (half res)", width: standinHalf.pixels.width, height: standinHalf.pixels.height,
    seasons: {
      spring: { sky: require("../assets/sets/standin-half/spring/sky.webp"), bank: require("../assets/sets/standin-half/spring/bank.webp"), water: require("../assets/sets/standin-half/spring/water.webp"), wash: require("../assets/sets/standin-half/spring/wash.webp"), line: require("../assets/sets/standin-half/spring/line.webp") },
      autumn: { sky: require("../assets/sets/standin-half/autumn/sky.webp"), bank: require("../assets/sets/standin-half/autumn/bank.webp"), water: require("../assets/sets/standin-half/autumn/water.webp"), wash: require("../assets/sets/standin-half/autumn/wash.webp"), line: require("../assets/sets/standin-half/autumn/line.webp") },
    },
    sprites: require("../assets/sets/standin-half/sprites.webp"),
  },
];

export const SPRITE = { cell: 128, drop: [0, 8], leaf: [8, 4], row: { spring: 0, autumn: 1 } } as const;
