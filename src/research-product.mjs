import {passagePeriod,reportPeriod} from './report-period.mjs';
export function plainTitle(value='') {
 return String(value).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g,m=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '})[m]).replace(/\s+/g,' ').trim();
}
export function eventContext(e) {
 const raw=plainTitle(e.rawTitle || e.title), t=raw.toLowerCase();
 let label='Company disclosure',score=10,reason='Disclosure located; substance requires verification.',question='Which business assumptions could this disclosure change, and what primary evidence supports that?';
 if(/annual report/.test(t)){label='Annual report';score=25;reason='Newly indexed research evidence; this is an archive item.';question='What changed in reported growth, margins and cash generation across the annual reporting periods?';}
 if(e.sourceType==='Earnings-call transcript'||/earnings call transcript|earnings discussion|transcript of.*(?:earnings|financial)/.test(t)){label='Earnings-call transcript';score=60;reason='Management commentary is available to check against reported performance.';question='How does management explain the changes in growth, margins and cash generation, and what remains unverified?';}
 if(/financial results|unaudited results|audited results/.test(t)&& !/notice|intimation.*meeting|schedule|transcript|reference to/.test(t)){label='Financial results';score=80;reason='Reported performance may update the investment assumptions; figures need source verification.';question='Which reported financial movements change the growth or cash-generation assumptions, on a comparable period and basis?';}
 if(/acquisition|divest|merger|amalgamation|order win|capex|capital expenditure|resignation|chief financial officer|litigation|default/.test(t)){label=/resignation|chief financial officer/.test(t)?'Leadership change':'Business or capital event';score=90;reason='Potential change to execution, governance or capital allocation; terms need verification.';question='What do the disclosed terms establish about execution or capital-allocation risk, and which details are still missing?';}
 if(score<80 && /allotment|esop|trading window|postal ballot|newspaper|prize|award|loss of share|duplicate|commercial paper|record date|investor meet|schedule of|intimation.*meeting/.test(t)){score=0;label='Routine disclosure';reason='Administrative update; retained for reference.';}
 const subject=raw.replace(/^Announcement under Regulation 30 \(LODR\)\s*[-–:]?\s*/i,'').replace(/\s*[-–]\s*\d{1,2}\s+[A-Za-z]{3}\s*[-–].*$/,'');
 if(label==='Business or capital event'||label==='Leadership change')label=subject.length>100?subject.slice(0,97)+'…':subject;
 const period=e.period||reportPeriod(raw,e.sourceType)||(e.historical&&e.sourceType==='Annual report'&&raw.match(/20\d{2}[-–](?:20)?(\d{2})/)?.[1]?'FY20'+raw.match(/20\d{2}[-–](?:20)?(\d{2})/)[1]:null);
 if(e.historical&&period)label+=' · '+period.replace(/^FY20(\d{2})-Q([1-4])$/,'Q$2 FY$1').replace(/^FY20(\d{2})$/,'FY$1');
 if(e.historical){score=25;reason='Archived primary evidence; retained for research, not a new filing alert.';}
 return {...e,rawTitle:raw,title:`${e.ticker} · ${label}`,rank:100-score,priority:e.historical?'Archive':score>=60?'Review':'Routine',description:reason,question:e.historical&&e.question?e.question:question};
}
export function selectAttention(events,limit=5){
 const sorted=events.map(eventContext).sort((a,b)=>a.rank-b.rank||b.date.localeCompare(a.date));
 const seen=new Set();const unique=sorted.filter(e=>{const key=e.url||e.id;if(seen.has(key))return false;seen.add(key);return true;});
 const critical=unique.filter(e=>e.rank<=10);
 const selected=unique.filter(e=>e.priority==='Review' && e.rank>10).slice(0,Math.max(0,limit-critical.length));
 const important=[...critical,...selected],ids=new Set(important.map(e=>e.id));
 return {important,ordinary:sorted.filter(e=>!ids.has(e.id))};
}
export function contactRelevance(person,question='',ticker='',sector='') {
 const age=Math.max(0,new Date().getFullYear()-person.end), finance=/cash|margin|conversion|profit|finance|guidance|deliver/i.test(question),growth=/growth|revenue|customer|sales/i.test(question);
 const fit=finance&&/finance/i.test(person.role)?'Finance experience may help interpret accounting treatment and working-capital mechanics.':growth&&/sales/i.test(person.role)?'Sales experience may help frame questions about demand, pricing and customer behaviour.':/operations|supply/i.test(person.role)?'Operating experience may help frame questions about capacity, supply constraints and execution.':'Relevant industry experience may help test the operating assumptions.';
 return `${person.expertise ? person.expertise+". " : ""}${fit} ${person.company===ticker?'Worked at this company.':sector&&person.sector===sector?'Sector perspective; not direct evidence about this company.':'Functional experience; company and sector fit remain unverified.'} Role ended ${age} years ago; no current inside knowledge is established.`;
}
export function evidenceFocus(p,record={}) {
 if(record.quote)return record.quote;
 const text=String(p.context||p.text).replace(/\s+/g,' ').trim();
 const aliases={pat:'profit after tax',pbt:'profit before tax',operating_margin:'operating margin',free_cash_flow:'free cash flow',fcf_conversion:'net profit'};
 const label=aliases[record.metric]||String(record.metric||p.section||'').replaceAll('_',' ');
 const sentences=text.split(/(?<=[.!?])\s+/);
 if(record.value !== undefined && record.value !== null){const value=String(record.value).replaceAll(',','');const candidates=sentences.filter(s=>s.toLowerCase().includes(label.toLowerCase())&&(s.match(/[+-]?\d[\d,]*(?:\.\d+)?/g)||[]).some(n=>Number(n.replaceAll(',',''))===Number(value)));const period=record.period||p.document?.period;const supported=candidates.filter(s=>!period||passagePeriod(s,period)===period);if(supported.length)return supported[0].trim();return "The exact supporting sentence is not isolated. Expand the page context and verify the selected figure in the original.";}
 return String(p.text).replace(/\s+/g,' ').trim().slice(0,650);
}
