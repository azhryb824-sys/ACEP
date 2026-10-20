"""No-fit checks addressing concrete PDF extraction and leakage regressions."""
from pathlib import Path
import json,hashlib
import pandas as pd
R=Path(__file__).resolve().parent;D=R/'data'
rows={r['project_id']:r for r in json.loads((R/'pdf_records.json').read_text())}
assert rows['FDOE-2022-PDF-001']['facility']=='A. Gary Walsingham Academy'
assert rows['FDOE-2022-PDF-002']['facility']=='Academy'
assert rows['FDOE-2022-PDF-013']['facility']=='Alexander D Henderson University School / FAU High School (K-12)'
assert rows['FDOE-2023-PDF-002']['facility']=='Chiefland Middle High School'
assert rows['FDOE-2025-PDF-002']['facility']=='Amanecer Elementary'
assert all('FACILITY NAME' not in r['facility'] for r in rows.values())
audit=json.loads((D/'source_quality.json').read_text())
assert audit['duplicates']==[{'project_id':'FDOE-2023-PDF-027','reason':'exact_duplicate_source_row'}]
parts={s:pd.read_csv(D/f'{s}_features.csv') for s in ['development','calibration','test']}
assert sum('FDOE-2023-PDF-027' in f.project_id.values for f in parts.values())==0
assert parts['development'].year.max()<parts['calibration'].year.min()<parts['test'].year.min()
for a,b in [('development','calibration'),('development','test'),('calibration','test')]:
 assert not set(parts[a].facility_group)&set(parts[b].facility_group)
contract=json.loads((D/'contract.json').read_text())
ids=parts['test'].assign(order=parts['test'].project_id.map(lambda s:hashlib.sha256(('ACEP-FDOE-V13-FIVE|'+s).encode()).hexdigest())).sort_values('order').drop_duplicates('facility_group').head(5).project_id.tolist()
assert ids==contract['five_projects']
for f in parts.values():
 assert 'contract_cost' not in f and 'architect_fees' not in f
assert [len(parts[s]) for s in ['development','calibration','test']]==[610,46,64]
print('PDF name regressions, deduplication, temporal/facility separation, five IDs and excluded predictors verified; zero fits')
