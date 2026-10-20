"""Evaluate the unchanged retained v5 configuration on the same 240 cases."""
from pathlib import Path
import subprocess,sys,os,time
R=Path('/kaggle/working/acep-engineering-v1');O=R/'qwen3_v7_experiment'
start=time.time()
while not (R/'qwen3_v7_evaluation/base/report.json').exists():
 if (O/'status.json').exists() and '"failed"' in (O/'status.json').read_text():raise RuntimeError('v7 runner failed')
 if time.time()-start>3600:raise TimeoutError('base evaluation')
 time.sleep(10)
time.sleep(5)
s=(R/'evaluate_qwen3_v7.py').read_text()
s=s.replace("choices=['base','v7']","choices=['retained_v5']")
s=s.replace("I=json.loads((R/'qwen3_base_comparison/identity.json').read_text());S=(R/'qwen3_v7_plan/system_prompt.txt').read_text()","I=dict(model='Qwen/Qwen2.5-3B-Instruct',revision='9bbedf2d140158eb7dc95a89e776b86befc70e1a');S=(R/'v6_experiment/selected_system_prompt.txt').read_text()")
s=s.replace("from transformers import AutoTokenizer,AutoModelForCausalLM","from transformers import AutoTokenizer,AutoModelForCausalLM,BitsAndBytesConfig")
s=s.replace("precision='fp16'","precision='NF4 double quantization, fp16 compute'")
s=s.replace("if A.label=='v7':meta['adapter_sha256']", "if A.label=='retained_v5':meta['adapter_sha256']")
s=s.replace("R/'qlora_qwen3_v7/adapter/adapter_model.safetensors'","R/'qlora_tool_pilot_v5/adapter/adapter_model.safetensors'")
s=s.replace("dtype=torch.float16,device_map={'':0})","dtype=torch.float16,device_map={'':0},quantization_config=BitsAndBytesConfig(load_in_4bit=True,bnb_4bit_quant_type='nf4',bnb_4bit_use_double_quant=True,bnb_4bit_compute_dtype=torch.float16))")
s=s.replace("if A.label=='v7':model=PeftModel.from_pretrained(model,str(R/'qlora_qwen3_v7/adapter'))", "if A.label=='retained_v5':model=PeftModel.from_pretrained(model,str(R/'qlora_tool_pilot_v5/adapter'))")
p=R/'evaluate_retained_v5_240.py';compile(s,str(p),'exec');p.write_text(s)
with (O/'retained_v5.log').open('a') as f:subprocess.run([sys.executable,'-u',str(p),'--label','retained_v5'],env=dict(os.environ,CUDA_VISIBLE_DEVICES='0',TOKENIZERS_PARALLELISM='false'),stdout=f,stderr=subprocess.STDOUT,check=True)
