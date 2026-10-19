"""Build a self-contained notebook under Kaggle's 1 MB source limit. No fitting."""
from pathlib import Path
import ast,base64,gzip,hashlib,json
R=Path(__file__).resolve().parent
files={'train_boq_kaggle.py':(R/'train_boq_kaggle.py').read_text()}
files.update({'data/'+p.name:p.read_text() for p in sorted((R/'boq_data').iterdir()) if p.is_file()})
manifest={n:hashlib.sha256(s.encode()).hexdigest() for n,s in files.items()}
payload=base64.b64encode(gzip.compress(json.dumps(files).encode(),mtime=0)).decode()
cells=[]
def add(kind,s):
 c=dict(cell_type=kind,metadata={},source=s.splitlines(True))
 if kind=='code':ast.parse(s);c.update(execution_count=None,outputs=[])
 cells.append(c)
add('markdown','''# ACEP v5b — actual BOQ quantities and costs
Eight published Australian civil projects; original project workbooks, CC BY 4.0.
77 train lines (P01/P17), 29 validation lines (P18), 126 eligible test lines across P02–P06.
Retrospective project-disjoint experiment, not a forward-time forecast. These projects were
previously used for duration research; this is a separately held-out BOQ task.
Conditional estimates from supplied BOQ, not drawing takeoff or Saudi quotations.
The compressed transport is verified against the exact original file hashes before fitting.
''')
add('code','from pathlib import Path\nimport hashlib,json,subprocess,sys,gzip,base64\nROOT=Path("/kaggle/working/acep-boq-v5b")\nROOT.mkdir(exist_ok=True)\nPAYLOAD='+repr(payload)+'\nMANIFEST='+repr(manifest)+'\nFILES=json.loads(gzip.decompress(base64.b64decode(PAYLOAD)))\nfor name,content in FILES.items():\n    assert hashlib.sha256(content.encode()).hexdigest()==MANIFEST[name],name\n    p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)\nprint("Verified source/input files",len(FILES))\nprint((ROOT/"data/audit.json").read_text())\n')
add('code','subprocess.run([sys.executable,str(ROOT/"train_boq_kaggle.py"),str(ROOT)],check=True)\n')
add('code','from IPython.display import FileLink,display\nprint((ROOT/"results/evaluation.json").read_text())\ndisplay(FileLink("/kaggle/working/ACEP_BOQ_v5b_results.zip"))\n')
p=R/'ACEP_BOQ_v5b.ipynb'
p.write_text(json.dumps(dict(nbformat=4,nbformat_minor=5,metadata=dict(kernelspec=dict(display_name='Python 3',language='python',name='python3'),language_info=dict(name='python')),cells=cells),ensure_ascii=False,indent=2)+'\n')
assert p.stat().st_size<1_000_000
(R/'boq_notebook_manifest.json').write_text(json.dumps(dict(notebook_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),transport='gzip-base64; exact input hashes unchanged',files=manifest),indent=2)+'\n')
print(p.stat().st_size)
