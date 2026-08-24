(()=>{const starts=['Build momentum before you wait for motivation','Make the next useful move visible','Protect the time that moves the mission forward','Choose progress that can survive a difficult day','Turn uncertainty into one testable action','Let discipline carry what motivation cannot','Make consistency easier than avoidance','Use small wins to create larger options','Measure what matters and ignore the noise','Leave enough margin to think clearly','Reduce friction before demanding more willpower','Treat preparation as a form of confidence','Move with purpose even when the path is incomplete','Create systems that make good choices easier','Keep your standards high and your process simple','Ask better questions before chasing faster answers','Finish the important work before polishing the trivial','Make room for recovery so effort remains sustainable','Notice what changed before deciding what it means','Prefer steady improvement over dramatic inconsistency'];const ends=['because reliable progress compounds quietly.','and let the result teach you what to do next.','so tomorrow begins with better options than today.','without confusing motion for meaningful progress.','and keep enough perspective to change course when needed.','because clarity often arrives after movement begins.','while preserving the energy required for the long game.','and make the system stronger each time you use it.','because durable results are built from repeatable actions.','and give your future self something useful to inherit.'];const cats=['Discipline','Momentum','Focus','Resilience','Systems','Learning','Perspective','Execution','Growth','Clarity'];starts.forEach((s,i)=>ends.forEach((e,j)=>Q.push([`${s}, ${e}`,`AEGIS • ${cats[(i+j)%cats.length]}`])));})();

// Direct current-runtime hook. index.html still references this base asset on every load,
// so it provides a service-worker-independent path to the current AEGIS modules.
(()=>{
  if(window.__AEGIS_RUNTIME_BOOTSTRAP_TAG__)return;
  window.__AEGIS_RUNTIME_BOOTSTRAP_TAG__=true;
  const s=document.createElement('script');
  s.src='runtime-bootstrap-v2.6.3d.js?v=2.6.3d';
  s.async=false;
  (document.body||document.documentElement).appendChild(s);
})();
