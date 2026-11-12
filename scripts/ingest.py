"""Free, primary-source ingestion. No language-model calls or company-answer lookup tables."""
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
import argparse, io, json, re, hashlib, time
import math
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
import yfinance as yf
ROOT=Path(__file__).resolve().parents[1]
TICKERS=['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','ITC','HINDUNILVR','TITAN','LT','BEL','ULTRACEMCO','TATASTEEL','SUNPHARMA','DRREDDY','MARUTI','BHARTIARTL','NTPC']
# Bootstrap source manifests only: these are original issuer PDFs, never generated answers.
BOOTSTRAP=[('INFY','Infosys Integrated Annual Report 2024–25','https://www.infosys.com/investors/reports-filings/annual-report/annual/documents/infosys-ar-25.pdf'),('TCS','TCS Integrated Annual Report 2024–25','https://www.tcs.com/content/dam/tcs/investor-relations/financial-statements/2024-25/ar/annual-report-2024-2025.pdf')]
SESSION=requests.Session();SESSION.headers['User-Agent']='FINN research prototype (public investor documents)'
def get(url):
 host=urlparse(url).hostname or ''
 if not url.startswith('https://') or re.search(r'(^localhost$|^127\.|^10\.|^192\.168\.|^169\.254\.|:)',host):raise ValueError('Only public HTTPS document URLs are allowed')
 r=SESSION.get(url,timeout=35,stream=True);r.raise_for_status();chunks=[];total=0
 for c in r.iter_content(65536):
  total+=len(c)
  if total>25_000_000:raise ValueError('Document exceeds 25 MB limit')
  chunks.append(c)
 return b''.join(chunks)
def discover(ticker):
 html=get(f'https://www.screener.in/company/{ticker}/consolidated/');soup=BeautifulSoup(html,'html.parser');out=[]
 for selector,kind in [('.annual-reports','Annual report'),('.concalls','Earnings-call transcript')]:
  section=soup.select_one(selector)
  if section is None:continue
  for a in section.select('a[href]'):
   text=a.get_text(' ',strip=True);url=urljoin('https://www.screener.in',a['href'])
   if kind=='Earnings-call transcript' and text.strip().lower()!='transcript':continue
   if not url.startswith('https://') or 'screener.in' in urlparse(url).netloc:continue
   period=a.find_parent('li').get_text(' ',strip=True)[:8] if kind!='Annual report' else text
   out.append((ticker,kind+' · '+period,url,kind))
 annual=[x for x in out if x[3]=='Annual report']; calls=[x for x in out if x[3]!='Annual report']
 return annual[:1]+calls[:3]
def parse_document(ticker,title,url,kind='Annual report'):
 raw=get(url)
 if not raw.startswith(b'%PDF'):raise ValueError('Source was not a PDF; provide an official PDF link')
 reader=PdfReader(io.BytesIO(raw));candidates=[]
 for n,page in enumerate(reader.pages):
  text=re.sub(r'[ \t]+',' ',page.extract_text() or '').strip()
  if len(text)<120:continue
  score=sum(text.lower().count(w) for w in ['revenue','cash flow','operating margin','guidance','outlook'])
  if score: candidates.append((score,n+1,text))
 # Keep short exact excerpts, with PDF page provenance. Numerical tables require original-layout verification.
 passages=[]
 for _,page,text in sorted(candidates,reverse=True)[:18]:
  sentences=re.split(r'(?<=[.!?])\s+|\n\s*\n',text)
  match=next((s for s in sentences if re.search(r'revenue|cash flow|operating margin|guidance',s,re.I) and len(s)>100),text)
  passages.append({'page':page,'text':match[:1000]})
 if not passages:raise ValueError('No readable relevant passages; scanned PDFs need OCR')
 now=datetime.now(timezone.utc).isoformat();period_match=re.search(r'20\d{2}[-–](?:20)?\d{2}',title)
 return {'id':hashlib.sha256(raw).hexdigest()[:16],'ticker':ticker,'title':title,'url':url,'type':kind,'period':period_match.group() if period_match else 'See original document','retrievedAt':now,'sha256':hashlib.sha256(raw).hexdigest(),'pageCount':len(reader.pages),'passages':passages}
def market(ticker):
 try:
  df=yf.Ticker(ticker+'.NS').history(period='2mo',timeout=15).dropna(subset=['Close'])
  if len(df)<2:return ticker,None
  df=df[df.Close.map(lambda v: math.isfinite(float(v)) and v>0)]
  if len(df)<2:return ticker,None
  close=float(df.Close.iloc[-1]);prev=float(df.Close.iloc[-2]);prior=df.Volume.iloc[-21:-1]
  return ticker,{'close':round(close,2),'change':(close-prev)/prev*100 if prev>0 else None,'session':str(df.index[-1].date()),'volume':int(df.Volume.iloc[-1]),'volumeRatio':float(df.Volume.iloc[-1]/prior.mean()) if len(prior)==20 and prior.mean()>0 else None,'provider':'Yahoo Finance via yfinance','basis':'provider-adjusted history'}
 except Exception as e:return ticker,{'error':str(e)[:180]}
def classify(title):
 if re.search(r'financial results|earnings|transcript',title,re.I):return 'Review',0,'Compare the reported operating performance and management commentary with the prior period.'
 if re.search(r'acquisition|merger|capex|capital expenditure|buyback|dividend|fund.?rais',title,re.I):return 'Review',1,'Check the proposed use of capital, funding and execution conditions in the original filing.'
 if re.search(r'resign|appoint|director|chief|litigation|fraud|default|penalty',title,re.I):return 'Review',1,'Check who or what changes, the effective date, and any disclosed implications.'
 if re.search(r'newspaper|certificate|trading window|investor meet|loss of share|duplicate|shareholding|award|prize|repayment of commercial paper',title,re.I):return 'Routine',9,'Administrative or routine disclosure; available in the complete indexed list.'
 return 'Review',4,'The title does not establish its financial impact. Read the original disclosure before deciding whether to investigate.'
def filings(ticker):
 html=get(f'https://www.screener.in/company/{ticker}/consolidated/');soup=BeautifulSoup(html,'html.parser');out=[]
 for li in soup.select('#company-announcements-tab li')[:5]:
  a=li.select_one('a[href]');date=li.select_one('time[datetime]')
  if not a or not date:continue
  url=a['href']
  if not re.search(r'https://(?:www\.)?bseindia\.com/',url):continue
  title=' '.join(a.find_all(string=True,recursive=False)).strip();title=re.sub(r'\s+',' ',title)
  priority,rank,reason=classify(title);raw_title=title;title=re.sub(r'^Announcement under Regulation 30 \(LODR\)-','',title,flags=re.I)
  out.append({'id':hashlib.sha256(url.encode()).hexdigest()[:16],'ticker':ticker,'date':date['datetime'][:10],'publishedAt':date['datetime'],'priority':priority,'rank':rank,'title':title,'rawTitle':raw_title,'url':url,'sourceType':'BSE filing','description':reason,'question':'What changed in this disclosure, and which operating assumptions should I revisit?','historical':False})
 return out
def main():
 p=argparse.ArgumentParser();p.add_argument('--ticker');p.add_argument('--url');p.add_argument('--title',default='Official company document');p.add_argument('--bootstrap',action='store_true');p.add_argument('--market',action='store_true');p.add_argument('--filings',action='store_true');p.add_argument('--extras',action='store_true');a=p.parse_args()
 output=ROOT/'public/data/seed.json';data=json.loads(output.read_text()) if output.exists() else {'documents':[],'events':[],'market':{},'errors':[]}
 sources=[]
 if a.bootstrap:sources=BOOTSTRAP
 elif a.extras:
  for t in ['COFORGE','PERSISTENT','TATACONSUM']:
   try:sources+=discover(t)
   except Exception as e:data['errors'].append({'ticker':t,'error':str(e)[:180]})
 elif a.ticker:
  t=a.ticker.upper().removesuffix('.NS')
  if not re.fullmatch(r'[A-Z0-9][A-Z0-9&-]{0,24}',t):raise ValueError('Invalid NSE ticker')
  sources=[(t,a.title,a.url)] if a.url else discover(t)
  if not sources:raise ValueError('No primary PDF links discovered. Provide --url with an official report or transcript.')
 for entry in sources:
  try:
   d=parse_document(*entry);data['documents']=[x for x in data['documents'] if x['id']!=d['id']]+[d];print('Indexed',d['ticker'],d['title'],len(d['passages']),'passages',flush=True)
  except Exception as e:data['errors'].append({'source':entry[2],'error':str(e)[:250]});print('Source unavailable:',str(e),flush=True)
 if a.market:
  # Sequential initialization avoids yfinance SQLite-cache locks on first use.
  for t in TICKERS:
   ticker,value=market(t)
   if value and 'error' not in value:data['market'][ticker]=value
   else:data['errors'].append({'ticker':t,'error':(value or {}).get('error','No data')})
   print('EOD',t,'ok' if value and 'error' not in value else 'unavailable',flush=True)
 if a.filings:
  recent=[];coverage=[]
  for t in TICKERS:
   try:
    records=filings(t);recent+=records;coverage.append({'ticker':t,'count':len(records),'status':'ok'});print('BSE links',t,len(records),flush=True)
   except Exception as e:coverage.append({'ticker':t,'count':0,'status':'unavailable'});data['errors'].append({'ticker':t,'error':str(e)[:180]})
  data['filings']=recent;data['filingCoverage']=coverage
 data['events']=data.get('filings',[])+[{'id':d['id'],'ticker':d['ticker'],'date':d['retrievedAt'][:10],'historical':True,'priority':'Review','title':d['title'],'sourceType':d['type'],'description':'An original company report is indexed for investigation. These are archived source excerpts, not a newly published exchange alert.','question':'How do revenue growth, operating margins and cash generation compare in the company’s own reporting?'} for d in data['documents']]
 data['asOf']=datetime.now(timezone.utc).isoformat();output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False))
 if not data['documents']:raise SystemExit('No documents indexed; see errors')
if __name__=='__main__':main()
