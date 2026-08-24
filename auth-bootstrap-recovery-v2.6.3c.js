// AEGIS 2.6.3c — AUTH-1 bootstrap recovery watchdog.
// Independent fallback for a primary bootstrap that remains stuck at Initializing.
(function(){
  if(!window.AEGIS?.Core) return;

  const TOKEN_KEY='aegis_auth_token';
  const FALLBACK_BACKEND='https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';
  const backend=()=>window.WEBHOOK||FALLBACK_BACKEND;
  let recovering=false;

  function statusEl(){return document.getElementById('aegisAuthStatus')}
  function hostEl(){return document.getElementById('aegisGoogleButton')}
  function setStatus(msg,error=false){const el=statusEl();if(!el)return;el.textContent=msg;el.classList.toggle('aegis-auth-error',!!error)}

  async function jsonFetch(url,opts={},timeout=10000){
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),timeout);
    try{
      const response=await fetch(url,{...opts,cache:'no-store',signal:ctrl.signal});
      if(!response.ok) throw new Error('HTTP '+response.status);
      return await response.json();
    } finally { clearTimeout(timer); }
  }

  function loadGoogleIdentity(){
    return new Promise((resolve,reject)=>{
      if(window.google?.accounts?.id) return resolve();
      let script=document.getElementById('googleIdentityServices');
      if(script){
        const poll=setInterval(()=>{if(window.google?.accounts?.id){clearInterval(poll);resolve();}},100);
        setTimeout(()=>{clearInterval(poll);if(window.google?.accounts?.id)resolve();else reject(new Error('Google Identity Services did not become ready.'));},7000);
        return;
      }
      script=document.createElement('script');
      script.id='googleIdentityServices';
      script.src='https://accounts.google.com/gsi/client';
      script.async=true;script.defer=true;
      script.onload=()=>resolve();
      script.onerror=()=>reject(new Error('Google Identity Services failed to load.'));
      document.head.appendChild(script);
    });
  }

  async function authorizeCredential(response){
    const token=response?.credential||'';
    if(!token){setStatus('Google did not return a usable identity token.',true);return;}
    setStatus('Recovery path: verifying account with AEGIS…');
    try{
      const result=await jsonFetch(backend(),{
        method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action:'auth_login',auth_token:token})
      },15000);
      if(!result?.authenticated) throw new Error(result?.error||'Account was not authorized.');
      sessionStorage.setItem(TOKEN_KEY,token);
      setStatus('Authorized. Reloading secure session…');
      location.reload();
    }catch(err){
      try{sessionStorage.removeItem(TOKEN_KEY)}catch{}
      setStatus('Authentication recovery failed: '+(err?.message||String(err)),true);
      installRetryButton();
    }
  }

  function installRetryButton(){
    const host=hostEl();if(!host||document.getElementById('aegisAuthRetry'))return;
    const button=document.createElement('button');
    button.id='aegisAuthRetry';button.type='button';
    button.textContent='Retry authentication';
    button.style.cssText='margin:8px auto 0;padding:10px 16px;border:1px solid #31566b;border-radius:10px;background:#153446;color:#e8f5fb;cursor:pointer;font-weight:700';
    button.addEventListener('click',()=>recover(true));
    host.appendChild(button);
  }

  async function recover(force=false){
    if(recovering)return;
    const status=statusEl();
    if(!status)return;
    const current=String(status.textContent||'');
    const stuck=/Initializing secure session/i.test(current);
    if(!force&&!stuck)return;
    recovering=true;
    setStatus('Primary auth bootstrap delayed. Starting recovery…');
    try{
      const cfg=await jsonFetch(backend()+'?action=auth_config&ts='+Date.now(),{},9000);
      if(!cfg?.configured||!cfg?.client_id) throw new Error('AEGIS auth configuration is unavailable.');
      await loadGoogleIdentity();
      const host=hostEl();if(!host)throw new Error('AEGIS auth button host is unavailable.');
      host.innerHTML='';
      window.google.accounts.id.initialize({
        client_id:cfg.client_id,
        callback:authorizeCredential,
        auto_select:false,
        cancel_on_tap_outside:false
      });
      window.google.accounts.id.renderButton(host,{theme:'filled_black',size:'large',shape:'pill',text:'signin_with',width:300});
      setStatus('Authentication recovery ready. Sign in with Google.');
    }catch(err){
      setStatus('Authentication initialization failed: '+(err?.message||String(err)),true);
      installRetryButton();
    }finally{recovering=false;}
  }

  // A normal AUTH-1 bootstrap should finish well before this watchdog fires.
  setTimeout(()=>recover(false),6000);
})();
