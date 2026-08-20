// AEGIS v2.4.1 runtime polish overrides.
(function(){
  if(!window.AEGIS) return;
  function e(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
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
    const health=(window.intel&&intel.source_health)||[];
    const box=document.getElementById('intelSourceHealth');
    if(box&&health.length){box.innerHTML=health.map(h=>{const st=String(h.status||'unknown').toLowerCase();const detail=h.error||h.reason||'';return `<div class="health-card"><strong>${e(h.source)}</strong><span class="health-label">Status</span><span class="health-value status-${e(st)}">${e(st.toUpperCase())}</span><span class="health-label">HTTP</span><span class="health-value">${e(String(h.http??'—'))}</span><span class="health-label">Items</span><span class="health-value">${e(String(h.items||0))}</span>${h.attempts?`<span class="health-label">Attempts</span><span class="health-value">${e(String(h.attempts))}</span>`:''}${detail?`<div class="health-detail"><b>Reason:</b> ${e(detail)}</div>`:''}</div>`}).join('');}
  };
})();
