// AEGIS PWA runtime boundary 2.6.4
// One canonical backend URL. No fetch monkeypatching. No background polling.
(()=>{
  if(window.__AEGIS_PWA_RUNTIME_264__) return;
  window.__AEGIS_PWA_RUNTIME_264__=true;

  const RELEASE='2.6.4';
  const BACKEND='https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';

  // Legacy extensions historically read window.WEBHOOK while app.js declared a
  // lexical const WEBHOOK. Make the endpoint an explicit, stable global until
  // all extension modules consume AEGIS.Core.BACKEND directly.
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
