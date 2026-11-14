export function plainTitle(value='') {
 return String(value).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g,m=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '})[m]).replace(/\s+/g,' ').trim();
}
export function eventContext(e) {
 const raw=plainTitle(e.rawTitle || e.title), t=raw.toLowerCase();
 let label='Company disclosure',score=10,reason='Disclosure located; substance requires verification.',question='Which business assumptions could this disclosure change, and what primary evidence supports that?';
 if(/annual report/.test(t)){label='Annual report';score=25;reason='Newly indexed research evidence; this is an archive item.';question='What changed in reported growth, margins and cash generation across the annual reporting periods?';}
 if(/earnings call transcript|earnings discussion|transcript of.*(?:earnings|financial)/.test(t)){label='Earnings-call transcript';score=60;reason='Management commentary is available to check against reported performance.';question='How does management explain the changes in growth, margins and cash generation, and what remains unverified?';}
 if(/financial results|unaudited results|audited results/.test(t)&& !/notice|intimation.*meeting|schedule|transcript|reference to/.test(t)){label='Financial results';score=80;reason='Reported performance may update the investment assumptions; figures need source verification.';question='Which reported financial movements change the growth or cash-generation assumptions, on a comparable period and basis?';}
 if(/acquisition|divest|merger|amalgamation|order win|resignation|chief financial officer|litigation|default/.test(t)){label=/resignation|chief financial officer/.test(t)?'Leadership change':'Business or capital event';score=90;reason='Potential change to execution, governance or capital allocation; terms need verification.';question='What do the disclosed terms establish about execution or capital-allocation risk, and which details are still missing?';}
 if(/allotment|esop|trading window|postal ballot|newspaper|prize|award|loss of share|duplicate|commercial paper|record date|investor meet|schedule of|intimation.*meeting/.test(t)){score=0;label='Routine disclosure';reason='Administrative update; retained for reference.';}
 const subject=raw.replace(/^Announcement under Regulation 30 \(LODR\)\s*[-–:]?\s*/i,'').replace(/\s*[-–]\s*\d{1,2}\s+[A-Za-z]{3}\s*[-–].*$/,'');
 if(label==='Business or capital event'||label==='Leadership change')label=subject.length>100?subject.slice(0,97)+'…':subject;
 return {...e,rawTitle:raw,title:`${e.ticker} · ${label}`,rank:100-score,priority:score>=60?'Review':'Routine',description:reason,question:e.historical&&e.question?e.question:question};
}
export function selectAttention(events,limit=5){const sorted=events.map(eventContext).sort((a,b)=>a.rank-b.rank||b.date.localeCompare(a.date));const seen=new Set();const important=sorted.filter(e=>{if(e.priority!=='Review'||seen.has(e.ticker))return false;seen.add(e.ticker);return true;}).slice(0,limit);const ids=new Set(important.map(e=>e.id));return {important,ordinary:sorted.filter(e=>!ids.has(e.id))};}
export function contactRelevance(person,question='',ticker='') {
 const age=Math.max(0,new Date().getFullYear()-person.end), finance=/cash|margin|conversion|profit|finance/i.test(question),growth=/growth|revenue|customer|sales/i.test(question);
 const fit=finance&&/finance/i.test(person.role)?'Finance experience may help interpret accounting treatment and working-capital mechanics.':growth&&/sales/i.test(person.role)?'Sales experience may help frame questions about demand, pricing and customer behaviour.':/operations|supply/i.test(person.role)?'Operating experience may help frame questions about capacity, supply constraints and execution.':'Relevant industry experience may help test the operating assumptions.';
 return `${fit} ${person.company===ticker?'Worked at this company.':'Sector perspective; not direct evidence about this company.'} Role ended ${age} years ago; no current inside knowledge is established.`;
}
export function evidenceFocus(p,record={}) {
 if(record.quote)return record.quote;
 const text=String(p.context||p.text).replace(/\s+/g,' ').trim();
 const terms=String(record.metric||p.section||'').replaceAll('_',' ').split(' ').filter(w=>w.length>3);
 const sentences=text.match(/[^.!?]+(?:[.!?]|$)/g)||[text];
 return sentences.find(s=>terms.some(t=>s.toLowerCase().includes(t))&&/\d/.test(s))?.trim() || String(p.text).replace(/\s+/g,' ').trim().slice(0,650);
}
