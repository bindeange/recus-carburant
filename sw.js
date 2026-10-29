const V='recus-v5',FILES=["./","./index.html","./ocr.js","./balance.js","./manifest.webmanifest","./icon.svg","./vendor/tesseract.min.js","./vendor/worker.min.js","./vendor/tesseract-core-lstm.wasm.js","./vendor/tesseract-core-simd-lstm.wasm.js","./vendor/lang/eng.traineddata.gz"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('recus-')&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{if(res.ok){const copy=res.clone();e.waitUntil(caches.open(V).then(c=>c.put(e.request,copy)))}return res})));
});
