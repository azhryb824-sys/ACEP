"""Fetch only pinned official sources and verify original hashes; no fitting."""
from pathlib import Path
import json,hashlib,urllib.request,concurrent.futures
R=Path(__file__).resolve().parent;S=R/'sources';S.mkdir(exist_ok=True)
sources=json.loads((R/'all_sources_manifest.json').read_text())
def get(row):
 p=S/row['file']
 if not p.exists():
  data=urllib.request.urlopen(row['url'],timeout=40).read()
  assert hashlib.sha256(data).hexdigest()==row['sha256'],'Published source changed'
  p.write_bytes(data)
 assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256'],p.name
 return p.name
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 print(json.dumps(list(pool.map(get,sources))))
(S/'downloads.json').write_text(json.dumps([s for s in sources if s['year'] not in [2022,2023,2025]],indent=2)+'\n')
