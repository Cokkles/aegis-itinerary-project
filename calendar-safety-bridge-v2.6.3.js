// AEGIS 2.6.3 — unified Calendar safety bridge
// Retires legacy resolve_calendar_event -> create_calendar_event behavior from the Schedule panel.
// All natural-language Calendar mutations now use calendar_ai -> preview -> calendar_confirm.
(function(){
  if(!window.AEGIS?.Core) return;

  let pending=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{if(!v)return'—';try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return String(v)}};

  function previewBox(){return document.getElementById('eventPreview')}
  function input(){return document.getElementById('eventInput')}

  function proposalRows(result){
    const p=result?.proposal||{},op=String(p.operation||result?.operation||'').toUpperCase();
    const target=p.target||{},ev=p.event||{},ch=p.changes||{};
    let rows='';
    if(op==='CREATE') rows=`<div><b>Title</b><span>${esc(ev.title||'Untitled event')}</span></div><div><b>When</b><span>${esc(fmt(ev.start))}${ev.end?' → '+esc(fmt(ev.end)):''}</span></div>`;
    else if(op==='UPDATE') rows=`<div><b>Event</b><span>${esc(target.title||'Matched Calendar event')}</span></div><div><b>Current</b><span>${esc(fmt(target.start))}${target.end?' → '+esc(fmt(target.end)):''}</span></div>${ch.start||ch.end?`<div><b>New time</b><span>${esc(fmt(ch.start||target.start))}${ch.end||target.end?' → '+esc(fmt(ch.end||target.end)):''}</span></div>`:''}${ch.title?`<div><b>New title</b><span>${esc(ch.title)}</span></div>`:''}`;
    else if(op==='DELETE') rows=`<div><b>Delete</b><span>${esc(target.title||'Matched Calendar event')}</span></div><div><b>When</b><span>${esc(fmt(target.start))}</span></div>`;
    return {op,rows};
  }

  function renderProposal(result){
    const box=previewBox();if(!box)return;
    const {op,rows}=proposalRows(result);
    pending={token:result.confirmation_token,expires_at:result.expires_at,operation:op};
    box.classList.remove('muted');
    box.innerHTML=`<div class="calendar-safe-preview"><div class="calendar-safe-head"><strong>${esc(op)} CALENDAR CHANGE</strong><span>${result.parser_source?esc(result.parser_source):'AQ-2'}${result.model_used?' • '+esc(result.model_used):' • no model call'}</span></div><p>${esc(result.answer||'Review this Calendar change before it is applied.')}</p><div class="calendar-safe-grid">${rows}</div><div class="inline-actions left"><button class="mini" id="legacyCalendarCancel">Cancel</button><button class="mini primary" id="legacyCalendarConfirm">Confirm ${esc(op.toLowerCase())}</button></div></div>`;
    document.getElementById('legacyCalendarCancel')?.addEventListener('click',()=>{pending=null;box.classList.add('muted');box.textContent='Calendar change cancelled. Nothing was written.';});
    document.getElementById('legacyCalendarConfirm')?.addEventListener('click',confirm);
  }

  async function resolve(){
    const q=String(input()?.value||'').trim(),box=previewBox(),btn=document.getElementById('resolveEvent');
    if(!q||!box||!btn)return;
    pending=null;btn.disabled=true;btn.textContent='Resolving…';box.classList.add('muted');box.textContent='Resolving through the AQ-2 Calendar safety contract…';
    try{
      const r=await AEGIS.Core.fetchJson(window.WEBHOOK,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'calendar_ai',question:q,history:[]})},60000);
      if(r?.status!=='success')throw new Error(r?.error||'Calendar resolution failed.');
      if(r.confirmation_required&&r.confirmation_token){renderProposal(r);}
      else{box.classList.remove('muted');box.innerHTML=`<div class="calendar-safe-preview"><div class="calendar-safe-head"><strong>${esc(r.operation||'CALENDAR')}</strong><span>${r.parser_source?esc(r.parser_source):'AQ-2'}</span></div><p>${esc(r.answer||'No Calendar mutation was proposed.')}</p></div>`;}
    }catch(err){box.classList.remove('muted');box.innerHTML=`<div class="calendar-safe-error"><strong>Calendar request failed</strong><div>${esc(err?.message||err)}</div></div>`;}
    finally{btn.disabled=false;btn.textContent='Preview Calendar Change';}
  }

  async function confirm(){
    if(!pending?.token)return;
    const box=previewBox(),btn=document.getElementById('legacyCalendarConfirm');
    if(btn){btn.disabled=true;btn.textContent='Applying…';}
    const token=pending.token;pending=null;
    try{
      const r=await AEGIS.Core.fetchJson(window.WEBHOOK,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'calendar_confirm',confirmation_token:token})},30000);
      if(r?.status!=='success')throw new Error(r?.error||'Calendar confirmation failed.');
      if(box){box.classList.remove('muted');box.innerHTML=`<div class="calendar-safe-success"><strong>${esc(r.answer||'Calendar updated.')}</strong>${r.event?.title?`<div>${esc(r.event.title)}${r.event.start?' • '+esc(fmt(r.event.start)):''}</div>`:''}</div>`;}
      try{window.toast?.('Calendar updated');window.loadDashboard&&setTimeout(()=>window.loadDashboard(true),500);}catch{}
    }catch(err){if(box){box.classList.remove('muted');box.innerHTML=`<div class="calendar-safe-error"><strong>Calendar change failed</strong><div>${esc(err?.message||err)}</div></div>`;}}
  }

  function install(){
    const old=document.getElementById('resolveEvent'),box=previewBox();if(!old||!box)return;
    old.textContent='Preview Calendar Change';
    const panel=old.closest('.panel');
    const h2=panel?.querySelector('.panel-head h2');if(h2)h2.textContent='CALENDAR QUICK COMMAND';
    const badge=panel?.querySelector('.source-badge');if(badge)badge.textContent='AQ-2 preview + confirmation';
    const ta=input();if(ta)ta.placeholder='Example: Move dentist tomorrow from 2:30 PM to 4 PM';
    box.textContent='AEGIS will classify the request as READ / CREATE / UPDATE / DELETE and preview every mutation before writing.';
    if(!document.getElementById('calendarSafetyBridgeStyles')){
      const s=document.createElement('style');s.id='calendarSafetyBridgeStyles';s.textContent='.calendar-safe-preview{padding:4px}.calendar-safe-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:9px}.calendar-safe-head span{font-size:.78rem;color:#8eb2c3}.calendar-safe-grid{display:grid;gap:7px;margin:10px 0 12px}.calendar-safe-grid>div{display:grid;grid-template-columns:90px 1fr;gap:10px}.calendar-safe-grid b{color:#7fa9bb}.calendar-safe-success{color:#b7eed8}.calendar-safe-error{color:#ffaaaa}';document.head.appendChild(s);
    }
    document.addEventListener('click',ev=>{if(!ev.target?.closest?.('#resolveEvent'))return;ev.preventDefault();ev.stopImmediatePropagation();resolve();},true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
