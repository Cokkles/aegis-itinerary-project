// AEGIS PWA runtime boundary 2.6.5
// One canonical backend URL. No global fetch governor. Auth-first runtime.
(()=>{
  if(window.__AEGIS_PWA_RUNTIME_265__) return;
  window.__AEGIS_PWA_RUNTIME_265__=true;

  const RELEASE='2.6.5';
  const BACKEND='https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';
  const RESET_KEY='aegis_sw_reset_265';

  if('serviceWorker' in navigator && navigator.serviceWorker.controller && !sessionStorage.getItem(RESET_KEY)){
    sessionStorage.setItem(RESET_KEY,'1');
    Promise.all([
      navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))),
      ('caches' in window?caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))):Promise.resolve())
    ]).finally(()=>{
      const u=new URL(location.href);u.searchParams.set('v',RELEASE);u.searchParams.set('swreset','1');location.replace(u.toString());
    });
    return;
  }

  window.WEBHOOK=BACKEND;
  window.AEGIS_BACKEND_URL=BACKEND;
  window.AEGIS_PWA={release:RELEASE,backend:BACKEND,authFirst:true,transport:'native-fetch-bounded-by-core'};

  window.addEventListener('error',event=>{try{console.error('[AEGIS PWA]',event.error||event.message||event)}catch{}});
  window.addEventListener('unhandledrejection',event=>{try{console.error('[AEGIS PWA rejection]',event.reason)}catch{}});

  function loadPostRuntimeBridge(src,id){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src+'?v='+RELEASE;s.async=false;s.onerror=()=>console.error('[AEGIS PWA] failed to load '+src);document.body.appendChild(s)}

  window.addEventListener('aegis-stable-runtime-ready',()=>{
    try{
      if(window.AEGIS?.Core){AEGIS.Core.BACKEND=BACKEND;AEGIS.Core.BUILD=RELEASE;AEGIS.Core.setState?.('pwa','ready','AEGIS PWA '+RELEASE+' • auth-first • canonical backend')}
      loadPostRuntimeBridge('horizon-sync-bridge-v2.6.4b.js','aegisHorizonSync265');
    }catch{}
  },{once:true});
})();
