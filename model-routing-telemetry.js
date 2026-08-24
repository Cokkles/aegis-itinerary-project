// AEGIS 2.6.3 model-routing telemetry hook.
(function(){
  if(!window.AEGIS?.Core?.fetchJson||window.AEGIS.Core.__routingTelemetry263)return;
  window.AEGIS.Core.__routingTelemetry263=true;
  const original=window.AEGIS.Core.fetchJson.bind(window.AEGIS.Core);
  window.AEGIS.Core.fetchJson=async function(url,options,timeout){
    const result=await original(url,options,timeout);
    try{
      let request=null;
      if(options?.body) request=JSON.parse(options.body);
      if(request?.action==='calendar_ai'&&result?.status==='success'){
        const route={
          domain:'calendar',
          operation:String(result.operation||'READ'),
          parser_source:String(result.parser_source||'UNKNOWN'),
          model_used:result.model_used||null,
          confirmation_required:result.confirmation_required===true,
          mutation_performed:result.mutation_performed===true,
          at:new Date().toISOString()
        };
        sessionStorage.setItem('aegis_model_route_last',JSON.stringify(route));
        window.dispatchEvent(new CustomEvent('aegis-calendar-routing',{detail:route}));
      }
      if(request?.action==='calendar_confirm'&&result?.status==='success'){
        const prev=JSON.parse(sessionStorage.getItem('aegis_model_route_last')||'{}');
        const route={...prev,domain:'calendar',operation:String(result.operation||prev.operation||'UNKNOWN'),mutation_performed:result.mutation_performed===true,confirmed:true,confirmed_at:new Date().toISOString(),at:new Date().toISOString()};
        sessionStorage.setItem('aegis_model_route_last',JSON.stringify(route));
        window.dispatchEvent(new CustomEvent('aegis-calendar-routing',{detail:route}));
      }
    }catch{}
    return result;
  };
})();
