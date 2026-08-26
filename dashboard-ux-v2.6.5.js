// AEGIS 2.6.5 — dashboard UX + HORIZON reliability layer.
(()=>{
  'use strict';
  if(window.__AEGIS_DASHBOARD_UX_265__) return;
  window.__AEGIS_DASHBOARD_UX_265__=true;

  const RELEASE='2.6.5';
  const BACKEND=window.WEBHOOK||window.AEGIS_BACKEND_URL||'https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';
  const ORDER_KEY='aegis_dashboard_order_v265';
  const COLLAPSE_KEY='aegis_dashboard_collapsed_v265';
  const DEFAULT_ORDER=['weather','glance','console','tasks','finance','intelligence'];
  const $=id=>document.getElementById(id);

  function safeJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}}
  function saveJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}

  function loadCuratedQuotes(){
    const alreadyLoaded=window.AEGIS_QUOTE_LIBRARY?.release===RELEASE||[...document.scripts].some(s=>String(s.src||'').includes('quotes-curated-2.6.5.js'));
    if(alreadyLoaded){try{window.rotateQuote?.()}catch{};try{AEGIS.Core.setState('quotes','ready',(window.Q?.length||0)+' curated quotes • 5 minute rotation')}catch{};return}
    if(document.getElementById('aegisCuratedQuotes265')) return;
    const s=document.createElement('script');
    s.id='aegisCuratedQuotes265';s.src='quotes-curated-2.6.5.js?v='+RELEASE;s.async=false;
    s.onload=()=>{try{window.rotateQuote?.()}catch{};try{AEGIS.Core.setState('quotes','ready',(window.Q?.length||0)+' curated quotes • 5 minute rotation')}catch{}};
    s.onerror=()=>console.warn('AEGIS curated quote library failed to load.');document.body.appendChild(s);
  }

  function reorganizeNavigation(){
    const nav=$('nav'); if(!nav||nav.dataset.ux265==='1') return;const version=nav.querySelector('.nav-version');const buttons=[...nav.querySelectorAll('.nav-item')];if(!buttons.length)return;
    nav.querySelectorAll('.nav-group').forEach(g=>g.remove());
    const defs=[['DAILY BRIEFING',['dashboard','horizon','schedule','tasks']],['INSIGHTS',['sentinel-fin','live intelligence']],['AEGIS',['ask aegis','console','system']]];const used=new Set();
    defs.forEach(([title,names])=>{const g=document.createElement('div');g.className='nav-group';const sm=document.createElement('small');sm.textContent=title;g.appendChild(sm);names.forEach(name=>{const b=buttons.find(x=>!used.has(x)&&String(x.textContent||'').trim().toLowerCase().includes(name));if(b){used.add(b);g.appendChild(b)}});if(g.querySelector('.nav-item'))nav.insertBefore(g,version||null)});
    const leftovers=buttons.filter(b=>!used.has(b));if(leftovers.length){const g=document.createElement('div');g.className='nav-group';const sm=document.createElement('small');sm.textContent='MORE';g.appendChild(sm);leftovers.forEach(b=>g.appendChild(b));nav.insertBefore(g,version||null)}
    if(version)version.textContent='AEGIS v'+RELEASE+' • AUTH-1';nav.dataset.ux265='1';
  }

  function panelKey(panel){if(panel.classList.contains('weather-panel'))return'weather';if(panel.classList.contains('glance'))return'glance';if(panel.classList.contains('console'))return'console';const txt=String(panel.textContent||'').toLowerCase();if(txt.includes('priority tasks'))return'tasks';if(txt.includes('recent finance'))return'finance';if(txt.includes('live intelligence'))return'intelligence';return'panel-'+Math.random().toString(36).slice(2,8)}
  function panelTitle(panel){return panel.querySelector('h2,h3')?.textContent?.trim()||panel.dataset.dashboardKey||'Dashboard panel'}
  function updateCollapseButton(panel){const b=panel.querySelector('.ux-collapse');if(!b)return;const collapsed=panel.classList.contains('ux-collapsed');b.textContent=collapsed?'▸':'▾';b.title=(collapsed?'Expand ':'Collapse ')+panelTitle(panel);b.setAttribute('aria-expanded',String(!collapsed))}
  function makeCollapsible(panel){
    const key=panel.dataset.dashboardKey,first=panel.firstElementChild;if(!first)return;first.classList.add('ux-panel-top');let tools=first.querySelector('.ux-panel-controls');if(!tools){tools=document.createElement('span');tools.className='ux-panel-controls';first.appendChild(tools)}
    if(!tools.querySelector('.ux-drag-handle')){const h=document.createElement('button');h.type='button';h.className='ux-drag-handle';h.textContent='⋮⋮';h.title='Drag to move '+panelTitle(panel);h.setAttribute('aria-label',h.title);h.addEventListener('pointerdown',()=>panel.dataset.dragReady='1');tools.appendChild(h)}
    if(!tools.querySelector('.ux-collapse')){const b=document.createElement('button');b.type='button';b.className='ux-collapse';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();panel.classList.toggle('ux-collapsed');const state=safeJson(COLLAPSE_KEY,{});state[key]=panel.classList.contains('ux-collapsed');saveJson(COLLAPSE_KEY,state);updateCollapseButton(panel)});tools.appendChild(b)}
    panel.classList.toggle('ux-collapsed',safeJson(COLLAPSE_KEY,{})[key]===true);updateCollapseButton(panel);panel.draggable=true;
    panel.addEventListener('dragstart',e=>{if(panel.dataset.dragReady!=='1'){e.preventDefault();return}panel.classList.add('ux-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',key)});
    panel.addEventListener('dragend',()=>{panel.classList.remove('ux-dragging');panel.dataset.dragReady='';saveDashboardOrder()});
  }
  function saveDashboardOrder(){const tiles=$('dashboardTiles');if(tiles)saveJson(ORDER_KEY,[...tiles.children].map(p=>p.dataset.dashboardKey).filter(Boolean))}
  function applyOrder(tiles){const stored=safeJson(ORDER_KEY,[]),order=Array.isArray(stored)&&stored.length?stored:DEFAULT_ORDER,map=new Map([...tiles.children].map(p=>[p.dataset.dashboardKey,p]));order.forEach(k=>{const p=map.get(k);if(p){tiles.appendChild(p);map.delete(k)}});map.forEach(p=>tiles.appendChild(p))}
  function resetLayout(){localStorage.removeItem(ORDER_KEY);localStorage.removeItem(COLLAPSE_KEY);const tiles=$('dashboardTiles');if(!tiles)return;const map=new Map([...tiles.children].map(p=>[p.dataset.dashboardKey,p]));DEFAULT_ORDER.forEach(k=>map.get(k)&&tiles.appendChild(map.get(k)));[...tiles.children].forEach(p=>{p.classList.remove('ux-collapsed');updateCollapseButton(p)});saveDashboardOrder();try{window.toast?.('Dashboard layout reset')}catch{}}
  function installDashboardLayout(){
    const overview=$('overview');if(!overview||$('dashboardTiles'))return;const live=overview.querySelector(':scope > .live-strip'),grid=overview.querySelector(':scope > .grid');const panels=[...(live?[...live.children].filter(x=>x.classList.contains('panel')):[]),...(grid?[...grid.children].filter(x=>x.classList.contains('panel')):[])];if(!panels.length)return;
    const tiles=document.createElement('div');tiles.id='dashboardTiles';tiles.className='dashboard-tiles';panels.forEach(p=>{p.dataset.dashboardKey=panelKey(p);tiles.appendChild(p);makeCollapsible(p)});live?.remove();grid?.remove();overview.appendChild(tiles);applyOrder(tiles);
    tiles.addEventListener('dragover',e=>{e.preventDefault();const dragging=tiles.querySelector('.ux-dragging'),target=e.target.closest('.panel');if(!dragging||!target||target===dragging)return;const r=target.getBoundingClientRect(),before=e.clientY<r.top+r.height/2;tiles.insertBefore(dragging,before?target:target.nextSibling)});
    const actions=document.querySelector('.compact-actions');if(actions&&!$('resetDashboardLayout')){const b=document.createElement('button');b.id='resetDashboardLayout';b.className='mini ux-reset-layout';b.type='button';b.textContent='↺ Reset Layout';b.onclick=resetLayout;actions.appendChild(b);const hint=document.createElement('span');hint.className='ux-layout-hint';hint.textContent='Drag ⋮⋮ to reorder • ▾ to collapse';actions.appendChild(hint)}
  }

  function readCalories(){try{const live=(typeof data!=='undefined'&&data)||{},value=live?.health_nutrition?.total_calories??live?.health?.total_calories??live?.totalCalories;if(value!==undefined&&value!==null&&value!=='')return Number(value)}catch{}try{const cached=window.AEGIS?.Core?.load?.('dashboard')?.data,value=cached?.health_nutrition?.total_calories??cached?.health?.total_calories??cached?.totalCalories;if(value!==undefined&&value!==null&&value!=='')return Number(value)}catch{}return null}
  function updateCalories(){const el=$('caloriesToday');if(!el)return;const n=readCalories();el.textContent=Number.isFinite(n)?Math.round(n).toLocaleString():'—'}
  function installCalories(){const metrics=document.querySelector('#overview .metrics');if(!metrics||$('caloriesMetric'))return;const btn=document.createElement('button');btn.id='caloriesMetric';btn.className='metric metric-btn';btn.type='button';btn.innerHTML='<small>CALORIES TODAY</small><strong id="caloriesToday">—</strong>';btn.title='Current KINETIC calorie total';btn.onclick=()=>{try{setView('horizon')}catch{}};const spend=$('spend72')?.closest('.metric');spend?.after(btn)||metrics.appendChild(btn);updateCalories()}

  async function getHorizonState(){const j=await AEGIS.Core.fetchJson(BACKEND+'?action=capabilities&ts='+Date.now(),{cache:'no-store'},10000);return j?.horizon_generation||j?.horizon||{}}
  function timeMs(v){const n=v?new Date(v).getTime():0;return Number.isFinite(n)?n:0}
  async function pollHorizonResolution(startMs,deadlineMs){while(Date.now()<deadlineMs){await new Promise(r=>setTimeout(r,5000));try{const s=await getHorizonState();if(timeMs(s.last_success)>=startMs-3000)return{status:'success',state:s,recovered:true};if(timeMs(s.last_attempt)>=startMs-3000&&s.last_error)return{status:'error',state:s,error:s.last_error}}catch{}}return{status:'unknown'}}
  async function refreshAfterHorizon(){try{await window.loadDashboard?.(true)}catch{}try{await window.AEGIS_DATA_BRIDGE?.refreshCanonicalBriefing?.()}catch{}try{await window.syncFinance?.(false)}catch{}try{await window.syncNotifications?.()}catch{}updateCalories()}
  function horizonDetail(message){const out=$('out');if(out)out.textContent=message}
  async function reliableGenerateHorizon(){
    const dlg=$('horizonConfirm');try{dlg?.open&&dlg.close()}catch{}const btn=$('gen');if(btn){btn.disabled=true;btn.dataset.oldHtml=btn.innerHTML;btn.innerHTML='⚡ Generating…<span>validated run</span>'}try{window.stat?.('GENERATING…','var(--warn)')}catch{}
    const startMs=Date.now();horizonDetail('HORIZON generation started. AEGIS will verify backend completion even if the browser request times out.');let transportError=null;
    try{const direct=await AEGIS.Core.fetchJson(BACKEND,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'horizon_sync',command:'/horizon'})},150000);if(direct?.status==='error'||direct?.error)throw new Error(direct.error||'HORIZON backend reported failure.')}catch(err){transportError=err}
    let resolved=null;if(transportError)resolved=await pollHorizonResolution(startMs,Date.now()+75000);
    if(!transportError||resolved?.status==='success'){await refreshAfterHorizon();const recovered=resolved?.recovered?' The initial browser request timed out, but backend status confirms the generation completed successfully.':'';horizonDetail('✅ HORIZON generated and canonical briefing refreshed.'+recovered);try{window.stat?.('HORIZON GENERATED');window.toast?.('New HORIZON generated and synced')}catch{}}
    else{const detail=resolved?.error||resolved?.state?.last_error||transportError?.message||'Generation did not reach a verifiable terminal state.';horizonDetail('HORIZON ERROR: '+detail);try{window.stat?.('GENERATION FAILED','var(--bad)');window.localNotification?.('HORIZON generation failed','The previous valid briefing was preserved.','critical','horizon',detail)}catch{}}
    if(btn){btn.disabled=false;btn.innerHTML=btn.dataset.oldHtml||'⚡ Generate HORIZON<span>AI generation</span>'}updateHorizonRcaBadge();
  }
  async function updateHorizonRcaBadge(){let badge=$('horizonRcaState');const actions=document.querySelector('.compact-actions');if(!actions)return;if(!badge){badge=document.createElement('span');badge.id='horizonRcaState';badge.className='ux-horizon-state';actions.appendChild(badge)}try{const s=await getHorizonState();if(s.last_error){badge.textContent='Last HORIZON: failed • '+String(s.last_error).slice(0,90);badge.classList.add('bad');badge.title=String(s.last_error)}else if(s.last_success){badge.textContent='Last HORIZON: '+new Date(s.last_success).toLocaleString();badge.classList.remove('bad')}else{badge.textContent='HORIZON status available after first run';badge.classList.remove('bad')}}catch{badge.textContent='HORIZON status unavailable';badge.classList.add('bad')}}
  function installReliableHorizon(){const confirm=$('confirmHorizon');if(!confirm||confirm.dataset.ux265==='1')return;confirm.dataset.ux265='1';confirm.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();reliableGenerateHorizon()},true);updateHorizonRcaBadge()}
  function installSyncHooks(){$('sync')?.addEventListener('click',()=>{setTimeout(updateCalories,1500);setTimeout(updateCalories,6000)});$('send')?.addEventListener('click',()=>setTimeout(updateCalories,3500))}

  function install(){window.AEGIS_PWA=Object.assign({},window.AEGIS_PWA||{},{release:RELEASE});document.documentElement.dataset.aegisRuntime=RELEASE;try{if(window.AEGIS?.Core)AEGIS.Core.BUILD=RELEASE}catch{}loadCuratedQuotes();reorganizeNavigation();installDashboardLayout();installCalories();installReliableHorizon();installSyncHooks();updateCalories();setTimeout(()=>{reorganizeNavigation();installCalories();updateCalories()},1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
