"""Select development configurations transparently and verify a full backup."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import zipfile

ROOT=Path('/kaggle/working/acep-engineering-v1')
EXP=ROOT/'v6_experiment'

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def read(path): return json.loads(path.read_text())

def save(path,value):
    temporary=path.with_suffix(path.suffix+'.partial')
    temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2))
    temporary.replace(path)

cases=[json.loads(x) for x in (EXP/'evaluation_cases.jsonl').read_text().splitlines()]
assert len(cases)==120
case_hash=sha(EXP/'evaluation_cases.jsonl')
locations={
    'v5_shared_prompt':EXP/'evaluation/v5',
    'v5_previous_prompt':ROOT/'v5_prompt_v2_comparison120',
    'v6_step60':ROOT/'v6_checkpoint_evaluation/v6_step60',
    'v6_step90':ROOT/'v6_checkpoint_evaluation/v6_step90',
    'v6_final':EXP/'evaluation/v6',
}
rows,metrics,metadata={},{},{}
for label,folder in locations.items():
    values=[json.loads(x) for x in (folder/'predictions.jsonl').read_text().splitlines()]
    assert len(values)==120 and len({v['id'] for v in values})==120,label
    by_id={v['id']:v for v in values}
    assert set(by_id)=={c['id'] for c in cases},label
    rows[label]=[by_id[c['id']] for c in cases]
    metadata[label]=read(folder/'metadata.json')
    assert metadata[label]['cases_sha256']==case_hash,label
    assert metadata[label]['quantization']=='nf4 double quantization, fp16 compute'
    assert metadata[label]['do_sample'] is False and metadata[label]['max_new_tokens']==256
    calls=[r['id'] for r in values if r['target']['action']=='clarify'
           and isinstance(r['prediction'],dict) and r['prediction'].get('action')=='call']
    m=dict(total=120,exact=sum(r['exact'] for r in values),
           contract_valid=sum(r['contract_valid'] for r in values),calls_on_missing_input=calls,
           suites={},per_tool={})
    for field,key in [('suite','suites'),('family','per_tool')]:
        for group in sorted({r[field] for r in values}):
            selected=[r for r in values if r[field]==group]
            m[key][group]=dict(total=len(selected),exact=sum(r['exact'] for r in selected),
                              contract_valid=sum(r['contract_valid'] for r in selected))
    metrics[label]=m
common_hash=metadata['v5_shared_prompt']['prompt_sha256']
assert all(metadata[k]['prompt_sha256']==common_hash for k in ['v6_step60','v6_step90','v6_final'])
prior=max(['v5_shared_prompt','v5_previous_prompt'],key=lambda k:(
    -len(metrics[k]['calls_on_missing_input']),metrics[k]['exact'],metrics[k]['contract_valid']))
b=metrics[prior]
checks,changes={},{}
prior_by_id={r['id']:r for r in rows[prior]}
for label in ['v6_step60','v6_step90','v6_final']:
    m=metrics[label]
    checks[label]=dict(overall_exact_improved=m['exact']>b['exact'],
        contracts_not_worse=m['contract_valid']>=b['contract_valid'],
        missing_input_calls_not_worse=len(m['calls_on_missing_input'])<=len(b['calls_on_missing_input']),
        each_suite_not_worse=all(m['suites'][s]['exact']>=b['suites'][s]['exact'] for s in b['suites']),
        each_tool_not_worse=all(m['per_tool'][s]['exact']>=b['per_tool'][s]['exact'] for s in b['per_tool']))
    changes[label]=dict(
        improvements=[r['id'] for r in rows[label] if r['exact'] and not prior_by_id[r['id']]['exact']],
        regressions=[r['id'] for r in rows[label] if not r['exact'] and prior_by_id[r['id']]['exact']],
        failures=[dict(id=r['id'],instruction=r['instruction'],target=r['target'],prediction=r['prediction'])
                  for r in rows[label] if not r['exact']])
eligible=[k for k,v in checks.items() if all(v.values())]
selected=max(eligible,key=lambda k:(metrics[k]['exact'],metrics[k]['contract_valid'],-len(changes[k]['regressions']))) if eligible else prior
report=dict(scope='five configurations on 120 authored development cases; four elementary tools only',
    independent_hard_test=False,independent_engineering_review=False,
    strongest_prior_configuration=prior,selected_development_configuration=selected,
    selection_checks=checks,metrics=metrics,metadata=metadata,changes=changes,
    model_grounding_guard_applied=False,tools_executed=False,platform_integration_tested=False,
    engineering_deployment_allowed=False)
save(EXP/'final_selection_report.json',report)
assert sha(ROOT/'qlora_tool_pilot_v5/adapter/adapter_model.safetensors')=='19049cee53597001db1ab7784e181f57cf0940b918deb83dac85aef80b6ace6b'
assert read(ROOT/'v6_checkpoint_evaluation/status.json')['stage']=='completed'
assert read(EXP/'status.json')['stage']=='completed'
# Include every small dependency used by preparation and all four saved adapters.
folders=['tool_data_pilot_v5','tool_data_pilot_v6','v6_experiment','v6_checkpoint_evaluation',
         'v5_prompt_v2_comparison120','v5_resume_evaluation_nf4','four_tool_comparison_v4_v5',
         'tool_contract_gate_v1','qlora_tool_pilot_v5/adapter','qlora_tool_pilot_v6/adapter',
         'qlora_tool_pilot_v6_step60/adapter','qlora_tool_pilot_v6_step90/adapter']
paths=set()
for name in folders:
    folder=ROOT/name
    for p in folder.rglob('*'):
        if p.is_file() and '__pycache__' not in p.parts and not p.name.endswith('.partial'):
            paths.add(p)
for name in ['prepare_v6.py','run_v6_experiment.py','train_tool_pilot_v6.py',
             'evaluate_v6_comparison.py','evaluate_intermediate_v6.py',
             'run_intermediate_with_prompt_baseline.py','evaluate_v6_intermediate_comparison.py',
             'evaluate_previous_prompt_comparison120.py','train_evaluate_tool_v5.py',
             'evaluate_v5_resume_nf4.py','evaluate_prompt_v2_regression40.py',
             'baseline_tool_config.json','v5_resume_reproducibility.json','finalize_v6.py','run_finalization_v6.py']:
    p=ROOT/name
    assert p.is_file(),name
    paths.add(p)
manifest={str(p.relative_to(ROOT)):sha(p) for p in sorted(paths)}
archive=ROOT.parent/'ACEP_tool_v6_verified_complete.zip'
temporary=archive.with_suffix('.zip.partial')
with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED,compresslevel=4) as bundle:
    for p in sorted(paths): bundle.write(p,str(p.relative_to(ROOT)))
    bundle.writestr('V6_COMPLETE_MANIFEST.json',json.dumps(manifest,indent=2))
with zipfile.ZipFile(temporary) as bundle:
    assert bundle.testzip() is None
    for name,digest in manifest.items():
        assert hashlib.sha256(bundle.read(name)).hexdigest()==digest,name
temporary.replace(archive)
summary=dict(archive=str(archive),size_bytes=archive.stat().st_size,sha256=sha(archive),
             verified_files=len(manifest),selected_configuration=selected,
             metrics={k:{field:v[field] for field in ['total','exact','contract_valid','calls_on_missing_input']} for k,v in metrics.items()},
             v5_preserved=True,archive_verified=True,independent_hard_test=False,
             engineering_deployment_allowed=False)
save(EXP/'final_backup_summary.json',summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
