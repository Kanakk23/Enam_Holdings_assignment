// Actual primary-statement pages, outside the seed; no LLM or credentials.
import {proseCandidates as beforeProse,validateFinancialCandidates as beforeValidate} from '../evals/completion-baseline-financial.mjs';
import fs from 'node:fs';import assert from'node:assert/strict';import{performance}from'node:perf_hooks';
import{pdfRows,tablePassages}from'../src/financial-tables.mjs';import{createResearchEngine}from'../server/research-engine.mjs';import{compareFacts,displayChange,sourceProof}from'../src/finance.mjs';
const suite=JSON.parse(fs.readFileSync('evals/annual-table-cases.json'));const rows=[],baselineRows=[],runs=[];
for(let trial=1;trial<=3;trial++)for(const c of suite.cases){const start=performance.now();const passages=tablePassages(pdfRows(c.items),c.page).map((p,i)=>({...p,id:c.sha256+':'+i}));const doc={id:c.sha256,ticker:c.ticker,type:c.type,url:c.url,title:'Held-out annual statement',period:c.expected[0].period,passages};
 const engine=createResearchEngine({fetcher:()=>{throw Error('A deterministic annual statement must not need a model.');}});
 const r=await engine.financial({ticker:c.ticker,passages:passages.map(p=>({...p,document:doc}))},{});
 const beforeSources=passages.map((p,i)=>({...p,reference:i+1,documentId:doc.id,type:doc.type,period:doc.period}));const before=beforeValidate(beforeProse(beforeSources),beforeSources,c.ticker);
 for(const e of c.expected){const actual=r.facts.find(f=>f.metric===e.metric&&f.period===e.period);const passed=!!actual&&['value','unit'].every(k=>actual[k]===e[k])&&sourceProof(actual,[doc]);rows.push({case_id:`${c.ticker}-${e.metric}-${e.period}`,trial,passed,critical:true,cost_usd:0,trajectory:[]});baselineRows.push({case_id:`${c.ticker}-${e.metric}-${e.period}`,trial,passed:before.facts.some(f=>f.metric===e.metric&&f.period===e.period&&f.value===e.value&&f.unit===e.unit),critical:true,cost_usd:0,trajectory:[]});}
 const changes={};for(const metric of Object.keys(c.expectedChanges)){const [a,b]=r.facts.filter(f=>f.metric===metric);changes[metric]=displayChange(compareFacts(a,b,'yoy'));assert.equal(changes[metric],c.expectedChanges[metric]);}
 const mutations=[t=>t.unit='INR lakh',t=>t.basis='standalone',t=>t.columns.reverse(),t=>t.header='',t=>t.rows.forEach(r=>r.values.reverse()),t=>t.columns[0].period='FY2099'];
 for(let n=0;n<mutations.length;n++){const bad=passages.map(p=>({...p,table:structuredClone(p.table)}));bad.forEach(p=>mutations[n](p.table));const result=await createResearchEngine().financial({ticker:c.ticker,passages:bad.map(p=>({...p,document:{...doc,passages:bad}}))},{});const row={case_id:`${c.ticker}-corrupt-${n}`,trial,passed:result.facts.length===0,critical:true,cost_usd:0,trajectory:[]};rows.push(row);baselineRows.push({...row,passed:before.facts.length===0});}
 const run={ticker:c.ticker,trial,extracted:r.facts.length,providerCalls:r.stats.calls,latencyMs:Math.round(performance.now()-start),changes};runs.push(run);
 console.log(JSON.stringify({ticker:c.ticker,trial,extracted:r.facts.length,providerCalls:r.stats.calls,latencyMs:Math.round(performance.now()-start),changes}));
}
fs.writeFileSync('evals/primary-table-results.json',JSON.stringify({kind:'held-out-real-statement-deterministic-extraction',date:new Date().toISOString(),scope:'Two manually inspected annual-statement pages, twelve facts, six changes. Not live-model quality or universal table support.',runs,checks:rows.length,passed:rows.filter(r=>r.passed).length,rows},null,2)+'\n');
fs.writeFileSync('evals/primary-table-baseline.jsonl',baselineRows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync('evals/primary-table-candidate.jsonl',rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
assert.ok(rows.every(r=>r.passed));
