// Explicit operator-run live evaluation. Never writes credentials to results.
import fs from 'node:fs';
import {loadEnv} from 'vite';
import {performance} from 'node:perf_hooks';
import {createResearchEngine,researchTask} from '../server/research-engine.mjs';
import {passagesFor} from '../src/retrieval.mjs';
if(!process.argv.includes('--live')){console.log('No API calls made. Run with --live after configuring backend keys locally. Results require human evidence review.');process.exit(0);}
const env={...loadEnv('development',process.cwd(),''),...process.env};
if(env.ENABLE_FREE_MODEL!=='true'||(!env.GROQ_API_KEY&&!env.GEMINI_API_KEY)){console.error('Backend keys are not configured locally; no live evaluation was run.');process.exit(2);}
const seed=JSON.parse(fs.readFileSync('public/data/seed.json'));
const heldout=JSON.parse(fs.readFileSync('evals/primary-cases.json')).cases.map(c=>({id:c.id,ticker:c.ticker,title:c.id,type:'Earnings-call transcript',url:c.url,period:c.period,passages:[{page:c.page,text:c.text}]}));
const cases=[['INFY','What did management say about operating margin?'],['INFY','Compare guidance and delivered results'],['INFY','What changed in cash conversion?'],['INFY','Calculate YoY growth'],['PERSISTENT','What did management say about cash flow?'],['PERSISTENT','Why did cash conversion change?'],['PERSISTENT','What evidence supports management guidance?'],['TATACONSUM','What do the documents say about revenue?'],['TATACONSUM','Discuss risks to cash generation'],['TATACONSUM','What evidence is missing for a financial comparison?'],['DABUR','What revenue growth is reported?'],['HAVELLS','What is reported about margins?']];
const results=[];
for(let trial=1;trial<=3;trial++)for(const [ticker,question] of cases){
 const engine=createResearchEngine(),docs=[...seed.documents,...heldout].filter(d=>d.ticker===ticker),passages=passagesFor(docs,question,{limit:researchTask(question)==='reason'?8:4}),start=performance.now();
 const result=await engine.research({ticker,question,passages,scope:'operator-evaluation'},env);
 const {stats,answer,warning,kind,grounding}=result;
 const row={ticker,question,trial,latencyMs:Math.round(performance.now()-start),answer:answer||null,warning:warning||null,kind:kind||null,grounding:grounding||null,failureCode:stats.failureCode||null,failureDetail:stats.failureDetail||null,providerCalls:stats.calls,cacheHits:stats.cacheHits,estimatedReservedTokens:stats.reservedTokens,stages:stats.stages,evidence:passages.map((p,i)=>({reference:i+1,url:p.document.url,page:p.page,text:p.text})),humanReview:{claimCorrectness:null,citationSupport:null,appropriateAbstention:null}};
 results.push(row);fs.writeFileSync('evals/live-review.json',JSON.stringify({kind:'live-outputs-awaiting-human-review',date:new Date().toISOString(),results},null,2)+'\n');
 console.log(JSON.stringify({ticker,trial,latencyMs:row.latencyMs,providerCalls:stats.calls,hasAnswer:!!answer,needsHumanReview:true}));
 // At most one research request per minute; provider account token limits may be lower.
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,60000-(performance.now()-start))));
}
