import fs from 'node:fs';
import {checkedAnswer as baseline} from '../evals/availability-baseline-engine.mjs';
import {checkedAnswer as candidate} from '../server/research-engine.mjs';
const annual=[{reference:1,period:'FY2027-Q2',text:'Based on Q2 performance and the revised outlook for the rest of the year, our revenue growth guidance is 1% to 2%. Our full-year operating margin guidance remains at 20% to 22%.'}];
const cash=[{reference:1,period:'FY2026-Q4',text:'Adjusted free cash flow as a percentage of net profit was 106% for FY26 and 111% for Q4.'}];
const cause=[{reference:1,period:'See original document',text:'Management said this decline in operational cash flow to PAT was primarily on account of a higher proportion of unbilled revenue, which we expect to normalize in the next quarter.'}];
const cases=[
 ['annual-labelled-quarter','For FY2027 Q2, revenue growth guidance is 1% to 2%. [1]',annual,false],
 ['wrong-generated-direction','Adjusted cash conversion declined to 111% in FY26 Q4 after being 106% for the full year. [1]',cash,false],
 ['right-generated-direction-still-calculator','Adjusted cash conversion increased to 111% in FY26 Q4 after being 106% for the full year. [1]',cash,false],
 ['unattributed-cause','Cash flow declined because unbilled revenue increased, and management expects it to normalize next quarter. [1]',cause,false],
 ['annual-horizon-explicit','At its FY2027 Q2 call, management gave full-year revenue growth guidance of 1% to 2%. [1]',annual,true],
 ['annual-without-quarter','Full-year operating margin guidance remains at 20% to 22%. [1]',annual,true],
 ['actual-single-period','Adjusted FY26 Q4 cash flow conversion was 111%. [1]',cash,true],
 ['attributed-cause','Management said cash flow declined because of higher unbilled revenue, which it expects to normalize next quarter. [1]',cause,true],
 ['literal-reported-movement','Operating margin improved by 20 bps to 21.1%. [1]',[{reference:1,period:'FY2027-Q2',text:'Operating margin improved by 20 bps to 21.1%.'}],true],
].map(([id,text,evidence,accepted])=>({id,text,evidence,accepted}));
fs.writeFileSync('evals/claim-scope-cases.json',JSON.stringify({scope:'synthetic deterministic product-boundary checks, not live AI accuracy',cases},null,2)+'\n');
for(const [name,validator] of [['baseline',baseline],['candidate',candidate]]){
 const rows=[];
 for(const c of cases)for(let trial=1;trial<=3;trial++){
  let accepted=true,detail=null;try{validator(c.text,c.evidence);}catch(error){accepted=false;detail=error.detail||error.code;}
  rows.push({case_id:c.id,trial,passed:accepted===c.accepted,critical:!c.accepted,cost_usd:0,accepted,expectedAccepted:c.accepted,detail});
 }
 fs.writeFileSync(`evals/claim-scope-${name}.jsonl`,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
 console.log(JSON.stringify({scope:'synthetic claim-scope contract only',name,passed:rows.filter(r=>r.passed).length,trials:rows.length,cases:cases.length}));
}
