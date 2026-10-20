"""Fetch the pinned official observation table. Never updates a frozen study."""
from pathlib import Path
import json,hashlib,urllib.request
R=Path(__file__).resolve().parent
record=json.loads((R/'index_source_manifest.json').read_text())
p=R/'sources'/record['file'];p.parent.mkdir(exist_ok=True)
data=p.read_bytes() if p.exists() else urllib.request.urlopen(record['url'],timeout=30).read()
if hashlib.sha256(data).hexdigest()!=record['sha256']:
 raise ValueError('Published price-index vintage differs. Restore archived source bytes; do not overwrite the study.')
p.write_bytes(data)
print(json.dumps({'verified_source':p.name,'bytes':len(data),'fits':0}))
