export function evaluationPage(cases,version,nonce){
 const total=cases.length*3;
 const config=JSON.stringify({cases:cases.map(({id,ticker,question})=>({id,ticker,question})),version}).replaceAll('<','\\u003c');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FINN private evaluation</title><style nonce="${nonce}">body{font:16px/1.5 system-ui,sans-serif;max-width:900px;margin:32px auto;padding:0 20px;color:#17202b;background:#f8f9fb}button{padding:12px 18px;margin:8px 8px 8px 0;cursor:pointer}table{border-collapse:collapse;width:100%}th,td{text-align:left;border-bottom:1px solid #cbd0d7;padding:12px}#status{padding:18px;background:#e7edf7}small{color:#49505b}pre{white-space:pre-wrap;overflow-wrap:anywhere}details{margin:12px 0}</style></head><body><h1>Private research evaluation</h1><p>${cases.length} fixed questions, three fresh trials each. Requests are spaced by at least one minute. Keep this tab open; progress is saved in this browser. No investor data is added to the suite.</p><p><small>Source retrieval and PDF parsing are excluded. Unseen-company cases use identified held-out primary excerpts. These are model trials, not a discovery benchmark.</small></p><button id="start">Run ${total} live trials</button><button id="pause" disabled>Pause after this trial</button><button id="download" disabled>Download results</button><p id="status" role="status">Ready · 0 / ${total} completed</p><table><thead><tr><th>Trial</th><th>Company / question</th><th>Outcome</th><th>Seconds</th></tr></thead><tbody id="rows"></tbody></table><h2>Visible answers</h2><div id="answers"></div><script nonce="${nonce}">
 const config=${config},storageKey='finn-private-evaluation-'+config.version;
 const queue=Array.from({length:3},(_,i)=>config.cases.map(c=>({...c,trial:i+1}))).flat();
 let state;try{state=JSON.parse(localStorage.getItem(storageKey));}catch{}if(!state||state.version!==config.version)state={version:config.version,runId:crypto.randomUUID(),rows:[],lastStarted:0};
 let active=false,timer;
 const status=document.getElementById('status'),start=document.getElementById('start'),pause=document.getElementById('pause'),download=document.getElementById('download');
 function save(){localStorage.setItem(storageKey,JSON.stringify(state));}
 function paint(){
  const body=document.getElementById('rows'),answers=document.getElementById('answers');body.replaceChildren();answers.replaceChildren();
  for(const r of state.rows){const tr=document.createElement('tr');for(const value of [r.trial,r.ticker+' · '+r.question,r.answer?'Answer returned':r.task==='calculation'?'Deterministic route':'Withheld',((r.latencyMs||0)/1000).toFixed(2)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);
   const d=document.createElement('details'),s=document.createElement('summary'),p=document.createElement('pre');s.textContent=r.ticker+' · trial '+r.trial+' · '+r.question;p.textContent=r.answer||r.warning||'No answer';d.append(s,p);answers.append(d);}
  download.disabled=!state.rows.length;start.disabled=active||state.rows.length===queue.length;pause.disabled=!active;start.textContent=state.rows.length?'Resume remaining trials':'Run ${total} live trials';
 }
 async function step(){
  if(!active)return;
  const next=queue.find(c=>!state.rows.some(r=>r.caseId===c.id&&r.trial===c.trial));if(!next){active=false;status.textContent='Complete · '+queue.length+' / '+queue.length+' trials recorded · Download results for evidence review';paint();save();return;}
  const delay=Math.max(0,60000-(Date.now()-state.lastStarted));if(delay){status.textContent='Completed '+state.rows.length+' / '+queue.length+' · next request in '+Math.ceil(delay/1000)+' seconds';timer=setTimeout(step,Math.min(delay,1000));return;}
  state.lastStarted=Date.now();save();status.textContent='Running '+next.ticker+' · trial '+next.trial+' · '+(state.rows.length+1)+' / '+queue.length;
  try{const response=await fetch('/api/evaluation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:state.runId,caseId:next.id,trial:next.trial})});const result=await response.json();
   if(response.status===429){state.lastStarted=Date.now();status.textContent='Rate limit · waiting before retry';save();timer=setTimeout(step,60000);return;}
   if(!response.ok)throw Error(result.error||'Evaluation request failed');state.rows.push(result);save();paint();
  }catch(error){active=false;status.textContent='Paused after '+state.rows.length+' trials: '+error.message;paint();return;}
  if(active)timer=setTimeout(step,0);
 }
 start.addEventListener('click',()=>{active=true;paint();step();});pause.addEventListener('click',()=>{active=false;clearTimeout(timer);status.textContent='Paused · '+state.rows.length+' / '+queue.length+' recorded';paint();});
 download.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({kind:'live-outputs-awaiting-evidence-review',suiteVersion:config.version,runId:state.runId,results:state.rows},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='finn-live-'+queue.length+'-trials.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
 paint();if(state.rows.length)status.textContent=state.rows.length===queue.length?'Complete · '+queue.length+' / '+queue.length+' trials recorded':'Paused · '+state.rows.length+' / '+queue.length+' recorded';
 </script></body></html>`;
}
