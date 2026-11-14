// Link discovery only. No directory prose is used as financial evidence.
const plain = s => String(s).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
export function anchors(html,base) {
 const result=[];
 for(const m of String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
  const raw=m[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];if(!raw)continue;
  try {const url=new URL(plain(raw),base);if(url.protocol==='http:')url.protocol='https:';url.hash='';result.push({url:url.href,text:plain(m[2]),context:plain(html.slice(Math.max(0,m.index-180),m.index+m[0].length+180))});}catch{}
 }
 return result;
}
export function issuerOrigin(html) {
 const links=anchors(html,'https://www.screener.in');
 const site=links.find(a=>/^Website$/i.test(a.text)&&!/(?:bseindia|nseindia)\.com$|screener\.in$/i.test(new URL(a.url).hostname));
 return site?new URL(site.url).origin:null;
}
export function primaryKind(link) {
 const s=decodeURIComponent(link.url)+' '+link.text;
 if(/presentation|audio|webcast|invitation|notice|summary|subsidiar|csr|responsibility|sustainab|agm.*transcript/i.test(s))return null;
 if(/annual[\s_/-]*report|integrated[\s_/-]*report|(?:^|\/)ar[-_]?20?\d{2}/i.test(s))return 'Annual report';
 if(/transcript/i.test(s)&&!/meeting.*shareholder|nclt/i.test(s))return 'Earnings-call transcript';
 return null;
}
export async function issuerSources(html,ticker,{fetcher=fetch,allowedUrl,now=()=>Date.now()}={}) {
 const origin=issuerOrigin(html);if(!origin||!allowedUrl(origin))return {sources:[],checked:0};
 const domain=new URL(origin).hostname.replace(/^www\./,'');
 const same=u=>{try{const h=new URL(u).hostname;return allowedUrl(u)&&(h===domain||h.endsWith('.'+domain));}catch{return false;}};
 const seen=new Set(),sources=new Map();let queue=[origin],checked=0;const deadline=now()+42000;
 for(let wave=0;wave<4&&queue.length&&checked<8&&now()<deadline;wave++){
  const batch=queue.filter(u=>!seen.has(u)).slice(0,Math.min(3,8-checked));batch.forEach(u=>seen.add(u));checked+=batch.length;
  const pages=await Promise.allSettled(batch.map(async url=>{const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(Math.max(1,Math.min(12000,deadline-now())))});if(r.status>=300&&r.status<400){const to=new URL(r.headers.get('location'),url).href;return same(to)?[{url:to,text:'Investor page'}]:[];}if(!r.ok)return [];const t=await r.text();return anchors(t.slice(0,1800000),url);}));
  const next=[];
  for(const page of pages)if(page.status==='fulfilled')for(const a of page.value){if(!same(a.url))continue;const kind=primaryKind(a);if(/\.pdf(?:$|\?)/i.test(a.url)&&kind){sources.set(a.url,{ticker,url:a.url,type:kind,title:`${ticker} · ${kind} · issuer original`,period:'See original document',discovery:'issuer-website',discoveredFrom:origin});continue;}if(!/\.pdf|\.(?:jpg|png|mp3|mp4|zip)(?:$|\?)/i.test(a.url)&&/investor|financial|annual.report|transcript|earning|quarterly.result/i.test(a.url+' '+a.text))next.push(a);}
  queue=next.filter(a=>!seen.has(a.url)).sort((a,b)=>score(b)-score(a)).map(a=>a.url);
 }
 const rank=s=>(/consolidated/i.test(s.url)?40:0)+(/integrated.report|annual.report.*\.pdf/i.test(s.url.split('/').at(-1))?20:0)+Math.max(0,...(s.url.match(/20\d{2}/g)||[]).map(Number));
 const all=[...sources.values()].sort((a,b)=>rank(b)-rank(a)||b.url.localeCompare(a.url,undefined,{numeric:true}));
 return {sources:[...all.filter(s=>s.type==='Annual report').slice(0,2),...all.filter(s=>s.type==='Earnings-call transcript').slice(0,4)],checked};
}
function score(a){return /transcript|annual.report/.test(a.url+' '+a.text)?4:/financial|quarterly|earning/.test(a.url+' '+a.text)?3:1;}
