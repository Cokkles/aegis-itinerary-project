// AEGIS FRONTEND RELEASE: 2.6.2
// Matching Apps Script backend: 2.6.2 / AQ-2.1
// Calendar contract: AEGIS_CALENDAR_ACTION_V2
// AEGIS AQ-2 — conversational Calendar read/write with preview + confirmation.
(function(){
  if(!window.AEGIS?.Core) return;

  const MODES=['general','career','finance','logistics','calendar','system'];
  const historyKey=mode=>'aegis_ai_history_v1_'+mode;
  const proposalKey='aegis_calendar_pending_v2';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loadHistory=mode=>{try{return JSON.parse(sessionStorage.getItem(historyKey(mode))||'[]')}catch{return[]}};
  const saveHistory=(mode,h)=>{try{sessionStorage.setItem(historyKey(mode),JSON.stringify(h.slice(-8)))}catch{}};
  const currentMode=()=>document.querySelector('[data-ai-mode].active')?.dataset.aiMode||'general';
  const loadProposal=()=>{try{return JSON.parse(sessionStorage.getItem(proposalKey)||'null')}catch{return null}};
  const saveProposal=p=>{try{p?sessionStorage.setItem(proposalKey,JSON.stringify(p)):sessionStorage.removeItem(proposalKey)}catch{}};

  function md(text){
    const blocks=[]; let s=esc(String(text??'').replace(/\r\n?/g,'\n'));
    s=s.replace(/```([^\n`]*)\n([\s\S]*?)```/g,(_,lang,code)=>{const i=blocks.length;blocks.push(`<pre class="ai-md-code"><code>${code}</code></pre>`);return `@@C${i}@@`;});
    s=s.replace(/^###\s+(.+)$/gm,'<h4>$1</h4>').replace(/^##\s+(.+)$/gm,'<h3>$1</h3>').replace(/^#\s+(.+)$/gm,'<h2>$1</h2>')
      .replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`\n]+)`/g,'<code class="ai-md-inline">$1</code>')
      .replace(/^\s*[-*]\s+(.+)$/gm,'<li>$1</li>').replace(/^\s*\d+[.)]\s+(.+)$/gm,'<li>$1</li>');
    s=s.replace(/(?:<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`).split(/\n{2,}/).map(b=>{const t=b.trim();if(!t)return'';if(/^<(h[234]|ul|pre)/.test(t)||/^@@C\d+@@$/.test(t))return t;return `<p>${t.replace(/\n/g,'<br>')}</p>`;}).join('');
    return s.replace(/@@C(\d+)@@/g,(_,i)=>blocks[Number(i)]||'');
  }

  function modeNote(mode){return ({
    general:'Calendar, Tasks, active notes, bounded SPARK state, and KINETIC display context.',
    career:'Career/technical mentoring using active notes, Tasks/Calendar, and bounded SPARK context.',
    finance:'SENTINEL-FIN bounded financial summary only.',
    logistics:'Calendar, Tasks, and recent Gmail metadata.',
    calendar:'Conversational Google Calendar. Reads are immediate; create/update/delete always require preview and confirmation.',
    system:'AEGIS/GEMINI-POS capability and health telemetry only.'
  })[mode]||'';}

  function fmtDate(v){if(!v)return'—';try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return String(v)}}
  function proposalHtml(p){
    if(!p?.proposal) return '';
    const q=p.proposal, op=q.operation;
    const target=q.target||{}, ev=q.event||{}, ch=q.changes||{};
    let rows='';
    if(op==='CREATE') rows=`<div><b>Title</b><span>${esc(ev.title)}</span></div><div><b>When</b><span>${esc(ev.all_day?'All day '+fmtDate(ev.start):fmtDate(ev.start)+' → '+fmtDate(ev.end))}</span></div>${ev.location?`<div><b>Location</b><span>${esc(ev.location)}</span></div>`:''}`;
    if(op==='DELETE') rows=`<div><b>Delete</b><span>${esc(target.title)}</span></div><div><b>When</b><span>${esc(fmtDate(target.start))}</span></div>`;
    if(op==='UPDATE') rows=`<div><b>Event</b><span>${esc(target.title)}</span></div>${ch.title?`<div><b>New title</b><span>${esc(ch.title)}</span></div>`:''}${(ch.start||ch.end)?`<div><b>New time</b><span>${esc(fmtDate(ch.start||target.start)+' → '+fmtDate(ch.end||target.end))}</span></div>`:''}${ch.location!==null&&ch.location!==undefined?`<div><b>Location</b><span>${esc(ch.location||'(clear)')}</span></div>`:''}`;
    return `<div class="calendar-proposal"><div class="calendar-proposal-head"><strong>${esc(op)} CALENDAR CHANGE</strong><span>Expires ${esc(fmtDate(p.expires_at))}</span></div><div class="calendar-proposal-grid">${rows}</div><div class="inline-actions"><button class="mini" id="calendarCancelProposal">Cancel</button><button class="mini primary" id="calendarConfirmProposal">Confirm ${esc(op.toLowerCase())}</button></div></div>`;
  }

  function render(){
    const mode=currentMode(), box=document.getElementById('aiThread'); if(!box)return;
    const h=loadHistory(mode);
    const note=document.getElementById('aiContextNote'); if(note)note.textContent=modeNote(mode);
    box.innerHTML=(h.length?h.map(x=>`<div class="ai-message ${x.role==='user'?'user':'assistant'}"><div class="ai-message-role">${x.role==='user'?'YOU':'AEGIS'}</div><div class="ai-message-body">${x.role==='user'?esc(x.text).replace(/\n/g,'<br>'):md(x.text)}</div></div>`).join(''):`<div class="ai-empty"><strong>Ask AEGIS</strong><span>${esc(modeNote(mode))}</span></div>`)+(mode==='calendar'?proposalHtml(loadProposal()):'');
    box.scrollTop=box.scrollHeight;
    document.getElementById('calendarConfirmProposal')?.addEventListener('click',confirmProposal);
    document.getElementById('calendarCancelProposal')?.addEventListener('click',()=>{saveProposal(null);render();window.toast?.('Calendar change cancelled');});
  }

  async function send(){
    const input=document.getElementById('aiQuestion'), btn=document.getElementById('aiSend'); if(!input||!btn)return;
    const q=String(input.value||'').trim(); if(!q)return;
    const mode=currentMode(), hist=loadHistory(mode), pending=[...hist,{role:'user',text:q}].slice(-8);
    saveHistory(mode,pending); input.value=''; render(); btn.disabled=true;btn.textContent='Thinking…';
    try{
      const payload=mode==='calendar'?{action:'calendar_ai',question:q,history:hist}:{action:'ai_query',mode,question:q,history:hist};
      const r=await AEGIS.Core.fetchJson(window.WEBHOOK,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)},60000);
      if(r?.status!=='success') throw new Error(r?.error||'AEGIS query failed.');
      saveHistory(mode,[...pending,{role:'assistant',text:String(r.answer||'Done.')}].slice(-8));
      if(mode==='calendar'&&r.confirmation_required&&r.confirmation_token) saveProposal({confirmation_token:r.confirmation_token,expires_at:r.expires_at,proposal:r.proposal});
      if(currentMode()===mode) render();
    }catch(err){saveHistory(mode,[...pending,{role:'assistant',text:'Query failed: '+(err.message||String(err))}].slice(-8));if(currentMode()===mode)render();}
    finally{btn.disabled=false;btn.textContent='Ask AEGIS';input.focus();}
  }

  async function confirmProposal(){
    const p=loadProposal(); if(!p)return;
    const btn=document.getElementById('calendarConfirmProposal'); if(btn){btn.disabled=true;btn.textContent='Applying…';}
    try{
      const r=await AEGIS.Core.fetchJson(window.WEBHOOK,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'calendar_confirm',confirmation_token:p.confirmation_token})},30000);
      if(r?.status!=='success')throw new Error(r?.error||'Calendar confirmation failed.');
      const h=loadHistory('calendar');
      const ev=r.event||{};
      const summary=`${r.answer||'Calendar change applied.'}${ev.title?`\n\n**${ev.title}**${ev.start?`\n${fmtDate(ev.start)}${ev.end?' → '+fmtDate(ev.end):''}`:''}`:''}`;
      saveHistory('calendar',[...h,{role:'assistant',text:summary}].slice(-8)); saveProposal(null); render(); window.toast?.('Calendar updated');
    }catch(err){const h=loadHistory('calendar');saveHistory('calendar',[...h,{role:'assistant',text:'Calendar change failed: '+(err.message||String(err))}].slice(-8));saveProposal(null);render();}
  }

  function install(){
    const row=document.getElementById('aiModeRow'); if(!row)return;
    if(!row.querySelector('[data-ai-mode="calendar"]')){
      const b=document.createElement('button'); b.className='mini ai-mode'; b.dataset.aiMode='calendar'; b.textContent='CALENDAR';
      const sys=row.querySelector('[data-ai-mode="system"]'); row.insertBefore(b,sys||null);
    }
    document.querySelectorAll('[data-ai-mode]').forEach(old=>{const b=old.cloneNode(true);old.replaceWith(b);b.addEventListener('click',()=>{const m=b.dataset.aiMode;if(!MODES.includes(m))return;document.querySelectorAll('[data-ai-mode]').forEach(x=>x.classList.toggle('active',x.dataset.aiMode===m));render();});});
    const oldSend=document.getElementById('aiSend'); if(oldSend){const b=oldSend.cloneNode(true);oldSend.replaceWith(b);b.addEventListener('click',send);}
    const oldInput=document.getElementById('aiQuestion'); if(oldInput){const i=oldInput.cloneNode(true);oldInput.replaceWith(i);i.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});}
    const oldClear=document.getElementById('aiClear'); if(oldClear){const b=oldClear.cloneNode(true);oldClear.replaceWith(b);b.addEventListener('click',()=>{try{sessionStorage.removeItem(historyKey(currentMode()));if(currentMode()==='calendar')saveProposal(null)}catch{}render();});}
    const style=document.createElement('style');style.textContent='.calendar-proposal{margin:12px 0 4px;padding:14px;border:1px solid rgba(82,176,194,.35);border-radius:10px;background:#071822}.calendar-proposal-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;color:#d8edf2}.calendar-proposal-head span{color:#7f9cab;font-size:.78rem}.calendar-proposal-grid{display:grid;gap:7px;margin-bottom:12px}.calendar-proposal-grid>div{display:grid;grid-template-columns:90px 1fr;gap:10px}.calendar-proposal-grid b{color:#7fa9bb}.calendar-proposal-grid span{color:#dce9ef}';document.head.appendChild(style);
    render();
  }
  install();
})();
