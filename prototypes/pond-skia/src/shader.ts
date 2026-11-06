import { Skia } from "@shopify/react-native-skia";
import { SCENE_SKSL } from "./sksl";

export const sceneEffect = Skia.RuntimeEffect.Make(SCENE_SKSL)!;
