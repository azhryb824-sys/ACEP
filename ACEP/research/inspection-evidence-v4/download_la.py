from pathlib import Path
import urllib.request,urllib.parse,json,hashlib,concurrent.futures,csv,io
R=Path(__file__).resolve().parent/'sources';R.mkdir(exist_ok=True)
counts=json.loads((R/'la-year-counts.json').read_text())
def fetch(job):
    year,offset=job;p=R/f'la-{year}-{offset:07d}.csv'
    q={'$select':'permit,inspection_date,inspection,inspection_result',
       '$where':f"inspection_date >= '{year}-01-01T00:00:00' AND inspection_date < '{year+1}-01-01T00:00:00' AND inspection_result in ('Approved','Corrections Issued')",
       '$order':'inspection_date,permit,inspection,inspection_result,:id','$limit':50000,'$offset':offset}
    url='https://data.lacity.org/resource/9w5z-rg2h.csv?'+urllib.parse.urlencode(q)
    if not p.exists():
        b=urllib.request.urlopen(url,timeout=90).read()
        rows=list(csv.DictReader(io.StringIO(b.decode())))
        assert 0<len(rows)<=50000 and set(rows[0])=={'permit','inspection_date','inspection','inspection_result'}
        p.write_bytes(b)
    else:b=p.read_bytes();rows=list(csv.DictReader(io.StringIO(b.decode())))
    result=dict(filename=p.name,year=year,offset=offset,rows=len(rows),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),url=url)
    print(json.dumps({k:result[k] for k in ('filename','rows','bytes')}),flush=True)
    return result
jobs=[(int(x['year']),o) for x in counts for o in range(0,int(x['n']),50000)]
results=[]
with concurrent.futures.ThreadPoolExecutor(3) as pool:
    for r in pool.map(fetch,jobs):results.append(r)
assert sum(x['rows'] for x in results)==sum(int(x['n']) for x in counts)
(R/'la-download-manifest.json').write_text(json.dumps(results,indent=2)+'\n')
print('TOTAL',sum(x['rows'] for x in results),flush=True)
