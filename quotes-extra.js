// AEGIS supplemental runtime compatibility shims.
// Synthetic AEGIS-authored quotes were intentionally removed in 2.6.5.
// Daily Perspective now draws only from the curated attributed quote library.

// AEGIS 2.6.3m stabilization shim.
// auth_login is the known-good stateless token-validation path. During the
// AUTH-1 browser stabilization window, translate legacy auth_session checks to
// auth_login so every page uses one backend validation operation.
(()=>{
  if(window.__AEGIS_AUTH_SESSION_COMPAT_263M__)return;
  window.__AEGIS_AUTH_SESSION_COMPAT_263M__=true;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    let url=typeof input==='string'?input:(input&&input.url)||'';
    if(url&&url.includes('action=auth_session')){
      url=url.replace('action=auth_session','action=auth_login');
      if(typeof input==='string')input=url;
      else input=new Request(url,input);
    }
    return nativeFetch(input,init);
  };
})();
