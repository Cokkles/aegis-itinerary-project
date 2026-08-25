// AEGIS frontend compatibility layer — capability-driven diagnostics.
(function(){
  if(!window.AEGIS?.Core) return;
  if(window.__AEGIS_COMPAT_264B__) return;
  window.__AEGIS_COMPAT_264B__=true;

  const FRONTEND_VERSION=String(window.AEGIS_PWA?.release||document.documentElement.dataset.aegisRuntime||AEGIS.Core.BUILD||'unknown');
  const REQUIRED=['auth.google','ai.query','calendar.read','calendar.write','calendar.aq2','horizon.generate'];
  const ROUTE_KEY='aegis_model_route_last';
  let lastMatrix=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bool=v=>v===true;

  function clearLegacyVersionAlert(render=false){
    let changed=false;
    try{
      const raw=JSON.parse(localStorage.getItem('aegis_local_notifications')||'[]');
      const clean=raw.filter(n=>n?.type!=='backend-version'&&!/backend update required|backend version mismatch/i.test(String(n?.title||'')));
      if(clean.length!==raw.length){localStorage.setItem('aegis_local_notifications',JSON.stringify(clean));changed=true;}
    }catch{}
    try{
      if(typeof notifications!=='undefined'){
        const clean=notifications.filter(n=>n?.type!=='backend-version'&&!/backend update required|backend version mismatch/i.test(String(n?.title||'')));
        if(clean.length!==notifications.length){notifications=clean;persistLocalNotifications?.();changed=true;}
      }
    }catch{}
    const pa=document.getElementById('persistentAlert');
    if(pa&&/backend update required|backend version mismatch/i.test(pa.textContent||'')){pa.classList.add('hidden');pa.innerHTML='';changed=true;}
    if(render&&changed){try{renderNotifications?.();}catch{}}
  }

  function canonicalCapabilities(cap,auth){
    const f=cap?.features||{};
    return {
      'auth.google':bool(auth?.configured)&&bool(auth?.allowlist_configured)&&bool(auth?.enforcement_required),
      'ai.query':bool(f.ai_query_v1),
      'calendar.read':bool(f.calendar_ai_v2)||bool(f.natural_language_calendar),
      'calendar.write':bool(f.calendar_ai_v2),
      'calendar.aq2':bool(f.calendar_ai_v2),
      'horizon.generate':bool(f.horizon_generation),
      'horizon.validate':bool(f.horizon_validation),
      'tasks.write':bool(f.task_completion),
      'notifications':bool(f.notifications),
      'finance.read':bool(f.recent_finance_72h),
      'intelligence.read':bool(f.intelligence_v24),
      'reverse_geocode':bool(f.reverse_geocode)
    };
  }

  function routeTelemetry(){try{return JSON.parse(sessionStorage.getItem(ROUTE_KEY)||'null')}catch{return null}}

  function ensurePanel(){
    const system=document.getElementById('system');
    if(!system)return null;
    let panel=document.getElementById('compatibilityPanel');
    if(panel)return panel;
    panel=document.createElement('section');panel.className='panel mt';panel.id='compatibilityPanel';
    const notificationPanel=[...system.querySelectorAll('.panel')].find(x=>/NOTIFICATION CENTER/i.test(x.textContent||''));
    system.insertBefore(panel,notificationPanel||system.children[1]||null);
    return panel;
  }

  function renderPanel(matrix){
    const panel=ensurePanel();if(!panel||!matrix)return;
    const route=routeTelemetry();
    const missing=REQUIRED.filter(k=>!matrix.capabilities[k]);
    const badges=Object.entries(matrix.capabilities).map(([k,v])=>`<span class="compat-cap ${v?'ok':'bad'}">${v?'✓':'✕'} ${esc(k)}</span>`).join('');
    const routeText=route?`${esc(route.domain||'calendar')} • ${esc(route.operation||'—')} • ${esc(route.parser_source||'UNKNOWN')}${route.model_used?` • ${esc(route.model_used)}`:' • no model call'}${route.confirmed?' • confirmed':''}`:'No Calendar routing telemetry recorded yet.';
    panel.innerHTML=`<div class="panel-head"><div><h2>COMPATIBILITY & MODEL ROUTING</h2><p class="muted">Capability-based compatibility. Runtime checks are bounded.</p></div><span class="source-badge">${missing.length?'DEGRADED':'COMPATIBLE'}</span></div><div class="compat-summary"><div><small>FRONTEND</small><strong>${esc(FRONTEND_VERSION)}</strong></div><div><small>BACKEND</small><strong>${esc(matrix.backend_version||'unknown')}</strong></div><div><small>AUTH</small><strong>${esc(matrix.auth_version||'AUTH-1')}</strong></div><div><small>REQUIRED CAPS</small><strong>${missing.length?esc(missing.length+' missing'):'All present'}</strong></div></div><div class="compat-caps">${badges}</div><div class="compat-routing"><h3>Model Routing</h3><div><b>Last Calendar route:</b> ${routeText}</div></div>`;
  }

  function normalizeDiagnostics(){
    const d=document.getElementById('diag');if(!d)return;
    const html=d.innerHTML;
    const next=html.replace(/Frontend build:\s*(?:<[^>]+>)*[^<\n]*(?:<\/[^>]+>)?/i,`Frontend build: <strong>${FRONTEND_VERSION}</strong>`);
    if(next!==html)d.innerHTML=next;
  }

  async function capabilityCheck(){
    clearLegacyVersionAlert(false);
    try{
      const cap=await AEGIS.Core.fetchJson(window.WEBHOOK+'?action=capabilities&ts='+Date.now(),{cache:'no-store'},8000);
      const auth={configured:true,allowlist_configured:true,enforcement_required:true,auth_version:'AUTH-1',backend_version:cap?.backend_version};
      capabilities=cap;
      const canonical=canonicalCapabilities(cap,auth),missing=REQUIRED.filter(k=>!canonical[k]);
      lastMatrix={backend_version:String(cap?.backend_version||''),auth_version:'AUTH-1',capabilities:canonical,missing};
      AEGIS.Core.setState('backend',missing.length?'partial':'ready',`v${lastMatrix.backend_version||'?'} • ${missing.length?missing.length+' required capabilities missing':'capabilities compatible'}`);
      if(missing.length)localNotification?.('AEGIS required capability missing',`Missing: ${missing.join(', ')}.`,'warning','backend-capability');
      renderPanel(lastMatrix);
    }catch(err){
      AEGIS.Core.setState('backend','failed',err.message);
    }
    try{renderHealth?.();}catch{}
    normalizeDiagnostics();
    clearLegacyVersionAlert(true);
  }

  window.checkCapabilities=capabilityCheck;

  if(!document.getElementById('compat264Styles')){
    const style=document.createElement('style');style.id='compat264Styles';
    style.textContent='.compat-summary{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin:12px 0}.compat-summary>div{padding:10px;border:1px solid rgba(93,169,194,.24);border-radius:8px;background:#091923}.compat-summary small{display:block;color:#7f9cab;font-size:.72rem}.compat-summary strong{display:block;margin-top:4px;color:#e7f1f5}.compat-caps{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.compat-cap{padding:5px 8px;border-radius:999px;border:1px solid rgba(127,159,198,.22);font-size:.76rem}.compat-cap.ok{color:#9dddc6}.compat-cap.bad{color:#ffaaa8}.compat-routing{margin-top:14px;padding-top:12px;border-top:1px solid rgba(93,169,194,.2)}@media(max-width:800px){.compat-summary{grid-template-columns:repeat(2,1fr)}}';
    document.head.appendChild(style);
  }

  clearLegacyVersionAlert(true);
  normalizeDiagnostics();
  setTimeout(capabilityCheck,250);
  setTimeout(()=>{clearLegacyVersionAlert(true);normalizeDiagnostics();},2500);
  window.addEventListener('aegis-calendar-routing',()=>{if(lastMatrix)renderPanel(lastMatrix)});
})();
