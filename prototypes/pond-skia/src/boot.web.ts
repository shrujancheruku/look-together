import { registerRootComponent } from "expo";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

// CanvasKit must be loaded before any module touches Skia (the shader is compiled at import).
LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(async () => {
  registerRootComponent((await import("../App")).default);
});
