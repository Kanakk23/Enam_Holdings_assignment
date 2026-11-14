// Synthetic answer-contract regression, not live model accuracy.
import fs from 'node:fs';
import {checkedAnswer as baseline} from '../evals/live-baseline-answer.mjs';
import {checkedAnswer as candidate} from '../server/research-engine.mjs';
const sources=[{reference:1,period:'FY2027-Q2',text:'Q2 operating margin was 21%.'},{reference:2,period:'FY2026-Q2',text:'Q2 operating margin was 20%.'}];
const duration=[{reference:1,period:'FY2027-Q3',text:'Adjusted cash conversion for 9 months stood at 117.8%. Adjusted operating margin was 21.2%.'}];
const cases=[
 ['short-year','In FY27, Q2 operating margin was 21%. [1]',true],
 ['full-year','In FY2027, Q2 operating margin was 21%. [1]',true],
 ['quoted-year',"In FY '27, Q2 operating margin was 21%. [1]",true],
 ['two-periods','In FY27 operating margin was 21%. [1] In FY26 operating margin was 20%. [2]',true],
 ['literal-number','Operating margin was 21%. [1]',true],
 ['invented-percentage','In FY27 operating margin was 27%. [1]',false],
 ['invented-currency','In FY27 operating margin was INR 27. [1]',false],
 ['wrong-year','In FY99 operating margin was 21%. [1]',false],
 ['misbound-period','In FY26 operating margin was 21%. [1]',false],
 ['misbound-number','Operating margin was 20%. [1]',false],
 ['unknown-reference','Operating margin was 21%. [9]',false],
 ['uncited','Operating margin was 21%.',false],
 ['cumulative-omitted','Q3 adjusted cash conversion was 117.8%. [1]',false,duration],
 ['cumulative-retained','Adjusted cash conversion for 9 months was 117.8%. [1]',true,duration],
 ['adjusted-omitted','Operating margin was 21.2%. [1]',false,duration],
 ['adjusted-retained','Adjusted operating margin was 21.2%. [1]',true,duration],
];
for(const [name,check] of Object.entries({baseline,candidate})){
 const rows=[];for(let trial=1;trial<=3;trial++)for(const [case_id,answer,expected,evidence=sources] of cases){let accepted=false;try{check(answer,evidence);accepted=true;}catch{}rows.push({case_id,trial,passed:accepted===expected,critical:!expected,cost_usd:0,trajectory:[]});}
 fs.writeFileSync(`evals/answer-period-${name}.jsonl`,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
 console.log(JSON.stringify({scope:'synthetic answer validation only',name,passed:rows.filter(r=>r.passed).length,trials:rows.length,cases:cases.length}));
}
