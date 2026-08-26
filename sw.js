// AEGIS PWA RELEASE: 2.6.5
// Network is authoritative for HTML, JS, CSS, manifest, backend calls, and API calls.
// The worker never synthesizes or pins JavaScript runtime bundles.
const CACHE_NAME='aegis-pwa-v2.6.5-static-only';

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);const sameOrigin=url.origin===self.location.origin;
  const image=sameOrigin&&/\.(?:png|svg|ico|webp|jpg|jpeg)$/i.test(url.pathname);if(!image)return;
  event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request)));
});
