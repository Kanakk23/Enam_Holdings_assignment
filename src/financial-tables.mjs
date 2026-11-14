// Geometry preserves explicit annual-statement columns. Ambiguous layouts abstain.
export function pdfRows(items) {
 const rows=[];
 for(const item of items){if(!item.str?.trim())continue;const y=item.transform?.[5]??0,x=item.transform?.[4]??0;let row=rows.find(r=>Math.abs(r.y-y)<2);if(!row){row={y,cells:[]};rows.push(row);}row.cells.push({x,text:item.str,width:item.width,font:Math.abs(item.transform?.[0]||10)});}
 return rows.sort((a,b)=>b.y-a.y).map(r=>{const cells=[];for(const c of r.cells.sort((a,b)=>a.x-b.x)){const prev=cells.at(-1);if(prev&&Number.isFinite(prev.width)&&Number.isFinite(c.width)&&c.x-prev.x-prev.width<Math.max(.6,c.font*.1)){prev.text+=c.text;prev.width=c.x+c.width-prev.x;}else cells.push({...c});}return {y:r.y,cells};});
}
const line=r=>r.cells.map(c=>c.text.trim()).join(' ');
export function tablePassages(rows,page) {
 const text=rows.map(line).join('\n');
 if(!/(?:statement|account) of profit and loss/i.test(text)||/unaudited financial results|segment revenue/i.test(text))return [];
 const bases=[...text.matchAll(/\b(consolidated|standalone)\b/gi)].map(m=>m[1].toLowerCase());const basis=new Set(bases).size===1?bases[0]:null;
 const money=text.match(/(?:₹|`|Rs\.?|INR|Rupees)[^\n]{0,25}\b(crores?|million|lakhs?|lacs?)\b/i);if(!basis||!money)return [];
 const unit=/crore/i.test(money[1])?'INR crore':/million/i.test(money[1])?'INR million':'INR lakh';
 const date=c=>c.text.trim().match(/^(?:31\s+March\s+|March\s+31,?\s+)(20\d{2})$/i);
 const headerRow=rows.slice(0,30).find(r=>r.cells.filter(date).length>=2);if(!headerRow)return [];
 const columns=headerRow.cells.filter(date).map(c=>({x:c.x,label:c.text.trim(),period:'FY'+date(c)[1]}));
 if(columns.length>3||new Set(columns.map(c=>c.period)).size!==columns.length||columns.some((c,i)=>i&&c.x-columns[i-1].x<65))return [];
 const header=rows.slice(0,rows.indexOf(headerRow)+1).map(line).join('\n');if(header.length>1600)return [];
 const financialRows=[];
 for(const row of rows){
  const label=row.cells.filter(c=>c.x<columns[0].x-8).map(c=>c.text.trim()).join(' ').replace(/^\d+\s+|^\([a-z]\)\s*/gi,'').replace(/\s*\([\d\s+\-]+\)\s*$/,'').replace(/\s+\d+$/,'').trim();
  const metric=/^(?:revenue from operations|revenue|total revenue)$/i.test(label)?'revenue':/^(?:net profit for the year|profit for the year|profit after tax|net profit)$/i.test(label)?'pat':/^profit before tax$/i.test(label)?'pbt':null;if(!metric)continue;
  const values=columns.map((col,i)=>row.cells.filter(c=>c.x>=col.x-8&&c.x<(columns[i+1]?.x??Infinity)-8&&/^\(?[+-]?[\d,]+(?:\.\d+)?\)?$/.test(c.text.trim())));
  if(values.some(v=>v.length!==1))continue;
  financialRows.push({metric,label,row:line(row),values:values.map(v=>v[0].text.trim())});
 }
 if(!financialRows.length||text.length>6000)return [];
 return [{page,text,table:{basis,unit,header,columns:columns.map(({label,period})=>({label,period})),rows:financialRows},score:30}];
}
