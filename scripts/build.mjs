import { build } from "vite";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
await build();
await fs.writeFile("dist/.nojekyll", "");
async function files(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? files(path.join(dir, e.name))
          : [path.join(dir, e.name)],
      ),
    )
  ).flat();
}
const all = (await files("dist"))
  .filter((p) => !p.endsWith("sw.js") && !p.endsWith(".nojekyll"))
  .sort();
const hash = createHash("sha256");
for (const p of all) hash.update(await fs.readFile(p));
const version = hash.digest("hex").slice(0, 16);
const urls = all.map(
  (p) => "./" + path.relative("dist", p).split(path.sep).join("/"),
);
const worker = `const CACHE='bloodlines-${version}';
const FILES=${JSON.stringify(urls)};
const absolute=FILES.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(absolute);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith('bloodlines-')&&key!==CACHE)await caches.delete(key);}await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{try{const response=await fetch(event.request);if(response.ok)return response;}catch{}return (await caches.open(CACHE)).match(new URL('./index.html',self.registration.scope).href);})());return;
 }
 if(!absolute.includes(event.request.url))return;
 event.respondWith((async()=>{const cached=await (await caches.open(CACHE)).match(event.request);return cached||fetch(event.request);})());
});
`;
await fs.writeFile("dist/sw.js", worker);
console.log(`Offline cache ${version}: ${urls.length} local files.`);
