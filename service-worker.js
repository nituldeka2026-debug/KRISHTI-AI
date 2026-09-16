const CACHE="krishti-v16.5-production";
const ASSETS=["./","./index.html","./style.css","./script.js","./cloud-sync.js","./assets/krishti-ai-logo.png","./manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const copy=n.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return n}).catch(()=>caches.match("./index.html"))))});
