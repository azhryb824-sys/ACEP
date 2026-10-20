"""Replay immutable saved proposals, including abstentions and false vetoes."""
from pathlib import Path
from collections import Counter
import argparse, hashlib, json, zipfile
from net_area_source_review import review


def evaluate(rows):
    checked = []
    for row in rows:
        if row['family'] != 'net_area':
            continue
        result = review(row['instruction'], row['raw'])
        assert result['authorization_granted'] is False and result['calculation_executed'] is False
        checked.append(dict(id=row['id'], model_exact=row['exact'], original_contract_valid=row['contract_valid'], review=result))
    calls = [r for r in checked if r['review']['status'] != 'not_applicable']
    correct = [r for r in calls if r['model_exact']]
    wrong_valid = [r for r in calls if not r['model_exact'] and r['original_contract_valid']]
    return dict(total_net_area_cases=len(checked), calls_reviewed=len(calls),
                statuses=dict(Counter(r['review']['status'] for r in checked)),
                correct_calls=len(correct), correct_calls_with_matching_evidence=sum(r['review']['status']=='consistent_evidence' for r in correct),
                correct_calls_requiring_review=sum(r['review']['status']=='review_required' for r in correct),
                false_veto_ids=[r['id'] for r in correct if r['review']['status']=='veto'],
                originally_wrong_contract_valid_calls=[r['id'] for r in wrong_valid],
                newly_vetoed_wrong_contract_valid_calls=[r['id'] for r in wrong_valid if r['review']['status']=='veto'],
                rows=checked)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('archive',type=Path);parser.add_argument('--out',type=Path,required=True);args=parser.parse_args()
    with zipfile.ZipFile(args.archive) as archive:
        def rows(name):return [json.loads(x) for x in archive.read(name).decode().splitlines()]
        v8=rows('v8_units/v8_evaluation348/predictions.jsonl')
        v7=rows('qwen3_v7_evaluation/v7/predictions.jsonl')+rows('v7_fresh_probe/predictions.jsonl')+rows('v8_development/v7_baseline_stress48/predictions.jsonl')
    assert len(v8)==348 and len(v7)==312
    report=dict(v8=evaluate(v8), retained_v7_original_prompt=evaluate(v7),
                input_archive_sha256=hashlib.sha256(args.archive.read_bytes()).hexdigest(),
                reviewer_sha256=hashlib.sha256(Path(__file__).with_name('net_area_source_review.py').read_bytes()).hexdigest(),
                weights_changed=False, model_raw_accuracy_changed=False,
                authorization_granted=False, tools_executed=False, engineering_deployment_allowed=False,
                limitations=['Labelled measurements only; unsupported context requires review',
                             'Matching evidence is not verified intent or complete semantic grounding',
                             'Saved authored development cases; not independent engineering evaluation'])
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:{a:b for a,b in v.items() if a!='rows'} for k,v in report.items() if isinstance(v,dict)},ensure_ascii=False,indent=2))


if __name__=='__main__':main()
