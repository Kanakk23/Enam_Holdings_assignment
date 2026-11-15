import {liveCases,heldoutDocuments,suiteVersion} from '../evals/live-suite.mjs';
import {createResearchEngine,researchTask,sourceInputs} from './research-engine.mjs';
import {passagesFor} from '../src/retrieval.mjs';
import {evaluationPage} from './evaluation-page.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function evaluationAuthorized(request,env){
 if(env.AI_EVALUATION_ENABLED!=='true')return false;
 const idMatches=!!env.AI_EVALUATION_OWNER_ID&&request.headers.get('oai-authenticated-user-id')===env.AI_EVALUATION_OWNER_ID;
 const email=request.headers.get('oai-authenticated-user-email');
 const emailMatches=!!env.AI_EVALUATION_OWNER_EMAIL&&!!email&&email.trim().toLowerCase()===env.AI_EVALUATION_OWNER_EMAIL.trim().toLowerCase();
 return idMatches||emailMatches;
}
export function createEvaluationService({engineFactory=createResearchEngine,now=()=>Date.now()}={}){
 const completed=new Map();let lastStarted=-Infinity,inflight=false;
 return {async fetch(request,env){
  if(!evaluationAuthorized(request,env))return json({error:'Not found'},404);
  const url=new URL(request.url);
  if(url.pathname==='/ops/evaluation'&&request.method==='GET'){
   const nonce=crypto.randomUUID(),focused=url.searchParams.get('suite')==='scope-guards';
   const cases=focused?liveCases.filter(c=>['infy-guidance','infy-cash','persistent-cause'].includes(c.id)):liveCases;
   return new Response(evaluationPage(cases,focused?suiteVersion+'-scope-guards-v1':suiteVersion,nonce),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`,'X-Content-Type-Options':'nosniff'}});
  }
  if(url.pathname!=='/api/evaluation'||request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Requests must originate from FINN.'},403);
  const text=await request.text();if(text.length>1000)return json({error:'Invalid evaluation request'},400);
  let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid evaluation request'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['runId','caseId','trial'].includes(k))||!/^[-a-z0-9]{20,64}$/.test(body.runId||'')||![1,2,3].includes(body.trial))return json({error:'Invalid evaluation request'},400);
  const c=liveCases.find(c=>c.id===body.caseId);if(!c)return json({error:'Unknown evaluation case'},400);
  const key=`${body.runId}:${c.id}:${body.trial}`,hit=completed.get(key);if(hit)return json({...hit,replayed:true});
  if(inflight||now()-lastStarted<55000)return json({error:'Wait at least one minute between live trials.'},429);
  inflight=true;lastStarted=now();
  try{
   const seed=await(await env.ASSETS.fetch(new Request(new URL('/data/seed.json',url)))).json();
   const documents=[...seed.documents,...heldoutDocuments].filter(d=>d.ticker===c.ticker),task=researchTask(c.question);
   const passages=passagesFor(documents,c.question,{limit:task==='reason'?8:4}),sources=sourceInputs(passages,task==='reason'?1200:1800,c.question),started=now();
   // Fresh engine per distinct trial deliberately avoids memo/cooldown carryover.
   // The endpoint is owner-only, opt-in, rate-limited and accepts fixed cases only.
   const result=await engineFactory().research({ticker:c.ticker,question:c.question,passages,scope:`evaluation:${body.runId}:${body.trial}`},env);
   const row={suiteVersion,runId:body.runId,caseId:c.id,ticker:c.ticker,question:c.question,rubric:c.rubric,trial:body.trial,task,startedAt:new Date(started).toISOString(),latencyMs:now()-started,answer:result.answer||null,warning:result.warning||null,kind:result.kind||null,grounding:result.grounding||null,coverage:result.coverage||null,stats:result.stats,evidence:sources.map(s=>({...s,url:documents.find(d=>d.id===s.documentId)?.url})),review:{supported:null,periodAndBasis:null,abstention:null,notes:null}};
   completed.set(key,row);while(completed.size>72)completed.delete(completed.keys().next().value);
   if(env.AI_LOG_USAGE==='true')console.info(JSON.stringify({event:'evaluation_usage',caseId:c.id,trial:body.trial,...result.stats}));
   return json(row);
  }catch{return json({error:'The evaluation service could not complete this trial. Retry after the cooldown.'},502);}
  finally{inflight=false;}
 }};
}
