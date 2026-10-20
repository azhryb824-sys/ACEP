"""Repair source metadata and add an external lagged price index; no fitting.

Requires the pinned v13 data and sources in the adjacent real-v13 directory.
Keeps every v13 partition, target and five-project ID unchanged. The exposed
2025 cohort is diagnostic only and cannot establish independent acceptance.
"""
from pathlib import Path
import json, re, hashlib, shutil
from collections import Counter
from html.parser import HTMLParser
import numpy as np, pandas as pd
import fitz, pdfplumber

R=Path(__file__).resolve().parent; OLD=R.parent/('real-building-cost-v13' if (R.parent/'real-building-cost-v13/data').exists() else 'real-v13'); D=R/'data'; D.mkdir(exist_ok=True)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
def norm(s):return re.sub('[^a-z0-9]','',str(s).lower())
def number(s):
 if not s:return None
 assert re.fullmatch(r'[\d,]+(?:\.\d+)?',s),s
 return float(s.replace(',',''))

# Parse the publisher's observation table, retaining the original HTML bytes.
class IndexTable(HTMLParser):
 def __init__(self):super().__init__();self.active=False;self.cell=False;self.rows=[];self.row=[];self.value=''
 def handle_starttag(self,t,a):
  if t=='table' and dict(a).get('id')=='data-table-observations':self.active=True
  if self.active and t=='tr':self.row=[]
  if self.active and t in ['th','td']:self.cell=True;self.value=''
 def handle_data(self,s):
  if self.cell:self.value+=s
 def handle_endtag(self,t):
  if self.active and t in ['th','td']:self.row.append(self.value.strip());self.cell=False
  if self.active and t=='tr' and len(self.row)==2 and re.fullmatch(r'\d{4}-\d{2}-\d{2}',self.row[0]):self.rows.append(self.row)
  if t=='table':self.active=False
p=R/'sources/price_index_source.html';reader=IndexTable();reader.feed(p.read_text())
monthly=pd.DataFrame(reader.rows,columns=['date','index']);monthly['index']=pd.to_numeric(monthly['index']);monthly['year']=monthly.date.str[:4].astype(int)
monthly=monthly[monthly.year.between(2009,2024)];assert len(monthly)==16*12 and monthly.date.is_unique
annual={int(y):float(g['index'].mean()) for y,g in monthly.groupby('year')};monthly.to_csv(D/'price_index_monthly.csv',index=False)
save(D/'price_index.json',{'series':'PCU236222236222','annual':annual,'source_url':'https://fred.stlouisfed.org/data/PCU236222236222','source_sha256':sha(p),'retrieved_utc_date':'2026-10-20','source':'U.S. Bureau of Labor Statistics via FRED','vintage':'Current revised values, not historical release vintages','policy':'Use prior calendar year annual average divided by 100. National new K-12 index; application to additions is an unvalidated modeling approximation. No tender-time availability guarantee.'})

# Exact nonmonetary matching to explicit type-of-addition or new-construction tables.
master=json.loads((OLD/'pdf_records.json').read_text());matches=[];secondary_checks=0;unmatched=[];page_audit=[]
for year in [2022,2023,2025]:
 path=OLD/'sources'/f'schools_{year}.pdf';doc=fitz.open(path);second=pdfplumber.open(path)
 for pn,page in enumerate(doc):
  text=page.get_text(); scope='new' if 'NEW CONSTRUCTION' in text else 'addition' if re.search(r'TYPE\s+OF\s+ADDITION',text) else None
  if scope is None:continue
  words=page.get_text('words');anchors=sorted([w for w in words if w[4] in ['1','2','3','4'] and 15<w[0]<40 and w[1]>100],key=lambda w:w[1])
  if not anchors:continue
  first=min(w[1] for w in anchors);headers=[w for w in words if w[1]<first and w[1]>first-90]
  def center(word,low=0,high=600):
   found=[w for w in headers if w[4]==word and low<w[0]<high]
   assert len(found)==1,(year,pn,word,found)
   return (found[0][0]+found[0][2])/2
  stations=sorted([(w[0]+w[2])/2 for w in headers if w[4]=='STATIONS' and w[0]<500])
  if len(stations)!=2:continue
  student,teacher=stations;net=center('NET');gross=center('GROSS',0,600);arch=center('ARCHITECT',gross,600);grade=center('9-12',teacher,net)
  bands={'students':(student-(teacher-student)/2,(student+teacher)/2),'net_ft2':((grade+net)/2,(net+gross)/2),'gross_ft2':((net+gross)/2,(gross+arch)/2)}
  sp=second.pages[pn];pw=sp.extract_words(x_tolerance=1,y_tolerance=1)
  for w in pw:w['x0']-=sp.bbox[0];w['x1']-=sp.bbox[0];w['top']-=sp.bbox[1];w['bottom']-=sp.bbox[1]
  accepted=0
  for an in anchors:
   yc=(an[1]+an[3])/2;near=[w for w in words if abs((w[1]+w[3])/2-yc)<2];vals={};valid=True;cell_evidence=[]
   for key,(lo,hi) in bands.items():
    a=[w for w in near if lo<=(w[0]+w[2])/2<hi];raw=''.join(w[4] for w in sorted(a,key=lambda w:w[0]))
    if not re.fullmatch(r'[\d,]+(?:\.\d+)?',raw):valid=False;break
    b=[w for w in pw if abs((w['top']+w['bottom'])/2-yc)<2 and lo<=(w['x0']+w['x1'])/2<hi];raw2=''.join(w['text'] for w in sorted(b,key=lambda w:w['x0']))
    assert number(raw)==number(raw2),(year,pn,key,raw,raw2)
    vals[key]=number(raw);secondary_checks+=1;cell_evidence.append({'field':key,'raw':raw,'independent_raw':raw2,'x0':lo,'x1':hi,'y':yc})
   if not valid:continue
   left=' '.join(w[4] for w in sorted(near,key=lambda w:w[0]) if an[2]<w[0]<bands['students'][0])
   candidates=[r for r in master if r['year']==year and r['school_type']==an[4] and all(r[k]==v for k,v in vals.items()) and norm(left).startswith(norm(r['district']))]
   # The known duplicate 2023 row is allowed to share exactly the same evidence.
   identities={norm(r['district'])+'|'+norm(r['facility']) for r in candidates}
   if len(identities)!=1:unmatched.append({'year':year,'page':pn+1,'y':yc,'scope':scope,'candidate_ids':[r['project_id'] for r in candidates]});continue
   for r in candidates:matches.append({'project_id':r['project_id'],'scope':scope,'source_file':path.name,'page':pn+1,'y':yc,'matched_on':['year','school_type','district','students','net_ft2','gross_ft2'],'cells':cell_evidence})
   accepted+=1
  page_audit.append({'year':year,'page':pn+1,'scope':scope,'matched_rows':accepted,'bands':bands})
 second.close();doc.close()
scope_map={};conflicts=[]
for pid in {m['project_id'] for m in matches}:
 scopes={m['scope'] for m in matches if m['project_id']==pid}
 if len(scopes)==1:scope_map[pid]=next(iter(scopes))
 else:conflicts.append(pid)
save(R/'scope_audit.json',{'matches':matches,'conflicts':conflicts,'unmatched_summary_rows':unmatched,'pages':page_audit,'independent_numeric_checks':secondary_checks})
changes=[];suspect=[]
for split in ['development','calibration','test']:
 f=pd.read_csv(OLD/'data'/f'{split}_features.csv',dtype={'school_type':str});original=f.copy(deep=True)
 for i,row in f.iterrows():
  if row.project_id in scope_map and row.project_scope=='unverified':
   f.at[i,'project_scope']=scope_map[row.project_id];changes.append({'split':split,'project_id':row.project_id,'old':'unverified','new':scope_map[row.project_id]})
  cls=row[['classes_k5','classes_68','classes_912']].to_numpy(float)
  if np.isfinite(row.students) and row.students>0 and np.any(cls>row.students/2):suspect.append({'project_id':row.project_id,'split':split,'reason':'class_count_above_half_student_capacity','action':'flag only; no target or numeric source alteration'})
 f['ppi_lag1']=f.year.map(lambda y:annual[int(y)-1]/100)
 assert np.isfinite(f.ppi_lag1).all() and f.project_id.tolist()==original.project_id.tolist()
 f.to_csv(D/f'{split}_features.csv',index=False,float_format='%.15g')
 shutil.copy2(OLD/'data'/f'{split}_labels.csv',D/f'{split}_labels.csv')
 original.to_csv(D/f'{split}_original_features.csv',index=False,float_format='%.15g')
for name in ['folds.json','split_audit.csv','sources.json','column_maps.json','source_quality.json']:shutil.copy2(OLD/'data'/name,D/name)
contract=json.loads((R/'protocol.json').read_text());contract['five_projects']=json.loads((OLD/'data/contract.json').read_text())['five_projects'];save(D/'contract.json',contract)
summary={'scope_changes':dict(Counter(x['split'] for x in changes)),'scope_change_total':len(changes),'conflicting_scope_ids':conflicts,'suspect_classroom_records':len(suspect),'prior_cohort_unchanged':True,'prior_targets_unchanged':True,'development':610,'calibration':46,'diagnostic_test':64,'new_independent_test_records':0,'ppi_months':len(monthly),'local_fits':0}
save(D/'audit.json',summary);save(D/'data_repairs.json',{'scope_changes':changes,'suspect_classroom_counts':suspect,'numeric_values_overwritten':0})
shutil.copy2(OLD/'kaggle-output/selected_model.json',D/'v13_model.json')
shutil.copy2(OLD/'kaggle-output/test_predictions.csv',D/'v13_test_predictions.csv')
save(D/'manifest.json',{p.name:sha(p) for p in sorted(D.iterdir()) if p.is_file() and p.name!='manifest.json'})
print(json.dumps(summary,indent=2))
