"""Post-run diagnostic audit only; never fit, select or revise a predictor."""
from pathlib import Path
import csv
import json

R = Path(__file__).resolve().parent
evaluation = json.loads((R / 'kaggle-output/evaluation.json').read_text())
selection = json.loads((R / 'kaggle-output/selection.json').read_text())
rows = list(csv.DictReader((R / 'kaggle-output/diagnostic_predictions.csv').open()))
features = {x['project_id']: x for x in csv.DictReader((R / 'data/test_features.csv').open())}
selected = next(x for x in selection['candidates'] if x['name'] == selection['selected'])
baseline = next(x for x in selection['candidates'] if x['name'] == 'baseline_median')
comparisons = []
for row in rows:
    f = features[row['project_id']]
    actual = float(row['actual'])
    new_error = abs(float(row['prediction']) - actual) / actual
    old_error = abs(float(row['v13_prediction']) - actual) / actual
    comparisons.append({
        'project_id': row['project_id'], 'facility': f['facility'],
        'scope': f['project_scope'], 'gross_ft2': float(f['gross_ft2']),
        'net_ft2': float(f['net_ft2']), 'net_gross_ratio': float(f['net_ft2']) / float(f['gross_ft2']),
        'actual_usd': actual, 'prediction_usd': float(row['prediction']),
        'v13_ape': old_error, 'v14_ape': new_error,
        'actual_contract_usd_per_gross_ft2': actual / float(f['gross_ft2']),
        'interpretation': 'Observed association only; source error or causal mechanism not established.'
    })
result = {
    'analysis_stage': 'post-evaluation diagnostic; not candidate selection',
    'cohort_count': len(rows),
    'lower_ape_than_v13': sum(x['v14_ape'] < x['v13_ape'] for x in comparisons),
    'higher_ape_than_v13': sum(x['v14_ape'] > x['v13_ape'] for x in comparisons),
    'newly_within10': sum(x['v14_ape'] <= .1 and x['v13_ape'] > .1 for x in comparisons),
    'lost_within10': sum(x['v14_ape'] > .1 and x['v13_ape'] <= .1 for x in comparisons),
    'over100pct_error_v14': sum(x['v14_ape'] > 1 for x in comparisons),
    'over100pct_error_v13': sum(x['v13_ape'] > 1 for x in comparisons),
    'worst_five_v14': sorted(comparisons, key=lambda x: x['v14_ape'], reverse=True)[:5],
    'validation_constraint_limitation': {
        'selected_p95': selected['metrics']['p95_ape'],
        'baseline_p95': baseline['metrics']['p95_ape'],
        'selected_max': selected['metrics']['max_ape'],
        'baseline_max': baseline['metrics']['max_ape'],
        'finding': 'MAPE/P95 eligibility does not constrain the worst fewer-than-5% errors.'
    },
    'decision': 'Retain research evidence; do not promote v14. Higher within-10 rate does not offset worse MAPE/P95/max and failed numerical gates.',
    'no_post_result_retuning': True,
    'next_study_requirements': [
        'Reconcile gross area and contract scope against original project/contract evidence; do not infer corrections from prediction error.',
        'Freeze source-quality checks and severe-error measures on development data before acquiring an independent acceptance cohort.',
        'Collect new independently held project outcomes, including engine-specific ground truth for the other six engines.'
    ],
    'independent_acceptance_established': False,
    'production_model_promoted': False,
    'local_fits': 0
}
assert len(comparisons) == evaluation['diagnostic']['count'] == 64
(R / 'error_analysis.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'worst_five_v14'}, indent=2))
