"""Unrepaired model proposals, fixed FP16 precision and prompt for base/LoRA."""
from pathlib import Path
from decimal import Decimal
from collections import Counter
import ast,json,hashlib,os,sys,argparse
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM
from peft import PeftModel
R=Path('/kaggle/working/acep-engineering-v1')
p=argparse.ArgumentParser();p.add_argument('--label',choices=['base','v7'],required=True);A=p.parse_args();O=R/'qwen3_v7_evaluation'/A.label;O.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(R/'tool_contract_gate_v1'));from contract_gate import gate
I=json.loads((R/'qwen3_base_comparison/identity.json').read_text());S=(R/'qwen3_v7_plan/system_prompt.txt').read_text()
cases=[json.loads(x) for x in (R/'v6_experiment/evaluation_cases.jsonl').read_text().splitlines()]
cases +=[json.loads(x) for x in (R/'v6_frozen_probe/cases.jsonl').read_text().splitlines()]
new=[json.loads(x) for x in (R/'tool_data_qwen3_v7/validation_targets.jsonl').read_text().splitlines()]
# Normalize family metadata for scoring, without changing any target or question.
for c in new:
 c['suite']='v7_validation96';f=c['family'];c['family']='line_cost' if 'price' in f or f=='cost_both_missing' else 'net_area' if 'openings' in f else 'add_waste' if 'waste' in f or f=='zero_net' else 'rectangular_volume'
cases+=new;assert len(cases)==240 and len({c['id'] for c in cases})==240
numeric={'length_m','width_m','height_m','count','gross_m2','openings_m2','quantity','unit_price','net_quantity','waste_percent'}
def eq(a,b,k=None):
 if isinstance(b,dict):return isinstance(a,dict) and set(a)==set(b) and all(eq(a[x],b[x],x) for x in b)
 if isinstance(b,list):return isinstance(a,list) and all(isinstance(x,str) for x in a) and len(a)==len(set(a)) and sorted(a)==sorted(b)
 if k in numeric:
  try:return not isinstance(a,bool) and isinstance(a,(str,int,float)) and Decimal(str(a)).is_finite() and Decimal(str(a))==Decimal(str(b))
  except:return False
 return type(a)==type(b) and a==b
def strict(raw):
 def pairs(xs):
  d={}
  for k,v in xs:
   if k in d:raise ValueError('duplicate key')
   d[k]=v
  return d
 return json.loads(raw,object_pairs_hook=pairs,parse_constant=lambda x:(_ for _ in ()).throw(ValueError(x)))
meta=dict(label=A.label,model=I['model'],revision=I['revision'],precision='fp16',prompt_sha256=hashlib.sha256(S.encode()).hexdigest(),cases_sha256=hashlib.sha256(json.dumps(cases,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),max_new_tokens=256,do_sample=False)
if A.label=='v7':meta['adapter_sha256']=hashlib.sha256((R/'qlora_qwen3_v7/adapter/adapter_model.safetensors').read_bytes()).hexdigest()
mp=O/'metadata.json'
if mp.exists():assert json.loads(mp.read_text())==meta
else:mp.write_text(json.dumps(meta,indent=2))
path=O/'predictions.jsonl';saved={r['id']:r for r in map(json.loads,path.read_text().splitlines())} if path.exists() else {}
if len(saved)<len(cases):
 tok=AutoTokenizer.from_pretrained(I['model'],revision=I['revision'],local_files_only=True)
 model=AutoModelForCausalLM.from_pretrained(I['model'],revision=I['revision'],local_files_only=True,dtype=torch.float16,device_map={'':0})
 if A.label=='v7':model=PeftModel.from_pretrained(model,str(R/'qlora_qwen3_v7/adapter'))
 model.eval()
 for c in cases:
  if c['id'] in saved:continue
  prompt=tok.apply_chat_template([dict(role='system',content=S),dict(role='user',content=c['instruction'])],tokenize=False,add_generation_prompt=True)
  ins=tok(prompt,add_special_tokens=False,return_tensors='pt').to('cuda:0')
  with torch.inference_mode():out=model.generate(**ins,max_new_tokens=256,do_sample=False,pad_token_id=tok.eos_token_id)
  raw=tok.decode(out[0,ins['input_ids'].shape[1]:],skip_special_tokens=True).strip();error=None
  try:pred=strict(raw);valid=gate(pred)['status']!='blocked';exact=eq(pred,c['target'])
  except Exception as e:pred=None;valid=False;exact=False;error=str(e)
  row=dict(c,raw=raw,prediction=pred,contract_valid=valid,exact=exact,parse_error=error)
  with path.open('a') as f:f.write(json.dumps(row,ensure_ascii=False)+'\n');f.flush();os.fsync(f.fileno())
  saved[c['id']]=row;print('GENERATED',len(saved),'/240',c['id'],exact,flush=True)
rows=[saved[c['id']] for c in cases]
def stats(rs):return dict(total=len(rs),exact=sum(r['exact'] for r in rs),contract_valid=sum(r['contract_valid'] for r in rs),calls_on_missing_input=[r['id'] for r in rs if r['target']['action']=='clarify' and isinstance(r['prediction'],dict) and r['prediction'].get('action')=='call'],incorrect_contract_valid_calls=[r['id'] for r in rs if not r['exact'] and r['contract_valid'] and isinstance(r['prediction'],dict) and r['prediction'].get('action')=='call'])
report=dict(label=A.label,**stats(rows),per_suite={s:stats([r for r in rows if r['suite']==s]) for s in sorted({r['suite'] for r in rows})},per_tool={t:stats([r for r in rows if r['family']==t]) for t in sorted({r['family'] for r in rows})},scope='authored development; related templates; not independent engineering test',tools_executed=False,engineering_deployment_allowed=False)
(O/'report.json').write_text(json.dumps(report,indent=2));print('V7_EVALUATION',json.dumps(report),flush=True)
