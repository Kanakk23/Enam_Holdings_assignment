import test from 'node:test';import assert from 'node:assert/strict';
import {reportedUsage} from '../server/models.mjs';
test('Gemini quota usage includes thoughts rather than only visible candidates',()=>{
 assert.deepEqual(reportedUsage('gemini',{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:80,totalTokenCount:200}),{inputTokens:100,outputTokens:100,totalTokens:200,candidateTokens:20,thinkingTokens:80});
 assert.equal(reportedUsage('gemini',{promptTokenCount:100,candidatesTokenCount:20,totalTokenCount:200}).outputTokens,100);
 assert.equal(reportedUsage('gemini',{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:80}).outputTokens,100);
});
test('partial or malformed Gemini accounting does not authorize a speculative refund',()=>{
 for(const usage of [{promptTokenCount:100,candidatesTokenCount:20},{promptTokenCount:100,candidatesTokenCount:20,totalTokenCount:90},{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:10,totalTokenCount:90},{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:10,totalTokenCount:125},{promptTokenCount:100,candidatesTokenCount:'20'},{promptTokenCount:100,candidatesTokenCount:-1}])assert.equal(reportedUsage('gemini',usage).outputTokens,null);
 assert.deepEqual(reportedUsage('groq',{prompt_tokens:100,completion_tokens:30}),{inputTokens:100,outputTokens:30});
});
