// AEGIS 2.6 UI/UX compatibility overrides.
(function(){
  if(!window.AEGIS) return;

  const UI_VERSION='2.6.0';
  const MARK='aegis-mark-v3.svg?v=2.6.0';

  function e(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function applyIdentity(){
    document.querySelectorAll('.brand-icon').forEach(img=>{img.src=MARK;img.alt='AEGIS';});
    let icon=document.querySelector('link[rel="icon"]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon);}
    icon.type='image/svg+xml';
    icon.href=MARK;
    const version=document.querySelector('.nav-version');
    if(version)version.textContent='AEGIS v2.6 • AUTH-1';
    document.documentElement.dataset.aegisUi='2.6';
  }

  window.renderHealth=function(){
    const states=AEGIS.Core.getStates();
    const names=['backend','dashboard','calendar','tasks','finance','weather','intelligence','notifications','quotes'];
    const grid=document.getElementById('healthGrid');
    if(grid) grid.innerHTML=names.map(n=>{const s=states[n]||{status:'unknown',detail:''};return `<div class="health-card"><strong>${e(n.toUpperCase())}</strong><span class="health-label">Status</span><span class="health-value status-${e(s.status)}">${e(String(s.status||'unknown').toUpperCase())}</span><div class="health-detail"><b>Detail:</b> ${e(s.detail||s.updatedAt||'Not checked')}</div></div>`}).join('');
    const severe=Object.values(states).some(s=>s.status==='failed'), degraded=Object.values(states).some(s=>['partial','cached'].includes(s.status));
    const btn=document.getElementById('systemState');
    if(btn){btn.textContent=severe?'● DEGRADED':degraded?'● PARTIAL':'● ONLINE';btn.style.color=severe?'var(--bad)':degraded?'var(--warn)':'var(--ok)';}
  };

  const oldRenderIntel=window.renderIntel;
  window.renderIntel=function(cached=false){
    if(oldRenderIntel) oldRenderIntel(cached);
    let health=[];
    try{if(typeof intel!=='undefined'&&Array.isArray(intel.source_health))health=intel.source_health;}catch{}
    const box=document.getElementById('intelSourceHealth');
    if(box&&health.length){box.innerHTML=health.map(h=>{const st=String(h.status||'unknown').toLowerCase();const detail=h.error||h.reason||'';return `<div class="health-card"><strong>${e(h.source)}</strong><span class="health-label">Status</span><span class="health-value status-${e(st)}">${e(st.toUpperCase())}</span><span class="health-label">HTTP</span><span class="health-value">${e(String(h.http??'—'))}</span><span class="health-label">Items</span><span class="health-value">${e(String(h.items||0))}</span>${h.attempts?`<span class="health-label">Attempts</span><span class="health-value">${e(String(h.attempts))}</span>`:''}${detail?`<div class="health-detail"><b>Reason:</b> ${e(detail)}</div>`:''}</div>`}).join('');}
  };

  function horizonActionRows(){
    const section=doc?.byKey?.tasks;
    if(!section)return[];
    const priority=section.subsections?.find(z=>/action priorit/i.test(z.title));
    const lines=priority?priority.lines:section.lines;
    return (lines||[])
      .map(x=>String(x||'').trim())
      .filter(x=>/^([-*]|\d+[.)])\s+/.test(x))
      .map(x=>x.replace(/^[-*]\s+\[[ xX]\]\s*/,'').replace(/^[-*]\s+/,'').replace(/^\d+[.)]\s+/,'').trim())
      .filter(Boolean)
      .map(text=>{
        const plain=strip(text.replace(/\*\*/g,''));
        const normalized=plain.toLowerCase().replace(/\s+/g,' ').trim();
        const heading=/^(active tasks|priority tasks|tasks|active grocery list|grocery list|shopping list|active shopping list):?$/.test(normalized);
        return {kind:heading?'heading':'action',text,plain};
      });
  }

  window.renderHorizonTasks=function(){
    const rows=horizonActionRows(), archived=localStore('horizonTasks'), show=document.getElementById('showHorizonTasks')?.checked;
    const box=document.getElementById('horizonTasks');
    if(!box)return;
    if(!rows.length){box.innerHTML='<span class="muted">No HORIZON-generated actions.</span>';return;}
    box.innerHTML=rows.map(row=>{
      if(row.kind==='heading')return `<div class="horizon-task-group">${inline(row.text)}</div>`;
      const key=row.plain.toLowerCase(),done=archived.has(key);
      return `<label class="item horizon-action ${done?'done':''}" style="${done&&!show?'display:none':''}"><input class="check" type="checkbox" ${done?'checked':''} onchange='toggleLocal("horizonTasks",${JSON.stringify(row.plain)},this.checked)'><span class="item-title">${inline(row.text)}</span></label>`;
    }).join('');
  };

  window.checkCapabilities=async function(){
    try{
      capabilities=await AEGIS.Core.fetchJson(WEBHOOK+'?action=capabilities&ts='+Date.now(),{cache:'no-store'},8000);
      const backend=String(capabilities?.backend_version||'');
      if(!/^2\.6\./.test(backend))localNotification('AEGIS backend version mismatch',`Frontend ${UI_VERSION} expects Apps Script 2.6.x but reports ${backend||'unknown'}.`,'warning','backend-version');
      AEGIS.Core.setState('backend','ready','v'+(backend||'?'));
    }catch(err){
      AEGIS.Core.setState('backend','failed',err.message);
      localNotification('AEGIS backend unavailable','Could not verify the Apps Script backend. Core cached data may still be shown.','critical','backend',err.message);
    }
    renderHealth();
  };

  applyIdentity();
  setTimeout(()=>{try{renderHorizonTasks();}catch{}},0);
})();
