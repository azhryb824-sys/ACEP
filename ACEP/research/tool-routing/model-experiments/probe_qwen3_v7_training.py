"""Measure an FP16 LoRA training batch without any optimizer update."""
from pathlib import Path
import hashlib
import json
import os
import time

os.environ['CUDA_VISIBLE_DEVICES']='1'
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM,set_seed
from peft import LoraConfig,get_peft_model

ROOT=Path('/kaggle/working/acep-engineering-v1')
OUT=ROOT/'qwen3_v7_plan'
OUT.mkdir(exist_ok=True)
SYSTEM='''Extract supplied facts for four tools. Output only JSON with exactly action,tool,arguments,missing_fields. Never calculate final results or invent data.
call: tool is one name below, arguments has every required field and no extra fields, missing_fields=[].
clarify: tool=null, arguments={}, missing_fields lists ALL missing/unresolved numeric fields, using exact English field names, never Arabic descriptions.
invalid_input: tool=null, arguments={}, missing_fields=[].
rectangular_volume(length_m,width_m,height_m,count): dimensions in metres, positive; count a positive integer. cm/سم/سنتيمتر divide by100; mm/مم/مليمتر divide by1000. height_m is سمك/سماكة/ارتفاع/البعد الرأسي. Explicit dual forms عمودان/قطعتان/كمرتان mean2. Never assume a group count.
net_area(gross_m2,openings_m2): gross>0, 0<=openings<=gross. Equal values are valid; copy both supplied values.
add_waste(net_quantity,waste_percent,unit): numbers>=0; unit="m2".
line_cost(quantity,unit_price,quantity_unit,price_unit): numbers>=0; quantity_unit="m2",price_unit="SAR/m2". Do not add waste again.
Zero price/free supply, zero quantity, zero net quantity, zero openings, and zero waste are valid known values, not missing. Zero dimensions/count/gross or any negative numeric input are invalid. Arabic سالب/ناقص followed by a number means negative. Conflicting unapproved values require clarification of that field.
Copy decimal values faithfully; normalize Arabic/Persian digits. Document/date/room/invoice identifiers are not tool values. Bind numbers to their labels and units. Missing data requires clarification, not invalid_input. Ask for ALL missing fields together. If exact reinforcement lacks design, clarify structural_design_and_reinforcement_details.
'''
p=OUT/'system_prompt.txt'
if p.exists():assert p.read_text()==SYSTEM
else:p.write_text(SYSTEM)
identity=json.loads((ROOT/'qwen3_base_comparison/identity.json').read_text())
set_seed(42)
tok=AutoTokenizer.from_pretrained(identity['model'],revision=identity['revision'],local_files_only=True)
if tok.pad_token_id is None:tok.pad_token=tok.eos_token
rows=[json.loads(x) for x in (ROOT/'tool_data_pilot_v6/training.jsonl').read_text().splitlines()]
encoded=[]
for r in rows:
    user=r['instruction']+ ('\n'+r['input'] if r.get('input') else '')
    prefix=tok.apply_chat_template([dict(role='system',content=SYSTEM),dict(role='user',content=user)],tokenize=False,add_generation_prompt=True)
    full=tok.apply_chat_template([dict(role='system',content=SYSTEM),dict(role='user',content=user),dict(role='assistant',content=r['output'])],tokenize=False)
    a=tok(prefix,add_special_tokens=False)['input_ids'];b=tok(full,add_special_tokens=False)['input_ids']
    assert b[:len(a)]==a and len(a)<len(b)<=2048
    encoded.append(dict(input_ids=b,attention_mask=[1]*len(b),labels=[-100]*len(a)+b[len(a):]))
encoded.sort(key=lambda r:len(r['input_ids']),reverse=True)
length=max(640,len(encoded[0]['input_ids']))
model=AutoModelForCausalLM.from_pretrained(identity['model'],revision=identity['revision'],local_files_only=True,
    dtype=torch.float16,device_map={'':0})
model.config.use_cache=False
model=get_peft_model(model,LoraConfig(r=16,lora_alpha=32,lora_dropout=.05,bias='none',task_type='CAUSAL_LM',
    target_modules=['q_proj','k_proj','v_proj','o_proj','gate_proj','up_proj','down_proj']))
for p in model.parameters():
    if p.requires_grad and p.dtype!=torch.float32:p.data=p.data.float()
model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={'use_reentrant':False})
model.enable_input_require_grads()
model.train()
model.print_trainable_parameters()
results=[];chosen=None
for size in [8,4,2,1]:
    inputs=output=loss=None
    model.zero_grad(set_to_none=True)
    torch.cuda.empty_cache();torch.cuda.reset_peak_memory_stats();torch.cuda.synchronize()
    start=time.perf_counter()
    try:
        selected=encoded[:size]
        inputs={k:torch.tensor([r[k]+([0] if k=='attention_mask' else [-100] if k=='labels' else [tok.pad_token_id])*(length-len(r[k])) for r in selected],device='cuda:0') for k in ['input_ids','attention_mask','labels']}
        with torch.autocast('cuda',dtype=torch.float16):output=model(**inputs);loss=output.loss
        assert torch.isfinite(loss)
        loss.backward();torch.cuda.synchronize()
        assert all(torch.isfinite(p.grad).all() for p in model.parameters() if p.requires_grad and p.grad is not None)
        elapsed=time.perf_counter()-start
        peak=torch.cuda.max_memory_allocated()/1e9
        result=dict(batch_size=size,padded_tokens=length,elapsed_seconds=elapsed,peak_allocated_gb=peak,loss=float(loss.detach()),finite=True)
        results.append(result);print('TRAINING_BATCH_PROBE',json.dumps(result),flush=True)
        if peak<13.5:
            chosen=size;break
    except torch.OutOfMemoryError:
        results.append(dict(batch_size=size,padded_tokens=length,oom=True));print('TRAINING_BATCH_OOM',size,flush=True)
    finally:
        model.zero_grad(set_to_none=True);inputs=output=loss=None;torch.cuda.empty_cache()
assert chosen is not None
report=dict(identity=identity,system_sha256=hashlib.sha256(SYSTEM.encode()).hexdigest(),
    selected_micro_batch=chosen,gradient_accumulation_steps=8//chosen,attempts=results,
    optimizer_steps_executed=0,base_weights_changed=False,training_started=False)
(OUT/'memory_probe.json').write_text(json.dumps(report,indent=2))
print('TRAINING_MEMORY_PREFLIGHT_PASSED',json.dumps(report),flush=True)
