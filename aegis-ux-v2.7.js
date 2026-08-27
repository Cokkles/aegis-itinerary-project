// AEGIS UX 2.7 — human-facing dashboard interaction layer
// Depends only on the authenticated AEGIS backend contracts; does not alter auth/GPOS/finance schemas.
(()=>{
'use strict';
if(window.__AEGIS_UX_27__) return;
window.__AEGIS_UX_27__=true;

const RELEASE='2.7.0';
const TOKEN_KEY='aegis_auth_token';
const LOCAL_TASKS_KEY='aegis_local_task_drafts_v1';
const LOCAL_FOLLOWUPS_KEY='aegis_followups_cache_v1';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=()=>{try{return sessionStorage.getItem(TOKEN_KEY)||''}catch{return''}};
const backend=()=>window.AEGIS?.Core?.BACKEND||window.WEBHOOK||window.AEGIS_BACKEND_URL;

async function api(payload,timeout=30000){
  const url=backend(); if(!url) throw new Error('AEGIS backend unavailable.');
  const body={...payload,auth_token:token()};
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
  try{
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),cache:'no-store',signal:ctl.signal});
    const text=await r.text(); let j; try{j=JSON.parse(text)}catch{throw new Error('Invalid AEGIS backend response.');}
    if(!r.ok||j?.status==='error'||j?.error) throw new Error(j?.error||('HTTP '+r.status));
    return j;
  }finally{clearTimeout(timer)}
}
function toastMsg(s){if(typeof window.toast==='function')window.toast(s);}
function safeStoreGet(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function safeStoreSet(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function uid(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}

function relabelNavigation(){
  const labels={overview:'Home',horizon:'Briefing',schedule:'Calendar',tasksView:'Tasks',financeView:'Finances',intelligence:'News & Insights',consoleView:'Console',system:'System'};
  document.querySelectorAll('.nav-item[data-view]').forEach(btn=>{const span=btn.querySelector('span');if(span&&labels[btn.dataset.view])span.textContent=labels[btn.dataset.view];});
  const hero=document.querySelector('.hero h1'); if(hero)hero.textContent='AEGIS';
  const heroP=document.querySelector('.hero p'); if(heroP)heroP.textContent='Your briefing, calendar, tasks, follow-ups and live context in one place.';
  const sync=$('sync'); if(sync){sync.childNodes[0].textContent='↻ Sync All '; const sub=sync.querySelector('span');if(sub)sub.textContent='Refresh current data';}
  document.querySelector('[data-view-link="financeView"]')?.setAttribute('title','Open Finances');
  const version=document.querySelector('.nav-version');if(version)version.textContent='AEGIS UX '+RELEASE+' • AUTH-1';
  document.querySelectorAll('h2,h3').forEach(h=>{
    h.childNodes.forEach(n=>{if(n.nodeType!==Node.TEXT_NODE)return;n.textContent=n.textContent.replace(/SENTINEL-FIN/g,'Finances').replace(/LIVE HORIZON BRIEFING/g,'DAILY BRIEFING').replace(/LIVE INTELLIGENCE/g,'NEWS & INSIGHTS').replace(/SCHEDULE INTELLIGENCE/g,'CALENDAR');});
  });
}

function installHomeAsk(){
  const overview=$('overview'); if(!overview||$('homeAsk'))return;
  const panel=document.createElement('section'); panel.id='homeAsk'; panel.className='panel ux-ask-home';
  panel.innerHTML=`<div class="panel-head"><div><h2>ASK AEGIS</h2><p class="muted">Ask about your day, calendar, tasks, finances, notes or current briefing.</p></div><span class="source-badge">Context-aware</span></div>
  <div class="ux-ask-row"><textarea id="homeAskInput" rows="2" placeholder="What should I know today?"></textarea><button class="mini primary" id="homeAskSend">Ask</button></div>
  <div class="ux-quick-prompts"><button data-q="What should I know today?">Today's priorities</button><button data-q="What is coming up on my calendar?">What's coming up?</button><button data-q="Summarize my recent financial activity.">Recent spending</button><button data-q="What follow-ups should I revisit?">Follow-ups</button></div>
  <div id="homeAskResult" class="ux-ask-result muted">AEGIS is ready.</div>`;
  overview.insertBefore(panel,overview.firstChild);
  const send=async()=>{const q=$('homeAskInput').value.trim();if(!q)return;const b=$('homeAskSend'),out=$('homeAskResult');b.disabled=true;b.textContent='Thinking…';out.textContent='Querying current AEGIS context…';try{const j=await api({action:'ai_query',mode:'general',question:q,history:[]},45000);out.innerHTML=typeof window.renderMarkdown==='function'?window.renderMarkdown(j.answer||''):esc(j.answer||'No response.').replace(/\n/g,'<br>');}catch(e){out.textContent='Unable to query AEGIS: '+e.message;}finally{b.disabled=false;b.textContent='Ask';}};
  $('homeAskSend').onclick=send;$('homeAskInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}});
  panel.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{$('homeAskInput').value=b.dataset.q;send();});
}

function addFollowupsView(){
  const nav=$('nav');if(!nav||$('followupsView'))return;
  const tasksBtn=nav.querySelector('.nav-item[data-view="tasksView"]');
  if(tasksBtn){const btn=document.createElement('button');btn.className='nav-item';btn.dataset.view='followupsView';btn.innerHTML='✦ <span>Follow-ups</span>';tasksBtn.after(btn);btn.addEventListener('click',()=>window.setView?window.setView('followupsView'):activateView('followupsView'));}
  const main=document.querySelector('main.shell');const system=$('system');const view=document.createElement('section');view.className='view';view.id='followupsView';
  view.innerHTML=`<div class="grid"><section class="panel full"><div class="panel-head"><div><h2>FOLLOW-UPS</h2><p class="muted">Useful items surfaced from your Notes and briefing intelligence. They remain until you resolve them.</p></div><button class="mini" id="followupsSync">↻ Sync Follow-ups</button></div><div id="followupsList" class="ux-followups"><span class="muted">Loading follow-ups…</span></div></section></div>`;
  main.insertBefore(view,system||null);$('followupsSync').onclick=()=>syncFollowups(true);
}
function activateView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'});}

function normalizeFollowup(x){return {id:x.id||x.followup_id||x.suggestion_id||uid('FU'),title:x.title||'Follow-up',summary:x.summary||x.insight||'',priority:(x.priority||'MEDIUM').toUpperCase(),type:x.type||'FOLLOW_UP',status:x.status||'ACTIVE',source_excerpt:x.source_excerpt||'',promoted_task_id:x.promoted_task_id||null,promoted_event_id:x.promoted_event_id||null,created_at:x.created_at||x.generated_at||new Date().toISOString()};}
function renderFollowups(items){
  const host=$('followupsList');if(!host)return;const active=(items||[]).map(normalizeFollowup).filter(x=>!['RESOLVED','DISMISSED'].includes(x.status));
  host.innerHTML=active.length?active.map(f=>`<article class="ux-followup" data-fu="${esc(f.id)}"><div class="ux-followup-main"><div class="ux-followup-meta"><span>${esc(f.type.replaceAll('_',' '))}</span><span class="priority ${esc(f.priority.toLowerCase())}">${esc(f.priority)}</span></div><h3>${esc(f.title)}</h3><p>${esc(f.summary)}</p>${f.source_excerpt?`<details><summary>Source note</summary><p class="muted">${esc(f.source_excerpt)}</p></details>`:''}</div><div class="ux-followup-actions"><button class="mini" data-act="done">✓ Done</button><button class="mini primary" data-act="task">↑ Promote to Task</button><button class="mini" data-act="calendar">＋ Add to Calendar</button></div></article>`).join(''):'<div class="muted">No active follow-ups.</div>';
  host.querySelectorAll('[data-fu]').forEach(card=>card.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=card.dataset.fu;const f=active.find(x=>x.id===id);if(!f)return;if(b.dataset.act==='done')await resolveFollowup(f);if(b.dataset.act==='task')await promoteFollowupTask(f);if(b.dataset.act==='calendar')openFollowupCalendar(f);}));
}
async function syncFollowups(showToast=false){
  let items=safeStoreGet(LOCAL_FOLLOWUPS_KEY,[]);try{const j=await api({action:'get_followups'},15000);items=j.items||j.followups||[];safeStoreSet(LOCAL_FOLLOWUPS_KEY,items);if(showToast)toastMsg('Follow-ups synced');}catch(e){if(showToast)toastMsg('Using cached follow-ups');}renderFollowups(items);renderHomeFollowups(items);
}
function renderHomeFollowups(items){
  let host=$('homeFollowups');if(!host){const grid=$('overview')?.querySelector('.grid');if(!grid)return;const section=document.createElement('section');section.className='panel';section.innerHTML='<div class="panel-head"><h2>FOLLOW-UPS</h2><button class="mini" data-view-link="followupsView">Open Follow-ups</button></div><div id="homeFollowups"></div>';grid.prepend(section);section.querySelector('[data-view-link]').onclick=()=>activateView('followupsView');host=$('homeFollowups');}
  const active=(items||[]).map(normalizeFollowup).filter(x=>!['RESOLVED','DISMISSED'].includes(x.status)).slice(0,3);host.innerHTML=active.length?active.map(f=>`<div class="item"><span><div class="item-title">${esc(f.title)}</div><div class="item-sub">${esc(f.summary)}</div></span></div>`).join(''):'<span class="muted">No active follow-ups.</span>';
}
async function resolveFollowup(f){try{await api({action:'resolve_followup',followup_id:f.id,title:f.title});const cached=safeStoreGet(LOCAL_FOLLOWUPS_KEY,[]).map(x=>(x.id||x.followup_id||x.suggestion_id)===f.id?{...x,status:'RESOLVED'}:x);safeStoreSet(LOCAL_FOLLOWUPS_KEY,cached);renderFollowups(cached);renderHomeFollowups(cached);toastMsg('Follow-up completed');}catch(e){toastMsg('Could not complete follow-up');}}
async function promoteFollowupTask(f){try{const j=await api({action:'promote_followup_task',followup_id:f.id,title:f.title,notes:f.summary});toastMsg('Created Google Task');await syncFollowups(false);if(typeof window.loadDashboard==='function')await window.loadDashboard(true);}catch(e){toastMsg('Task promotion failed: '+e.message);}}
function openFollowupCalendar(f){activateView('schedule');const input=$('eventInput');if(input){input.value='Schedule: '+f.title+(f.summary?' — '+f.summary:'');input.focus();}toastMsg('Follow-up copied to Calendar prompt');}

function installLocalTasks(){
  const view=$('tasksView');const first=view?.querySelector('.panel');if(!first||$('localTaskComposer'))return;
  const box=document.createElement('div');box.id='localTaskComposer';box.className='ux-local-tasks';box.innerHTML=`<h3>QUICK TASKS</h3><p class="muted">Capture locally first; sync only when you want it in Google Tasks.</p><div class="ux-task-compose"><input id="localTaskInput" placeholder="Add a quick task…"><button class="mini" id="localTaskAdd">＋ Add</button></div><div id="localTaskList"></div>`;first.prepend(box);
  $('localTaskAdd').onclick=addLocalTask;$('localTaskInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addLocalTask();}});renderLocalTasks();
}
function localTasks(){return safeStoreGet(LOCAL_TASKS_KEY,[])}
function addLocalTask(){const input=$('localTaskInput'),title=input.value.trim();if(!title)return;const list=localTasks();list.unshift({id:uid('LT'),title,status:'LOCAL',created_at:new Date().toISOString()});safeStoreSet(LOCAL_TASKS_KEY,list);input.value='';renderLocalTasks();}
function renderLocalTasks(){const host=$('localTaskList');if(!host)return;const items=localTasks();host.innerHTML=items.length?items.map(t=>`<div class="ux-local-task" data-id="${esc(t.id)}"><span><b>${esc(t.title)}</b><small>${t.status==='SYNCED'?'Google Tasks ✓':'Local'}</small></span><div>${t.status==='SYNCED'?'':`<button class="mini primary" data-act="sync">Sync to Google Tasks</button>`}<button class="mini" data-act="remove">×</button></div></div>`).join(''):'<span class="muted">No local task drafts.</span>';host.querySelectorAll('[data-id]').forEach(row=>row.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=row.dataset.id,t=localTasks().find(x=>x.id===id);if(!t)return;if(b.dataset.act==='remove'){safeStoreSet(LOCAL_TASKS_KEY,localTasks().filter(x=>x.id!==id));renderLocalTasks();return;}if(b.dataset.act==='sync'){b.disabled=true;try{const j=await api({action:'create_task',title:t.title,local_id:t.id});safeStoreSet(LOCAL_TASKS_KEY,localTasks().map(x=>x.id===id?{...x,status:'SYNCED',google_task_id:j.task?.id||j.task_id||null}:x));renderLocalTasks();if(typeof window.loadDashboard==='function')await window.loadDashboard(true);toastMsg('Task synced to Google Tasks');}catch(err){toastMsg('Task sync failed: '+err.message);b.disabled=false;}}}));}

let calendarAnchor=new Date();
function installCalendarWorkspace(){
  const view=$('schedule');const panel=view?.querySelector('.panel.full');if(!panel||$('uxCalendar'))return;
  const cal=document.createElement('div');cal.id='uxCalendar';cal.className='ux-calendar';cal.innerHTML=`<div class="ux-calendar-toolbar"><button class="mini" id="calPrev">‹</button><strong id="calMonth"></strong><button class="mini" id="calNext">›</button><button class="mini" id="calToday">Today</button></div><div class="ux-calendar-grid" id="calGrid"></div><div class="ux-calendar-agenda"><h3 id="calSelectedTitle">Selected day</h3><div id="calSelectedEvents" class="timeline"><span class="muted">Choose a day to inspect events.</span></div></div>`;panel.appendChild(cal);
  $('calPrev').onclick=()=>{calendarAnchor=new Date(calendarAnchor.getFullYear(),calendarAnchor.getMonth()-1,1);syncCalendarRange()};$('calNext').onclick=()=>{calendarAnchor=new Date(calendarAnchor.getFullYear(),calendarAnchor.getMonth()+1,1);syncCalendarRange()};$('calToday').onclick=()=>{calendarAnchor=new Date();syncCalendarRange()};syncCalendarRange();
}
async function syncCalendarRange(){
  const start=new Date(calendarAnchor.getFullYear(),calendarAnchor.getMonth(),1),end=new Date(calendarAnchor.getFullYear(),calendarAnchor.getMonth()+1,1);$('calMonth').textContent=start.toLocaleDateString(undefined,{month:'long',year:'numeric'});try{const j=await api({action:'get_calendar_range',start_date:start.toISOString().slice(0,10),end_date:end.toISOString().slice(0,10)},20000);renderCalendarMonth(start,j.events||[]);}catch(e){renderCalendarMonth(start,[]);$('calSelectedEvents').innerHTML='<span class="muted">Extended calendar requires AEGIS backend 2.6.5. Today/Tomorrow remain available above.</span>';}}
function renderCalendarMonth(monthStart,events){
  const host=$('calGrid');if(!host)return;const y=monthStart.getFullYear(),m=monthStart.getMonth(),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),pad=first.getDay();let html=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="ux-cal-head">${x}</div>`).join('');for(let i=0;i<pad;i++)html+='<div class="ux-cal-empty"></div>';for(let d=1;d<=days;d++){const date=new Date(y,m,d),key=[y,String(m+1).padStart(2,'0'),String(d).padStart(2,'0')].join('-'),count=events.filter(e=>String(e.local_date||'')===key).length;html+=`<button class="ux-cal-day ${date.toDateString()===new Date().toDateString()?'today':''}" data-date="${key}"><b>${d}</b>${count?`<span>${count} event${count===1?'':'s'}</span>`:''}</button>`;}host.innerHTML=html;host.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>showCalendarDay(b.dataset.date,events));const todayKey=new Date().toISOString().slice(0,10);if(events.some(e=>e.local_date===todayKey))showCalendarDay(todayKey,events);
}
function showCalendarDay(date,events){const day=events.filter(e=>e.local_date===date);$('calSelectedTitle').textContent=new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});$('calSelectedEvents').innerHTML=day.length?day.map(e=>`<div class="event"><strong>${esc(e.title)}</strong><span>${esc(e.all_day?'All day':(e.local_time||''))}${e.location?' • '+esc(e.location):''}</span></div>`).join(''):'<span class="muted">No events on this day.</span>';}

function installSyncSemantics(){
  document.querySelector('#scheduleSync')?.setAttribute('title','Refresh Google Calendar data');document.querySelector('#tasksSync')?.setAttribute('title','Refresh Google Tasks and apply staged completions');document.querySelector('#financeSync')?.setAttribute('title','Refresh canonical finance data');document.querySelector('#intelSync')?.setAttribute('title','Refresh News & Insights');
  const passive=()=>{if(document.hidden)return;Promise.allSettled([typeof window.loadDashboard==='function'?window.loadDashboard(false):Promise.resolve(),syncFollowups(false),syncCalendarRange()]);};
  window.addEventListener('focus',()=>setTimeout(passive,300));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(passive,300)});setInterval(passive,5*60*1000);
}

function install(){
  relabelNavigation();installHomeAsk();addFollowupsView();installLocalTasks();installCalendarWorkspace();installSyncSemantics();syncFollowups(false);
  document.documentElement.dataset.aegisUx=RELEASE;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
