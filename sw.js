const CACHE='bloodlines-40134c77c3d7e4f9';
const FILES=["./PHASER-LICENSE.txt","./assets/ASSETS.md","./assets/battlefield.webp","./assets/index-1dbeTFtm.js","./assets/index-Dbalazj-.css","./assets/main-Cnw8QO3W.js","./boot-guard.js","./favicon.svg","./icon-192.png","./icon-512.png","./index.html","./manifest.webmanifest"];
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
