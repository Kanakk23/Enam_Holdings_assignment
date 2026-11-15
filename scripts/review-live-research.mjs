// Aggregate evidence-reviewed labels. This script does not use model self-grading.
import fs from 'node:fs';
const labelPath=process.argv[2];
if(!labelPath)throw new Error('Usage: node scripts/review-live-research.mjs evals/live-baseline-review.json');
const review=JSON.parse(fs.readFileSync(labelPath,'utf8'));
const raw=JSON.parse(fs.readFileSync(review.rawFile,'utf8'));
if(raw.results.length!==36)throw new Error('Keep all 36 trials, including failures.');
const rows=raw.results.map(r=>{
 const label=review.labels.find(x=>x.caseId===r.caseId&&x.trial===r.trial);
 if(!label||typeof label.passed!=='boolean'||!label.notes)throw new Error(`Missing review ${r.caseId}:${r.trial}`);
 return {case_id:r.caseId,trial:r.trial,passed:label.passed,critical:r.caseId==='havells-missing-margin',latency_ms:r.latencyMs,review:label,trajectory:r.stats.stages.map(s=>({tool:`${s.purpose}:${s.provider}`,args:{model:s.model},outcome:s.outcome,code:s.code||null}))};
});
const cases=[...new Set(rows.map(r=>r.case_id))].map(id=>{const trials=rows.filter(r=>r.case_id===id);if(trials.length!==3||new Set(trials.map(r=>r.trial)).size!==3)throw new Error('Three distinct trials required');return {caseId:id,passed:trials.map(r=>r.passed),passAt3:trials.some(r=>r.passed),passAll3:trials.every(r=>r.passed)};});
const sorted=raw.results.map(r=>r.latencyMs).sort((a,b)=>a-b),q=p=>sorted[Math.ceil(p*sorted.length)-1];
const stages=raw.results.flatMap(r=>r.stats.stages),known=stages.filter(s=>Number.isFinite(s.usage?.inputTokens)&&Number.isFinite(s.usage?.outputTokens));
const displayed=raw.results.filter(r=>r.answer);
const summary={reviewer:'coding-agent evidence review; not independent human annotation',suiteVersion:raw.suiteVersion,rawFile:review.rawFile,trials:rows.length,issuers:new Set(raw.results.map(r=>r.ticker)).size,cases:cases.length,passedTrials:rows.filter(r=>r.passed).length,passAt3Cases:cases.filter(r=>r.passAt3).length,passAll3Cases:cases.filter(r=>r.passAll3).length,displayedNotes:displayed.length,fullySupportedDisplayedNotes:review.labels.filter(l=>raw.results.some(r=>r.caseId===l.caseId&&r.trial===l.trial&&r.answer)&&l.supported===true&&l.periodAndBasis===true).length,latencyMs:{median:q(.5),p95:q(.95),includes:'model endpoint execution; excludes retrieval/download/PDF parsing and one-minute trial spacing'},providerAttempts:stages.length,failedAttempts:stages.filter(s=>s.outcome==='failed').length,cacheHits:raw.results.reduce((s,r)=>s+r.stats.cacheHits,0),recordedInputAndOutputTokens:known.reduce((s,r)=>s+r.usage.inputTokens+r.usage.outputTokens,0),attemptsWithUnknownUsage:stages.length-known.length,tokenAccountingNote:raw.suiteVersion==='live-12x3-v3'?'Gemini output uses reported total minus input (including thoughts) when available. Unknown usage remains unknown.':'Earlier Gemini traces retained candidatesTokenCount but not thoughts/total tokens. Recorded counts are incomplete lower bounds; no complete token-saving claim.',costUsd:null,caseResults:cases,limits:['Twelve correlated questions across five issuers, not broad all-company accuracy.','The arithmetic case tests routing only; the missing-margin case expects abstention.','Sequential external-provider conditions are not controlled.','No verifier recall estimate: rejected drafts are not retained.']};
const prefix=labelPath.replace(/-review\.json$/,'');
fs.writeFileSync(`${prefix}.jsonl`,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync(`${prefix}-summary.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
