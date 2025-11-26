const CACHE_NAME = 'fredagsdrinken-v8';
const APP_SHELL = ['./','./index.html','./manifest.webmanifest','./recipes.json','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME && caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e=>{
  const req=e.request;
  if(req.mode==='navigate' || req.url.endsWith('/recipes.json')){
    e.respondWith(fetch(req).then(res=>{ const cp=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,cp)); return res; }).catch(()=>caches.match(req).then(m=>m||caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(m=>m||fetch(req).then(res=>{ const cp=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,cp)); return res; })));
});