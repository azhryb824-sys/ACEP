"""Fresh FP16 LoRA, assistant-only loss; bounded one-epoch research run."""
from pathlib import Path
import json,hashlib,os,math
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM,Trainer,TrainingArguments,set_seed
from peft import LoraConfig,get_peft_model
R=Path('/kaggle/working/acep-engineering-v1');O=R/'qlora_qwen3_v7';O.mkdir(exist_ok=True)
if (O/'completed.json').exists():print((O/'completed.json').read_text());raise SystemExit
I=json.loads((R/'qwen3_base_comparison/identity.json').read_text());S=(R/'qwen3_v7_plan/system_prompt.txt').read_text()
P=json.loads((R/'qwen3_v7_plan/memory_probe.json').read_text());assert P['selected_micro_batch']==2
set_seed(7301);tok=AutoTokenizer.from_pretrained(I['model'],revision=I['revision'],local_files_only=True)
if tok.pad_token_id is None:tok.pad_token=tok.eos_token
class Data(torch.utils.data.Dataset):
 def __init__(self,name):
  self.data=[]
  for r in map(json.loads,(R/'tool_data_qwen3_v7'/name).read_text().splitlines()):
   user=r['instruction']+('\n'+r['input'] if r.get('input') else '')
   m=[dict(role='system',content=S),dict(role='user',content=user)]
   a=tok(tok.apply_chat_template(m,tokenize=False,add_generation_prompt=True),add_special_tokens=False)['input_ids']
   b=tok(tok.apply_chat_template(m+[dict(role='assistant',content=r['output'])],tokenize=False),add_special_tokens=False)['input_ids']
   assert b[:len(a)]==a and len(a)<len(b)<=2048
   self.data.append(dict(input_ids=b,attention_mask=[1]*len(b),labels=[-100]*len(a)+b[len(a):]))
 def __len__(self):return len(self.data)
 def __getitem__(self,i):return self.data[i]
train=Data('training.jsonl');val=Data('validation.jsonl')
assert max(len(x['input_ids']) for x in train.data+val.data)<=640,'Repeat memory probe for longer data'
def collate(rows):
 n=max(len(r['input_ids']) for r in rows)
 return {k:torch.tensor([r[k]+[0 if k=='attention_mask' else -100 if k=='labels' else tok.pad_token_id]*(n-len(r[k])) for r in rows]) for k in ['input_ids','attention_mask','labels']}
base=AutoModelForCausalLM.from_pretrained(I['model'],revision=I['revision'],local_files_only=True,dtype=torch.float16,device_map={'':0})
base.config.use_cache=False
model=get_peft_model(base,LoraConfig(r=16,lora_alpha=32,lora_dropout=.05,bias='none',task_type='CAUSAL_LM',target_modules=['q_proj','k_proj','v_proj','o_proj','gate_proj','up_proj','down_proj']))
for p in model.parameters():
 if p.requires_grad:p.data=p.data.float()
model.enable_input_require_grads();model.print_trainable_parameters()
args=TrainingArguments(output_dir=str(O),per_device_train_batch_size=2,gradient_accumulation_steps=4,per_device_eval_batch_size=1,num_train_epochs=1,learning_rate=1e-4,warmup_steps=11,lr_scheduler_type='cosine',fp16=True,optim='adamw_torch',gradient_checkpointing=True,gradient_checkpointing_kwargs={'use_reentrant':False},logging_steps=5,eval_strategy='steps',eval_steps=50,save_strategy='steps',save_steps=50,save_total_limit=2,report_to='none',seed=7301,data_seed=7301,remove_unused_columns=False,dataloader_num_workers=0,max_grad_norm=1.0)
trainer=Trainer(model=model,args=args,train_dataset=train,eval_dataset=val,data_collator=collate,processing_class=tok)
checkpoints=sorted(O.glob('checkpoint-*'),key=lambda p:int(p.name.split('-')[-1]))
resume=str(checkpoints[-1]) if checkpoints else None
print('TRAINING_V7',json.dumps(dict(records=len(train),steps=math.ceil(len(train)/8),resume=resume,max_tokens=max(len(x['input_ids']) for x in train.data+val.data))),flush=True)
result=trainer.train(resume_from_checkpoint=resume)
ad=O/'adapter';model.save_pretrained(ad);tok.save_pretrained(ad)
metrics=trainer.evaluate();sha=hashlib.sha256((ad/'adapter_model.safetensors').read_bytes()).hexdigest()
report=dict(training_completed=True,identity=I,adapter_sha256=sha,training_metrics=result.metrics,validation_metrics=metrics,scope='authored four-tool research; unpromoted',engineering_deployment_allowed=False)
(O/'completed.json').write_text(json.dumps(report,indent=2));print('V7_COMPLETED',json.dumps(report),flush=True)
