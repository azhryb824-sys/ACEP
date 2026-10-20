from pathlib import Path
from html.parser import HTMLParser
import urllib.request,urllib.parse,json,hashlib,re,concurrent.futures
R=Path(__file__).resolve().parent;D=R/'sources';D.mkdir(exist_ok=True)
BASE='https://www.fldoe.org/finance/fco/cost-of-construction/public-schools.stml'
class Links(HTMLParser):
 def __init__(self):super().__init__();self.href=None;self.text='';self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag=='a':self.href=dict(attrs).get('href');self.text=''
 def handle_data(self,data):
  if self.href:self.text+=data
 def handle_endtag(self,tag):
  if tag=='a' and self.href:self.links.append((self.text.strip(),urllib.parse.urljoin(BASE,self.href)));self.href=None
pinned=json.loads((R/'sources_manifest.json').read_text()) if (R/'sources_manifest.json').exists() else None
selected=[]
if pinned:
 selected=[(r['year'],r['url']) for r in pinned]
else:
 page=urllib.request.urlopen(BASE,timeout=30).read();(D/'source_page.html').write_bytes(page)
 p=Links();p.feed(page.decode())
 for title,url in p.links:
  m=re.match(r'^(20\d\d) Cost of Construction',title)
  if m and (2010<=int(m[1])<=2021 or int(m[1])==2024) and re.search(r'\.xls[xm]?(?:\?|$)',url,re.I):selected.append((int(m[1]),url))
assert len(selected)==13,selected
print('Selected source years',sorted(y for y,u in selected),flush=True)
def get(row):
 year,url=row;ext=Path(urllib.parse.urlsplit(url).path).suffix
 f=D/f'schools_{year}{ext}'
 if not f.exists():
  data=urllib.request.urlopen(url,timeout=40).read();assert len(data)<15_000_000 and data[:2] in [b'PK',b'\xd0\xcf'];f.write_bytes(data)
 digest=hashlib.sha256(f.read_bytes()).hexdigest()
 if pinned:assert digest==next(r['sha256'] for r in pinned if r['year']==year),'Published source changed; do not silently overwrite the frozen study'
 return dict(year=year,url=url,file=f.name,bytes=f.stat().st_size,sha256=digest)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 results=list(pool.map(get,selected))
(D/'downloads.json').write_text(json.dumps(sorted(results,key=lambda x:x['year']),indent=2)+'\n')
print(json.dumps([{'year':x['year'],'bytes':x['bytes']} for x in results]),flush=True)
