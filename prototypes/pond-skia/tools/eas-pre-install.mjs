// PROTOTYPE. EAS runs this before installing dependencies; for the v3 profiles it swaps
// @shopify/react-native-skia (v2, SDK-bundled) for react-native-skia 3.x.
import fs from "node:fs";
if (process.env.EXPO_PUBLIC_SKIA === "v3") {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  delete pkg.dependencies["@shopify/react-native-skia"];
  pkg.dependencies["react-native-skia"] = "3.9.1";
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
  fs.rmSync("package-lock.json", { force: true });
  console.log("Swapped in react-native-skia 3.9.1");
}
