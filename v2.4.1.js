// AEGIS 2.6 UI/UX compatibility overrides.
(function(){
  if(!window.AEGIS) return;

  const UI_VERSION='2.6.1';
  const MARK='aegis-mark-v3.svg?v=2.6.0';
  const AI_MODES=['general','career','finance','logistics','system'];
  let aiMode='general';

  function e(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function applyIdentity(){
    document.querySelectorAll('.brand-icon,.aegis-auth-mark').forEach(img=>{img.src=MARK;img.alt='AEGIS';});
    let icon=document.querySelector('link[rel="icon"]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon);}
    icon.type='image/svg+xml';
    icon.href=MARK;
    const version=document.querySelector('.nav-version');
    if(version)version.textContent='AEGIS v2.6.1 • AUTH-1';
    document.documentElement.dataset.aegisUi='2.6.1';
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

  function aiHistoryKey(mode){return 'aegis_ai_history_v1_'+mode;}
  function loadAiHistory(mode){try{return JSON.parse(sessionStorage.getItem(aiHistoryKey(mode))||'[]')}catch{return[]}}
  function saveAiHistory(mode,history){try{sessionStorage.setItem(aiHistoryKey(mode),JSON.stringify(history.slice(-8)))}catch{}}

  function installAiQueryView(){
    if(document.getElementById('aiQuery'))return;
    const navGroups=document.querySelectorAll('.nav-group');
    const tools=[...navGroups].find(g=>g.querySelector('small')?.textContent.trim()==='TOOLS');
    if(tools){
      const btn=document.createElement('button');
      btn.className='nav-item';btn.dataset.view='aiQuery';btn.innerHTML='◇ <span>Ask AEGIS</span>';
      btn.addEventListener('click',()=>setView('aiQuery'));
      tools.insertBefore(btn,tools.firstElementChild?.nextSibling||null);
    }
    const shell=document.querySelector('main.shell');
    if(!shell)return;
    const section=document.createElement('section');
    section.className='view';section.id='aiQuery';
    section.innerHTML=`<section class="panel ai-query-panel"><div class="panel-head"><div><h2>ASK AEGIS</h2><p class="muted">Authenticated GEMINI-POS query gateway • read-only in AQ-1</p></div><span class="source-badge">SESSION MEMORY ONLY</span></div><div class="ai-mode-row" id="aiModeRow">${AI_MODES.map(m=>`<button class="mini ai-mode ${m==='general'?'active':''}" data-ai-mode="${m}">${m.toUpperCase()}</button>`).join('')}</div><div class="ai-context-note" id="aiContextNote"></div><div class="ai-thread" id="aiThread"></div><div class="ai-compose"><textarea id="aiQuestion" placeholder="Ask AEGIS something… Shift+Enter for a new line."></textarea><div class="inline-actions"><button class="mini" id="aiClear">Clear Session</button><button class="mini primary" id="aiSend">Ask AEGIS</button></div></div></section>`;
    shell.appendChild(section);
    document.querySelectorAll('[data-ai-mode]').forEach(btn=>btn.addEventListener('click',()=>switchAiMode(btn.dataset.aiMode)));
    document.getElementById('aiSend')?.addEventListener('click',sendAiQuery);
    document.getElementById('aiClear')?.addEventListener('click',clearAiHistory);
    document.getElementById('aiQuestion')?.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();sendAiQuery();}});
    renderAiThread();
  }

  function aiModeDescription(mode){
    const map={
      general:'Calendar, Tasks, active notes, bounded SPARK state, and KINETIC display context.',
      career:'Career/technical mentoring using active notes, current Tasks/Calendar, and bounded SPARK context. No invented career history.',
      finance:'SENTINEL-FIN bounded financial summary only. No PRISM internals and no transactions.',
      logistics:'Calendar, Tasks, and 7-day Gmail metadata. Email bodies are not supplied.',
      system:'AEGIS/GEMINI-POS capability and health telemetry only.'
    };
    return map[mode]||map.general;
  }

  function switchAiMode(mode){
    if(!AI_MODES.includes(mode))return;
    aiMode=mode;
    document.querySelectorAll('[data-ai-mode]').forEach(b=>b.classList.toggle('active',b.dataset.aiMode===mode));
    renderAiThread();
  }

  function renderAiThread(){
    const box=document.getElementById('aiThread');if(!box)return;
    const history=loadAiHistory(aiMode);
    const note=document.getElementById('aiContextNote');if(note)note.textContent=aiModeDescription(aiMode);
    box.innerHTML=history.length?history.map(item=>`<div class="ai-message ${item.role==='user'?'user':'assistant'}"><div class="ai-message-role">${item.role==='user'?'YOU':'AEGIS'}</div><div>${e(item.text).replace(/\n/g,'<br>')}</div></div>`).join(''):`<div class="ai-empty"><img src="${MARK}" alt=""><strong>Ask AEGIS</strong><span>${e(aiModeDescription(aiMode))}</span></div>`;
    box.scrollTop=box.scrollHeight;
  }

  async function sendAiQuery(){
    const input=document.getElementById('aiQuestion'),button=document.getElementById('aiSend');
    const question=String(input?.value||'').trim();if(!question||!button)return;
    const history=loadAiHistory(aiMode);
    const pending=[...history,{role:'user',text:question}].slice(-8);
    saveAiHistory(aiMode,pending);input.value='';renderAiThread();
    button.disabled=true;button.textContent='Thinking…';
    try{
      const result=await AEGIS.Core.fetchJson(WEBHOOK,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'ai_query',mode:aiMode,question,history})},60000);
      if(result?.status!=='success'||!result.answer)throw new Error(result?.error||'AEGIS AI query failed.');
      const updated=[...pending,{role:'assistant',text:String(result.answer)}].slice(-8);
      saveAiHistory(aiMode,updated);renderAiThread();
      const sources=(result.context_sources||[]).filter(x=>x.status==='AVAILABLE').map(x=>x.source).join(', ');
      if(sources)toast('AEGIS context: '+sources);
    }catch(err){
      const failed=[...pending,{role:'assistant',text:'Query failed: '+(err.message||String(err))}].slice(-8);
      saveAiHistory(aiMode,failed);renderAiThread();
      localNotification('AEGIS AI query failed',err.message||String(err),'warning','ai-query');
    }finally{button.disabled=false;button.textContent='Ask AEGIS';input?.focus();}
  }

  function clearAiHistory(){
    try{sessionStorage.removeItem(aiHistoryKey(aiMode))}catch{}
    renderAiThread();toast('AQ-1 session cleared');
  }

  applyIdentity();
  installAiQueryView();
  setTimeout(()=>{try{renderHorizonTasks();}catch{}},0);
})();
