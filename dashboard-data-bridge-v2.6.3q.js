// AEGIS 2.6.3q — bounded canonical briefing/data-source stabilization.
(function(){
  if(!window.AEGIS?.Core) return;
  if(window.__AEGIS_DATA_BRIDGE_263Q__) return;
  window.__AEGIS_DATA_BRIDGE_263Q__=true;

  const RELEASE='2.6.3q';
  const WEBHOOK=window.WEBHOOK||'https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';

  function clearLegacyVersionAlert(){
    try{
      const raw=JSON.parse(localStorage.getItem('aegis_local_notifications')||'[]');
      const clean=raw.filter(n=>n?.type!=='backend-version'&&!/backend update required|backend version mismatch/i.test(String(n?.title||'')));
      if(clean.length!==raw.length)localStorage.setItem('aegis_local_notifications',JSON.stringify(clean));
    }catch{}
    try{
      if(typeof notifications!=='undefined'){
        const clean=notifications.filter(n=>n?.type!=='backend-version'&&!/backend update required|backend version mismatch/i.test(String(n?.title||'')));
        if(clean.length!==notifications.length){notifications=clean;persistLocalNotifications?.();renderNotifications?.();}
      }
    }catch{}
  }

  async function refreshCapabilities(){
    try{
      const cap=await AEGIS.Core.fetchJson(WEBHOOK+'?action=capabilities&ts='+Date.now(),{cache:'no-store'},8000);
      try{capabilities=cap}catch{}
      AEGIS.Core.setState('backend','ready','v'+String(cap?.backend_version||'?'));
      clearLegacyVersionAlert();
      try{renderHealth?.()}catch{}
    }catch(err){
      AEGIS.Core.setState('backend','failed',err.message||String(err));
      try{renderHealth?.()}catch{}
    }
  }

  async function refreshCanonicalBriefing(){
    try{
      const b=await AEGIS.Core.fetchJson(WEBHOOK+'?action=getLatestHorizonBriefing&ts='+Date.now(),{cache:'no-store'},12000);
      if(b?.status==='error')throw new Error(b.error||'Canonical briefing unavailable.');
      const raw=String(b?.plain_text||'');
      if(!raw.trim())throw new Error('Canonical briefing returned no text.');

      try{
        data=data||{};
        data.briefing={...(data.briefing||{}),...b,plain_text:raw,last_updated:b.fetched_at||b.generated_at||data.briefing?.last_updated};
        doc=parseHorizon(raw);
        renderDashboard();
        diag(raw);
        const rb=document.getElementById('rawBrief');if(rb)rb.textContent=raw;
        AEGIS.Core.save('dashboard',data,{source:'apps-script+canonical-briefing',release:RELEASE});
        AEGIS.Core.setState('dashboard','ready','canonical briefing');
        try{renderHealth?.()}catch{}
      }catch(renderErr){
        console.error('AEGIS canonical briefing render failed',renderErr);
      }
    }catch(err){
      console.warn('AEGIS canonical briefing refresh failed',err);
      AEGIS.Core.setState('dashboard','cached',err.message||String(err));
      try{renderHealth?.()}catch{}
    }
  }

  window.AEGIS_DATA_BRIDGE={release:RELEASE,refreshCanonicalBriefing,refreshCapabilities};

  // Finite only: initial correction, post-startup correction, and one final
  // correction after the legacy dashboard request's 12-second timeout window.
  clearLegacyVersionAlert();
  setTimeout(refreshCapabilities,150);
  setTimeout(refreshCanonicalBriefing,300);
  setTimeout(()=>{clearLegacyVersionAlert();refreshCanonicalBriefing();},3500);
  setTimeout(()=>{clearLegacyVersionAlert();refreshCanonicalBriefing();},13000);
})();
