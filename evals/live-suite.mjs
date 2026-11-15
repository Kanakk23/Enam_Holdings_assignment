import primary from './primary-cases.json' with {type:'json'};
export const suiteVersion='live-12x3-v3';
export const liveCases=[
 ['infy-margin','INFY','What did management say about operating margin?','Select relevant literal evidence; retain period and adjusted basis.'],
 ['infy-guidance','INFY','Compare guidance and delivered results','Do not settle an open full-year target with a quarterly actual.'],
 ['infy-cash','INFY','What changed in cash conversion?','Retain actual/adjusted and quarterly/cumulative distinctions.'],
 ['infy-arithmetic','INFY','Calculate YoY growth','Route to deterministic comparisons; zero model calls. This checks routing, not calculation accuracy.'],
 ['persistent-cash','PERSISTENT','What did management say about cash flow?','Select original evidence; management expectations remain forecasts.'],
 ['persistent-cause','PERSISTENT','Why did cash conversion change?','Attribute the unbilled-revenue explanation to management; normalization remains expected.'],
 ['persistent-guidance','PERSISTENT','What evidence supports management guidance?','Distinguish guidance from delivered results and acknowledge missing evidence.'],
 ['tataconsum-revenue','TATACONSUM','What do the documents say about revenue?','Select literal primary evidence; do not infer unsupported financial scope.'],
 ['tataconsum-risk','TATACONSUM','Discuss risks to cash generation','Risks must have cited support; no outside company knowledge.'],
 ['tataconsum-missing','TATACONSUM','What evidence is missing for a financial comparison?','Missing retrieved evidence is not proof that a fact is absent from the full report.'],
 ['dabur-growth','DABUR','What revenue growth is reported?','Q4 FY2026 consolidated revenue growth is 7.3% YoY; distinguish domestic 9.5% and HPC 17%.'],
 ['havells-missing-margin','HAVELLS','What is reported about margins?','The held-out excerpt reports revenue growth, not margins. Abstain on margin conclusions.'],
].map(([id,ticker,question,rubric])=>({id,ticker,question,rubric}));
export const heldoutDocuments=primary.cases.map(c=>({id:c.id,ticker:c.ticker,title:c.id,type:'Earnings-call transcript',url:c.url,period:c.period,passages:[{page:c.page,text:c.text}]}));
