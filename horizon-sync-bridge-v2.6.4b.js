// AEGIS PWA 2.6.4b — canonical HORIZON refresh bridge.
// The legacy dashboard bundle and the canonical latest_horizon_briefing are separate
// sources. Manual Sync and post-generation refresh must explicitly reconcile both.
(()=>{
  if(window.__AEGIS_HORIZON_SYNC_264B__) return;
  window.__AEGIS_HORIZON_SYNC_264B__=true;
  if(!window.AEGIS?.Core) return;

  const toastSafe=(msg)=>{try{window.toast?.(msg)}catch{}};
  const notifySafe=(title,msg)=>{try{window.localNotification?.(title,msg,'warning','horizon-sync')}catch{}};

  async function refreshCanonical(){
    if(window.AEGIS_DATA_BRIDGE?.refreshCanonicalBriefing){
      await window.AEGIS_DATA_BRIDGE.refreshCanonicalBriefing();
      return;
    }
    throw new Error('Canonical HORIZON bridge is unavailable.');
  }

  async function refreshDashboardAndHorizon(){
    // Legacy dashboard first; canonical briefing always wins last.
    if(typeof window.loadDashboard==='function') await window.loadDashboard(true);
    else if(typeof loadDashboard==='function') await loadDashboard(true);
    await refreshCanonical();
  }

  async function syncAll(){
    const btn=document.getElementById('sync');
    if(btn){btn.disabled=true;btn.dataset.old=btn.innerHTML;btn.innerHTML='↻ Syncing…';}
    try{
      // Do not race the canonical briefing against the legacy dashboard bundle.
      await refreshDashboardAndHorizon();
      const jobs=[];
      try{if(typeof syncWeather==='function')jobs.push(syncWeather(false))}catch{}
      try{if(typeof syncIntelligence==='function')jobs.push(syncIntelligence(false,false))}catch{}
      try{if(typeof syncFinance==='function')jobs.push(syncFinance(false))}catch{}
      try{if(typeof syncNotifications==='function')jobs.push(syncNotifications())}catch{}
      const results=await Promise.allSettled(jobs);
      const failed=results.filter(x=>x.status==='rejected');
      if(failed.length){
        try{stat('PARTIAL','var(--warn)')}catch{}
        toastSafe('Dashboard synced; '+failed.length+' secondary subsystem issue'+(failed.length===1?'':'s'));
      }else{
        try{stat('SYSTEM READY')}catch{}
        toastSafe('Dashboard and HORIZON synced');
      }
      try{renderHealth?.()}catch{}
    }catch(err){
      try{stat('SYNC FAILED','var(--bad)')}catch{}
      notifySafe('Dashboard / HORIZON sync failed',err?.message||String(err));
      toastSafe('HORIZON sync failed');
      throw err;
    }finally{
      if(btn){btn.disabled=false;btn.innerHTML=btn.dataset.old||'↻ Sync Dashboard <span>Live refresh</span>';}
    }
  }

  async function generateAndRefresh(){
    const dlg=document.getElementById('horizonConfirm');
    try{if(dlg?.open)dlg.close()}catch{}
    const btn=document.getElementById('gen');
    if(btn){btn.disabled=true;btn.dataset.old=btn.innerHTML;btn.innerHTML='⚡ Generating…';}
    try{
      try{stat('GENERATING…','var(--warn)')}catch{}
      const result=await (typeof post==='function'
        ? post({action:'horizon_sync',command:'/horizon'},90000)
        : AEGIS.Core.fetchJson(window.WEBHOOK,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'horizon_sync',command:'/horizon'})},90000));
      const out=document.getElementById('out');
      if(out)out.textContent=result?.result||'HORIZON generated.';
      // Critical invariant: do not claim UI refresh complete until canonical Doc is re-read.
      await refreshDashboardAndHorizon();
      try{if(typeof syncNotifications==='function')await syncNotifications()}catch{}
      try{stat('HORIZON GENERATED')}catch{}
      toastSafe('HORIZON generated and dashboard refreshed');
    }catch(err){
      const out=document.getElementById('out');if(out)out.textContent='HORIZON ERROR: '+(err?.message||String(err));
      try{stat('GENERATION FAILED','var(--bad)')}catch{}
      notifySafe('HORIZON generation/refresh failed',err?.message||String(err));
    }finally{
      if(btn){btn.disabled=false;btn.innerHTML=btn.dataset.old||'⚡ Generate HORIZON <span>AI generation</span>';}
    }
  }

  function install(){
    const sync=document.getElementById('sync');
    if(sync){sync.onclick=syncAll;sync.dataset.horizonSyncBridge='2.6.4b';}
    const confirm=document.getElementById('confirmHorizon');
    if(confirm){confirm.onclick=generateAndRefresh;confirm.dataset.horizonSyncBridge='2.6.4b';}
    window.AEGIS_HORIZON_SYNC={release:'2.6.4b',syncAll,generateAndRefresh,refreshDashboardAndHorizon};
    try{AEGIS.Core.setState('horizon_sync','ready','canonical refresh bridge 2.6.4b')}catch{}
  }

  install();
})();
