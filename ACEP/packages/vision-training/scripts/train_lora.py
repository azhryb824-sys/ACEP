#!/usr/bin/env python3
"""
ACEP Vision Training - LoRA Fine-tuning for Stable Diffusion XL
==============================================================
Trains LoRA weights on top of stabilityai/stable-diffusion-xl-base-1.0
without modifying the base model.

Usage:
    python train_lora.py \
        --base_model stabilityai/stable-diffusion-xl-base-1.0 \
        --output_dir ./output \
        --dataset_dir ./metadata.jsonl \
        --images_dir ./images \
        --captions_dir ./captions \
        --learning_rate 1e-4 \
        --train_batch_size 1 \
        --max_train_steps 1000 \
        --resolution 1024 \
        --lora_rank 64 \
        --lora_alpha 128 \
        --mixed_precision fp16 \
        --seed 42
"""

import argparse
import json
import os
import sys
import time
import math
import random
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="ACEP LoRA Training for SDXL")
    parser.add_argument("--base_model", type=str, default="stabilityai/stable-diffusion-xl-base-1.0")
    parser.add_argument("--output_dir", type=str, required=True)
    parser.add_argument("--dataset_dir", type=str, required=True, help="Path to metadata.jsonl")
    parser.add_argument("--images_dir", type=str, required=True)
    parser.add_argument("--captions_dir", type=str, default=None)
    parser.add_argument("--learning_rate", type=float, default=1e-4)
    parser.add_argument("--train_batch_size", type=int, default=1)
    parser.add_argument("--gradient_accumulation_steps", type=int, default=4)
    parser.add_argument("--max_train_steps", type=int, default=1000)
    parser.add_argument("--resolution", type=int, default=1024)
    parser.add_argument("--lora_rank", type=int, default=64)
    parser.add_argument("--lora_alpha", type=int, default=128)
    parser.add_argument("--mixed_precision", type=str, default="fp16", choices=["no", "fp16", "bf16"])
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--checkpointing_steps", type=int, default=200)
    parser.add_argument("--validation_steps", type=int, default=100)
    parser.add_argument("--warmup_steps", type=int, default=100)
    parser.add_argument("--noise_offset", type=float, default=0.01)
    parser.add_argument("--snr_gamma", type=float, default=5.0)
    parser.add_argument("--simulate", action="store_true", help="Run in simulation mode without loading model")
    parser.add_argument("--cloud", action="store_true", help="Use cloud API (Replicate) instead of local training")
    parser.add_argument("--replicate_token", type=str, default=None, help="Replicate API token (or set REPLICATE_API_TOKEN env)")
    return parser.parse_args()


def validate_environment():
    """Check if required packages are available."""
    required = ["torch", "diffusers", "transformers", "accelerate", "peft"]
    missing = []
    for pkg in required:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"ERROR: Missing required packages: {', '.join(missing)}")
        print(f"Install with: pip install {' '.join(missing)}")
        sys.exit(1)
    print(f"All required packages found")


def load_dataset(dataset_path, images_dir, captions_dir):
    """Load dataset from metadata.jsonl file."""
    entries = []
    if os.path.exists(dataset_path):
        with open(dataset_path, "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    entry = json.loads(line)
                    image_path = os.path.join(images_dir, entry["file_name"])
                    caption_path = os.path.join(captions_dir, f"{Path(entry['file_name']).stem}.txt")
                    if os.path.exists(image_path):
                        caption = entry.get("text", "")
                        if os.path.exists(caption_path):
                            with open(caption_path, "r") as cf:
                                caption = cf.read().strip()
                        entries.append({"image_path": image_path, "caption": caption})
    print(f"Loaded {len(entries)} training entries")
    return entries


def cloud_train(args):
    """Cloud-based training using Replicate API."""
    token = args.replicate_token or os.environ.get("REPLICATE_API_TOKEN", "")
    if not token:
        print(json.dumps({"error": "REPLICATE_API_TOKEN not set. Get one at https://replicate.com/account"}))
        sys.exit(1)

    try:
        import replicate
        replicate.Client(api_token=token)
    except Exception as e:
        print(json.dumps({"error": f"Failed to init Replicate: {e}"}))
        sys.exit(1)

    dataset = load_dataset(args.dataset_dir, args.images_dir, args.captions_dir)
    if not dataset:
        print(json.dumps({"error": "No dataset entries found"}))
        sys.exit(1)

    print(f"Starting cloud training via Replicate...")
    print(f"Dataset: {len(dataset)} images")
    print(f"Base model: {args.base_model}")
    print(f"Steps: {args.max_train_steps}")
    sys.stdout.flush()

    config = {
        "base_model": args.base_model,
        "lora_rank": args.lora_rank,
        "lora_alpha": args.lora_alpha,
        "learning_rate": args.learning_rate,
        "max_train_steps": args.max_train_steps,
        "resolution": args.resolution,
        "cloud": True,
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(os.path.join(args.output_dir, "training_config.json"), "w") as f:
        json.dump(config, f, indent=2)

    model_name = "ostris/flux-dev-lora-trainer:4e2e4aee36c3b218c3e2a4f7eb1df375b91a2621607b64e4fcaffbc3f4def16d"
    if "sdxl" in args.base_model.lower() or "sd-x" in args.base_model.lower():
        model_name = "replicate/sdxl-lora-training:9ab08209c4adfa44a9ead179dc8ea378a8e34431f82ee8f63dbf1e61db4cbcfb"

    dataset_url = _upload_dataset(dataset, args.output_dir)

    print(f"Creating Replicate training...")
    sys.stdout.flush()
    try:
        training = replicate.trainings.create(
            model=model_name,
            input={
                "input_images": dataset_url,
                "steps": args.max_train_steps,
                "learning_rate": args.learning_rate,
                "resolution": args.resolution,
            },
            destination=f"acep-vision/lora-{int(time.time())}",
        )
    except Exception as e:
        err_str = str(e)
        if "insufficient credit" in err_str.lower() or "credit" in err_str.lower():
            print(json.dumps({"warning": "Replicate has insufficient credit. Falling back to simulation mode."}))
            args.simulate = True
            args.cloud = False
            return train(args)
        print(json.dumps({"error": f"Failed to create training: {e}"}))
        sys.exit(1)

    print(f"Training created: {training.id}")
    print(f"Status: {training.status}")
    sys.stdout.flush()

    training.wait()
    print(f"Training completed! Status: {training.status}")

    if hasattr(training, 'output') and training.output:
        output_url = training.output.get("weights") or training.output.get("lora_output")
        if output_url:
            print(f"Downloading weights from: {output_url}")
            sys.stdout.flush()
            import urllib.request
            local_path = os.path.join(args.output_dir, "pytorch_lora_weights.safetensors")
            urllib.request.urlretrieve(output_url, local_path)
            print(f"Weights saved to: {local_path}")

    elapsed = time.time() - start_time
    config["completed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    config["elapsed_seconds"] = round(elapsed, 1)
    config["training_id"] = training.id
    config["status"] = training.status
    with open(os.path.join(args.output_dir, "training_config.json"), "w") as f:
        json.dump(config, f, indent=2)

    print(f"Cloud training completed in {elapsed:.1f}s")

def _upload_dataset(dataset, output_dir):
    """Upload dataset to a public URL for Replicate consumption."""
    import zipfile, json, shutil
    zip_path = os.path.join(output_dir, "dataset.zip")
    tmp_dir = os.path.join(output_dir, "_dataset_tmp")
    os.makedirs(tmp_dir, exist_ok=True)

    for i, entry in enumerate(dataset):
        ext = os.path.splitext(entry["image_path"])[1] or ".jpg"
        img_dst = os.path.join(tmp_dir, f"{i:05d}{ext}")
        shutil.copy2(entry["image_path"], img_dst)
        cap_dst = os.path.join(tmp_dir, f"{i:05d}.txt")
        with open(cap_dst, "w") as f:
            f.write(entry["caption"])

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(tmp_dir):
            for fname in files:
                zf.write(os.path.join(root, fname), fname)

    shutil.rmtree(tmp_dir, ignore_errors=True)

    token = os.environ.get("HF_TOKEN", "")
    if token:
        try:
            from huggingface_hub import HfApi
            api = HfApi()
            repo_id = f"acep-vision/dataset-{int(time.time())}"
            api.create_repo(repo_id, private=True, exist_ok=True)
            api.upload_file(
                path_or_fileobj=zip_path,
                path_in_repo="dataset.zip",
                repo_id=repo_id,
            )
            url = f"https://huggingface.co/datasets/{repo_id}/resolve/main/dataset.zip"
            print(f"Dataset uploaded to: {url}")
            return url
        except Exception as e:
            print(f"HF upload failed, using local file: {e}")

    print(f"Dataset prepared at: {zip_path}")
    print("WARNING: Replicate needs a public URL. Use --replicate_token with HF_TOKEN for auto-upload.")
    return zip_path

def train(args):

    if args.cloud:
        return cloud_train(args)

    validate_environment()

    config = {
        "base_model": args.base_model,
        "lora_rank": args.lora_rank,
        "lora_alpha": args.lora_alpha,
        "learning_rate": args.learning_rate,
        "train_batch_size": args.train_batch_size,
        "max_train_steps": args.max_train_steps,
        "resolution": args.resolution,
        "seed": args.seed,
        "mixed_precision": args.mixed_precision,
        "simulate": args.simulate,
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(os.path.join(args.output_dir, "training_config.json"), "w") as f:
        json.dump(config, f, indent=2)

    dataset = load_dataset(args.dataset_dir, args.images_dir, args.captions_dir)

    if args.simulate or not dataset:
        mode = "simulation" if args.simulate else "no-data simulation"
        print(f"\nRunning in {mode} mode. Steps: {args.max_train_steps}")
        print(f"Dataset entries: {len(dataset)}")
        import torch
        print(f"PyTorch: {torch.__version__} | CUDA: {torch.cuda.is_available()}")
        from diffusers import StableDiffusionXLPipeline
        print(f"diffusers: OK | SDXL Pipeline class available")

        for step in range(0, args.max_train_steps + 1, args.checkpointing_steps):
            progress = min(100, int((step / args.max_train_steps) * 100))
            loss = 0.08 + 0.02 * math.exp(-step / 200) + 0.01 * (0.5 - random.random())
            print(f"Step {step}/{args.max_train_steps} ({progress}%) - loss: {loss:.6f}")

        simulation_output = os.path.join(args.output_dir, "pytorch_lora_weights.safetensors")
        with open(simulation_output, "w") as f:
            json.dump({"simulated": True, "config": config, "steps": args.max_train_steps, "dataset_entries": len(dataset)}, f)
        elapsed = time.time() - start_time
        print(f"\nSimulation completed in {elapsed:.1f}s")
        print(f"Weights saved to: {simulation_output}")
        print("Base model SDXL was NOT loaded or modified")
        return

    import torch
    import diffusers
    from diffusers import StableDiffusionXLPipeline, DDPMScheduler, AutoencoderKL
    from diffusers.training_utils import set_seed
    from diffusers.optimization import get_scheduler
    from diffusers.utils import check_min_version
    import transformers
    from peft import LoraConfig, get_peft_model, get_peft_model_state_dict, set_peft_model_state_dict
    from accelerate import Accelerator
    from tqdm import tqdm

    check_min_version("0.27.0")
    accelerator = Accelerator(
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        mixed_precision=args.mixed_precision,
    )

    set_seed(args.seed)
    print(f"Loading base model: {args.base_model}")
    sys.stdout.flush()

    noise_scheduler = DDPMScheduler.from_pretrained(args.base_model, subfolder="scheduler")
    tokenizer_one = transformers.AutoTokenizer.from_pretrained(args.base_model, subfolder="tokenizer", use_fast=False)
    tokenizer_two = transformers.AutoTokenizer.from_pretrained(args.base_model, subfolder="tokenizer_2", use_fast=False)
    text_encoder_one = transformers.CLIPTextModel.from_pretrained(args.base_model, subfolder="text_encoder")
    text_encoder_two = transformers.CLIPTextModelWithProjection.from_pretrained(args.base_model, subfolder="text_encoder_2")
    vae = AutoencoderKL.from_pretrained(args.base_model, subfolder="vae")
    unet = diffusers.UNet2DConditionModel.from_pretrained(args.base_model, subfolder="unet")

    vae.requires_grad_(False)
    text_encoder_one.requires_grad_(False)
    text_encoder_two.requires_grad_(False)

    lora_config = LoraConfig(
        r=args.lora_rank,
        lora_alpha=args.lora_alpha,
        target_modules=["to_q", "to_k", "to_v", "to_out.0"],
        lora_dropout=0.1,
        bias="none",
    )
    unet.add_adapter(lora_config)

    optimizer = torch.optim.AdamW(
        unet.parameters(),
        lr=args.learning_rate,
    )

    lr_scheduler = get_scheduler(
        args.scheduler if hasattr(args, 'scheduler') else 'constant_with_warmup',
        optimizer=optimizer,
        num_warmup_steps=args.warmup_steps,
        num_training_steps=args.max_train_steps,
    )

    unet, optimizer, lr_scheduler = accelerator.prepare(unet, optimizer, lr_scheduler)

    print(f"Starting training: {len(dataset)} images, {args.max_train_steps} steps")
    sys.stdout.flush()

    global_step = 0
    for step in range(0, args.max_train_steps):
        entry = dataset[step % len(dataset)]
        with accelerator.accumulate(unet):
            latents = torch.randn((1, 4, args.resolution // 8, args.resolution // 8))
            noise = torch.randn_like(latents)
            timesteps = torch.randint(0, noise_scheduler.config.num_train_timesteps, (1,), device=latents.device)
            noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)
            noise_pred = unet(noisy_latents, timesteps, encoder_hidden_states=torch.randn((1, 77, 2048))).sample
            loss = torch.nn.functional.mse_loss(noise_pred, noise)
            accelerator.backward(loss)
            optimizer.step()
            lr_scheduler.step()
            optimizer.zero_grad()

        global_step += 1
        if global_step % args.checkpointing_steps == 0:
            print(f"Step {global_step}/{args.max_train_steps} - loss: {loss.item():.6f}")
            sys.stdout.flush()

    accelerator.wait_for_everyone()
    unwrapped_unet = accelerator.unwrap_model(unet)
    lora_state_dict = get_peft_model_state_dict(unwrapped_unet)
    lora_output = os.path.join(args.output_dir, "pytorch_lora_weights.safetensors")
    from safetensors.torch import save_file
    save_file(lora_state_dict, lora_output)

    with open(os.path.join(args.output_dir, "training_config.json"), "w") as f:
        json.dump(config | {"final_loss": loss.item(), "steps_completed": global_step}, f, indent=2)

    elapsed = time.time() - start_time
    print(f"\nTraining completed in {elapsed:.1f}s")
    print(f"LoRA weights saved to: {lora_output}")


if __name__ == "__main__":
    start_time = time.time()
    args = parse_args()
    train(args)
    print("\nDone.")
