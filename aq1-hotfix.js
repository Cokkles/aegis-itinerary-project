// AEGIS AQ-1.1 hotfix: request-mode isolation + safe Markdown rendering.
(function(){
  if(!window.AEGIS?.Core) return;

  const AI_MODES=['general','career','finance','logistics','system'];
  const historyKey=mode=>'aegis_ai_history_v1_'+mode;
  const loadHistory=mode=>{try{return JSON.parse(sessionStorage.getItem(historyKey(mode))||'[]')}catch{return[]}};
  const saveHistory=(mode,history)=>{try{sessionStorage.setItem(historyKey(mode),JSON.stringify(history.slice(-8)))}catch{}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currentMode=()=>document.querySelector('[data-ai-mode].active')?.dataset.aiMode||'general';

  function renderMarkdown(text){
    const blocks=[];
    let s=esc(String(text??'').replace(/\r\n?/g,'\n'));
    s=s.replace(/```([^\n`]*)\n([\s\S]*?)```/g,(_,lang,code)=>{
      const i=blocks.length;
      blocks.push(`<pre class="ai-md-code"><code>${code}</code></pre>`);
      return `@@AEGIS_CODE_${i}@@`;
    });
    s=s
      .replace(/^###\s+(.+)$/gm,'<h4>$1</h4>')
      .replace(/^##\s+(.+)$/gm,'<h3>$1</h3>')
      .replace(/^#\s+(.+)$/gm,'<h2>$1</h2>')
      .replace(/^>\s+(.+)$/gm,'<blockquote>$1</blockquote>')
      .replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g,'<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>')
      .replace(/`([^`\n]+)`/g,'<code class="ai-md-inline">$1</code>')
      .replace(/^\s*[-*]\s+(.+)$/gm,'<li>$1</li>')
      .replace(/^\s*\d+[.)]\s+(.+)$/gm,'<li>$1</li>');
    s=s.replace(/(?:<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`);
    s=s.split(/\n{2,}/).map(block=>{
      const t=block.trim();
      if(!t) return '';
      if(/^<(h[234]|ul|pre|blockquote)/.test(t)||/^@@AEGIS_CODE_\d+@@$/.test(t)) return t;
      return `<p>${t.replace(/\n/g,'<br>')}</p>`;
    }).join('');
    return s.replace(/@@AEGIS_CODE_(\d+)@@/g,(_,i)=>blocks[Number(i)]||'');
  }

  function renderThread(){
    const mode=currentMode();
    const box=document.getElementById('aiThread');
    if(!box) return;
    const history=loadHistory(mode);
    box.innerHTML=history.length?history.map(item=>{
      const role=item.role==='user'?'user':'assistant';
      const body=role==='assistant'?renderMarkdown(item.text):esc(item.text).replace(/\n/g,'<br>');
      return `<div class="ai-message ${role}"><div class="ai-message-role">${role==='user'?'YOU':'AEGIS'}</div><div class="ai-message-body">${body}</div></div>`;
    }).join(''):'<div class="ai-empty"><strong>Ask AEGIS</strong><span>This mode has no messages in the current browser session.</span></div>';
    box.scrollTop=box.scrollHeight;
  }

  async function send(){
    const input=document.getElementById('aiQuestion');
    const button=document.getElementById('aiSend');
    if(!input||!button) return;
    const question=String(input.value||'').trim();
    if(!question) return;
    const requestMode=currentMode();
    const history=loadHistory(requestMode);
    const pending=[...history,{role:'user',text:question}].slice(-8);
    saveHistory(requestMode,pending);
    input.value='';
    if(currentMode()===requestMode) renderThread();
    button.disabled=true;button.textContent='Thinking…';
    try{
      const result=await AEGIS.Core.fetchJson(window.WEBHOOK,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'ai_query',mode:requestMode,question,history})},60000);
      if(result?.status!=='success'||!result.answer) throw new Error(result?.error||'AEGIS AI query failed.');
      saveHistory(requestMode,[...pending,{role:'assistant',text:String(result.answer)}].slice(-8));
      if(currentMode()===requestMode) renderThread();
      const sources=(result.context_sources||[]).filter(x=>x.status==='AVAILABLE').map(x=>x.source).join(', ');
      if(sources&&typeof window.toast==='function') window.toast(`AEGIS ${requestMode}: ${sources}`);
    }catch(err){
      saveHistory(requestMode,[...pending,{role:'assistant',text:'Query failed: '+(err.message||String(err))}].slice(-8));
      if(currentMode()===requestMode) renderThread();
      if(typeof window.localNotification==='function') window.localNotification(`AEGIS ${requestMode} query failed`,err.message||String(err),'warning','ai-query');
    }finally{
      button.disabled=false;button.textContent='Ask AEGIS';input.focus();
    }
  }

  function install(){
    const thread=document.getElementById('aiThread');
    if(!thread||thread.dataset.aq11==='1') return;
    thread.dataset.aq11='1';

    document.querySelectorAll('[data-ai-mode]').forEach(old=>{
      const btn=old.cloneNode(true);
      old.replaceWith(btn);
      btn.addEventListener('click',()=>{
        const mode=btn.dataset.aiMode;
        if(!AI_MODES.includes(mode)) return;
        document.querySelectorAll('[data-ai-mode]').forEach(x=>x.classList.toggle('active',x.dataset.aiMode===mode));
        const note=document.getElementById('aiContextNote');
        if(note) note.textContent=({general:'Calendar, Tasks, active notes, bounded SPARK state, and KINETIC display context.',career:'Career/technical mentoring using active notes, current Tasks/Calendar, and bounded SPARK context. No invented career history.',finance:'SENTINEL-FIN bounded financial summary only. No PRISM internals and no transactions.',logistics:'Calendar, Tasks, and 7-day Gmail metadata. Email bodies are not supplied.',system:'AEGIS/GEMINI-POS capability and health telemetry only.'})[mode]||'';
        renderThread();
      });
    });

    const oldInput=document.getElementById('aiQuestion');
    if(oldInput){const input=oldInput.cloneNode(true);oldInput.replaceWith(input);input.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();send();}});}
    const oldSend=document.getElementById('aiSend');
    if(oldSend){const btn=oldSend.cloneNode(true);oldSend.replaceWith(btn);btn.addEventListener('click',send);}
    const oldClear=document.getElementById('aiClear');
    if(oldClear){const btn=oldClear.cloneNode(true);oldClear.replaceWith(btn);btn.addEventListener('click',()=>{try{sessionStorage.removeItem(historyKey(currentMode()))}catch{}renderThread();if(typeof window.toast==='function')window.toast('AQ-1 session cleared');});}

    const style=document.createElement('style');
    style.id='aq11MarkdownStyle';
    style.textContent='.ai-message-body p{margin:0 0 10px}.ai-message-body p:last-child{margin-bottom:0}.ai-message-body h2,.ai-message-body h3,.ai-message-body h4{margin:14px 0 7px;color:#e9f4fa;line-height:1.25}.ai-message-body h2{font-size:1.05rem}.ai-message-body h3{font-size:.98rem}.ai-message-body h4{font-size:.92rem}.ai-message-body ul{margin:7px 0 10px 20px;padding:0}.ai-message-body li{margin:4px 0}.ai-message-body blockquote{margin:9px 0;padding:7px 11px;border-left:3px solid #4f7e9e;background:#091722;color:#bdd0dc}.ai-md-inline{padding:1px 5px;border-radius:5px;background:#07141e;border:1px solid rgba(127,159,198,.2);font-size:.88em}.ai-md-code{margin:10px 0;padding:12px;overflow:auto;border-radius:8px;background:#061019;border:1px solid rgba(127,159,198,.2);white-space:pre-wrap}';
    document.head.appendChild(style);
    renderThread();
  }

  install();
})();
