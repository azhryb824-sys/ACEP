"""Prepare pinned v14 inputs and frozen comparators; never fit."""
from pathlib import Path
import pandas as pd
import hashlib
import json
import shutil

R = Path(__file__).resolve().parent
OLD = R.parent / ('real-building-cost-v14' if (R.parent / 'real-building-cost-v14/data').exists() else 'real-v14')
D = R / 'data'
D.mkdir(exist_ok=True)
(R / 'comparison').mkdir(exist_ok=True)
(R / 'sources').mkdir(exist_ok=True)
for name, digest in json.loads((OLD / 'data/manifest.json').read_text()).items():
    p = OLD / 'data' / name
    assert hashlib.sha256(p.read_bytes()).hexdigest() == digest, name
    shutil.copy2(p, D / name)
shutil.copy2(R / 'protocol.json', D / 'protocol.json')
shutil.copy2(OLD / 'scope_audit.json', R / 'scope_audit.json')
shutil.copy2(OLD / 'sources/price_index_source.html', R / 'sources/price_index_source.html')
for source, target in [('selected_model.json', 'v14_model.json'), ('diagnostic_predictions.csv', 'v14_test_predictions.csv')]:
    p = OLD / 'kaggle-output' / source
    expected = json.loads((OLD / 'kaggle-output/output_manifest.json').read_text())[source]
    assert hashlib.sha256(p.read_bytes()).hexdigest() == expected
    shutil.copy2(p, R / 'comparison' / target)
pd.read_csv(R / 'comparison/v14_test_predictions.csv')[['project_id', 'prediction']].to_csv(D / 'v14_frozen_predictions.csv', index=False, float_format='%.17g')
manifest = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in D.iterdir() if p.is_file() and p.name != 'manifest.json'}
(D / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'files': len(manifest), 'local_fits': 0, 'numeric_values_overwritten': 0}))
