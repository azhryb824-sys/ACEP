from pathlib import Path
import json,hashlib,ast
ROOT=Path(__file__).resolve().parent
files={'train_kaggle.py':(ROOT/'train_kaggle.py').read_text()}
for p in sorted((ROOT/'data').iterdir()):
 if p.is_file():files['data/'+p.name]=p.read_text()
manifest={n:hashlib.sha256(s.encode()).hexdigest() for n,s in files.items()}
cells=[]
def cell(kind,s):
 c=dict(cell_type=kind,metadata={},source=s.splitlines(True))
 if kind=='code':ast.parse(s);c.update(execution_count=None,outputs=[])
 cells.append(c)
cell('markdown','''# ACEP v5 — real residential projects: cost, duration and overrun
Source: Rafiei, M. Residential Building. UCI 437. DOI 10.24432/C5S896. CC BY 4.0.
372 actual historical Tehran projects. Strict label-availability cutoff: 162 train, 81 validation,
31 additional pre-test completed projects for final refit, 38 later-start test projects.
Five test projects selected by a fixed hash before fitting. All 38 are scored.
Actual completion dates, actual duration, actual sale prices, actual costs, all V-21 lags,
and base-year-equivalent V-6 are excluded from predictors.
All learning runs here on Kaggle, including 12 neural candidates across three tasks.
Historical IRR unit costs, not current Saudi quotations. Whole-seven-engine target remains unproven.
''')
cell('code','from pathlib import Path\nimport hashlib,json,subprocess,sys\nROOT=Path("/kaggle/working/acep-real-v5")\nROOT.mkdir(exist_ok=True)\nFILES='+repr(files)+'\nMANIFEST='+repr(manifest)+'\nfor name,content in FILES.items():\n    assert hashlib.sha256(content.encode()).hexdigest()==MANIFEST[name],name\n    p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)\nprint("Verified",len(FILES),"input/source files")\nprint((ROOT/"data/audit.json").read_text())\n')
cell('code','subprocess.run([sys.executable,str(ROOT/"train_kaggle.py"),str(ROOT)],check=True)\n')
cell('code','from IPython.display import FileLink,display\nprint((ROOT/"results/evaluation.json").read_text())\ndisplay(FileLink("/kaggle/working/ACEP_Real_Projects_v5_results.zip"))\n')
notebook=dict(nbformat=4,nbformat_minor=5,metadata=dict(kernelspec=dict(display_name='Python 3',language='python',name='python3'),language_info=dict(name='python')),cells=cells)
p=ROOT/'ACEP_Real_Projects_v5.ipynb';p.write_text(json.dumps(notebook,ensure_ascii=False,indent=2)+'\n')
(ROOT/'notebook-manifest.json').write_text(json.dumps({'notebook_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'files':manifest},indent=2)+'\n')
print(p.stat().st_size)
