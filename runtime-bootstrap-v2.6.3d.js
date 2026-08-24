// AEGIS 2.6.3d — direct runtime bootstrap.
// Loaded by a directly referenced base asset so current feature modules do not depend on service-worker bundle substitution.
(function(){
  if(window.__AEGIS_RUNTIME_263D__) return;
  window.__AEGIS_RUNTIME_263D__=true;

  const RELEASE='2.6.3d';
  const MODULES=[
    'aq1-hotfix.js',
    'aq2-calendar.js',
    'aq2-stabilization.js',
    'model-routing-telemetry.js',
    'compatibility-v2.6.3.js',
    'calendar-safety-bridge-v2.6.3.js',
    'auth-bootstrap-recovery-v2.6.3c.js'
  ];

  function loadScript(name){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>String(s.src||'').includes('/'+name));
      if(existing) return resolve();
      const s=document.createElement('script');
      s.src=name+'?v='+RELEASE;
      s.async=false;
      s.dataset.aegisRuntime=RELEASE;
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Failed to load '+name));
      document.body.appendChild(s);
    });
  }

  async function boot(){
    // If AQ-2 is already present, the service-worker bundle supplied the current runtime.
    if(document.querySelector('[data-ai-mode="calendar"]')){
      document.documentElement.dataset.aegisRuntime=RELEASE;
      return;
    }
    try{
      for(const module of MODULES) await loadScript(module);
      document.documentElement.dataset.aegisRuntime=RELEASE;
      const v=document.querySelector('.nav-version');
      if(v) v.textContent='AEGIS v2.6.3 • AUTH-1';
      window.dispatchEvent(new CustomEvent('aegis-runtime-ready',{detail:{release:RELEASE,source:'direct-bootstrap'}}));
    }catch(err){
      console.error('AEGIS direct runtime bootstrap failed',err);
      const pa=document.getElementById('persistentAlert');
      if(pa){
        pa.classList.remove('hidden');
        pa.innerHTML='<b>⚠ AEGIS runtime load failed</b> — '+String(err.message||err)+'. Reload once; if it persists, open System diagnostics.';
      }
    }
  }

  if(document.readyState==='complete') setTimeout(boot,0);
  else window.addEventListener('load',()=>setTimeout(boot,0),{once:true});
})();
