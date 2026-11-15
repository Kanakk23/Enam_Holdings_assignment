import fs from 'node:fs';
import assert from 'node:assert/strict';
import {liveCases} from '../evals/live-suite.mjs';
const paths=process.argv.slice(2);
if(!paths.length)throw new Error('Pass raw live-result JSON files.');
const allowed={groq:new Set(['openai/gpt-oss-20b','openai/gpt-oss-120b']),gemini:new Set(['gemini-3.5-flash-lite','gemini-3.8-flash'])};
const spec=Object.fromEntries(liveCases.map(c=>[c.id,{expected:[],match:'superset',args_match:'ignore',max_calls:['infy-arithmetic','havells-missing-margin'].includes(c.id)?0:3}]));
fs.writeFileSync('evals/live-trajectory-spec.json',JSON.stringify(spec,null,2)+'\n');
for(const path of paths){
 const raw=JSON.parse(fs.readFileSync(path,'utf8')),findings=[];
 assert.equal(raw.results.length,36,'All twelve cases, all three trials must remain.');
 assert.equal(new Set(raw.results.map(r=>r.caseId+':'+r.trial)).size,36);
 for(const row of raw.results){
  assert.ok(liveCases.some(c=>c.id===row.caseId));assert.ok([1,2,3].includes(row.trial));
  const stages=row.stats.stages;
  assert.equal(stages.length,row.stats.calls);assert.ok(stages.length<=spec[row.caseId].max_calls);
  assert.equal(row.stats.cacheHits,0,'Fresh-trial benchmark must not reuse answer cache.');
  for(const stage of stages){assert.ok(allowed[stage.provider]?.has(stage.model));assert.ok(['extract','reason','verify'].includes(stage.purpose));assert.ok(stage.durationMs<=10500);}
  if(row.kind==='analysis'&&row.answer){
   const writer=stages.find(s=>s.purpose==='reason'&&s.outcome==='completed'),verifier=stages.find(s=>s.purpose==='verify'&&s.outcome==='completed');
   assert.ok(writer&&verifier,'Displayed analysis needs completed writer and verifier.');assert.notEqual(writer.model,verifier.model);
  }
  assert.ok(row.latencyMs<=31000);
 }
 const report={kind:'recorded-model-stage-audit',rawFile:path,suiteVersion:raw.suiteVersion,trials:raw.results.length,passed:true,checks:['complete three-trial case set','recorded call ceiling','allowlisted model stages','fresh-cache isolation','separate completed verifier for displayed analysis','recorded stage/deadline bounds','zero-call arithmetic and missing-margin retrieval paths'],limits:['Audits recorded model stages; does not establish citation support, answer usefulness, provider-internal behaviour or all application actions.'],findings};
 fs.writeFileSync(path.replace(/-raw\.json$/,'-trajectory-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}
