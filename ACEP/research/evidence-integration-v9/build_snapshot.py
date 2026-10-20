"""Copy already-frozen Kaggle predictions into a reviewed application snapshot. No fit."""
import csv, hashlib, json, sys
from pathlib import Path

source = Path(sys.argv[1]).resolve()
dest = Path(__file__).resolve().parents[2] / 'packages/ai-engine/evidence'
dest.mkdir(exist_ok=True)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
rows = list(csv.DictReader((source/'kaggle-output/results/heldout_predictions.csv').open()))
contract = json.loads((source/'data/contract.json').read_text())
evaluation = json.loads((source/'kaggle-output/results/evaluation.json').read_text())
verified = json.loads((source/'independent_verification.json').read_text())
assert len(rows) == 98 and verified['local_fitting'] is False
snapshot = {
 'schemaVersion': 1, 'cycle': 'FDOT-v8', 'date': '2026-10-19',
 'evaluationRole': 'archived_research_holdout', 'currentTestState': 'exposed',
 'trainingLocation': 'Kaggle CPU', 'kaggleVersion': 12,
 'runUrl': 'https://www.kaggle.com/code/aaabbb2026/acep-engines-real-projects-v1/log?scriptVersionId=360178385',
 'researchCommit': '40a6e3e25879ca8b18d3cae253be3644137d0545',
 'sourceUrl': 'https://www.fdot.gov/construction/constadm/reports',
 'fiveIds': contract['five_projects'], 'expectedIds': [r['project_id'] for r in rows],
 'selected': {k: v['selected_name'] for k,v in evaluation['test'].items()},
 'policy': contract['acceptance'], 'limitations': contract['limits'],
 'sourceHashes': {n: sha(source/n) for n in ['kaggle-output/results/heldout_predictions.csv',
   'kaggle-output/results/evaluation.json', 'data/contract.json', 'independent_verification.json']},
 'rows': [{ 'id': r['project_id'], 'group':r['group'], 'letDate':r['let_date'],
   'sourceFile':r['source_file'], 'sourceRow':int(r['source_row']),
   'cost': {'actual':float(r['cost_actual']), 'predicted':float(r['cost_prediction']), 'baseline':float(r['baseline_cost'])},
   'duration': {'actual':float(r['duration_actual']), 'predicted':float(r['duration_prediction']), 'baseline':float(r['planned_days'])},
   'risk': {'actual':int(float(r['risk_actual'])), 'predicted':None if r['risk_class']=='' else int(float(r['risk_class'])), 'probability':float(r['risk_prediction'])}
 } for r in rows]
}
out=dest/'fdot-v8.json'; out.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2, allow_nan=False)+'\n')
print(json.dumps({'snapshot':str(out),'sha256':sha(out),'rows':len(rows),'new_training':False}))
