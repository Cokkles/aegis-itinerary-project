(()=>{const starts=['Build momentum before you wait for motivation','Make the next useful move visible','Protect the time that moves the mission forward','Choose progress that can survive a difficult day','Turn uncertainty into one testable action','Let discipline carry what motivation cannot','Make consistency easier than avoidance','Use small wins to create larger options','Measure what matters and ignore the noise','Leave enough margin to think clearly','Reduce friction before demanding more willpower','Treat preparation as a form of confidence','Move with purpose even when the path is incomplete','Create systems that make good choices easier','Keep your standards high and your process simple','Ask better questions before chasing faster answers','Finish the important work before polishing the trivial','Make room for recovery so effort remains sustainable','Notice what changed before deciding what it means','Prefer steady improvement over dramatic inconsistency'];const ends=['because reliable progress compounds quietly.','and let the result teach you what to do next.','so tomorrow begins with better options than today.','without confusing motion for meaningful progress.','and keep enough perspective to change course when needed.','because clarity often arrives after movement begins.','while preserving the energy required for the long game.','and make the system stronger each time you use it.','because durable results are built from repeatable actions.','and give your future self something useful to inherit.'];const cats=['Discipline','Momentum','Focus','Resilience','Systems','Learning','Perspective','Execution','Growth','Clarity'];starts.forEach((s,i)=>ends.forEach((e,j)=>Q.push([`${s}, ${e}`,`AEGIS • ${cats[(i+j)%cats.length]}`])));})();

// AEGIS 2.6.3f authoritative core bootstrap.
// index.html loads quotes-extra.js immediately before the legacy aegis-core.js.
// Install the deterministic AUTH-1 core here and make Core non-writable so the
// legacy script cannot replace it afterward.
(()=>{
  if(window.__AEGIS_CORE_263F_BOOTSTRAPPED__)return;
  window.__AEGIS_CORE_263F_BOOTSTRAPPED__=true;
  function lockCore(){
    if(!window.AEGIS?.Core)return false;
    try{
      const core=window.AEGIS.Core;
      Object.defineProperty(window.AEGIS,'Core',{value:core,writable:false,configurable:false,enumerable:true});
      document.documentElement.dataset.aegisCore=core.BUILD||'2.6.3f';
      return true;
    }catch(err){console.error('AEGIS core lock failed',err);return false;}
  }
  if(document.readyState==='loading'){
    document.write('<script src="aegis-core-v2.6.3f.js?v=2.6.3f"><\/script>');
    lockCore();
  }else{
    const s=document.createElement('script');
    s.src='aegis-core-v2.6.3f.js?v=2.6.3f';
    s.onload=()=>{if(lockCore())location.reload();};
    s.onerror=()=>console.error('AEGIS 2.6.3f core failed to load');
    document.head.appendChild(s);
  }
})();

// Current feature runtime bootstrap. This remains independent of service-worker
// response substitution and runs after the base page finishes loading.
(()=>{
  if(window.__AEGIS_DIRECT_RUNTIME_263F__) return;
  window.__AEGIS_DIRECT_RUNTIME_263F__=true;
  const RELEASE='2.6.3f';
  const MODULES=['aq1-hotfix.js','aq2-calendar.js','aq2-stabilization.js','model-routing-telemetry.js','compatibility-v2.6.3.js','calendar-safety-bridge-v2.6.3.js'];
  function loaded(name){return [...document.scripts].some(s=>String(s.src||'').includes('/'+name));}
  function load(name){return new Promise((resolve,reject)=>{if(loaded(name))return resolve();const s=document.createElement('script');s.src=name+'?v='+RELEASE;s.async=false;s.dataset.aegisDirectRuntime=RELEASE;s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load '+name));document.body.appendChild(s);});}
  async function boot(){
    const started=Date.now();
    while(!window.AEGIS?.Core && Date.now()-started<12000)await new Promise(r=>setTimeout(r,100));
    if(!window.AEGIS?.Core){console.error('AEGIS 2.6.3f: core never initialized');return;}
    try{
      for(const name of MODULES)await load(name);
      document.documentElement.dataset.aegisRuntime=RELEASE;
      const v=document.querySelector('.nav-version');if(v)v.textContent='AEGIS v2.6.3 • AUTH-1';
      window.dispatchEvent(new CustomEvent('aegis-runtime-ready',{detail:{release:RELEASE,source:'direct-authoritative'}}));
    }catch(err){
      console.error('AEGIS direct runtime bootstrap failed',err);
      const status=document.getElementById('aegisAuthStatus');if(status){status.textContent='Runtime initialization failed: '+String(err.message||err);status.classList.add('aegis-auth-error');}
    }
  }
  if(document.readyState==='complete')setTimeout(boot,0);else window.addEventListener('load',()=>setTimeout(boot,0),{once:true});
})();
