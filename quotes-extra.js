(()=>{const starts=['Build momentum before you wait for motivation','Make the next useful move visible','Protect the time that moves the mission forward','Choose progress that can survive a difficult day','Turn uncertainty into one testable action','Let discipline carry what motivation cannot','Make consistency easier than avoidance','Use small wins to create larger options','Measure what matters and ignore the noise','Leave enough margin to think clearly','Reduce friction before demanding more willpower','Treat preparation as a form of confidence','Move with purpose even when the path is incomplete','Create systems that make good choices easier','Keep your standards high and your process simple','Ask better questions before chasing faster answers','Finish the important work before polishing the trivial','Make room for recovery so effort remains sustainable','Notice what changed before deciding what it means','Prefer steady improvement over dramatic inconsistency'];const ends=['because reliable progress compounds quietly.','and let the result teach you what to do next.','so tomorrow begins with better options than today.','without confusing motion for meaningful progress.','and keep enough perspective to change course when needed.','because clarity often arrives after movement begins.','while preserving the energy required for the long game.','and make the system stronger each time you use it.','because durable results are built from repeatable actions.','and give your future self something useful to inherit.'];const cats=['Discipline','Momentum','Focus','Resilience','Systems','Learning','Perspective','Execution','Growth','Clarity'];starts.forEach((s,i)=>ends.forEach((e,j)=>Q.push([`${s}, ${e}`,`AEGIS • ${cats[(i+j)%cats.length]}`])));})();

// AEGIS 2.6.3i — remove auth_config from the critical dashboard boot path.
// AUTH-1 configuration is static deployment metadata, not user/session state. The
// dashboard may therefore bootstrap from this release-pinned copy while all actual
// authentication and protected operations remain backend-enforced.
(()=>{
  if(window.__AEGIS_AUTH_CONFIG_TRANSPORT_263I__)return;
  window.__AEGIS_AUTH_CONFIG_TRANSPORT_263I__=true;
  const nativeFetch=window.fetch.bind(window);
  const BACKEND='https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';
  const STATIC_AUTH_CONFIG={
    status:'success',
    provider:'google',
    configured:true,
    client_id:'441009275873-qnf9c9n1o3l9tl9c76t2821hm8tectfl.apps.googleusercontent.com',
    allowlist_configured:true,
    enforcement_required:true,
    auth_version:'AUTH-1',
    backend_version:'2.6.3'
  };
  function isAuthConfig(input){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const u=new URL(raw,location.href);
      return u.href.startsWith(BACKEND)&&u.searchParams.get('action')==='auth_config';
    }catch{return false;}
  }
  window.fetch=function(input,init={}){
    if(!isAuthConfig(input))return nativeFetch(input,init);
    window.__AEGIS_AUTH_CONFIG_LAST__={at:new Date().toISOString(),http:200,ok:true,backend_version:STATIC_AUTH_CONFIG.backend_version,source:'release-pinned'};
    return Promise.resolve(new Response(JSON.stringify(STATIC_AUTH_CONFIG),{status:200,statusText:'OK',headers:{'Content-Type':'application/json'}}));
  };
})();

// AEGIS 2.6.3i current feature runtime bootstrap.
// The authoritative AUTH-1 core is loaded normally by index.html as aegis-core.js.
(()=>{
  if(window.__AEGIS_DIRECT_RUNTIME_263I__)return;
  window.__AEGIS_DIRECT_RUNTIME_263I__=true;
  const RELEASE='2.6.3i';
  const MODULES=['aq1-hotfix.js','aq2-calendar.js','aq2-stabilization.js','model-routing-telemetry.js','compatibility-v2.6.3.js','calendar-safety-bridge-v2.6.3.js'];
  function loaded(name){return [...document.scripts].some(s=>String(s.src||'').includes('/'+name));}
  function load(name){return new Promise((resolve,reject)=>{if(loaded(name))return resolve();const s=document.createElement('script');s.src=name+'?v='+RELEASE;s.async=false;s.dataset.aegisDirectRuntime=RELEASE;s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load '+name));document.body.appendChild(s);});}
  async function boot(){
    const started=Date.now();
    while(!window.AEGIS?.Core&&Date.now()-started<12000)await new Promise(r=>setTimeout(r,100));
    if(!window.AEGIS?.Core){console.error('AEGIS 2.6.3i: core never initialized');return;}
    try{
      for(const name of MODULES)await load(name);
      document.documentElement.dataset.aegisRuntime=RELEASE;
      const v=document.querySelector('.nav-version');if(v)v.textContent='AEGIS v2.6.3 • AUTH-1';
      window.dispatchEvent(new CustomEvent('aegis-runtime-ready',{detail:{release:RELEASE,source:'single-core-static-auth-config'}}));
    }catch(err){
      console.error('AEGIS runtime bootstrap failed',err);
      const status=document.getElementById('aegisAuthStatus');if(status){status.textContent='Runtime initialization failed: '+String(err.message||err);status.classList.add('aegis-auth-error');}
    }
  }
  if(document.readyState==='complete')setTimeout(boot,0);else window.addEventListener('load',()=>setTimeout(boot,0),{once:true});
})();
