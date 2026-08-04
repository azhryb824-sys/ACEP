import sys, os, json, time, base64, io, threading, logging, socketserver
from http.server import HTTPServer, BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ai-training'))
os.environ["HF_HOME"] = os.environ.get("HF_HOME", "D:\\huggingface")

logging.basicConfig(level=logging.INFO, format="[SD-Server] %(message)s")
log = logging.getLogger("sd-server")

CHECKPOINT_PATH = r"D:\models\sd15.safetensors"
CHECKPOINT_PATH2 = r"C:\Users\Abdulrahman\AppData\Local\Temp\opencode\models\sd15.safetensors"
MODEL_ID = "runwayml/stable-diffusion-v1-5"
pipe = None
pipe_lock = threading.Lock()
loading_done = threading.Event()
load_error = None

def load_model():
    global pipe, load_error
    try:
        checkpoint = CHECKPOINT_PATH if os.path.exists(CHECKPOINT_PATH) else (CHECKPOINT_PATH2 if os.path.exists(CHECKPOINT_PATH2) else None)
        if checkpoint:
            log.info(f"Loading from single file: {checkpoint}")
            from diffusers import StableDiffusionPipeline
            import torch
            p = StableDiffusionPipeline.from_single_file(
                checkpoint,
                torch_dtype=torch.float32,
                safety_checker=None,
                requires_safety_checker=False,
            )
        else:
            log.info(f"Loading model: {MODEL_ID}")
            from diffusers import StableDiffusionPipeline
            import torch
            p = StableDiffusionPipeline.from_pretrained(
                MODEL_ID, cache_dir=os.environ["HF_HOME"],
                torch_dtype=torch.float32,
                safety_checker=None, requires_safety_checker=False,
            )
        p.to("cpu")
        p.enable_attention_slicing()

        # Load LoRA weights if available
        lora_path = r"C:\Users\Abdulrahman\Documents\مقاولات إلكترونية 2\ACEP\packages\vision-training\training\lora\run_005\pytorch_lora_weights.safetensors"
        if os.path.exists(lora_path):
            log.info(f"Loading LoRA weights: {lora_path}")
            try:
                p.unet.load_attn_procs(lora_path)
                log.info("LoRA weights loaded successfully")
            except Exception as e:
                log.warning(f"LoRA ADDN failed (base model only): {e}")
        else:
            log.info("No LoRA weights found, using base model")

        pipe = p
        log.info("Model loaded successfully")
    except Exception as e:
        load_error = str(e)
        log.error(f"Model load failed: {e}")
    finally:
        loading_done.set()

class SDRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/sdapi/v1/options":
            self.send_json({"sd_model_name": MODEL_ID, "sd_model_hash": ""})
        elif self.path == "/":
            self.send_json({"status": "running", "model": MODEL_ID, "ready": pipe is not None})
        else:
            self.send_error(404, "Not found")

    def do_POST(self):
        if self.path == "/sdapi/v1/txt2img":
            self.handle_txt2img()
        elif self.path == "/sdapi/v1/img2img":
            self.handle_img2img()
        else:
            self.send_error(404, "Not found")

    def handle_txt2img(self):
        global pipe
        loading_done.wait(600)
        if pipe is None:
            self.send_error(503, f"Model not loaded: {load_error}")
            return
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length > 0 else self.rfile.read()
        body = json.loads(raw) if raw else {}
        prompt = body.get("prompt", "")
        neg = body.get("negative_prompt", "")
        forbidden = ("cross, crucifix, red cross, redcross, church, churches, cathedral, "
                     "temple, synagogue, monastery, statue, idol, idolatry, "
                     "alcohol, wine, beer, liquor, whisky, whiskey, vodka, champagne, "
                     "person, people, human, man, woman, child, baby, crowd, pedestrian, "
                     "animal, dog, cat, bird, horse, camel, "
                     "صليب, الصليب, صليب أحمر, الصليب الأحمر, "
                     "خمر, مشروبات كحولية, نبيذ, "
                     "تمثال, تماثيل, أصنام, "
                     "كنيسة, كنائس, معبد, معابد, "
                     "إنسان, أشخاص, شخص, رجل, امرأة, طفل, "
                     "حيوان, كلب, قط, حصان, جمل, طير, طيور")
        neg = (neg + ", " + forbidden) if neg else forbidden
        width = min(body.get("width", 512), 768)
        height = min(body.get("height", 512), 768)
        steps = min(body.get("steps", 3), 50)
        cfg = body.get("cfg_scale", 7.5)
        seed = body.get("seed", -1)
        gen = None
        import torch
        if seed >= 0:
            gen = torch.Generator().manual_seed(seed)
        log.info(f"Generating: {prompt[:60]}... ({width}x{height}, {steps} steps)")
        t0 = time.time()
        with pipe_lock:
            result = pipe(prompt, width=width, height=height,
                          num_inference_steps=steps, guidance_scale=cfg,
                          negative_prompt=neg if neg else None,
                          generator=gen)
        img = result.images[0]
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        elapsed = round(time.time() - t0, 2)
        log.info(f"Done in {elapsed}s")
        self.send_json({"images": [b64], "info": json.dumps({
            "width": width, "height": height, "seed": seed,
            "steps": steps, "sd_model_name": MODEL_ID,
            "inference_time": elapsed,
        })})

    def handle_img2img(self):
        self.send_error(501, "img2img not implemented yet")

    def send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def send_error(self, code, msg):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode())

    def log_message(self, format, *args):
        log.info(f"{self.client_address[0]} - {format % args}")

if __name__ == "__main__":
    t = threading.Thread(target=load_model, daemon=True)
    t.start()
    port = int(os.environ.get("SD_PORT", 7860))
    server = socketserver.ThreadingTCPServer(("0.0.0.0", port), SDRequestHandler)
    server.allow_reuse_address = True
    server.daemon_threads = True
    log.info(f"Starting SD server on port {port} (loading model in background)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
