// AEGIS PWA RELEASE: 2.6.3b
// Backend compatibility is capability-driven; Apps Script 2.6.3 validated.
const CACHE_NAME='aegis-dashboard-v2.6.3b-calendar-unified';
const STATIC=[
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './aegis-mark-v3.svg?v=2.6.3b',
  './styles.css?v=2.6.3b',
  './v2.4.1.css?v=2.6.3b',
  './aegis-core.js?v=2.6.3b',
  './app.js?v=2.6.3b',
  './v2.4.1.js?v=2.6.3b',
  './aq1-hotfix.js?v=2.6.3b',
  './aq2-calendar.js?v=2.6.3b',
  './aq2-stabilization.js?v=2.6.3b',
  './model-routing-telemetry.js?v=2.6.3b',
  './compatibility-v2.6.3.js?v=2.6.3b',
  './calendar-safety-bridge-v2.6.3.js?v=2.6.3b',
  './quotes.js?v=2.6.3b',
  './quotes-1.js?v=2.6.3b',
  './quotes-2.js?v=2.6.3b',
  './quotes-3.js?v=2.6.3b',
  './quotes-4.js?v=2.6.3b',
  './quotes-5.js?v=2.6.3b',
  './quotes-6.js?v=2.6.3b',
  './quotes-7.js?v=2.6.3b',
  './quotes-extra.js?v=2.6.3b'
];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));

function runtimeBundle(){
  const files=[
    './v2.4.1.js?v=2.6.3b',
    './aq1-hotfix.js?v=2.6.3b',
    './aq2-calendar.js?v=2.6.3b',
    './aq2-stabilization.js?v=2.6.3b',
    './model-routing-telemetry.js?v=2.6.3b',
    './compatibility-v2.6.3.js?v=2.6.3b',
    './calendar-safety-bridge-v2.6.3.js?v=2.6.3b'
  ];
  return Promise.all(files.map(file=>caches.match(file).then(r=>r||fetch(file,{cache:'no-store'}))))
    .then(async responses=>{
      const parts=[];
      for(const response of responses) parts.push(await response.text());
      return new Response(parts.join('\n\n'),{headers:{'Content-Type':'application/javascript; charset=utf-8','X-AEGIS-Release':'2.6.3b'}});
    });
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.hostname.includes('script.google.com')||url.hostname.includes('open-meteo.com')||url.hostname.includes('accounts.google.com')) return;

  const nav=event.request.mode==='navigate'||url.pathname.endsWith('/')||url.pathname.endsWith('/index.html');
  if(nav){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));return response;}).catch(()=>caches.match('./index.html')));
    return;
  }

  if(url.pathname.endsWith('/aegis-core.js')){
    event.respondWith(caches.match('./aegis-core.js?v=2.6.3b').then(r=>r||fetch('./aegis-core.js?v=2.6.3b',{cache:'no-store'})));
    return;
  }
  if(url.pathname.endsWith('/app.js')){
    event.respondWith(caches.match('./app.js?v=2.6.3b').then(r=>r||fetch('./app.js?v=2.6.3b',{cache:'no-store'})));
    return;
  }
  if(url.pathname.endsWith('/v2.4.1.js')){
    event.respondWith(runtimeBundle());
    return;
  }

  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request,{cache:'no-store'}).then(response=>{if(response.ok&&response.type==='basic'){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}return response;})));
});
