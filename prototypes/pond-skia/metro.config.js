// PROTOTYPE. With EXPO_PUBLIC_SKIA=v3, imports of @shopify/react-native-skia resolve to react-native-skia (3.x).
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
if (process.env.EXPO_PUBLIC_SKIA === "v3") {
  const resolve = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (ctx, name, platform) =>
    (resolve ?? ctx.resolveRequest)(ctx, name.replace(/^@shopify\/react-native-skia/, "react-native-skia"), platform);
}
module.exports = config;
