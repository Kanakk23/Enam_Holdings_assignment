// Explicit operator-run evaluation. The hosted owner-only page uses this same suite.
// Never reads hosting secrets back into local code or writes credentials to results.
import fs from 'node:fs';
import {loadEnv} from 'vite';
import {performance} from 'node:perf_hooks';
import {createResearchEngine,researchTask,sourceInputs} from '../server/research-engine.mjs';
import {passagesFor} from '../src/retrieval.mjs';
import {liveCases,heldoutDocuments,suiteVersion} from '../evals/live-suite.mjs';
if(!process.argv.includes('--live')){console.log('No API calls made. Use --live with locally configured backend keys. Outputs need evidence review.');process.exit(0);}
const env={...loadEnv('development',process.cwd(),''),...process.env};
if(env.ENABLE_FREE_MODEL!=='true'||(!env.GROQ_API_KEY&&!env.GEMINI_API_KEY)){console.error('Backend keys are not configured locally; no live evaluation was run.');process.exit(2);}
const seed=JSON.parse(fs.readFileSync('public/data/seed.json'));
const results=[],runId=crypto.randomUUID(),queue=Array.from({length:3},(_,i)=>liveCases.map(c=>({...c,trial:i+1}))).flat();
for(const [index,c] of queue.entries()){
 const engine=createResearchEngine(),documents=[...seed.documents,...heldoutDocuments].filter(d=>d.ticker===c.ticker),task=researchTask(c.question);
 const passages=passagesFor(documents,c.question,{limit:task==='reason'?8:4}),sources=sourceInputs(passages,task==='reason'?1200:1800,c.question),startedAt=new Date().toISOString(),start=performance.now();
 const result=await engine.research({ticker:c.ticker,question:c.question,passages,scope:`evaluation:${runId}:${c.trial}`},env);
 const row={suiteVersion,runId,caseId:c.id,ticker:c.ticker,question:c.question,rubric:c.rubric,trial:c.trial,task,startedAt,latencyMs:Math.round(performance.now()-start),answer:result.answer||null,warning:result.warning||null,kind:result.kind||null,grounding:result.grounding||null,coverage:result.coverage||null,stats:result.stats,evidence:sources.map(s=>({...s,url:documents.find(d=>d.id===s.documentId)?.url})),review:{supported:null,periodAndBasis:null,abstention:null,notes:null}};
 results.push(row);fs.writeFileSync('evals/live-review.json',JSON.stringify({kind:'live-outputs-awaiting-evidence-review',suiteVersion,runId,results},null,2)+'\n');
 console.log(JSON.stringify({caseId:c.id,trial:c.trial,latencyMs:row.latencyMs,providerCalls:row.stats.calls,hasAnswer:!!row.answer,needsEvidenceReview:true}));
 if(index<queue.length-1)await new Promise(resolve=>setTimeout(resolve,Math.max(0,60000-(performance.now()-start))));
}
