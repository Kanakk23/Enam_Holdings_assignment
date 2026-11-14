import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {cases} from '../evals/financial-cases.mjs';
import {validateFinancialCandidates,proseCandidates} from '../server/financial-extraction.mjs';
const output=process.argv[2]||'evals/contract-results.json';const rows=[];
for(let trial=1;trial<=3;trial++)for(const c of cases){const started=performance.now();const sources=[{reference:1,documentId:c.id,page:7,period:'FY2026',type:'Annual report',text:c.text}];const result=validateFinancialCandidates([c.candidate],sources,c.ticker||'UNSEEN','2026-11-14');const parser=validateFinancialCandidates(proseCandidates(sources),sources,c.ticker||'UNSEEN','2026-11-14');rows.push({case_id:c.id,trial,passed:(result.facts.length===1)===c.expected,expectedAcceptance:c.expected,accepted:result.facts.length,rejection:result.rejections[0]?.reason||null,parserRecords:parser.facts.length,latencyMs:+(performance.now()-started).toFixed(3),providerCalls:0,critical:!c.expected,cost_usd:0,trajectory:[]});}
const report={kind:'synthetic-contract-evaluation',limitations:'Three deterministic repetitions measure contract stability, not live model quality, source retrieval success, or real-company accuracy. Baseline has no automatic financial extraction.',cases:cases.length,trials:rows.length,passed:rows.filter(r=>r.passed).length,providerCalls:0,rows};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(output.replace('.json','.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync(output.replace('.json','-baseline.jsonl'),rows.map(r=>JSON.stringify({...r,passed:!r.expectedAcceptance,accepted:0,parserRecords:0,latencyMs:0})).join('\n')+'\n');
console.log(JSON.stringify({kind:report.kind,cases:report.cases,trials:report.trials,passed:report.passed,providerCalls:0}));if(report.passed!==rows.length)process.exitCode=1;
