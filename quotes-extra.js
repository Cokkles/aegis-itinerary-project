(()=>{const starts=['Build momentum before you wait for motivation','Make the next useful move visible','Protect the time that moves the mission forward','Choose progress that can survive a difficult day','Turn uncertainty into one testable action','Let discipline carry what motivation cannot','Make consistency easier than avoidance','Use small wins to create larger options','Measure what matters and ignore the noise','Leave enough margin to think clearly','Reduce friction before demanding more willpower','Treat preparation as a form of confidence','Move with purpose even when the path is incomplete','Create systems that make good choices easier','Keep your standards high and your process simple','Ask better questions before chasing faster answers','Finish the important work before polishing the trivial','Make room for recovery so effort remains sustainable','Notice what changed before deciding what it means','Prefer steady improvement over dramatic inconsistency'];const ends=['because reliable progress compounds quietly.','and let the result teach you what to do next.','so tomorrow begins with better options than today.','without confusing motion for meaningful progress.','and keep enough perspective to change course when needed.','because clarity often arrives after movement begins.','while preserving the energy required for the long game.','and make the system stronger each time you use it.','because durable results are built from repeatable actions.','and give your future self something useful to inherit.'];const cats=['Discipline','Momentum','Focus','Resilience','Systems','Learning','Perspective','Execution','Growth','Clarity'];starts.forEach((s,i)=>ends.forEach((e,j)=>Q.push([`${s}, ${e}`,`AEGIS • ${cats[(i+j)%cats.length]}`])));})();

// AEGIS 2.6.3j current feature runtime bootstrap.
// The authoritative AUTH-1 core is loaded normally by index.html as aegis-core.js.
(()=>{
  if(window.__AEGIS_DIRECT_RUNTIME_263I__)return;
  window.__AEGIS_DIRECT_RUNTIME_263I__=true;
  const RELEASE='2.6.3j';
  const MODULES=['aq1-hotfix.js','aq2-calendar.js','aq2-stabilization.js','model-routing-telemetry.js','compatibility-v2.6.3.js','calendar-safety-bridge-v2.6.3.js'];
  function loaded(name){return [...document.scripts].some(s=>String(s.src||'').includes('/'+name));}
  function load(name){return new Promise((resolve,reject)=>{if(loaded(name))return resolve();const s=document.createElement('script');s.src=name+'?v='+RELEASE;s.async=false;s.dataset.aegisDirectRuntime=RELEASE;s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load '+name));document.body.appendChild(s);});}
  async function boot(){
    const started=Date.now();
    while(!window.AEGIS?.Core&&Date.now()-started<12000)await new Promise(r=>setTimeout(r,100));
    if(!window.AEGIS?.Core){console.error('AEGIS 2.6.3j: core never initialized');return;}
    try{
      for(const name of MODULES)await load(name);
      document.documentElement.dataset.aegisRuntime=RELEASE;
      const v=document.querySelector('.nav-version');if(v)v.textContent='AEGIS v2.6.3 • AUTH-1';
      window.dispatchEvent(new CustomEvent('aegis-runtime-ready',{detail:{release:RELEASE,source:'single-core-stabilized-auth'}}));
    }catch(err){
      console.error('AEGIS runtime bootstrap failed',err);
      const status=document.getElementById('aegisAuthStatus');if(status){status.textContent='Runtime initialization failed: '+String(err.message||err);status.classList.add('aegis-auth-error');}
    }
  }
  if(document.readyState==='complete')setTimeout(boot,0);else window.addEventListener('load',()=>setTimeout(boot,0),{once:true});
})();
