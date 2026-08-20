window.AEGIS=window.AEGIS||{};
AEGIS.Core=(()=>{
  const BUILD='2.4.0';
  const cacheKey=k=>'aegis_cache_'+k;
  const states={};
  function now(){return new Date().toISOString()}
  function save(k,data,meta={}){const entry={data,updatedAt:meta.updatedAt||now(),source:meta.source||'unknown',fresh:meta.fresh!==false};try{localStorage.setItem(cacheKey(k),JSON.stringify(entry))}catch{}return entry}
  function load(k){try{return JSON.parse(localStorage.getItem(cacheKey(k))||'null')}catch{return null}}
  function setState(name,status,detail=''){states[name]={status,detail,updatedAt:now()};return states[name]}
  function getStates(){return JSON.parse(JSON.stringify(states))}
  async function fetchJson(url,opts={},timeoutMs=12000){const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeoutMs);try{const r=await fetch(url,{...opts,signal:ctrl.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}}
  async function provider(name,fn,{cache=null,allowCached=true}={}){setState(name,'loading');try{const data=await fn();if(cache)save(cache,data,{source:name});setState(name,'ready');return{data,cached:false}}catch(error){const old=cache&&allowCached?load(cache):null;if(old){setState(name,'cached',error.message);return{data:old.data,cached:true,error}}setState(name,'failed',error.message);throw error}}
  return{BUILD,save,load,setState,getStates,fetchJson,provider};
})();
