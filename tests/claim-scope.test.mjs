import test from 'node:test';
import assert from 'node:assert/strict';
import {checkClaimScope} from '../server/claim-scope.mjs';

test('annual guidance announced in a quarter retains its annual target horizon',()=>{
 const source='Based on Q2 performance and the outlook for the rest of the year, our revenue growth guidance is 1% to 2%.';
 for(const quarter of ['Q1','Q2','Q3','Q4'])assert.throws(()=>checkClaimScope(`For FY2027 ${quarter}, the company guided revenue growth of 1% to 2%.`,source),e=>e.detail==='ambiguous_annual_guidance_horizon');
 assert.ok(checkClaimScope('At its FY2027 Q2 call, the company gave full-year revenue growth guidance of 1% to 2%.',source));
 assert.ok(checkClaimScope('Full-year revenue growth guidance is 1% to 2%.',source));
 assert.ok(checkClaimScope('Q2 revenue guidance is 1% to 2%.','Management gave Q2 revenue guidance of 1% to 2%.'));
});
test('generated cross-period numeric movements route to deterministic comparisons regardless of direction',()=>{
 for(const verb of ['declined','increased','fell','rose'])for(const [a,b] of [[111,106],[106,111],[116.5,113]])assert.throws(()=>checkClaimScope(`Adjusted cash conversion ${verb} to ${a}% after being ${b}% for the full year.`,'Original facts are available.'),e=>e.detail==='numeric_comparison_requires_calculator');
 assert.throws(()=>checkClaimScope('Conversion fell from 116.5% in FY2027 Q1 to 113% in FY2027 Q2.','Both original facts are available.'),e=>e.detail==='numeric_comparison_requires_calculator');
 assert.throws(()=>checkClaimScope('Adjusted cash flow conversion fell to 111% for the quarter and 106% for the full year.','Adjusted cash flow conversion was 111% for the quarter and 106% for the full year.'),e=>e.detail==='numeric_comparison_requires_calculator');
 assert.throws(()=>checkClaimScope('Conversion was 113% in Q2, down from 116.5% in Q1.','Both original facts are available.'),e=>e.detail==='numeric_comparison_requires_calculator');
 assert.ok(checkClaimScope('Q2 adjusted cash conversion was 111%.','Q2 adjusted cash conversion was 111%.'));
 assert.ok(checkClaimScope('Operating margin improved by 20 bps to 21.1%.','Operating margin improved by 20 bps to 21.1%.'));
});
test('management expectation at the end does not attribute a preceding causal assertion',()=>{
 const explanation='A higher proportion of unbilled revenue was the cause, which management expects to normalize.';
 assert.throws(()=>checkClaimScope('Cash conversion declined because unbilled revenue increased, and management expects normalization.',explanation),e=>e.detail==='unattributed_causal_explanation');
 for(const text of ['Management said cash conversion declined because unbilled revenue increased.','According to management, cash conversion declined due to unbilled revenue.','The company attributed the decline to unbilled revenue.'])assert.ok(checkClaimScope(text,explanation));
});
test('absence from an excerpt cannot become absence from an entire report',()=>{
 for(const text of ['The transcript does not provide evidence supporting guidance.','The total revenue amount is not broken out by segment.','Operating profit is mentioned without providing actual operating profit numbers.'])assert.throws(()=>checkClaimScope(text,'An excerpt.'),e=>e.detail==='absence_must_be_scoped_to_retrieved_evidence');
 assert.ok(checkClaimScope('The supplied passages do not provide actual operating profit values.','An excerpt.'));
 assert.ok(checkClaimScope('The statement lacks quantitative values for smaller markets.','An excerpt.'));
});

test('absence verification receives other retrieved passages that may contradict a local absence claim',async()=>{
 const {createResearchEngine}=await import('../server/research-engine.mjs');let verified=false;
 const engine=createResearchEngine({fetcher:async(url,options)=>{
  const body=JSON.parse(options.body),input=JSON.parse(url.includes('googleapis')?body.contents[0].parts[0].text:body.messages[1].content);
  let text;
  if(input.claims){verified=true;assert.equal(input.retrievedContext.length,2);assert.ok(input.retrievedContext.some(s=>s.text.includes('1000 crore')));text=JSON.stringify({items:input.claims.map(c=>({index:c.index,verdict:'unsupported',reason:'Total revenue is present in another retrieved passage.'}))});}
  else text=JSON.stringify({claims:[{text:'The supplied passages do not provide total revenue for the comparison.',references:[2]}]});
  return Response.json(url.includes('googleapis')?{candidates:[{finishReason:'STOP',content:{parts:[{text}]}}]}:{choices:[{finish_reason:'stop',message:{content:text}}]});
 }});
 const passages=['Total revenue was INR 1000 crore for the year.','Company A represented a share of total revenue.'].map((text,i)=>({page:i+1,text,document:{id:'doc'+i,type:'Annual report',period:'FY2026'}}));
 const result=await engine.research({ticker:'UNSEEN',question:'What evidence is missing for a financial comparison?',passages},{ENABLE_FREE_MODEL:'true',GROQ_API_KEY:'test-only-placeholder-key',GEMINI_API_KEY:'test-only-placeholder-key'});
 assert.equal(verified,true);assert.equal(result.answer,undefined);assert.equal(result.stats.calls,2);
});
