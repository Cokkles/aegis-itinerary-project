// AEGIS 2.7.1 — canonical shell/navigation hardening
(()=>{
'use strict';
if(window.__AEGIS_SHELL_HARDENING_271__) return;
window.__AEGIS_SHELL_HARDENING_271__=true;

const LABELS={
  overview:'Home',
  horizon:'Briefing',
  schedule:'Calendar',
  tasksView:'Tasks',
  followupsView:'Follow-ups',
  financeView:'Finances',
  intelligence:'News & Insights',
  consoleView:'Console',
  system:'System'
};

function normalizeNav(){
  const nav=document.getElementById('nav');
  if(!nav) return;

  nav.querySelectorAll('.nav-item[data-view]').forEach(btn=>{
    const label=LABELS[btn.dataset.view];
    const span=btn.querySelector('span');
    if(label&&span) span.textContent=label;
  });

  // UX 2.7 may dynamically insert Follow-ups for older shells. The 2.7.1
  // shell already contains it, so retain only one instance.
  const followups=[...nav.querySelectorAll('.nav-item[data-view="followupsView"]')];
  followups.slice(1).forEach(btn=>btn.remove());

  const version=nav.querySelector('.nav-version');
  if(version) version.textContent='AEGIS UX 2.7.1 • AUTH-1';
}

function normalizeShellCopy(){
  const hero=document.querySelector('.hero h1');
  if(hero) hero.textContent='AEGIS';
  const heroP=document.querySelector('.hero p');
  if(heroP) heroP.textContent='Your briefing, calendar, tasks, follow-ups and live context in one place.';

  const sync=document.getElementById('sync');
  if(sync){
    const text=[...sync.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
    if(text) text.textContent='↻ Sync All ';
    const sub=sync.querySelector('span');
    if(sub) sub.textContent='Refresh current data';
  }
}

function apply(){normalizeNav();normalizeShellCopy();document.documentElement.dataset.aegisShell='2.7.1';}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0),{once:true});
else setTimeout(apply,0);
window.addEventListener('aegis-stable-runtime-ready',()=>setTimeout(apply,0));
setTimeout(apply,750);
})();
