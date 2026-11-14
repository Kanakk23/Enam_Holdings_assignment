import {number,periodEnd,units} from '../src/finance.mjs';
const norm=s=>String(s).replace(/\s+/g,' ').trim();
export function tableActuals(sources,ticker,asOf=new Date().toISOString().slice(0,10)){
 const facts=[];
 for(const s of sources){const t=s.table;if(!t||s.type!=='Annual report'||!['consolidated','standalone'].includes(t.basis)||!units[t.unit]||!Array.isArray(t.columns)||t.columns.length<2||t.columns.length>3||!Array.isArray(t.rows)||t.rows.length>4)continue;
  const header=norm(t.header);if(!header||!norm(s.text).includes(header)||!new RegExp('\\b'+t.basis+'\\b','i').test(header)||/\bconsolidated\b/i.test(header)&&/\bstandalone\b/i.test(header))continue;
  const magnitude=t.unit==='INR crore'?'crores?':t.unit==='INR million'?'million':t.unit==='INR lakh'?'(?:lakhs?|lacs?)':null;
  if(!magnitude||!new RegExp('(?:₹|`|Rs\\.?|INR|Rupees)[\\s\\S]{0,25}'+magnitude+'\\b','i').test(header))continue;
  if(!/(?:statement|account) of profit and loss/i.test(header)||/adjusted|restated|segment revenue|unaudited financial results/i.test(header))continue;
  if(new Set(t.columns.map(c=>c.period)).size!==t.columns.length||t.columns.some(c=>!periodEnd(c.period)||periodEnd(c.period)>asOf||!header.includes(norm(c.label))||!/^FY20\d{2}$/.test(c.period)||!new RegExp('(?:31\\s+March\\s+|March\\s+31,?\\s+)'+c.period.slice(2)+'$','i').test(c.label)))continue;
  if(t.columns.some((c,i)=>i&&header.indexOf(norm(c.label))<=header.indexOf(norm(t.columns[i-1].label))))continue;
  for(const row of t.rows){if(!['revenue','pat','pbt'].includes(row.metric)||!Array.isArray(row.values)||row.values.length!==t.columns.length||!norm(s.text).includes(norm(row.row)))continue;
   const label=row.metric==='revenue'?/^(?:revenue from operations|revenue|total revenue)$/i:row.metric==='pbt'?/^profit before tax$/i:/^(?:net profit for the year|profit for the year|profit after tax|net profit)$/i;
   if(!label.test(row.label)||!norm(row.row).replace(/^\d+\s+|^\([a-z]\)\s*/gi,'').startsWith(norm(row.label)))continue;
   const numeric=norm(row.row).slice(norm(row.row).indexOf(norm(row.label))+norm(row.label).length).replace(/^\s*\([\d\s+\-]+\)/,'').match(/\(?[+-]?\d[\d,]*(?:\.\d+)?\)?/g)||[];
   if(numeric.length===row.values.length+1&&/^\d{1,3}$/.test(numeric[0]))numeric.shift();
   if(numeric.length!==row.values.length||numeric.some((n,i)=>!number(n)?.eq(number(row.values[i]))))continue;
   for(let i=0;i<t.columns.length;i++){const value=number(row.values[i]);if(!value)continue;const period=t.columns[i].period;
    facts.push({id:`table:${s.documentId}:${s.page}:${row.metric}:${period}:${t.basis}:${value}`,ticker,metric:row.metric,value:value.toString(),unit:t.unit,period,basis:t.basis,scope:'reported',accounting:/Ind AS/i.test(t.header)?'Ind AS':/IFRS/i.test(t.header)?'IFRS':'Unspecified framework',documentId:s.documentId,passageId:s.passageId,page:s.page,quote:norm(row.row),contextQuote:header,review:'machine_checked',extraction:'aligned-annual-table-v1'});
   }
  }
 }
 return [...new Map(facts.map(f=>[f.id,f])).values()];
}
