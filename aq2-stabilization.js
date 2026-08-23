// AEGIS 2.6.2 — AQ-2 stabilization layer
// Matching backend: Apps Script 2.6.2 / AQ-2.1
// Purpose: fail-closed authenticated legacy dispatcher transport + release coherence.
(function(){
  if(!window.AEGIS?.Core) return;

  const RELEASE='2.6.2';
  const TOKEN_KEY='aegis_auth_token';
  const esc=s=>String(s??'');

  function authToken(){
    try{return sessionStorage.getItem(TOKEN_KEY)||'';}catch{return'';}
  }

  function selectedPrefix(){
    const active=document.querySelector('.chip.on[data-p]');
    return active?.dataset?.p||'/note ';
  }

  async function authenticatedDispatch(){
    const input=document.getElementById('input');
    const button=document.getElementById('send');
    const out=document.getElementById('out');
    const value=String(input?.value||'').trim();
    if(!value||!button) return;

    const token=authToken();
    if(!token){
      if(out) out.textContent='ERROR: Authentication token missing. Sign in again.';
      window.AEGIS?.Core?.Auth?.logout?.();
      return;
    }

    const original=button.innerHTML;
    button.disabled=true;
    button.innerHTML='DISPATCHING…';
    try{
      const payload={message:selectedPrefix()+value,auth_token:token};
      const response=await fetch(window.WEBHOOK||'https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec',{
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify(payload),
        cache:'no-store'
      });
      const result=await response.json();
      if(result?.code==='AEGIS_AUTH_REQUIRED'||result?.code==='AEGIS_AUTH_FAILED'){
        throw new Error(result.error||'AEGIS authentication required.');
      }
      if(result?.status==='error'||result?.error) throw new Error(result.error||'AEGIS request failed.');
      if(out) out.textContent=result.result||result.message||JSON.stringify(result,null,2);
      if(input) input.value='';
      window.toast?.('Command dispatched');
      if(typeof window.loadDashboard==='function') setTimeout(()=>window.loadDashboard(true),700);
    }catch(err){
      if(out) out.textContent='ERROR: '+esc(err?.message||err);
      window.localNotification?.('Command dispatch failed',esc(err?.message||err),'critical','console');
    }finally{
      button.disabled=false;
      button.innerHTML=original;
    }
  }

  function install(){
    document.documentElement.dataset.aegisRelease=RELEASE;

    // Capture before legacy target handlers so only one dispatcher request is sent.
    document.addEventListener('click',event=>{
      const target=event.target?.closest?.('#send');
      if(!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      authenticatedDispatch();
    },true);

    // Preserve the console keyboard dispatch behavior through the same authenticated path.
    document.addEventListener('keydown',event=>{
      if(event.target?.id!=='input'||event.key!=='Enter'||!(event.ctrlKey||event.shiftKey)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      authenticatedDispatch();
    },true);
  }

  install();
})();
