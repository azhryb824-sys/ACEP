"""Post-run paired diagnostics; no fitting or candidate re-selection."""
from pathlib import Path
import csv
import json
import math

R = Path(__file__).resolve().parent
rows = list(csv.DictReader((R / 'kaggle-output/diagnostic_predictions.csv').open()))
features = {r['project_id']: r for r in csv.DictReader((R / 'data/test_features.csv').open())}
evaluation = json.loads((R / 'kaggle-output/evaluation.json').read_text())
review = json.loads((R / 'kaggle-output/input_review.json').read_text())
flags = {r['project_id']: r for r in review['rows']}
cases = []
for r in rows:
    y = float(r['actual'])
    errors = {v: abs(float(r[k]) - y) / y for v, k in [('v13', 'v13_prediction'), ('v14', 'v14_prediction'), ('v15', 'prediction')]}
    cases.append({'project_id': r['project_id'], 'facility': features[r['project_id']]['facility'], 'scope': features[r['project_id']]['project_scope'], 'actual_usd': y, 'errors': errors, 'input_review_reasons': flags[r['project_id']]['reasons']})
result = {'cohort': 64, 'analysis_role': 'post-evaluation diagnostic only', 'local_fits': 0, 'new_independent_holdout': False, 'numerical_gates_passed': evaluation['numerical_gates_passed'], 'production_promoted': False, 'paired': {}, 'worst_five_v15': sorted(cases, key=lambda r: r['errors']['v15'], reverse=True)[:5]}
for version in ['v13', 'v14']:
    result['paired'][version] = {'lower_ape': sum(x['errors']['v15'] < x['errors'][version] for x in cases), 'higher_ape': sum(x['errors']['v15'] > x['errors'][version] for x in cases), 'newly_within10': sum(x['errors']['v15'] <= .1 < x['errors'][version] for x in cases), 'lost_within10': sum(x['errors'][version] <= .1 < x['errors']['v15'] for x in cases)}
result['review_flags'] = {'count': review['flagged_count'], 'error_over100_caught': sum(bool(x['input_review_reasons']) and x['errors']['v15'] > 1 for x in cases), 'total_error_over100': sum(x['errors']['v15'] > 1 for x in cases), 'interpretation': 'Not a trained error detector or calibrated precision; descriptive flags remain in the full denominator.'}
result['decision'] = 'Research retained; no production promotion or independent seven-engine acceptance. Do not retune against this diagnostic cohort.'
assert len(cases) == 64
(R / 'error_analysis.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'worst_five_v15'}, indent=2))
