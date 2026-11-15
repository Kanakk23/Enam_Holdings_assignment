import test from 'node:test';import assert from 'node:assert/strict';
import {directExplanation,createResearchEngine} from '../server/research-engine.mjs';
const quote='Operating margins declined primarily on account of higher freight costs; management expects these costs to normalize next quarter.';
const source={reference:7,text:quote,documentId:'unseen',period:'See original'};
test('one explicit primary explanation uses a literal selection on an unseen issuer, preserving the original reference and forecast',async()=>{
 assert.equal(directExplanation('Why did margins decline?',[source]),source);let calls=0;
 const engine=createResearchEngine({fetcher:async(url,opt)=>{calls++;const body=JSON.parse(opt.body),input=JSON.parse(body.messages[1].content);assert.equal(body.model,'openai/gpt-oss-20b');assert.equal(input.passages.length,1);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:[{reference:input.passages[0].reference,quote,topic:'margin'}]})}}]});}});
 const result=await engine.research({ticker:'UNSEEN',question:'Why did margins decline?',passages:[{text:quote,page:4,document:{id:'unseen',title:'Original call',type:'Earnings-call transcript',period:'See original'}}]},{ENABLE_FREE_MODEL:'true',GROQ_API_KEY:'test-only-placeholder-key'});
 assert.equal(result.kind,'selected-evidence');assert.equal(result.answer,quote+' [1]');assert.equal(result.stats.resolution,'literal-explanation');assert.equal(calls,1);
});
test('future, multi-source, explicit-period and comparative questions do not receive a single-explanation shortcut',()=>{
 assert.equal(directExplanation('Why did margins decline?',[source,{...source,reference:8}]),null);
 assert.equal(directExplanation('Why did margins change?',[{...source,text:'Management said margins may improve next year because freight costs could fall.'}]),null);
 for(const q of ['Why did margins change across different years?','Why did margins decline in FY2027 Q2?','Why did profit decline while cash improved?'])assert.equal(directExplanation(q,[source]),null);
});
