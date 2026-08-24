(()=>{const starts=['Build momentum before you wait for motivation','Make the next useful move visible','Protect the time that moves the mission forward','Choose progress that can survive a difficult day','Turn uncertainty into one testable action','Let discipline carry what motivation cannot','Make consistency easier than avoidance','Use small wins to create larger options','Measure what matters and ignore the noise','Leave enough margin to think clearly','Reduce friction before demanding more willpower','Treat preparation as a form of confidence','Move with purpose even when the path is incomplete','Create systems that make good choices easier','Keep your standards high and your process simple','Ask better questions before chasing faster answers','Finish the important work before polishing the trivial','Make room for recovery so effort remains sustainable','Notice what changed before deciding what it means','Prefer steady improvement over dramatic inconsistency'];const ends=['because reliable progress compounds quietly.','and let the result teach you what to do next.','so tomorrow begins with better options than today.','without confusing motion for meaningful progress.','and keep enough perspective to change course when needed.','because clarity often arrives after movement begins.','while preserving the energy required for the long game.','and make the system stronger each time you use it.','because durable results are built from repeatable actions.','and give your future self something useful to inherit.'];const cats=['Discipline','Momentum','Focus','Resilience','Systems','Learning','Perspective','Execution','Growth','Clarity'];starts.forEach((s,i)=>ends.forEach((e,j)=>Q.push([`${s}, ${e}`,`AEGIS • ${cats[(i+j)%cats.length]}`])));})();

// AEGIS 2.6.3m stabilization shim.
// auth_login is the known-good stateless token-validation path. During the
// AUTH-1 browser stabilization window, translate legacy auth_session checks to
// auth_login so every page uses one backend validation operation.
(()=>{
  if(window.__AEGIS_AUTH_SESSION_COMPAT_263M__)return;
  window.__AEGIS_AUTH_SESSION_COMPAT_263M__=true;
  const nativeFetch=window.fetch.bind(window);
  const BACKEND='https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';
  window.fetch=function(input,init={}){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!String(url).startsWith(BACKEND)||String(init.method||'GET').toUpperCase()!=='POST'||!init.body)return nativeFetch(input,init);
    try{
      const payload=JSON.parse(init.body);
      if(payload&&payload.action==='auth_session'){
        payload.action='auth_login';
        return nativeFetch(input,{...init,body:JSON.stringify(payload)});
      }
    }catch{}
    return nativeFetch(input,init);
  };
})();
