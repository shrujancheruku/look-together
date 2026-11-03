import { Skia, FilterMode, MipmapMode, TileMode, type SkImage } from "@shopify/react-native-skia";

// Does a 0–255 index ramp reach a shader with exact values? The shader samples each pixel,
// compares it with its x position and writes 255 (exact) or 0, read back on the CPU.
const CHECK = Skia.RuntimeEffect.Make(`
uniform shader idx;
half4 main(float2 p) {
  float v = idx.eval(p).r * 255.0;
  return abs(v - floor(p.x)) < 0.5 ? half4(1) : half4(0, 0, 0, 1);
}`)!;

export function indexExactness(img: SkImage) {
  const surface = Skia.Surface.MakeOffscreen(256, 1);
  if (!surface) return { exact: -1, firstBad: -1 };
  const paint = Skia.Paint();
  paint.setShader(CHECK.makeShaderWithChildren([], [img.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Nearest, MipmapMode.None)]));
  surface.getCanvas().drawRect(Skia.XYWHRect(0, 0, 256, 1), paint);
  surface.flush();
  const px = surface.makeImageSnapshot().makeNonTextureImage()?.readPixels();
  if (!px) return { exact: -1, firstBad: -1 };
  let exact = 0, firstBad = -1;
  for (let i = 0; i < 256; i++) {
    if (px[i * 4] > 127) exact++;
    else if (firstBad < 0) firstBad = i;
  }
  return { exact, firstBad };
}
