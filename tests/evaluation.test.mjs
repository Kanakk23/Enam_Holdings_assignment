import test from 'node:test';import assert from 'node:assert/strict';
import {createEvaluationService,evaluationAuthorized} from '../server/evaluation.mjs';
import {liveCases,heldoutDocuments} from '../evals/live-suite.mjs';
const owner='owner-test-id',env={AI_EVALUATION_ENABLED:'true',AI_EVALUATION_OWNER_ID:owner,ASSETS:{fetch:async()=>Response.json({documents:[]})}};
const request=(body,who=owner,path='/api/evaluation')=>new Request('https://finn.example'+path,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':who,origin:'https://finn.example'},...(body?{body:JSON.stringify(body)}:{})});
const body={runId:'00000000-0000-4000-8000-000000000000',caseId:'dabur-growth',trial:1};
test('evaluation is off by default and requires the configured owner',async()=>{
 let calls=0;const service=createEvaluationService({engineFactory:()=>{calls++;throw Error();}});
 for(const [req,config] of [[request(body),{}],[request(body),{...env,AI_EVALUATION_ENABLED:'false'}],[request(body,'someone-else'),env],[request(null,'someone-else','/ops/evaluation'),env]])assert.equal((await service.fetch(req,config)).status,404);
 assert.equal(calls,0);assert.equal(evaluationAuthorized(request(body),env),true);
});
test('the fixed suite has twelve distinct cases, three issuers in seed and two held-out primary excerpts',()=>{
 assert.equal(liveCases.length,12);assert.equal(new Set(liveCases.map(c=>c.id)).size,12);assert.equal(new Set(liveCases.map(c=>c.ticker)).size,5);
 assert.deepEqual(heldoutDocuments.map(d=>d.ticker).sort(),['DABUR','HAVELLS']);assert.ok(heldoutDocuments.every(d=>d.type==='Earnings-call transcript'&&d.url.startsWith('https://nsearchives.nseindia.com/')));
});
test('evaluation rejects arbitrary prompts, model controls, invalid cases and trials before making calls',async()=>{
 let calls=0;const service=createEvaluationService({engineFactory:()=>{calls++;throw Error();}});
 for(const b of [{...body,trial:4},{...body,runId:'bad'},{...body,caseId:'not-in-suite'},{...body,apiKey:'test-only-key'},{...body,question:'Arbitrary prompt'}])assert.equal((await service.fetch(request(b),env)).status,400);
 assert.equal(calls,0);
});
test('fresh trials avoid answer caches; duplicate deliveries replay the original result without provider calls',async()=>{
 let time=0,calls=0;const service=createEvaluationService({now:()=>time,engineFactory:()=>({research:async input=>{calls++;assert.ok(input.scope.includes('evaluation:'));return{answer:'A literal source-supported answer [1]',kind:'selected-evidence',stats:{calls:1,cacheHits:0,stages:[]}};}})});
 const first=await(await service.fetch(request(body),env)).json();assert.equal(first.trial,1);assert.equal(first.evidence[0].period,'FY2026-Q4');
 assert.equal((await(await service.fetch(request(body),env)).json()).replayed,true);assert.equal(calls,1);
 assert.equal((await service.fetch(request({...body,trial:2}),env)).status,429);
 time+=60000;assert.equal((await service.fetch(request({...body,trial:2}),env)).status,200);assert.equal(calls,2);
});
test('private operator page contains no keys or model configuration and uses nonce CSP',async()=>{
 const response=await createEvaluationService().fetch(request(null,owner,'/ops/evaluation'),{...env,GROQ_API_KEY:'private-test-key-value'}),html=await response.text();
 assert.equal(response.status,200);assert.ok(!html.includes('private-test-key-value'));assert.ok(!/gpt-oss|gemini-|GROQ_API_KEY/.test(html));assert.match(html,/Run 36 live trials/);assert.match(response.headers.get('Content-Security-Policy'),/script-src 'nonce-/);
});
test('cross-origin operational requests are rejected',async()=>{
 const req=request(body);const malicious=new Request(req,{headers:{'oai-authenticated-user-id':owner,origin:'https://elsewhere.example'}});
 assert.equal((await createEvaluationService().fetch(malicious,env)).status,403);
});
test('targeted guard rerun uses only three declared failure cases and a distinct progress namespace',async()=>{
 const response=await createEvaluationService().fetch(request(null,owner,'/ops/evaluation?suite=scope-guards'),env),html=await response.text();
 assert.equal(response.status,200);assert.match(html,/Run 9 live trials/);assert.match(html,/scope-guards-v1/);
 for(const id of ['infy-guidance','infy-cash','persistent-cause'])assert.ok(html.includes(id));
 for(const id of ['dabur-growth','tataconsum-revenue','infy-arithmetic'])assert.ok(!html.includes(id));
});
test('a verified gateway email can match the native owner when account-user and authenticated-user IDs differ',()=>{
 const config={AI_EVALUATION_ENABLED:'true',AI_EVALUATION_OWNER_EMAIL:'owner@example.test'};
 const req=new Request('https://finn.example/ops/evaluation',{headers:{'oai-authenticated-user-id':'different-id-namespace','oai-authenticated-user-email':'Owner@Example.Test'}});
 assert.equal(evaluationAuthorized(req,config),true);
 assert.equal(evaluationAuthorized(req,{...config,AI_EVALUATION_ENABLED:'false'}),false);
 assert.equal(evaluationAuthorized(req,{...config,AI_EVALUATION_OWNER_EMAIL:'someone-else@example.test'}),false);
});
