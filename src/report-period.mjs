// Explicit document headers only; dates from download/publication are not reporting periods.
export function reportPeriod(text,type='') {
 const s=String(text).slice(0,18000).replace(/\s+/g,' ');
 const q=s.match(/\bQ([1-4])\s*(?:FY\s*)?['’]?(20\d{2}|\d{2})\b/i)||s.match(/\b([1-4])Q\s*(?:FY\s*)?['’]?(20\d{2}|\d{2})\b/i);
 if(q)return `FY${q[2].length===2?'20':''}${q[2]}-Q${q[1]}`;
 const range=s.match(/\bFY\s*(20\d{2})\s*[-–]\s*(20\d{2}|\d{2})\b/i);
 if(range){const year=range[2].length===2?'20'+range[2]:range[2];const quarter=s.match(/\bquarter\s+([1-4])\b/i);if(quarter)return `FY${year}-Q${quarter[1]}`;if(type==='Annual report')return `FY${year}`;}
 const d=s.match(/(?:quarter|year)[^.]{0,65}ended(?:\s+on)?\s+(?:(\d{1,2})(?:st|nd|rd|th)?\s+(March|June|September|December)|(March|June|September|December)\s+(\d{1,2})(?:st|nd|rd|th)?)[,\s]+(20\d{2})/i);
 if(d){const month=(d[2]||d[3]).toLowerCase(),year=+d[5]+(month==='march'?0:1);return `FY${year}${type==='Annual report'?'':'-Q'+({june:1,september:2,december:3,march:4}[month])}`;}
 return null;
}
