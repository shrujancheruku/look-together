export type Glass = "none" | "skia1" | "skia4" | "expo1" | "expo4";

export function cardRects(w: number, h: number, glass: Glass) {
  const n = glass.endsWith("4") ? 4 : glass === "none" ? 0 : 1;
  return Array.from({ length: n }, (_, i) => ({ x: 20, y: h * 0.14 + i * 132, width: w - 40, height: 116 }));
}
