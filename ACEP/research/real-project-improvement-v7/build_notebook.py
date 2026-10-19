"""Build a self-contained notebook under Kaggle's 1 MB source limit. No fitting."""
from pathlib import Path
import ast,base64,gzip,hashlib,json
R=Path(__file__).resolve().parent
files={'train_kaggle.py':(R/'train_kaggle.py').read_text()}
files.update({'data/'+p.name:p.read_text() for p in sorted((R/'data').iterdir()) if p.is_file()})
manifest={n:hashlib.sha256(s.encode()).hexdigest() for n,s in files.items()}
payload=base64.b64encode(gzip.compress(json.dumps(files).encode(),mtime=0)).decode()
cells=[]
def add(kind,s):
 c=dict(cell_type=kind,metadata={},source=s.splitlines(True))
 if kind=='code':ast.parse(s);c.update(execution_count=None,outputs=[])
 cells.append(c)
add('markdown','# ACEP v7 — stable training and new DSLIB projects\nAll fitting on Kaggle. FDOT development-only: 1878 contracts, three purged report-year folds.\nNew DSLIB: 76 development projects, 11 held-out projects; collector/name groups separated.\nFive projects and acceptance rules frozen before fitting. No seven-engine acceptance claim.\n')
add('code','from pathlib import Path\nimport hashlib,json,subprocess,sys,gzip,base64\nROOT=Path("/kaggle/working/acep-v7")\nROOT.mkdir(exist_ok=True)\nPAYLOAD='+repr(payload)+'\nMANIFEST='+repr(manifest)+'\nFILES=json.loads(gzip.decompress(base64.b64decode(PAYLOAD)))\nfor name,content in FILES.items():\n    assert hashlib.sha256(content.encode()).hexdigest()==MANIFEST[name],name\n    p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)\nprint("Verified source/input files",len(FILES))\nprint((ROOT/"data/audit.json").read_text())\n')
add('code','subprocess.run([sys.executable,str(ROOT/"train_kaggle.py"),str(ROOT)],check=True)\n')
add('code','from IPython.display import FileLink,display\nprint((ROOT/"results/evaluation.json").read_text())\ndisplay(FileLink("/kaggle/working/ACEP_v7_results.zip"))\n')
p=R/'ACEP_v7.ipynb'
p.write_text(json.dumps(dict(nbformat=4,nbformat_minor=5,metadata=dict(kernelspec=dict(display_name='Python 3',language='python',name='python3'),language_info=dict(name='python')),cells=cells),ensure_ascii=False,indent=2)+'\n')
assert p.stat().st_size<1_000_000
(R/'notebook_manifest.json').write_text(json.dumps(dict(notebook_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),transport='gzip-base64; exact input hashes unchanged',files=manifest),indent=2)+'\n')
print(p.stat().st_size)
