import {ModelError} from './models.mjs';
export const absenceClaim=text=>/\b(?:missing|unavailable|insufficient|incomplete)\b|\bno (?:actual|specific|quantitative)\b|\bnot given\b|\b(?:does|do|did) not (?:provide|include|contain|report)|\b(?:not|no) (?:provided|included|reported|supplied|available|broken out|evidence|information)|\bwithout (?:providing|actual|the actual)|\b(?:cannot|can't) be (?:calculated|assessed|compared)|\blacks? (?:quantitative|actual|specific|evidence)/i.test(text);

// Conservative product boundaries, not a replacement for semantic verification.
// Numeric comparisons belong in the deterministic comparison UI. Annual targets
// and attributed explanations must keep their scope even if a verifier agrees.
export function checkClaimScope(text,evidence){
 const reject=detail=>{const error=new ModelError('evidence');error.detail=detail;throw error;};
 const guidance=/\b(?:guidance|guided|outlook|target)\b/i;
 const annual=/\bfull[ -]year\b|\bannual\b|\bfinancial year\b|\bfiscal year\b|\brest of (?:the )?year\b|\bentire year\b/i;
 if(guidance.test(text)&&/\bQ[1-4]\b|\bquarter(?:ly)?\b/i.test(text)&&guidance.test(evidence)&&annual.test(evidence)&&!annual.test(text))reject('ambiguous_annual_guidance_horizon');
 if(absenceClaim(text)&&!/\b(?:supplied|retrieved|quoted|cited|provided) (?:primary[ -]source )?(?:passages?|excerpts?|evidence|context)\b|\b(?:this|the) (?:passage|excerpt|statement)\b/i.test(text))reject('absence_must_be_scoped_to_retrieved_evidence');

 const withoutPeriods=text.replace(/\bFY\s*['’]?(?:20\d{2}|\d{2})\b|\bQ[1-4]\b|\b20\d{2}\b/gi,'');
 const numbers=new Set(withoutPeriods.match(/\d[\d,]*(?:\.\d+)?/g)||[]);
 const literal=evidence.replace(/\s+/g,' ').includes(text.replace(/\s+/g,' ').trim());
 if(numbers.size>1&&/\b(?:increased|decreased|fell|declined|rose|dropped|improved|deteriorated|expanded|contracted|higher|lower|down|up)\b/i.test(text)&&!literal)reject('numeric_comparison_requires_calculator');

 const causal=text.search(/\bbecause\b|\bdue to\b|\bdriven by\b|\bled to\b|\bcaused by\b|\bon account of\b/i);
 if(causal>=0){
  const prefix=text.slice(0,causal);
  if(!/\b(?:management|the issuer|the company|the CFO|the CEO)\b[\s\S]*\b(?:said|stated|reported|attributed|explained|described|expects?|expected|indicated|noted)\b|\baccording to (?:management|the issuer|the company)\b/i.test(prefix))reject('unattributed_causal_explanation');
 }
 return text;
}
