from pathlib import Path
from decimal import Decimal
import json,sys,os,hashlib,argparse
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM
from peft import PeftModel
R=Path('/kaggle/working/acep-engineering-v1');D=R/'v9_site'
p=argparse.ArgumentParser();p.add_argument('--adapter',choices=['v7','v8','v9']);p.add_argument('--suite',choices=['development','frozen','regression','published']);p.add_argument('--shard',type=int,default=-1);a=p.parse_args()
O=D/(a.adapter+'_'+a.suite+('' if a.shard<0 else '_shard'+str(a.shard)));O.mkdir(exist_ok=True)
if a.suite=='regression':cs=[json.loads(x) for x in (R/'v8_units/v8_evaluation348/predictions.jsonl').read_text().splitlines()]
else:cs=[json.loads(x) for x in (D/(a.suite+'_cases.jsonl')).read_text().splitlines()]
cs=[{k:c[k] for k in ['id','suite','family','instruction','target']} for c in cs]
if a.shard>=0:cs=cs[a.shard::2]
sys.path.insert(0,str(R/('tool_contract_gate_v1' if a.adapter=='v7' else 'v8_units/contract_v2')));from contract_gate import gate
S=(R/('qwen3_v7_plan/system_prompt.txt' if a.adapter=='v7' else 'v8_units/system_prompt_v3.txt')).read_text();I=json.loads((R/'qwen3_base_comparison/identity.json').read_text());ad=R/('qlora_qwen3_v7/adapter' if a.adapter=='v7' else 'qlora_units_v8/adapter' if a.adapter=='v8' else 'qlora_site_v9/adapter')
num={'length_m','width_m','height_m','count','gross_m2','openings_m2','quantity','unit_price','net_quantity','waste_percent'}
def eq(x,y,k=''):
 if isinstance(y,dict):return isinstance(x,dict) and set(x)==set(y) and all(eq(x[t],y[t],t) for t in y)
 if isinstance(y,list):return isinstance(x,list) and all(isinstance(t,str) for t in x) and len(x)==len(set(x)) and sorted(x)==sorted(y)
 if k in num:
  try:return not isinstance(x,bool) and isinstance(x,(str,int,float)) and Decimal(str(x)).is_finite() and Decimal(str(x))==Decimal(str(y))
  except:return False
 return type(x)==type(y) and x==y
def strict(raw):
 def pairs(xs):
  d={}
  for k,v in xs:
   if k in d:raise ValueError('duplicate key')
   d[k]=v
  return d
 return json.loads(raw,object_pairs_hook=pairs,parse_constant=lambda x:(_ for _ in ()).throw(ValueError(x)))
meta=dict(adapter_sha256=hashlib.sha256((ad/'adapter_model.safetensors').read_bytes()).hexdigest(),prompt_sha256=hashlib.sha256(S.encode()).hexdigest(),case_sha256=hashlib.sha256(json.dumps(cs,sort_keys=True,ensure_ascii=False).encode()).hexdigest(),precision='fp16',max_new_tokens=256)
mp=O/'metadata.json'
if mp.exists():assert json.loads(mp.read_text())==meta
else:mp.write_text(json.dumps(meta,indent=2))
path=O/'predictions.jsonl';saved={r['id']:r for r in map(json.loads,path.read_text().splitlines())} if path.exists() else {}
if len(saved)<len(cs):
 tok=AutoTokenizer.from_pretrained(I['model'],revision=I['revision'],local_files_only=True)
 base=AutoModelForCausalLM.from_pretrained(I['model'],revision=I['revision'],local_files_only=True,dtype=torch.float16,device_map={'':0})
 model=PeftModel.from_pretrained(base,str(ad)).eval()
 for c in cs:
  if c['id'] in saved:continue
  text=tok.apply_chat_template([dict(role='system',content=S),dict(role='user',content=c['instruction'])],tokenize=False,add_generation_prompt=True)
  ins=tok(text,add_special_tokens=False,return_tensors='pt').to('cuda:0')
  assert ins['input_ids'].shape[1]<2048
  with torch.inference_mode():out=model.generate(**ins,max_new_tokens=256,do_sample=False,pad_token_id=tok.eos_token_id)
  raw=tok.decode(out[0,ins['input_ids'].shape[1]:],skip_special_tokens=True).strip()
  try:pred=strict(raw);valid=gate(pred)['status']!='blocked';exact=eq(pred,c['target'])
  except Exception:pred=None;valid=exact=False
  row=dict(c,raw=raw,prediction=pred,contract_valid=valid,exact=exact)
  with path.open('a') as f:f.write(json.dumps(row,ensure_ascii=False)+'\n');f.flush();os.fsync(f.fileno())
  saved[c['id']]=row;print('GENERATED',len(saved),'/',len(cs),c['id'],exact,flush=True)
rows=[saved[c['id']] for c in cs]
report=dict(total=len(rows),exact=sum(r['exact'] for r in rows),contract_valid=sum(r['contract_valid'] for r in rows),incorrect_contract_valid_calls=[r['id'] for r in rows if not r['exact'] and r['contract_valid'] and isinstance(r['prediction'],dict) and r['prediction'].get('action')=='call'],calls_on_missing=[r['id'] for r in rows if r['target']['action']=='clarify' and isinstance(r['prediction'],dict) and r['prediction'].get('action')=='call'],failures=[r for r in rows if not r['exact']],scope='authored site-style extraction, not actual projects or engineering certification',engineering_deployment_allowed=False)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('REPORT',json.dumps(report,ensure_ascii=False),flush=True)
