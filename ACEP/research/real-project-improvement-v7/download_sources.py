"""Download pinned public DSLIB source; no fitting or third-party code execution."""
from pathlib import Path
from urllib.request import urlopen
import hashlib,json,zipfile
R=Path(__file__).resolve().parent;S=R/'sources';S.mkdir(exist_ok=True)
URL='https://github.com/MarioVanhoucke/DSLIB-Dynamic-Scheduling-Empirical-Project-Library/releases/download/DSLIB_v3.4/DSLIB3.4.zip'
EXPECTED='19f87632c589f5d49f72b5f071992efc6379df2beb35f1efd3a60ac1381dc277'
if __name__=='__main__':
 p=S/'DSLIB3.4.zip'
 if not p.exists():
  with urlopen(URL,timeout=60) as response,p.open('wb') as out:
   while chunk:=response.read(1048576):out.write(chunk)
 digest=hashlib.sha256(p.read_bytes()).hexdigest();assert digest==EXPECTED,'Publisher archive differs from the frozen release'
 with zipfile.ZipFile(p) as z:
  for name in ['DSLIB_Analysis_Sheet.xlsx','Readme.rtf']:(S/name).write_bytes(z.read('DSLIB 3.4/'+name))
 (S/'dslib_download.json').write_text(json.dumps(dict(url=URL,file=p.name,sha256=digest,bytes=p.stat().st_size,publisher='Mario Vanhoucke; Operations Research & Scheduling Research Group, Ghent University',version='DSLIB_v3.4'),indent=2)+'\n')
 print('Verified pinned DSLIB archive',p.stat().st_size)
