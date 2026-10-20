import { build } from "vite";
import fs from "node:fs/promises";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
// Reuse the tested source and production CSS. Bundle an offline IIFE; no imported modules or duplicated images.
const result = await build({
  configFile: false,
  base: "./",
  publicDir: false,
  build: {
    write: false,
    target: ["es2020", "safari15"],
    minify: true,
    lib: { entry: "src/main.js", name: "BloodlinesOffline", formats: ["iife"] },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const outputs = Array.isArray(result)
  ? result.flatMap((item) => item.output)
  : result.output;
const js = outputs.find((o) => o.type === "chunk").code;
const cssName = (await fs.readdir("dist/assets")).find((n) =>
  n.endsWith(".css"),
);
const css = await fs.readFile("dist/assets/" + cssName, "utf8");
const guard = await fs.readFile("public/boot-guard.js", "utf8");
const art =
  "data:image/webp;base64," +
  (await fs.readFile("public/assets/battlefield.webp")).toString("base64");
const favicon =
  "data:image/svg+xml;base64," +
  (await fs.readFile("public/favicon.svg")).toString("base64");
let html = await fs.readFile("index.html", "utf8");
html = html
  .replace(/\s*<link rel="(?:apple-touch-icon|manifest)"[^>]*>/g, "")
  .replace("./favicon.svg", favicon)
  .replace(
    '<script src="./boot-guard.js"></script>',
    `<script>${guard.replaceAll("</script", "<\\/script")}</script>`,
  )
  .replace(
    '<script type="module" src="/src/boot.js"></script>',
    `<style>${css}</style><script>window.BLOODLINES_STANDALONE=true;window.BLOODLINES_ART=${JSON.stringify(art)};${js.replaceAll("</script", "<\\/script")}</script>`,
  );
await fs.mkdir("downloads", { recursive: true });
await fs.writeFile("downloads/BLOODLINES.html", html);
const output = { "BLOODLINES.html": strToU8(html) };
const exclude = new Set([
  "node_modules",
  ".git",
  "downloads",
  "test-results",
  ".local",
]);
async function collect(directory = "") {
  for (const entry of await fs.readdir(directory || ".", {
    withFileTypes: true,
  })) {
    if (exclude.has(entry.name)) continue;
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) await collect(relative);
    else
      output["age-of-war/" + relative] = new Uint8Array(
        await fs.readFile(relative),
      );
  }
}
await collect();
output["ZACZNIJ-TUTAJ.txt"] = strToU8(
  "BLOODLINES — wersja mobilna\n\niPhone: otworz opublikowany adres HTTPS w Safari. Nie uzywaj podgladu HTML w aplikacji Pliki. Publikacja: age-of-war/IPHONE.md.\n\nWindows/macOS: BLOODLINES.html jest samodzielna wersja offline.\n\nHosting: zawartosc age-of-war/dist/. Projekt i instrukcja budowania: age-of-war/README.md.\n",
);
await fs.writeFile("downloads/BLOODLINES.zip", zipSync(output, { level: 6 }));
console.log(
  "Prepared downloads/BLOODLINES.html and downloads/BLOODLINES.zip. Embedded art once; all current source and dist files included.",
);
