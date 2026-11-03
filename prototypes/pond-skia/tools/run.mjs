// Bundles a tools/*.tsx script for Node (react-native → react-native-web) and runs it.
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
const [entry, ...args] = process.argv.slice(2);
const outfile = `.tools-out/${entry.replace(/\W/g, "_")}.mjs`;
await build({
  entryPoints: [entry], outfile, bundle: true, platform: "node", format: "esm",
  alias: { "react-native": "react-native-web" },
  external: ["canvaskit-wasm", "sharp"],
  loader: { ".js": "jsx" }, jsx: "automatic", logLevel: "warning",
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  define: { __DEV__: "false", "process.env.NODE_ENV": '"production"' },
});
process.argv = [process.argv[0], outfile, ...args];
await import(pathToFileURL(outfile).href);
