"""Pin and cache an official alternative base model for a Kaggle comparison."""
from pathlib import Path
import hashlib
import json
import shutil
from huggingface_hub import HfApi,snapshot_download

ROOT=Path('/kaggle/working/acep-engineering-v1')
OUT=ROOT/'qwen3_base_comparison'
OUT.mkdir(exist_ok=True)
model='Qwen/Qwen3-4B-Instruct-2507'
cache=Path('/root/.cache/huggingface/hub')
cache.mkdir(parents=True,exist_ok=True)
identity=OUT/'identity.json'
if identity.exists():
    data=json.loads(identity.read_text())
    assert data['model']==model
else:
    info=HfApi().model_info(model)
    assert not info.gated and not info.private
    assert info.config['model_type']=='qwen3'
    data=dict(model=model,revision=info.sha,scope='official alternative base; evaluation candidate only',
              architecture='qwen3',training_started=False,engineering_deployment_allowed=False)
    identity.write_text(json.dumps(data,indent=2))
free=shutil.disk_usage(cache).free
print('CACHE_PREFLIGHT',json.dumps(dict(free_gb=round(free/1e9,2),identity=data)),flush=True)
assert free>11_000_000_000,'Insufficient free disk for separate official base cache'
location=snapshot_download(model,revision=data['revision'],cache_dir=cache,
    allow_patterns=['*.json','*.safetensors','*.txt','*.model'],ignore_patterns=['original/*'])
weights=list(Path(location).glob('*.safetensors'))
assert weights
hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in weights}
(OUT/'download_verified.json').write_text(json.dumps(dict(identity=data,cache_path=location,weights_sha256=hashes),indent=2))
print('BASE_CACHE_VERIFIED',data['revision'],len(weights),flush=True)
