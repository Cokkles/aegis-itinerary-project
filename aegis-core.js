window.AEGIS=window.AEGIS||{};
AEGIS.Core=(()=>{
  const BUILD='2.6.3j';
  const BACKEND='https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';
  const TOKEN_KEY='aegis_auth_token';
  const cacheKey=k=>'aegis_cache_'+k;
  const states={};
  const auth={configured:false,enforcementRequired:true,authenticated:false,user:null,expiresAt:null,clientId:null,phase:'BOOT'};
  let readySettled=false;
  let authReadyResolve;
  let authReadyReject;
  const authReady=new Promise((resolve,reject)=>{authReadyResolve=resolve;authReadyReject=reject});

  function now(){return new Date().toISOString()}
  function save(k,data,meta={}){const entry={data,updatedAt:meta.updatedAt||now(),source:meta.source||'unknown',fresh:meta.fresh!==false};try{localStorage.setItem(cacheKey(k),JSON.stringify(entry))}catch{}return entry}
  function load(k){try{return JSON.parse(localStorage.getItem(cacheKey(k))||'null')}catch{return null}}
  function setState(name,status,detail=''){states[name]={status,detail,updatedAt:now()};return states[name]}
  function getStates(){return JSON.parse(JSON.stringify(states))}
  function setPhase(phase,detail=''){auth.phase=phase;setState('auth',phase.toLowerCase(),detail||phase);document.documentElement.dataset.aegisAuthPhase=phase;return phase}
  function settleReady(ok,error){if(readySettled)return;readySettled=true;if(ok)authReadyResolve(true);else authReadyReject(error instanceof Error?error:new Error(String(error||'AEGIS authentication failed.')))}

  async function rawFetchJson(url,opts={},timeoutMs=12000){
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
    try{
      const r=await fetch(url,{cache:'no-store',...opts,signal:ctrl.signal});
      const text=await r.text();
      if(!r.ok)throw new Error('HTTP '+r.status+(text?' — '+text.slice(0,180):''));
      try{return JSON.parse(text)}catch{throw new Error('Invalid JSON response from AEGIS backend.')}
    }catch(err){
      if(err?.name==='AbortError')throw new Error('Request timed out after '+timeoutMs+' ms.');
      throw err;
    }finally{clearTimeout(timer)}
  }

  async function provider(name,fn,{cache=null,allowCached=true}={}){setState(name,'loading');try{const data=await fn();if(cache)save(cache,data,{source:name});setState(name,'ready');return{data,cached:false}}catch(error){const old=cache&&allowCached?load(cache):null;if(old){setState(name,'cached',error.message);return{data:old.data,cached:true,error}}setState(name,'failed',error.message);throw error}}

  function injectAuthUi(){
    if(document.getElementById('aegisAuthGate'))return;
    document.body.classList.add('aegis-auth-locked');
    const style=document.createElement('style');style.id='aegisAuthStyle';style.textContent=`
      body.aegis-auth-locked{overflow:hidden;background:#071118!important}
      body.aegis-auth-locked>.nav,body.aegis-auth-locked>.shell,body.aegis-auth-locked>.mobile-menu,body.aegis-auth-locked>.scrim,body.aegis-auth-locked>.notification-drawer,body.aegis-auth-locked>.toast,body.aegis-auth-locked>dialog{visibility:hidden!important}
      #aegisAuthGate{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 20%,#123245 0,#08151e 46%,#050b10 100%);color:#eef8ff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #aegisAuthGate[hidden]{display:none!important}.aegis-auth-card{width:min(460px,100%);border:1px solid #24495c;border-radius:22px;background:rgba(8,20,29,.96);box-shadow:0 22px 70px rgba(0,0,0,.48);padding:34px;text-align:center}
      .aegis-auth-mark{width:72px;height:72px;object-fit:contain;margin-bottom:14px}.aegis-auth-card h1{font-size:28px;letter-spacing:.04em;margin:0 0 8px}.aegis-auth-card p{color:#a8bdc9;line-height:1.5;margin:0 0 22px}
      #aegisGoogleButton{display:flex;justify-content:center;min-height:44px}.aegis-auth-status{min-height:22px;margin-top:18px;color:#8fdcff;font-size:13px}.aegis-auth-error{color:#ff9b9b}.aegis-auth-phase{margin-top:8px;color:#668898;font-size:11px;letter-spacing:.08em}
      #aegisAuthRetry{margin:12px auto 0;padding:9px 14px;border:1px solid #31566b;border-radius:9px;background:#153446;color:#e8f5fb;cursor:pointer;font-weight:700}
      #aegisAuthBadge{position:fixed;right:18px;bottom:18px;z-index:5000;display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid #285064;border-radius:999px;background:rgba(7,18,26,.93);box-shadow:0 8px 28px rgba(0,0,0,.32);color:#dcecf5;font:12px/1.2 Inter,system-ui,sans-serif}
      #aegisAuthBadge[hidden]{display:none!important}#aegisAuthBadge img{width:26px;height:26px;border-radius:50%;object-fit:cover}#aegisAuthBadge button{border:0;border-radius:999px;background:#173647;color:#dcecf5;padding:6px 9px;cursor:pointer}
    `;document.head.appendChild(style);
    const gate=document.createElement('div');gate.id='aegisAuthGate';gate.innerHTML=`<div class="aegis-auth-card"><img class="aegis-auth-mark" src="aegis-mark-v3.svg?v=2.6.3j" alt="AEGIS"><h1>AEGIS SECURE ACCESS</h1><p>Sign in with an authorized Google account to unlock GEMINI-POS workspace data and controls.</p><div id="aegisGoogleButton"></div><div class="aegis-auth-status" id="aegisAuthStatus">Starting secure session…</div><div class="aegis-auth-phase" id="aegisAuthPhase">BOOT</div></div>`;document.body.appendChild(gate);
    const badge=document.createElement('div');badge.id='aegisAuthBadge';badge.hidden=true;document.body.appendChild(badge);
  }

  function setAuthStatus(message,isError=false){const el=document.getElementById('aegisAuthStatus');if(el){el.textContent=message;el.classList.toggle('aegis-auth-error',!!isError)}const phase=document.getElementById('aegisAuthPhase');if(phase)phase.textContent=auth.phase}
  function token(){try{return sessionStorage.getItem(TOKEN_KEY)||''}catch{return''}}
  function rememberToken(value){try{if(value)sessionStorage.setItem(TOKEN_KEY,value);else sessionStorage.removeItem(TOKEN_KEY)}catch{}}
  function showGate(){injectAuthUi();document.body.classList.add('aegis-auth-locked');const g=document.getElementById('aegisAuthGate');if(g)g.hidden=false;const b=document.getElementById('aegisAuthBadge');if(b)b.hidden=true}
  function unlockUi(){document.body.classList.remove('aegis-auth-locked');const g=document.getElementById('aegisAuthGate');if(g)g.hidden=true;renderBadge()}
  function renderBadge(){const b=document.getElementById('aegisAuthBadge');if(!b||!auth.authenticated||!auth.user){if(b)b.hidden=true;return}const pic=auth.user.picture?`<img src="${String(auth.user.picture).replace(/"/g,'&quot;')}" alt="">`:'';b.innerHTML=`${pic}<span>${String(auth.user.email||'Authorized')}</span><button id="aegisLogoutBtn" type="button">Sign out</button>`;b.hidden=false;document.getElementById('aegisLogoutBtn')?.addEventListener('click',logout)}

  function installRetry(error){const host=document.getElementById('aegisGoogleButton');if(!host)return;let btn=document.getElementById('aegisAuthRetry');if(!btn){btn=document.createElement('button');btn.id='aegisAuthRetry';btn.type='button';btn.textContent='Retry authentication';btn.addEventListener('click',()=>{btn.remove();document.getElementById('aegisAuthFallback')?.remove();bootstrapAuth(true)});host.appendChild(btn)}installStandaloneFallback();setAuthStatus(error?.message||String(error||'Authentication failed.'),true)}

  function loadGoogleIdentity(){return new Promise((resolve,reject)=>{
    if(window.google?.accounts?.id)return resolve();
    let settled=false,poll=null,timer=null;
    const finish=(err)=>{if(settled)return;settled=true;if(poll)clearInterval(poll);if(timer)clearTimeout(timer);err?reject(err):resolve();};
    let s=document.getElementById('googleIdentityServices');
    if(!s){s=document.createElement('script');s.id='googleIdentityServices';s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.onload=()=>window.google?.accounts?.id?finish():null;s.onerror=()=>finish(new Error('Google Sign-In could not load. Browser privacy protection or network filtering may be blocking accounts.google.com.'));document.head.appendChild(s);}
    poll=setInterval(()=>{if(window.google?.accounts?.id)finish();},100);
    timer=setTimeout(()=>finish(new Error('Google Sign-In timed out after 10 seconds. Retry, or use the standalone sign-in fallback.')),10000);
  })}

  function installStandaloneFallback(){const host=document.getElementById('aegisGoogleButton');if(!host||document.getElementById('aegisAuthFallback'))return;const a=document.createElement('a');a.id='aegisAuthFallback';a.href='auth-diagnostic.html?return=1';a.textContent='Open standalone sign-in';a.style.cssText='display:block;margin:12px auto 0;color:#8fdcff;font:700 13px Inter,system-ui,sans-serif;text-decoration:none';host.appendChild(a);}


  async function authPost(action,idToken){return rawFetchJson(BACKEND,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,auth_token:idToken})},15000)}
  function applySession(result,idToken){auth.authenticated=!!result?.authenticated;auth.user=result?.user||null;auth.expiresAt=result?.session?.expires_at||null;if(!auth.authenticated)return false;rememberToken(idToken);setPhase('AUTHENTICATED',auth.user?.email||'authorized');setAuthStatus('Authenticated. Loading AEGIS…');unlockUi();settleReady(true);return true}

  async function handleGoogleCredential(response){
    const idToken=response?.credential||'';if(!idToken){setPhase('AUTH_FAILED');installRetry(new Error('Google did not return a usable identity token.'));return}
    setPhase('LOGIN_VERIFY');setAuthStatus('Verifying account with AEGIS…');
    try{const result=await authPost('auth_login',idToken);if(!result?.authenticated)throw new Error(result?.error||'Account was not authorized.');applySession(result,idToken)}catch(err){rememberToken('');auth.authenticated=false;setPhase('AUTH_FAILED');installRetry(err)}
  }

  async function renderGoogleButton(){
    setPhase('SIGN_IN_LOADING');setAuthStatus('Loading Google Sign-In…');
    try{await loadGoogleIdentity()}catch(err){setPhase('SIGN_IN_FAILED');throw err}if(!auth.clientId)throw new Error('Google OAuth client ID is not configured.');
    const host=document.getElementById('aegisGoogleButton');if(!host)throw new Error('Authentication UI host is unavailable.');host.innerHTML='';
    window.google.accounts.id.initialize({client_id:auth.clientId,callback:handleGoogleCredential,auto_select:false,cancel_on_tap_outside:false});
    window.google.accounts.id.renderButton(host,{theme:'filled_black',size:'large',shape:'pill',text:'signin_with',width:300});
    setPhase('SIGN_IN_REQUIRED');setAuthStatus('Authentication required.');
  }

  async function bootstrapAuth(force=false){
    injectAuthUi();showGate();
    try{
      setPhase('CONFIG_LOADING');setAuthStatus('Loading authentication configuration…');
      const cfg={status:'success',provider:'google',configured:true,client_id:'441009275873-qnf9c9n1o3l9tl9c76t2821hm8tectfl.apps.googleusercontent.com',allowlist_configured:true,enforcement_required:true,auth_version:'AUTH-1',backend_version:'2.6.3',source:'release-pinned'};
      auth.configured=!!cfg.configured;auth.enforcementRequired=cfg.enforcement_required!==false;auth.clientId=cfg.client_id||null;
      if(!auth.configured)throw new Error('AEGIS authentication is not configured on the backend.');
      setPhase('CONFIG_READY','backend '+(cfg.backend_version||'?'));
      if(!auth.enforcementRequired){setPhase('AUTH_BYPASSED');unlockUi();settleReady(true);return}

      const existing=force?'':token();
      if(existing){
        setPhase('SESSION_CHECK');setAuthStatus('Validating existing session…');
        try{const session=await authPost('auth_session',existing);if(session?.authenticated&&applySession(session,existing))return}catch(err){setState('auth_session','failed',err.message)}
        rememberToken('');
      }

      await renderGoogleButton();
    }catch(err){
      setPhase('AUTH_FAILED');setState('auth','failed',err.message||String(err));installRetry(err);
    }
  }

  async function logout(){const current=token();try{if(current)await authPost('auth_logout',current)}catch{}rememberToken('');auth.authenticated=false;auth.user=null;try{window.google?.accounts?.id?.disableAutoSelect()}catch{}location.reload()}

  function mapPrivateGet(url){const u=new URL(url,location.href),a=u.searchParams.get('action')||'';const map={getHorizonData:'get_dashboard',getSummary:'get_dashboard',getIntelligence:'get_intelligence',capabilities:'get_capabilities',getNotifications:'get_notifications',getRecentFinance:'get_recent_finance',health:'get_health',getLatestHorizonBriefing:'get_latest_horizon'};const action=map[a];if(!action)return null;const p={action};if(a==='getIntelligence')p.force=u.searchParams.get('force')==='1';if(a==='getRecentFinance')p.hours=Number(u.searchParams.get('hours'))||72;return p}
  function isBackend(url){return String(url||'').startsWith(BACKEND)}
  function isPublicBackendGet(url){try{const u=new URL(url,location.href),a=u.searchParams.get('action')||'';return a==='auth_config'||a==='reverseGeocode'}catch{return false}}
  async function secureBackendResult(promise){const j=await promise;if(j?.code==='AEGIS_AUTH_REQUIRED'||j?.code==='AEGIS_AUTH_FAILED'){rememberToken('');auth.authenticated=false;showGate();setPhase('SESSION_EXPIRED');setAuthStatus(j.error||'Your AEGIS session expired. Sign in again.',true);setTimeout(()=>bootstrapAuth(true),250);throw new Error(j.error||'AEGIS authentication required')}return j}

  async function fetchJson(url,opts={},timeoutMs=12000){
    if(!isBackend(url)||isPublicBackendGet(url))return rawFetchJson(url,opts,timeoutMs);
    await authReady;
    const idToken=token();if(auth.enforcementRequired&&!idToken)throw new Error('AEGIS authentication required.');
    const method=String(opts.method||'GET').toUpperCase();
    if(method==='GET'){
      const payload=mapPrivateGet(url);if(!payload)throw new Error('Protected AEGIS GET has no AUTH-1 POST mapping.');payload.auth_token=idToken;
      return secureBackendResult(rawFetchJson(BACKEND,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)},timeoutMs));
    }
    let payload={};try{payload=opts.body?JSON.parse(opts.body):{}}catch{throw new Error('AEGIS protected request body must be JSON.')}payload.auth_token=idToken;
    return secureBackendResult(rawFetchJson(BACKEND,{...opts,method:'POST',headers:{...(opts.headers||{}),'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)},timeoutMs));
  }

  setTimeout(()=>bootstrapAuth(false),0);
  return{BUILD,save,load,setState,getStates,fetchJson,provider,Auth:{ready:authReady,state:auth,logout,retry:()=>bootstrapAuth(true)}};
})();
