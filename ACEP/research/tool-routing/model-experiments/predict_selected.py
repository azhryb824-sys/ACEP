"""Read one original request per JSON line; output a proposal, never execute it."""
from pathlib import Path
import argparse
import hashlib
import json
import sys

parser=argparse.ArgumentParser()
parser.add_argument('--root',type=Path,default=Path('/kaggle/working/acep-engineering-v1'))
args=parser.parse_args()
ROOT=args.root
spec=json.loads((ROOT/'v6_experiment/selected_model.json').read_text())

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def within(relative):
    path=(ROOT/relative).resolve()
    assert path.is_relative_to(ROOT.resolve())
    return path

adapter=within(spec['adapter_path'])
prompt_path=within(spec['system_prompt_path'])
assert sha(adapter/'adapter_model.safetensors')==spec['adapter_sha256']
assert sha(prompt_path)==spec['system_prompt_sha256']
assert sha(ROOT/'tool_contract_gate_v1/contract_gate.py')==spec['contract_gate_sha256']
sys.path.insert(0,str(ROOT/'tool_contract_gate_v1'))
from contract_gate import gate
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM,BitsAndBytesConfig
from peft import PeftModel
assert torch.cuda.is_available()
tokenizer=AutoTokenizer.from_pretrained(spec['model'],revision=spec['revision'])
base=AutoModelForCausalLM.from_pretrained(spec['model'],revision=spec['revision'],dtype=torch.float16,
    device_map={'':0},quantization_config=BitsAndBytesConfig(load_in_4bit=True,
    bnb_4bit_quant_type='nf4',bnb_4bit_use_double_quant=True,bnb_4bit_compute_dtype=torch.float16))
model=PeftModel.from_pretrained(base,str(adapter)).eval()
system=prompt_path.read_text()

def strict_json(raw):
    def pairs(items):
        result={}
        for k,v in items:
            if k in result:raise ValueError('duplicate_json_key')
            result[k]=v
        return result
    def reject(value):raise ValueError('nonstandard_numeric_constant')
    return json.loads(raw,object_pairs_hook=pairs,parse_constant=reject)

for line in sys.stdin:
    try:
        request=strict_json(line)
        if not isinstance(request,dict) or set(request)!={'text'}:
            raise ValueError('invalid_request_contract')
        text=request['text']
        if not isinstance(text,str) or not text.strip() or len(text)>4096:
            raise ValueError('invalid_request_text')
        rendered=tokenizer.apply_chat_template([{'role':'system','content':system},
            {'role':'user','content':text}],tokenize=False,add_generation_prompt=True)
        inputs=tokenizer(rendered,return_tensors='pt',add_special_tokens=False).to('cuda:0')
        if inputs['input_ids'].shape[1]>2048:raise ValueError('input_token_limit')
        with torch.inference_mode():
            output=model.generate(**inputs,max_new_tokens=spec['max_new_tokens'],
                do_sample=False,pad_token_id=tokenizer.eos_token_id)
        raw=tokenizer.decode(output[0,inputs['input_ids'].shape[1]:],skip_special_tokens=True).strip()
        try:
            prediction=strict_json(raw)
            contract=gate(prediction)
        except (ValueError,TypeError,RecursionError):
            prediction=None
            contract={'status':'blocked','errors':['invalid_prediction_json']}
        result=dict(raw=raw,prediction=prediction,contract=contract,
            configuration=spec['configuration'],text_grounding_verified=False,
            calculation_executed=False,engineering_deployment_allowed=False)
    except (ValueError,TypeError,RecursionError) as error:
        result=dict(status='blocked',reason=str(error),calculation_executed=False)
    print(json.dumps(result,ensure_ascii=False,allow_nan=False),flush=True)
