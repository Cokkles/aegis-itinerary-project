(()=>{const starts=['Build momentum before you wait for motivation','Make the next useful move visible','Protect the time that moves the mission forward','Choose progress that can survive a difficult day','Turn uncertainty into one testable action','Let discipline carry what motivation cannot','Make consistency easier than avoidance','Use small wins to create larger options','Measure what matters and ignore the noise','Leave enough margin to think clearly','Reduce friction before demanding more willpower','Treat preparation as a form of confidence','Move with purpose even when the path is incomplete','Create systems that make good choices easier','Keep your standards high and your process simple','Ask better questions before chasing faster answers','Finish the important work before polishing the trivial','Make room for recovery so effort remains sustainable','Notice what changed before deciding what it means','Prefer steady improvement over dramatic inconsistency'];const ends=['because reliable progress compounds quietly.','and let the result teach you what to do next.','so tomorrow begins with better options than today.','without confusing motion for meaningful progress.','and keep enough perspective to change course when needed.','because clarity often arrives after movement begins.','while preserving the energy required for the long game.','and make the system stronger each time you use it.','because durable results are built from repeatable actions.','and give your future self something useful to inherit.'];const cats=['Discipline','Momentum','Focus','Resilience','Systems','Learning','Perspective','Execution','Growth','Clarity'];starts.forEach((s,i)=>ends.forEach((e,j)=>Q.push([`${s}, ${e}`,`AEGIS • ${cats[(i+j)%cats.length]}`])));})();

// AEGIS 2.6.3i — isolate the public AUTH-1 config request from the dashboard
// request stack. The standalone diagnostic proved this exact fetch/text/parse path
// is reliable. Only auth_config is intercepted; all other requests use native fetch.
(()=>{
  if(window.__AEGIS_AUTH_CONFIG_TRANSPORT_263I__)return;
  window.__AEGIS_AUTH_CONFIG_TRANSPORT_263I__=true;
  const nativeFetch=window.fetch.bind(window);
  const BACKEND='https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';
  function isAuthConfig(input){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const u=new URL(raw,location.href);
      return u.href.startsWith(BACKEND)&&u.searchParams.get('action')==='auth_config';
    }catch{return false;}
  }
  window.fetch=async function(input,init={}){
    if(!isAuthConfig(input))return nativeFetch(input,init);
    const ctrl=new AbortController();
    const timeout=setTimeout(()=>ctrl.abort(),12000);
    try{
      const raw=typeof input==='string'?input:input.url;
      const r=await nativeFetch(raw,{...init,cache:'no-store',signal:ctrl.signal});
      const text=await r.text();
      let parsed;
      try{parsed=JSON.parse(text);}catch{throw new Error('auth_config returned non-JSON content.');}
      window.__AEGIS_AUTH_CONFIG_LAST__={at:new Date().toISOString(),http:r.status,ok:r.ok,backend_version:parsed&&parsed.backend_version};
      return new Response(JSON.stringify(parsed),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'application/json'}});
    }finally{clearTimeout(timeout);}
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
      window.dispatchEvent(new CustomEvent('aegis-runtime-ready',{detail:{release:RELEASE,source:'single-core-auth-config-isolated'}}));
    }catch(err){
      console.error('AEGIS runtime bootstrap failed',err);
      const status=document.getElementById('aegisAuthStatus');if(status){status.textContent='Runtime initialization failed: '+String(err.message||err);status.classList.add('aegis-auth-error');}
    }
  }
  if(document.readyState==='complete')setTimeout(boot,0);else window.addEventListener('load',()=>setTimeout(boot,0),{once:true});
})();
