// Frozen checkedAnswer from Site source 7e42fc2; synthetic contract baseline.
import {ModelError} from "../server/models.mjs";
const numericTokens = text => (text.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => n.replaceAll(",", "").replace(/\.0+$/, ""));
export function checkedAnswer(answer, sources) {
  if (typeof answer !== "string" || answer.split(/\s+/).length > 220) throw new ModelError("citations");
  const refs = [...answer.matchAll(/\[(\d+)\]/g)].map(m => +m[1]);
  if (!refs.length || refs.some(n => !sources.some(p => p.reference === n))) throw new ModelError("citations");
  // Numerical invention is blocked. This does not prove semantic entailment.
  const allowed = new Set(sources.filter(p => refs.includes(p.reference)).flatMap(p => numericTokens(p.text)));
  if (numericTokens(answer.replace(/\[\d+\]/g, "")).some(n => !allowed.has(n))) throw new ModelError("numbers");
  for (const chunk of answer.matchAll(/([\s\S]*?)((?:\[\d+\]\s*)+)/g)) {
    const references=[...chunk[2].matchAll(/\[(\d+)\]/g)].map(m=>+m[1]);
    const evidence=sources.filter(s=>references.includes(s.reference)).map(s=>s.text).join(" ");
    const localNumbers=new Set(numericTokens(evidence));
    if(numericTokens(chunk[1]).some(n=>!localNumbers.has(n)))throw new ModelError("numbers");
    if(/permanently|guaranteed|all execution risks|risk.free|no risks/i.test(chunk[1]) && !evidence.toLowerCase().includes(chunk[1].trim().toLowerCase()))throw new ModelError("evidence");
    const words=chunk[1].toLowerCase().match(/[a-z]{5,}/g)||[];
    if(words.length && !words.some(w=>evidence.toLowerCase().includes(w)))throw new ModelError("evidence");
  }
  return answer;
}
