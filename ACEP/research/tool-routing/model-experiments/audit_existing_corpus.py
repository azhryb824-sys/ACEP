"""Inventory existing synthetic JSONL without authorizing it for training.

Exact/normalized matches are structural evidence only. No engineering correctness
or semantic overlap conclusions follow from this audit.
"""
from pathlib import Path
from collections import Counter, defaultdict
import hashlib
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[3]
DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹٫−','01234567890123456789.-')

def normalize(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', value).translate(DIGITS)).strip()

def audit(root=ROOT):
    folders = ['packages/datasets', 'data/uets/jsonl', 'ai-data-factory/datasets/datasets']
    files, questions, contents = [], defaultdict(list), defaultdict(list)
    for folder in folders:
        for path in sorted((root/folder).rglob('*.jsonl')):
            if path.stem not in {'training', 'validation', 'test'}:
                continue
            raw = path.read_bytes()
            record_count = 0
            errors = []
            domains, sources = Counter(), Counter()
            for line_no, line in enumerate(raw.decode('utf-8-sig').splitlines(), 1):
                if not line.strip():
                    continue
                try:
                    row = json.loads(line)
                    if not isinstance(row, dict): raise ValueError('record_not_object')
                    instruction, output = row.get('instruction'), row.get('output')
                    if not isinstance(instruction, str) or not isinstance(output, str):
                        raise ValueError('missing_instruction_or_output')
                    record_count += 1
                    domains[str(row.get('domain',path.parent.name))] += 1
                    sources[str(row.get('source','unspecified'))] += 1
                    location = dict(file=str(path.relative_to(root)), split=path.stem, line=line_no)
                    prompt = '\n'.join(str(row.get(k,'')) for k in ['system','instruction','input'])
                    key = normalize(prompt)
                    questions[key].append(dict(location, output=normalize(output)))
                    contents[(key,normalize(output))].append(location)
                except (json.JSONDecodeError, ValueError) as exc:
                    errors.append(dict(line=line_no,error=type(exc).__name__,reason=str(exc)[:120]))
            files.append(dict(file=str(path.relative_to(root)),sha256=hashlib.sha256(raw).hexdigest(),
                              valid_records=record_count,invalid_lines=len(errors),errors=errors,
                              domains=dict(domains),sources=dict(sources)))
    cross = lambda group: len({x['split'] for x in group}) > 1
    return dict(scope='structural audit of existing repository JSONL only',
                files=files, totals=dict(files=len(files),valid_records=sum(f['valid_records'] for f in files),
                    invalid_lines=sum(f['invalid_lines'] for f in files),
                    normalized_duplicate_content_excess=sum(len(g)-1 for g in contents.values()),
                    cross_split_content_groups=sum(cross(g) for g in contents.values()),
                    cross_split_prompt_groups=sum(cross(g) for g in questions.values()),
                    conflicting_prompt_groups=sum(len({x['output'] for x in g})>1 for g in questions.values())),
                engineering_correctness_reviewed=False,semantic_overlap_reviewed=False,
                training_authorized_by_this_audit=False)

if __name__ == '__main__':
    output = Path(__file__).with_name('existing_corpus_structural_audit.json')
    result = audit()
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result['totals'],indent=2))
