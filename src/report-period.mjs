const fiscal = y => Number(y)<100 ? 2000+Number(y) : Number(y);
export function reportPeriod(text,type='') {
 const s=String(text).slice(0,18000).replace(/\s+/g,' ');
 // Explicit results dates take precedence over quarters mentioned for comparison.
 const d=s.match(/(?:quarter|year)[^.]{0,65}ended(?:\s+on)?\s+(?:(\d{1,2})(?:st|nd|rd|th)?\s+(March|June|September|December)|(March|June|September|December)\s+(\d{1,2})(?:st|nd|rd|th)?)[,\s]+(20\d{2})/i);
 if(d){const m=(d[2]||d[3]).toLowerCase(),year=+d[5]+(m==='march'?0:1);return `FY${year}${type==='Annual report'?'':'-Q'+({june:1,september:2,december:3,march:4}[m])}`;}
 const quarters=[...s.matchAll(/\b(?:Q([1-4])|([1-4])Q)\s*(?:of\s*)?(?:FY\s*)?['’]?(20\d{2}|\d{2})\b/gi)].map(m=>`FY${fiscal(m[3])}-Q${m[1]||m[2]}`);
 for(const m of s.matchAll(/\bFY\s*(20\d{2}|\d{2})\s*[-–]?\s*Q([1-4])\b/gi))quarters.push(`FY${fiscal(m[1])}-Q${m[2]}`);
 if(quarters.length)return new Set(quarters).size===1?quarters[0]:null;
 const range=s.match(/\b(?:FY\s*|financial year\s+)(20\d{2}|\d{2})\s*[-–]\s*(20\d{2}|\d{2})\b/i);
 if(range)return `FY${fiscal(range[2])}`;
 const year=s.match(/\bFY\s*(20\d{2}|\d{2})\b/i);return year?`FY${fiscal(year[1])}`:null;
}
export function passagePeriod(text,documentPeriod) {
 const explicit=reportPeriod(text,'Annual report');
 const bare=String(text).match(/\b(?:Q([1-4])|quarter\s+([1-4]))\b/i);
 if(bare&&!explicit){const quarter=bare[1]||bare[2];return documentPeriod?.endsWith('-Q'+quarter)?documentPeriod:null;}
 return explicit||documentPeriod;
}
