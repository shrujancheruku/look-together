// PROTOTYPE. EXPO_PUBLIC_SKIA=v3 builds a separate app (own package id) against react-native-skia 3.x.
const { withAndroidManifest } = require("expo/config-plugins");
const v3 = process.env.EXPO_PUBLIC_SKIA === "v3";

// Firebase Test Lab's Game Loop test launches the app through this intent; with
// EXPO_PUBLIC_AUTOBENCH=1 the app starts its benchmark on launch and logs BENCH lines.
const withTestLoop = (config) =>
  withAndroidManifest(config, (c) => {
    const activity = c.modResults.manifest.application[0].activity.find((a) => a.$["android:name"] === ".MainActivity");
    activity["intent-filter"].push({
      action: [{ $: { "android:name": "com.google.intent.action.TEST_LOOP" } }],
      category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
      data: [{ $: { "android:mimeType": "application/javascript" } }],
    });
    return c;
  });

module.exports = {
  expo: {
    name: v3 ? "LT pond v3" : "LT pond v2",
    slug: "look-together-pond-proto",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: { supportsTablet: false, bundleIdentifier: v3 ? "dev.looktogether.pondproto.v3" : "dev.looktogether.pondproto" },
    android: {
      package: v3 ? "dev.looktogether.pondproto.v3" : "dev.looktogether.pondproto",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: { favicon: "./assets/favicon.png" },
    plugins: [["expo-build-properties", { android: { minSdkVersion: v3 ? 26 : 24 } }], withTestLoop],
    owner: "shrujancheruku",
    extra: { eas: { projectId: "3dde13b0-8fcf-456e-9c4e-48c05dd32263" } },
  },
};
