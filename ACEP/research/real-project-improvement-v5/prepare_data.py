"""Prepare real project data without fitting. All model training belongs on Kaggle."""
from pathlib import Path
import hashlib, json
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'data'
OUT.mkdir(exist_ok=True)
source = ROOT / 'sources/Residential-Building-Data-Set.xlsx'
raw = pd.read_excel(source, sheet_name='Data', header=1)
assert raw.shape == (372, 109)
assert not raw.isna().any().any() and not raw.duplicated().any()
assert np.allclose(raw['V-4'] * 1000 / raw['V-2'], raw['V-5'])
assert np.array_equal((raw['COMPLETION YEAR']-raw['START YEAR'])*4 + raw['COMPLETION QUARTER']-raw['START QUARTER'], raw['V-7'])
assert raw['V-2'].gt(0).all() and raw['V-5'].gt(0).all() and raw['V-10'].gt(0).all()
ids = pd.Series([f'UCI-RB-{i:03d}' for i in range(1,373)], index=raw.index)

# Restrict features by author documentation. V-21 refers to completion-time costs;
# V-6 uses conversion to a selected base year and is conservatively excluded.
physical = ['START YEAR','START QUARTER','V-1','V-2','V-3','V-4','V-5','V-8']
economic = [c for c in raw if c.startswith('V-') and 11 <= int(c.split('-')[1].split('.')[0]) <= 29 and not c.startswith('V-21')]
features = raw[physical + economic].copy()
features.columns = ['start_year','start_quarter','locality','floor_area_m2','lot_area_m2','preliminary_total_1e7_irr','preliminary_unit_1e4_irr','initial_sale_unit_1e4_irr'] + [c.replace('V-','economic_').replace('.','_lag_index_') for c in economic]
features.insert(0,'project_id',ids)
features['floor_lot_ratio'] = features.floor_area_m2 / features.lot_area_m2
labels = pd.DataFrame({'project_id':ids,'construction_cost_unit_1e4_irr':raw['V-10'],'duration_quarters':raw['V-7']})
labels['cost_overrun_gt_10pct'] = (labels.construction_cost_unit_1e4_irr > 1.1*raw['V-5']).astype(int)

train = raw['COMPLETION YEAR'].le(82)
validation = raw['START YEAR'].gt(82) & raw['START YEAR'].lt(87) & raw['COMPLETION YEAR'].lt(87)
refit_extra = raw['COMPLETION YEAR'].lt(87) & ~(train|validation)
test = raw['START YEAR'].ge(87)
assert (int(train.sum()),int(validation.sum()),int(refit_extra.sum()),int(test.sum())) == (162,81,31,38)
assert raw.loc[train,'COMPLETION YEAR'].max() < raw.loc[validation,'START YEAR'].min()
assert raw.loc[train|validation|refit_extra,'COMPLETION YEAR'].max() < raw.loc[test,'START YEAR'].min()
five = sorted(ids[test], key=lambda x:hashlib.sha256(('ACEP-REAL-V5-FIVE|'+x).encode()).hexdigest())[:5]
contract = {
 'version':'5.0','seed':42195,'dataset':'UCI Residential Building 437','doi':'10.24432/C5S896','license':'CC BY 4.0',
 'tasks':['construction_cost_unit_1e4_irr','duration_quarters','cost_overrun_gt_10pct'],
 'split':{'train':'completed by Persian year 1382','validation':'started in 1383-1386 and completed by 1386','refit_extra':'other projects completed by 1386, used only after candidate selection','test':'all projects started in 1387-1388'},
 'refit':'After validation-only selection, refit fixed candidates on all 274 projects completed by 1386. Test labels remain unopened until model hashes and selections are written.',
 'excluded_inflight':'60 projects started before 1387 but not completed by 1386. Their outcomes were not available at final fitting cutoff.',
 'censoring_limit':'Validation requires completion before the final test origin and can underrepresent longer projects. The source itself includes completed projects only, not the full population of projects in progress.',
 'five_projects':five,'five_rule':'First five SHA256(ACEP-REAL-V5-FIVE|project_id) among all 38 held-out projects; no outcome or score used.',
 'regression_acceptance':{'all_five_relative_error_at_most':0.10,'all_38_fraction_within_10pct_at_least':0.90,'coverage':1.0},
 'risk_acceptance':{'balanced_accuracy_at_least':0.90,'overrun_recall_at_least':0.90,'coverage':1.0,'each_class_min':5,'all_five_correct':True},
 'feature_exclusions':['completion year','completion quarter','V-6 base-year-equivalent cost','V-7 actual duration','V-9 actual sale price','V-10 actual construction cost','V-21 all five lags completion-time cost index','project_id'],
 'feature_sets':{'physical':[c for c in features if not c.startswith('economic_') and c!='project_id'],'economic':[c for c in features if c!='project_id']},
 'scope':'Historical Tehran residential total unit-cost forecast conditioned on an initial estimate, total duration forecast, and >10% cost-overrun classification. Not Saudi prices, BOQ quantities, full activity optimization, general risk, engineering certification or whole-seven-engine acceptance.',
 'source_limits':['Historical anonymized projects; no drawings or independently audited BOQ','Physical input design revision timestamps unavailable','Quarter resolution for duration','Prices are original historical Iranian rials; no SAR conversion or current-price claim','Validation and test sample sizes are small'],
 'selection_regression':'Lowest validation MAPE; tie WAPE then candidate name. Cost learned target is log(actual/preliminary), duration log(quarters). Neural checkpoint selected on validation only.',
 'selection_risk':'Highest validation balanced accuracy; tie lowest Brier then name. Threshold grid 0.10..0.90 step 0.025 on validation only.'
}
(OUT/'contract.json').write_text(json.dumps(contract,indent=2)+'\n')
for name,mask in [('train',train),('validation',validation),('refit_extra',refit_extra),('test',test)]:
 features[mask].to_csv(OUT/f'{name}_features.csv',index=False,float_format='%.12g')
 labels[mask].to_csv(OUT/f'{name}_labels.csv',index=False,float_format='%.12g')
audit={'raw_projects':len(raw),'train':int(train.sum()),'validation':int(validation.sum()),'refit_extra':int(refit_extra.sum()),'final_fit':int((train|validation|refit_extra).sum()),'test':int(test.sum()),'excluded_inflight':int((~(train|validation|refit_extra|test)).sum()),'feature_count':features.shape[1]-1,'physical_feature_count':len(contract['feature_sets']['physical']),'duplicates':0,'missing':0,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'five_projects':five,'train_overrun_counts':labels[train].cost_overrun_gt_10pct.value_counts().to_dict(),'test_labels_inspected_for_model_selection':False}
(OUT/'audit.json').write_text(json.dumps(audit,indent=2)+'\n')
lineage=pd.DataFrame({'project_id':ids,'source_excel_row':np.arange(3,375),'start_year':raw['START YEAR'],'start_quarter':raw['START QUARTER'],'completion_year':raw['COMPLETION YEAR'],'completion_quarter':raw['COMPLETION QUARTER'],'split':np.select([train,validation,refit_extra,test],['train','validation','refit_extra','test'],default='excluded_inflight')})
lineage.to_csv(ROOT/'sources/project_lineage.csv',index=False)
manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(OUT.iterdir()) if p.name!='manifest.json'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(audit,indent=2))
print('contract_sha256',manifest['contract.json'])
