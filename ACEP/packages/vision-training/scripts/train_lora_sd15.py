#!/usr/bin/env python3
import argparse, json, os, sys, time, math, re, glob
from pathlib import Path

# Monkey-patch BEFORE any diffusers import
import diffusers.loaders.single_file_utils as _sfu
def _noop_legacy(local_files_only, torch_dtype, *args, **kwargs):
    return {}
_sfu._legacy_load_safety_checker = _noop_legacy

import torch
import bitsandbytes
import diffusers
from diffusers import StableDiffusionPipeline, DDPMScheduler, AutoencoderKL, UNet2DConditionModel
from diffusers.optimization import get_scheduler
from diffusers.utils import is_peft_available
import transformers
from peft import LoraConfig, get_peft_model, get_peft_model_state_dict
from accelerate import Accelerator
from safetensors.torch import save_file
from PIL import Image
import numpy as np
from tqdm import tqdm


def parse_args():
    parser = argparse.ArgumentParser(description="SD1.5 CPU 8-bit LoRA Training")
    parser.add_argument("--base_model", type=str, default=r"D:\models\sd15.safetensors",
                        help="Path to SD1.5 safetensors file")
    parser.add_argument("--output_dir", type=str, required=True)
    parser.add_argument("--images_dir", type=str, required=True)
    parser.add_argument("--captions_dir", type=str, required=True)
    parser.add_argument("--learning_rate", type=float, default=5e-5)
    parser.add_argument("--train_batch_size", type=int, default=1)
    parser.add_argument("--gradient_accumulation_steps", type=int, default=4)
    parser.add_argument("--max_train_steps", type=int, default=500)
    parser.add_argument("--resolution", type=int, default=384)
    parser.add_argument("--lora_rank", type=int, default=32)
    parser.add_argument("--lora_alpha", type=int, default=64)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--checkpointing_steps", type=int, default=100)
    parser.add_argument("--warmup_steps", type=int, default=50)
    parser.add_argument("--use_8bit", action="store_true", default=True,
                        help="Use 8-bit quantization for UNet")
    parser.add_argument("--num_workers", type=int, default=0)
    return parser.parse_args()


def validate_env():
    required = ["torch", "diffusers", "transformers", "peft", "accelerate", "bitsandbytes", "safetensors", "PIL"]
    missing = []
    for pkg in required:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"Missing: {missing}")
        sys.exit(1)
    print(f"Torch: {torch.__version__} | CPU threads: {torch.get_num_threads()}")
    print(f"Diffusers: {diffusers.__version__} | Transformers: {transformers.__version__}")
    print(f"bitsandbytes: OK | PEFT: OK")
    sys.stdout.flush()


def load_dataset(images_dir, captions_dir):
    entries = []
    supported = {'.png', '.jpg', '.jpeg', '.webp'}
    for fname in os.listdir(images_dir):
        ext = os.path.splitext(fname)[1].lower()
        if ext not in supported:
            continue
        img_path = os.path.join(images_dir, fname)
        cap_path = os.path.join(captions_dir, os.path.splitext(fname)[0] + '.txt')
        caption = ""
        if os.path.exists(cap_path):
            with open(cap_path, 'r', encoding='utf-8') as f:
                caption = f.read().strip()
        if not caption:
            caption = os.path.splitext(fname)[0]
        entries.append({"image_path": img_path, "caption": caption, "filename": fname})
    # Sort for deterministic order
    entries.sort(key=lambda x: x['filename'])
    print(f"Loaded {len(entries)} training entries")
    if entries:
        print(f"  First: {entries[0]['filename']} | caption: {entries[0]['caption'][:50]}")
    return entries


def validate_dataset(entries):
    valid = []
    for e in entries:
        if os.path.exists(e['image_path']) and os.path.getsize(e['image_path']) > 1000:
            valid.append(e)
        else:
            print(f"  Skipping (missing/small): {e['filename']}")
    return valid


@torch.no_grad()
def encode_images(vae, images, device):
    images = images.to(device)
    latents = vae.encode(images).latent_dist.sample()
    latents = latents * vae.config.scaling_factor
    return latents


def train(args):
    validate_env()

    os.makedirs(args.output_dir, exist_ok=True)
    start_time = time.time()

    config = {
        "base_model": args.base_model,
        "output_dir": args.output_dir,
        "lora_rank": args.lora_rank,
        "lora_alpha": args.lora_alpha,
        "learning_rate": args.learning_rate,
        "train_batch_size": args.train_batch_size,
        "max_train_steps": args.max_train_steps,
        "resolution": args.resolution,
        "seed": args.seed,
        "use_8bit": args.use_8bit,
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(os.path.join(args.output_dir, "training_config.json"), "w") as f:
        json.dump(config, f, indent=2)

    dataset = load_dataset(args.images_dir, args.captions_dir)
    dataset = validate_dataset(dataset)

    if not dataset:
        print("ERROR: No valid images found!")
        return

    # Set threads for CPU
    torch.set_num_threads(min(8, os.cpu_count() or 4))

    # Set seed
    torch.manual_seed(args.seed)

    print(f"\nLoading SD1.5 from: {args.base_model}")
    sys.stdout.flush()

    # Load from single file
    pipe = StableDiffusionPipeline.from_single_file(
        args.base_model,
        torch_dtype=torch.float32,
        use_safetensors=True,
        load_safety_checker=False,
        local_files_only=True,
    )

    noise_scheduler = DDPMScheduler.from_config(pipe.scheduler.config)
    vae = pipe.vae
    tokenizer = pipe.tokenizer
    text_encoder = pipe.text_encoder
    unet = pipe.unet

    # Freeze VAE and text encoder
    vae.requires_grad_(False)
    text_encoder.requires_grad_(False)
    vae.eval()
    text_encoder.eval()

    # Apply 8-bit quantization to UNet
    if args.use_8bit:
        try:
            from bitsandbytes.nn import Linear8bitLt
            print("Applying 8-bit quantization to UNet...")
            sys.stdout.flush()

            def quantize_8bit(module):
                for name, child in list(module.named_children()):
                    if isinstance(child, torch.nn.Linear):
                        in_f, out_f = child.in_features, child.out_features
                        has_bias = child.bias is not None
                        new = Linear8bitLt(in_f, out_f, has_bias, has_fp16_weights=False)
                        new.weight.data = child.weight.data.to(torch.float32)
                        if has_bias:
                            new.bias.data = child.bias.data
                        setattr(module, name, new)
                    else:
                        quantize_8bit(child)

            quantize_8bit(unet)
            print("  8-bit quantization complete")
        except Exception as e:
            print(f"  8-bit quantization failed: {e}. Using full precision.")
            sys.stdout.flush()
    else:
        print("  Using full precision")
    sys.stdout.flush()

    # Add LoRA to UNet
    lora_config = LoraConfig(
        r=args.lora_rank,
        lora_alpha=args.lora_alpha,
        target_modules=["to_q", "to_k", "to_v", "to_out.0", "q_proj", "k_proj", "v_proj", "out_proj"],
        lora_dropout=0.1,
        bias="none",
    )
    unet.add_adapter(lora_config)
    print(f"LoRA adapter added: rank={args.lora_rank}, alpha={args.lora_alpha}")

    # Only train LoRA params
    for name, param in unet.named_parameters():
        param.requires_grad = "lora" in name.lower()

    trainable = sum(p.numel() for p in unet.parameters() if p.requires_grad)
    total = sum(p.numel() for p in unet.parameters())
    print(f"Trainable: {trainable:,} / {total:,} params ({trainable/total*100:.2f}%)")

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, unet.parameters()),
        lr=args.learning_rate,
        weight_decay=1e-2,
    )

    lr_scheduler = get_scheduler(
        "constant_with_warmup",
        optimizer=optimizer,
        num_warmup_steps=args.warmup_steps,
        num_training_steps=args.max_train_steps,
    )

    accelerator = Accelerator(
        gradient_accumulation_steps=args.gradient_accumulation_steps,
    )
    unet, optimizer, lr_scheduler = accelerator.prepare(unet, optimizer, lr_scheduler)

    # Pre-encode all images to latents
    print(f"\nPre-encoding {len(dataset)} images to latents...")
    sys.stdout.flush()
    all_latents = []
    all_embeds = []
    for entry in tqdm(dataset):
        try:
            img = Image.open(entry['image_path']).convert("RGB")
            w, h = img.size
            scale = args.resolution / min(w, h)
            nw, nh = int(w * scale), int(h * scale)
            img = img.resize((nw, nh), Image.BILINEAR)
            left = (nw - args.resolution) // 2
            top = (nh - args.resolution) // 2
            img = img.crop((left, top, left + args.resolution, top + args.resolution))
            img_np = np.array(img).astype(np.float32) / 127.5 - 1.0
            img_tensor = torch.from_numpy(img_np).permute(2, 0, 1).unsqueeze(0)
            latents = encode_images(vae, img_tensor, "cpu")
            all_latents.append(latents)

            # Encode caption
            text_inputs = tokenizer(
                entry['caption'],
                padding="max_length",
                max_length=tokenizer.model_max_length,
                truncation=True,
                return_tensors="pt",
            )
            with torch.no_grad():
                embed = text_encoder(text_inputs.input_ids)[0]
            all_embeds.append(embed)
        except Exception as e:
            print(f"  Error encoding {entry['filename']}: {e}")

    if not all_latents:
        print("ERROR: No images could be encoded!")
        return

    print(f"Encoded {len(all_latents)} images. Latent shape: {all_latents[0].shape}")
    sys.stdout.flush()

    # Training loop
    print(f"\nStarting training: {len(dataset)} images, {args.max_train_steps} steps")
    sys.stdout.flush()

    global_step = 0
    total_loss = 0.0

    progress = tqdm(range(args.max_train_steps), desc="Training")
    for step in progress:
        entry_idx = step % len(all_latents)
        latents = all_latents[entry_idx]
        embed = all_embeds[entry_idx]

        with accelerator.accumulate(unet):
            noise = torch.randn_like(latents)
            bsz = latents.shape[0]
            timesteps = torch.randint(
                0, noise_scheduler.config.num_train_timesteps,
                (bsz,), device=latents.device
            ).long()
            noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)

            noise_pred = unet(
                noisy_latents,
                timesteps,
                encoder_hidden_states=embed,
            ).sample

            loss = torch.nn.functional.mse_loss(noise_pred.float(), noise.float())
            accelerator.backward(loss)

            optimizer.step()
            lr_scheduler.step()
            optimizer.zero_grad()

        global_step += 1
        total_loss += loss.item()

        progress.set_postfix({"loss": f"{loss.item():.6f}"})

        if global_step % args.checkpointing_steps == 0:
            avg_loss = total_loss / max(1, global_step)
            print(f"\n  Step {global_step}/{args.max_train_steps} | loss: {loss.item():.6f} | avg: {avg_loss:.6f}")
            sys.stdout.flush()

    accelerator.wait_for_everyone()

    # Save LoRA weights
    unwrapped = accelerator.unwrap_model(unet)
    lora_state_dict = get_peft_model_state_dict(unwrapped)
    lora_output = os.path.join(args.output_dir, "pytorch_lora_weights.safetensors")
    save_file(lora_state_dict, lora_output)

    config.update({
        "final_loss": total_loss / max(1, global_step),
        "steps_completed": global_step,
        "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "elapsed_seconds": round(time.time() - start_time, 1),
        "dataset_entries": len(dataset),
    })
    with open(os.path.join(args.output_dir, "training_config.json"), "w") as f:
        json.dump(config, f, indent=2)

    elapsed = time.time() - start_time
    print(f"\nTraining completed in {elapsed:.1f}s")
    print(f"LoRA weights saved to: {lora_output}")
    print(f"Size: {os.path.getsize(lora_output) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    args = parse_args()
    try:
        train(args)
    except Exception as e:
        print(f"FATAL: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
