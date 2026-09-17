"""Verify frozen corpus hashes/counts and persist exactly reproducible calibration/test records."""
import argparse, gzip, hashlib, importlib.util, json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('directory',type=Path);a=p.parse_args();root=Path(__file__).resolve().parents[1]
manifest=json.loads((a.directory/'manifest.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for file,key in [('scripts/train-million-project-models.py','generatorSha256'),('package-lock.json','dependencyLockSha256'),('packages/ai-engine/model-training/project-archetypes.json','configSha256')]:
    assert sha(root/file)==manifest[key],f'Frozen source mismatch: {file}'
records=0
for shard in manifest['shards']:
    file=a.directory/shard['file'];assert sha(file)==shard['sha256'];assert file.stat().st_size==shard['bytes']
    with gzip.open(file,'rb') as f: count=sum(1 for _ in f)
    assert count==shard['records'];records+=count
assert records==manifest['records']
spec=importlib.util.spec_from_file_location('training',root/'scripts/train-million-project-models.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
config=json.loads((root/'packages/ai-engine/model-training/project-archetypes.json').read_text());gen=m.CorpusGenerator(config,manifest['seed']);splits={}
for split in ['calibration','holdout']:
    desc=manifest[split];x,y,raw=gen.generate(desc['start'],desc['records'],seed_offset=desc['seedOffset']);assert not m.validate_chunk(raw,y)
    file=a.directory/(split+'.jsonl.gz');m.write_shard(file,gen,raw,y,split)
    splits[split]={**desc,'file':file.name,'bytes':file.stat().st_size,'sha256':sha(file)}
result={'status':'verified','trainingRecords':records,'trainingManifestFileSha256':sha(a.directory/'manifest.json'),'additionalSplits':splits,'independentRealWorldEvidence':False,'engineeringReleaseApproved':False}
(a.directory/'verification-and-splits.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
