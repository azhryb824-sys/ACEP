"""Package prepared data and source. Never performs any fitting."""
from pathlib import Path
import json,gzip,base64,hashlib,sys
R=Path(__file__).resolve().parent
files={p.name:p.read_text() for p in [R/'train_kaggle.py',R/'model_runtime.py']}
for p in sorted((R/'data').glob('*')):files['data/'+p.name]=p.read_text()
manifest={n:hashlib.sha256(s.encode()).hexdigest() for n,s in files.items()}
payload=base64.b64encode(gzip.compress(json.dumps(files).encode(),mtime=0)).decode()
code=f'''from pathlib import Path
import base64,gzip,json,hashlib,subprocess,sys,shutil
ROOT=Path('/kaggle/working/acep-real-building-v12');ROOT.mkdir(exist_ok=True)
PAYLOAD={payload!r}
MANIFEST={manifest!r}
files=json.loads(gzip.decompress(base64.b64decode(PAYLOAD)))
for name,content in files.items():
    assert hashlib.sha256(content.encode()).hexdigest()==MANIFEST[name],name
    p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
print('Verified',len(files),'files; source reports are official FDOE. All fitting runs on Kaggle.')
(ROOT/'transport_manifest.json').write_text(json.dumps(MANIFEST,indent=2))
'''
run='''process=subprocess.run([sys.executable,'train_kaggle.py'],cwd=ROOT,capture_output=True,text=True)
(ROOT/'training.log').write_text(process.stdout+'\\n'+process.stderr)
print(process.stdout[-9000:]);print(process.stderr[-2000:])
output=ROOT/'output';output.mkdir(exist_ok=True)
shutil.copy2(ROOT/'training.log',output/'training.log')
shutil.copy2(ROOT/'transport_manifest.json',output/'transport_manifest.json')
shutil.make_archive('/kaggle/working/ACEP_v12_results','zip',output)
assert process.returncode==0,'See ACEP_v12_results.zip training.log'
from IPython.display import FileLink,display
display(FileLink('/kaggle/working/ACEP_v12_results.zip'))
'''
def cell(kind,source):return {'cell_type':kind,'metadata':{},'source':source.splitlines(True),**({'execution_count':None,'outputs':[]} if kind=='code' else {})}
nb={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'}},'cells':[cell('markdown','# ACEP v12 — actual school construction cost research\n492 development records, 56 calibration records and 46 untouched 2024 test records. Five facility IDs frozen before fitting. Retrospective reported-building cost task in USD; not an award-time forecast, Saudi quote or seven-engine acceptance. Training and preprocessing on Kaggle only.\n'),cell('code',code),cell('code',run)]}
out=Path(sys.argv[1]) if len(sys.argv)>1 else R/'ACEP_Real_Building_Cost_v12.ipynb';out.write_text(json.dumps(nb,indent=1));print(json.dumps({'file':str(out.resolve()),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'sourceFiles':len(files)}))
