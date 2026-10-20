"""Package source only. This script never fits models; all fits run on Kaggle."""
from pathlib import Path
import base64,gzip,hashlib,json,sys
root=Path(__file__).resolve().parents[2]
out=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd()/"ACEP_Profile_Compatibility_v11.ipynb"
files={}
for folder in ['packages/ai-engine/models','packages/ai-engine/engineering-ke']:
    for p in sorted((root/folder).glob('*.js')): files[str(p.relative_to(root))]=p.read_text()
paths=['packages/ai-engine/knowledge-base.js','packages/ai-engine/project-understanding/stage-classifier.js',
 'packages/ai-engine/engineering-data-layer.js','packages/ai-engine/workflow-engine.js','packages/ai-engine/ai-orchestrator.js',
 'packages/ui/web/src/app.js','server.js','packages/databases/training/scripts/generate_training_data.js',
 'research/profile-compatibility-v11/checks.cjs','research/profile-compatibility-v11/snapshot-checks.cjs','research/profile-compatibility-v11/train-kaggle.cjs',
 'research/model-repairs-v1/checks.cjs','research/inference-repairs-v10/checks.cjs','research/training-status-v8/checks.js',
 'research/schedule-network-v3/checks.cjs','research/schedule-consistency-v1/checks.cjs','research/inspection-evidence-v4/checks.cjs']
for name in paths: files[name]=(root/name).read_text()
manifest={n:hashlib.sha256(v.encode()).hexdigest() for n,v in files.items()}
payload=base64.b64encode(gzip.compress(json.dumps(files,ensure_ascii=False).encode(),mtime=0)).decode()
bootstrap=f'''from pathlib import Path
import base64,gzip,json,hashlib,subprocess,sys,shutil,platform,time
ROOT=Path('/kaggle/working/acep-v11');ROOT.mkdir(exist_ok=True)
PAYLOAD={payload!r}
MANIFEST={manifest!r}
FILES=json.loads(gzip.decompress(base64.b64decode(PAYLOAD)))
for name,content in FILES.items():
    assert hashlib.sha256(content.encode()).hexdigest()==MANIFEST[name],name
    p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
(ROOT/'source-manifest.json').write_text(json.dumps(MANIFEST,indent=2))
print('Verified',len(FILES),'source files; no prior real-project holdout is included.')
'''
run='''assert Path('/kaggle/working').is_dir()
NODE=shutil.which('node');assert NODE,'Kaggle Node runtime missing'
RESULTS=ROOT/'results';RESULTS.mkdir(exist_ok=True)
steps=[]
def run_step(name,args):
    t=time.monotonic();p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True)
    (RESULTS/(name+'.log')).write_text(p.stdout+'\\n'+p.stderr)
    steps.append(dict(name=name,exitCode=p.returncode,seconds=round(time.monotonic()-t,3)))
    print(name,steps[-1]);print((p.stdout+p.stderr)[-1600:])
    return p.returncode==0
ok=run_step('generate_synthetic',[NODE,'packages/databases/training/scripts/generate_training_data.js','--records=10000','--seed=20261020'])
if ok: ok=run_step('fit_seven_models',[NODE,'research/profile-compatibility-v11/train-kaggle.cjs',str(RESULTS/'profiles')])
if ok:
    suites=[('fit_contract_checks','research/profile-compatibility-v11/checks.cjs'),('model_repairs_v1','research/model-repairs-v1/checks.cjs'),('inference_v10','research/inference-repairs-v10/checks.cjs'),('training_status','research/training-status-v8/checks.js'),('schedule_network','research/schedule-network-v3/checks.cjs'),('schedule_consistency','research/schedule-consistency-v1/checks.cjs'),('inspection','research/inspection-evidence-v4/checks.cjs')]
    for name,script in suites: ok=run_step(name,[NODE,script]) and ok
    ok=run_step('snapshot_checks',[NODE,'research/profile-compatibility-v11/snapshot-checks.cjs',str(RESULTS/'profiles'),str(RESULTS/'snapshot-checks.json')]) and ok
for name in ['profile-compatibility-v11','model-repairs-v1','inference-repairs-v10']:
    p=ROOT/'research'/name/'results.json'
    if p.exists():shutil.copy2(p,RESULTS/(name+'.json'))
shutil.copy2(ROOT/'source-manifest.json',RESULTS/'source-manifest.json')
source_data=ROOT/'packages/databases/training'
if (source_data/'synthetic-manifest.json').exists():shutil.copy2(source_data/'synthetic-manifest.json',RESULTS/'synthetic-manifest.json')
summary=dict(cycle='ACEP v11',status='succeeded' if ok else 'failed',environment='Kaggle',python=platform.python_version(),steps=steps,realProjectAccuracyMeasured=False,newRealProjectHoldoutCount=0,accuracyValidated=False,goal90PercentEstablished=False,boundary='Synthetic profile compatibility and regression checks only')
(RESULTS/'evaluation.json').write_text(json.dumps(summary,indent=2))
(RESULTS/'output-manifest.json').write_text(json.dumps({str(p.relative_to(RESULTS)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(RESULTS.rglob('*')) if p.is_file()},indent=2))
shutil.make_archive('/kaggle/working/ACEP_v11_results','zip',RESULTS)
print(json.dumps(summary,indent=2))
assert ok,'See logs in ACEP_v11_results.zip'
'''
cells=[dict(cell_type='markdown',metadata={},source=['# ACEP v11 — explicit units and restart-safe profiles\n','All model fitting is restricted to Kaggle. 10,000 clearly marked synthetic projects test compatibility only. No new real-project accuracy or 90% acceptance claim. Existing real-project test sets are not retuned.']),
 dict(cell_type='code',metadata={},execution_count=None,outputs=[],source=bootstrap.splitlines(True)),
 dict(cell_type='code',metadata={},execution_count=None,outputs=[],source=run.splitlines(True)),
 dict(cell_type='code',metadata={},execution_count=None,outputs=[],source=["from IPython.display import FileLink,display\n","display(FileLink('/kaggle/working/ACEP_v11_results.zip'))\n"])]
notebook=dict(nbformat=4,nbformat_minor=5,metadata=dict(kernelspec=dict(display_name='Python 3',language='python',name='python3')),cells=cells)
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(notebook,ensure_ascii=False,indent=1))
print(json.dumps(dict(notebook=str(out),bytes=out.stat().st_size,sourceFiles=len(files),sha256=hashlib.sha256(out.read_bytes()).hexdigest())))
