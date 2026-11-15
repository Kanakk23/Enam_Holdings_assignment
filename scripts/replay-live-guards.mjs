import fs from 'node:fs';
import {citedClaims} from '../server/grounding.mjs';
import {checkedAnswer} from '../server/research-engine.mjs';
const path=process.argv[2];
if(!path)throw new Error('Pass a raw live-result JSON path.');
const raw=JSON.parse(fs.readFileSync(path,'utf8'));
const rows=raw.results.map(r=>{
 const retained=[],rejected=[];
 if(r.kind==='analysis'&&r.answer){
  for(const claim of citedClaims(r.answer,r.evidence)){
   const rendered=claim.text+' '+claim.evidence.map(s=>`[${s.reference}]`).join(' ');
   try{checkedAnswer(rendered,r.evidence);retained.push(rendered);}catch(error){rejected.push({text:claim.text,reason:error.detail||error.code});}
  }
 }
 return {caseId:r.caseId,trial:r.trial,originalAnswer:r.answer,retainedAnswer:r.kind==='analysis'?(retained.join('\n\n')||null):r.answer,rejected};
});
const report={kind:'offline-deterministic-guard-replay',inputFile:path,inputSuite:raw.suiteVersion,liveProviderCalls:0,scope:'Recheck previously displayed analytical claims with final deterministic guards. This is not a fresh live final-version generation benchmark.',rows};
fs.writeFileSync(path.replace(/-raw\.json$/,'-guard-replay.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({trials:rows.length,changedNotes:rows.filter(r=>r.rejected.length).length,rejectedClaims:rows.reduce((s,r)=>s+r.rejected.length,0),liveProviderCalls:0}));
