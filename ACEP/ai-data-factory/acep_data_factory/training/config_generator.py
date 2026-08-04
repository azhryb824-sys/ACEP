"""Auto-training configuration generators."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


def base_training_config(dataset_dir: str, model_name: str = "meta-llama/Llama-3.1-8B-Instruct") -> dict:
    return {
        "project": "acep-engineering-llm",
        "base_model": model_name,
        "dataset_dir": dataset_dir,
        "train_file": "training.jsonl",
        "validation_file": "validation.jsonl",
        "test_file": "test.jsonl",
        "max_seq_length": 4096,
        "learning_rate": 2e-4,
        "num_train_epochs": 3,
        "per_device_train_batch_size": 2,
        "gradient_accumulation_steps": 8,
        "warmup_ratio": 0.03,
        "logging_steps": 10,
        "save_steps": 500,
        "bf16": True,
        "seed": 42,
    }


def lora_config() -> dict:
    return {
        "peft_type": "LORA",
        "r": 16,
        "lora_alpha": 32,
        "lora_dropout": 0.05,
        "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        "bias": "none",
        "task_type": "CAUSAL_LM",
    }


def qlora_config() -> dict:
    cfg = lora_config()
    cfg.update({
        "quantization": {"load_in_4bit": True, "bnb_4bit_quant_type": "nf4", "bnb_4bit_use_double_quant": True},
        "torch_dtype": "bfloat16",
    })
    return cfg


def unsloth_config() -> dict:
    return {
        "framework": "unsloth",
        "model_name": "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit",
        "max_seq_length": 4096,
        "lora_r": 16,
        "lora_alpha": 16,
        "use_gradient_checkpointing": "unsloth",
    }


def huggingface_config(dataset_dir: str) -> dict:
    return {
        "framework": "huggingface_trl",
        "sft_config": base_training_config(dataset_dir),
        "peft_config": lora_config(),
        "dataset_format": "instruction",
    }


def axolotl_config(dataset_dir: str) -> dict:
    return {
        "base_model": "meta-llama/Llama-3.1-8B-Instruct",
        "datasets": [{"path": dataset_dir, "type": "alpaca.instruction"}],
        "adapter": "lora",
        "lora_r": 16,
        "lora_alpha": 32,
        "sequence_len": 4096,
        "micro_batch_size": 2,
        "gradient_accumulation_steps": 8,
        "learning_rate": 0.0002,
        "num_epochs": 3,
    }


def llamafactory_config(dataset_dir: str) -> dict:
    return {
        "model_name_or_path": "meta-llama/Llama-3.1-8B-Instruct",
        "stage": "sft",
        "finetuning_type": "lora",
        "dataset_dir": dataset_dir,
        "template": "llama3",
        "cutoff_len": 4096,
        "lora_rank": 16,
        "lora_alpha": 32,
        "learning_rate": 2e-4,
        "num_train_epochs": 3.0,
    }


def tokenizer_config() -> dict:
    return {
        "tokenizer": "meta-llama/Llama-3.1-8B-Instruct",
        "padding_side": "right",
        "truncation": True,
        "max_length": 4096,
        "chat_template": "llama3",
    }


def write_all_training_configs(output_dir: Path, dataset_dir: str) -> Dict[str, Path]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    files = {
        "training_config.json": base_training_config(dataset_dir),
        "lora_config.json": lora_config(),
        "qlora_config.json": qlora_config(),
        "unsloth_config.json": unsloth_config(),
        "huggingface_config.json": huggingface_config(dataset_dir),
        "axolotl_config.yaml-ready.json": axolotl_config(dataset_dir),
        "llamafactory_config.json": llamafactory_config(dataset_dir),
        "tokenizer_config.json": tokenizer_config(),
    }
    written = {}
    for name, cfg in files.items():
        path = output_dir / name
        path.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
        written[name] = path
    return written
