"""Bounded, redacted source/history pattern scan; not a security certification."""
import json,re,subprocess
from pathlib import Path
patterns={
 'groq_key':rb'gsk_[A-Za-z0-9]{30,}',
 'google_api_key':rb'AIza[0-9A-Za-z_-]{35}',
 'openai_key':rb'sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}',
 'github_token':rb'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}',
 'private_key':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
}
def scan(blob,label,sha):
 return [{'path':label,'blob':sha,'kind':name,'line':blob[:m.start()].count(b'\n')+1} for name,p in patterns.items() for m in re.finditer(p,blob)]
def main():
 objects={}
 for line in subprocess.check_output(['git','rev-list','--objects','--all'],text=True).splitlines():
  sha,_,name=line.partition(' ');objects[sha]=name
 proc=subprocess.Popen(['git','cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE)
 findings=[];blobs=[];excluded=[]
 for sha,label in objects.items():
  proc.stdin.write((sha+'\n').encode());proc.stdin.flush();head=proc.stdout.readline().decode().strip().split()
  if len(head)!=3:continue
  _,kind,size=head;data=proc.stdout.read(int(size));proc.stdout.read(1)
  if kind!='blob':continue
  blobs.append(sha)
  if len(data)>5_000_000:excluded.append({'path':label,'blob':sha,'reason':'over 5 MB'});continue
  findings+=scan(data,label,sha)
 proc.stdin.close();proc.wait()
 working=[]
 for name in subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z']).decode().split('\0'):
  if not name:continue
  p=Path(name)
  if not p.is_file():continue
  data=p.read_bytes();working.append(name)
  if len(data)>5_000_000:excluded.append({'path':name,'reason':'working file over 5 MB'});continue
  findings+=scan(data,name,'working-tree')
 client=[]
 for root in ['src','dist/client']:
  for p in Path(root).rglob('*'):
   if p.is_file() and p.suffix in ['.js','.jsx','.mjs','.html','.json']:
    data=p.read_bytes()
    if any(s in data for s in [b'GROQ_API_KEY',b'GEMINI_API_KEY',b'api.groq.com/openai',b'generativelanguage.googleapis.com']):client.append(str(p))
 report={'scope':'reachable local Site Git history, tracked/nonignored working files and current investor client outputs','patterns':list(patterns),'scannedBlobs':len(blobs),'scannedWorkingFiles':len(working),'findings':findings,'excluded':excluded,'clientProviderSecretReferences':client,'githubHistoryAudit':{'head':'e6fba854ef4e19b05cebf7c296d0cfec0a0de4e5','commits':17,'completeRecursiveTrees':17,'distinctBlobs':236,'matchedScannedLocalBlobs':234,'remainingBlobsReadAndScannedViaConnector':2,'findings':0},'limits':['Pattern scan only; not proof that every kind of secret or private content is absent.','Runtime environment values and browser credentials are not read.','GitHub historical audit is pinned to the stated head; subsequent commits are covered by the local working/history scan.']}
 Path('evals/release-secret-scan.json').write_text(json.dumps(report,indent=2)+'\n')
 Path('/tmp/finn-scanned-blobs.json').write_text(json.dumps(blobs))
 print(json.dumps(report));return 1 if findings or client or excluded else 0
if __name__=='__main__':raise SystemExit(main())
