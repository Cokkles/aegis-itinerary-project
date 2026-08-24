// AEGIS PWA runtime boundary 2.6.4
// One canonical backend URL. No fetch monkeypatching. No background polling.
(()=>{
  if(window.__AEGIS_PWA_RUNTIME_264__) return;
  window.__AEGIS_PWA_RUNTIME_264__=true;

  const RELEASE='2.6.4';
  const BACKEND='https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';
  const RESET_KEY='aegis_sw_reset_264';

  // 2.6.3c's service worker intercepted v2.4.1.js and synthesized a cached bundle
  // containing AQ-1 + AQ-2. That can override the clean 2.6.4 script list even
  // when pwa.html is correct. Evict the old worker/caches once, then reload into
  // an uncontrolled page before app.js and the Ask-AEGIS modules are loaded.
  if('serviceWorker' in navigator && navigator.serviceWorker.controller && !sessionStorage.getItem(RESET_KEY)){
    sessionStorage.setItem(RESET_KEY,'1');
    Promise.all([
      navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))),
      ('caches' in window?caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))):Promise.resolve())
    ]).finally(()=>{
      const u=new URL(location.href);
      u.searchParams.set('v',RELEASE);
      u.searchParams.set('swreset','1');
      location.replace(u.toString());
    });
    return;
  }

  // Legacy extensions historically read window.WEBHOOK while app.js declared a
  // lexical const WEBHOOK. Keep the endpoint explicit until all modules consume
  // AEGIS.Core.BACKEND directly.
  window.WEBHOOK=BACKEND;
  window.AEGIS_BACKEND_URL=BACKEND;
  window.AEGIS_PWA={release:RELEASE,backend:BACKEND,authFirst:true,transport:'native-fetch-bounded-by-core'};

  window.addEventListener('error',event=>{
    try{console.error('[AEGIS PWA]',event.error||event.message||event)}catch{}
  });
  window.addEventListener('unhandledrejection',event=>{
    try{console.error('[AEGIS PWA rejection]',event.reason)}catch{}
  });

  window.addEventListener('aegis-stable-runtime-ready',()=>{
    try{
      if(window.AEGIS?.Core){
        AEGIS.Core.BACKEND=BACKEND;
        AEGIS.Core.setState?.('pwa','ready','AEGIS PWA '+RELEASE+' • auth-first • canonical backend');
      }
    }catch{}
  },{once:true});
})();
