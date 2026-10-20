from pathlib import Path
import urllib.request,urllib.parse,csv,io,json,hashlib,concurrent.futures
R=Path(__file__).resolve().parent/'sources'
def fetch(year):
 out=R/f'la-permit-addresses-{year}.csv'
 q={'$select':'permit,address','$where':f"inspection_date >= '{year}-01-01T00:00:00' AND inspection_date < '{year+1}-01-01T00:00:00' AND inspection_result in ('Approved','Corrections Issued')",'$group':'permit,address','$order':'permit,address','$limit':500000}
 url='https://data.lacity.org/resource/9w5z-rg2h.csv?'+urllib.parse.urlencode(q)
 if not out.exists():out.write_bytes(urllib.request.urlopen(url,timeout=120).read())
 b=out.read_bytes();batch=list(csv.DictReader(io.StringIO(b.decode())));assert len(batch)<500000
 print(year,len(batch),flush=True)
 return dict(filename=out.name,url=url,rows=len(batch),sha256=hashlib.sha256(b).hexdigest())
with concurrent.futures.ThreadPoolExecutor(3) as ex:manifest=list(ex.map(fetch,range(2021,2025)))
(R/'la-address-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
