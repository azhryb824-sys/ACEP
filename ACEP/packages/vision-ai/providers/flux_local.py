import sys, json, os, time, traceback
from io import StringIO

HF_TOKEN = os.environ.get("HF_TOKEN") or ""
SPACE_NAME = "black-forest-labs/FLUX.1-schnell"

def generate_via_gradio(prompt, output_path, seed=42):
    from gradio_client import Client
    old_stdout = sys.stdout
    sys.stdout = StringIO()
    try:
        client = Client(SPACE_NAME)
        result = client.predict(prompt, seed, api_name="/infer")
    finally:
        sys.stdout = old_stdout
    if isinstance(result, (list, tuple)):
        filepath = result[0]
    elif isinstance(result, str):
        filepath = result
    else:
        filepath = result
    import shutil
    shutil.copy(filepath, output_path)
    return True

def generate_via_hf_inference(prompt, output_path):
    from huggingface_hub import InferenceClient
    client = InferenceClient(token=HF_TOKEN)
    image = client.text_to_image(prompt, model="black-forest-labs/FLUX.1-schnell")
    image.save(output_path, "PNG")
    return True

def generate(prompt, output_path, width=1024, height=1024, steps=4):
    timings = {}
    t0 = time.time()

    # Try HuggingFace InferenceClient first (fast, but may exhaust free credits)
    try:
        generate_via_hf_inference(prompt, output_path)
        timings["method"] = "hf_inference"
        timings["total"] = round(time.time() - t0, 1)
        return {"output_path": output_path, "model": "black-forest-labs/FLUX.1-schnell", "provider": "huggingface-inference", "width": width, "height": height, "timings": timings, "success": True}
    except Exception as e:
        pass

    # Fallback: Gradio Space API (free, no credit limits)
    try:
        generate_via_gradio(prompt, output_path)
        timings["method"] = "gradio_space"
        timings["total"] = round(time.time() - t0, 1)
        return {"output_path": output_path, "model": "black-forest-labs/FLUX.1-schnell", "provider": "gradio-space", "width": width, "height": height, "timings": timings, "success": True}
    except Exception as e2:
        return {"error": f"All methods failed: {e2}", "success": False, "timings": timings}

if __name__ == "__main__":
    try:
        config_path = sys.argv[1]
        with open(config_path, "r", encoding="utf-8-sig") as f:
            args = json.load(f)
        prompt = args.get("prompt", "")
        output_path = args.get("output", "output.png")
        width = args.get("width", 1024)
        height = args.get("height", 1024)
        steps = args.get("steps", 4)
        if not prompt:
            result = {"error": "No prompt provided", "success": False}
        else:
            result = generate(prompt, output_path, width, height, steps)
    except Exception as e:
        result = {"error": f"Script error: {e}\n{traceback.format_exc()}", "success": False}
    print(json.dumps(result))
