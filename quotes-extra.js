// AEGIS 2.6.5 supplemental runtime shims.
// Synthetic AEGIS-authored quotes were removed. Quote rotation is five minutes.
(()=>{
  if(window.__AEGIS_QUOTE_INTERVAL_265__)return;
  window.__AEGIS_QUOTE_INTERVAL_265__=true;
  const nativeSetInterval=window.setInterval.bind(window);
  window.setInterval=function(fn,delay,...args){
    if(typeof fn==='function'&&fn.name==='rotateQuote'&&Number(delay)===30000)delay=5*60*1000;
    return nativeSetInterval(fn,delay,...args);
  };
})();

// AUTH-1 compatibility: translate legacy auth_session checks to auth_login.
(()=>{
  if(window.__AEGIS_AUTH_SESSION_COMPAT_263M__)return;
  window.__AEGIS_AUTH_SESSION_COMPAT_263M__=true;
  const nativeFetch=window.fetch.bind(window);
  const BACKEND='https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec';
  window.fetch=function(input,init={}){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!String(url).startsWith(BACKEND)||String(init.method||'GET').toUpperCase()!=='POST'||!init.body)return nativeFetch(input,init);
    try{
      const payload=JSON.parse(init.body);
      if(payload&&payload.action==='auth_session'){
        payload.action='auth_login';
        return nativeFetch(input,{...init,body:JSON.stringify(payload)});
      }
    }catch{}
    return nativeFetch(input,init);
  };
})();

// Finite canonical dashboard-data bridge loader.
(()=>{
  if(window.__AEGIS_DATA_BRIDGE_LOADER_263Q__)return;
  window.__AEGIS_DATA_BRIDGE_LOADER_263Q__=true;
  function install(){
    if(window.__AEGIS_DATA_BRIDGE_263Q__)return true;
    if(typeof window.renderDashboard!=='function'&&typeof renderDashboard!=='function')return false;
    if(document.getElementById('aegisDataBridge263q'))return true;
    const s=document.createElement('script');
    s.id='aegisDataBridge263q';s.src='dashboard-data-bridge-v2.6.3q.js?v=2.6.5';s.async=false;document.body.appendChild(s);return true;
  }
  [250,900,2200,5000].forEach(ms=>setTimeout(install,ms));
})();

// AEGIS 2.6.5 UX/reliability loader. Wait for app.js to finish defining the dashboard.
(()=>{
  if(window.__AEGIS_UX_LOADER_265__)return;window.__AEGIS_UX_LOADER_265__=true;
  function install(){
    if(window.__AEGIS_DASHBOARD_UX_265__)return true;
    if(typeof window.renderDashboard!=='function'&&typeof renderDashboard!=='function')return false;
    if(!document.getElementById('aegisUxCss265')){const l=document.createElement('link');l.id='aegisUxCss265';l.rel='stylesheet';l.href='dashboard-ux-v2.6.5.css?v=2.6.5';document.head.appendChild(l)}
    if(!document.getElementById('aegisUxJs265')){const s=document.createElement('script');s.id='aegisUxJs265';s.src='dashboard-ux-v2.6.5.js?v=2.6.5';s.async=false;document.body.appendChild(s)}
    return true;
  }
  [350,1000,2400,5200].forEach(ms=>setTimeout(install,ms));
})();
