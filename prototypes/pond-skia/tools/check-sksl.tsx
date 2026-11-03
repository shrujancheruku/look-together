// PROTOTYPE: compiles every scene shader headless and prints any SkSL errors.
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
(async () => {
  await LoadSkiaWeb();
  const S: any = await import("@shopify/react-native-skia/lib/module/headless");
  const { Skia } = S.getSkiaExports();
  const shaders = { ...(await import("../src/sksl")), ...(await import("../src/pixel")) } as Record<string, string>;
  let failed = false;
  for (const [name, src] of Object.entries(shaders)) {
    const ck = (globalThis as any).CanvasKit;
    const errors: string[] = [];
    const ok = ck.RuntimeEffect.Make(src, (e: string) => errors.push(e));
    console.log(name, ok ? "ok" : `FAILED\n${errors.join("\n")}`);
    if (!ok) failed = true;
  }
  process.exit(failed ? 1 : 0);
})();
