"""Repair a source-identity collapse in a staged dataset, never the frozen run.

Equal school/area/cost values do not prove that two source rows are duplicates.
Two explicit addition descriptions establish two work items. Their assignment
to the two description-free summary-row IDs is deliberately left unresolved.
"""
from pathlib import Path
import hashlib
import json
import csv
import math
import fitz
import pdfplumber

R = Path(__file__).resolve().parent
OLD = R.parent / ('real-building-cost-v13' if (R.parent / 'real-building-cost-v13/data').exists() else 'real-v13')
OUT = R / 'data_review'
OUT.mkdir(exist_ok=True)
source = OLD / 'sources/schools_2023.pdf'
doc = fitz.open(source)
page = doc[4]
words = page.get_text('words')
independent = pdfplumber.open(source)
other_words = independent.pages[4].extract_words(x_tolerance=1, y_tolerance=1)
records = []
for label, y in [('Softball Batting Cages', 167.4669189453125), ('Baseball Batting Cages', 174.42691040039062)]:
    row = sorted([w for w in words if abs((w[1]+w[3])/2-y)<2], key=lambda w:w[0])
    text = ' '.join(w[4] for w in row)
    other = sorted([w for w in other_words if abs((w['top']+w['bottom'])/2-y)<2], key=lambda w:w['x0'])
    independent_text = ' '.join(w['text'] for w in other)
    assert label in text and label in independent_text
    assert 'Central School' in text and 'Central School' in independent_text
    assert text.count('2,100') == independent_text.count('2,100') == 2
    assert '86,936' in text and '86,936' in independent_text
    records.append({'source_page':5,'row_center_y':y,'description':label,'gross_ft2':2100,'net_ft2':2100,'contract_cost_usd':86936,'mupdf_row':text,'pdfplumber_row':independent_text})
independent.close()
raw = json.loads((OLD / 'pdf_records.json').read_text())
original = [r for r in raw if r['project_id'] in ['FDOE-2023-PDF-026','FDOE-2023-PDF-027']]
assert len(original)==2 and all(r['contract_cost']==86936 and r['gross_ft2']==2100 for r in original)
with (R/'data/development_features.csv').open() as f: features=list(csv.DictReader(f))
with (R/'data/development_labels.csv').open() as f: labels=list(csv.DictReader(f))
keep=next(x for x in features if x['project_id']=='FDOE-2023-PDF-026')
assert not any(x['project_id']=='FDOE-2023-PDF-027' for x in features)
restored=dict(keep,project_id='FDOE-2023-PDF-027',source_row='27')
position=features.index(keep)+1;features.insert(position,restored)
old_label=next(x for x in labels if x['project_id']=='FDOE-2023-PDF-026')
labels.insert(position,dict(old_label,project_id='FDOE-2023-PDF-027'))
for item in features:
    is_pair=item['project_id'] in ['FDOE-2023-PDF-026','FDOE-2023-PDF-027']
    item['work_category']='ancillary_sports_batting_cage' if is_pair else 'unclassified'
    item['identity_review']='distinct_pair_summary_to_description_mapping_unresolved' if is_pair else 'not_reviewed_in_this_audit'
assert len(features)==len(labels)==611
assert [x['project_id'] for x in features]==[x['project_id'] for x in labels]
for name,items in [('development_features_proposed.csv',features),('development_labels_proposed.csv',labels)]:
    with (OUT/name).open('w') as f:
        writer=csv.DictWriter(f,fieldnames=list(items[0]),lineterminator='\n');writer.writeheader();writer.writerows(items)
result={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'source_url':'https://www.fldoe.org/file/7742/23CostConst-PS.pdf','frozen_cohort_unchanged':True,'original_development_count':610,'proposed_development_count':611,'restored_source_id':'FDOE-2023-PDF-027','same_facility_group':restored['facility_group'],'distinct_work_items':records,'finding':'The prior exact-duplicate removal collapsed two distinct described work items. This is a source-identity defect.','mapping_limit':'Which description maps to summary row 26 or 27 is not established; both source identities are retained, never assigned a speculative individual label.','training_allowed_for_proposed_data':False,'blockers':['Audit work descriptions across the source corpus, including non-building ancillary works.','Resolve project/subproject identity before deduplication.','Freeze new feature vocabulary, splits, fold memberships and candidate protocol before any fitting.'],'independent_acceptance_established':False,'local_fits':0}
(OUT/'identity_repair.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['distinct_work_items','source_sha256','source_url']},indent=2))
