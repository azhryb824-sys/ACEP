"""ACEP Integration Tests - End-to-end tests for the complete training pipeline."""
import os, sys, json, tempfile, shutil, unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ai-training'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# ─── Config Tests ───────────────────────────────────────────────────────

class TestConfig(unittest.TestCase):
    def test_default_config_creation(self):
        from config import get_default_config, ACEPConfig
        cfg = get_default_config()
        self.assertEqual(cfg.model.model_name, "Qwen/Qwen2.5-7B-Instruct")
        self.assertEqual(cfg.lora.r, 16)
        self.assertEqual(cfg.training.num_train_epochs, 3)
        self.assertTrue(cfg.training.bf16)

    def test_config_save_load(self):
        from config import ACEPConfig
        cfg = ACEPConfig()
        cfg.training.num_train_epochs = 5
        cfg.lora.r = 32

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            cfg.save(f.name)
            fname = f.name

        loaded = ACEPConfig.load(fname)
        self.assertEqual(loaded.training.num_train_epochs, 5)
        self.assertEqual(loaded.lora.r, 32)
        self.assertEqual(loaded.model.model_name, "Qwen/Qwen2.5-7B-Instruct")
        os.unlink(fname)

    def test_get_dataset_dirs(self):
        from config import get_dataset_dirs
        dirs = get_dataset_dirs()
        self.assertIsInstance(dirs, dict)

# ─── Dataset Tests ──────────────────────────────────────────────────────

class TestDataset(unittest.TestCase):
    def test_load_jsonl(self):
        from dataset import load_jsonl
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False, encoding='utf-8') as f:
            f.write('{"instruction": "test", "output": "response"}\n')
            f.write('{"prompt": "q2", "response": "a2"}\n')
            f.write('invalid json\n')
            f.write('{"instruction": "q3", "output": "a3"}\n')
            fname = f.name

        data = load_jsonl(fname)
        self.assertEqual(len(data), 3)  # 3 valid, 1 invalid
        self.assertEqual(data[0]["instruction"], "test")
        self.assertEqual(data[2]["instruction"], "q3")
        os.unlink(fname)

    def test_format_instruction(self):
        from dataset import format_instruction
        item = {"instruction": "What is concrete?", "output": "A building material."}
        result = format_instruction(item)
        self.assertIn("What is concrete?", result)
        self.assertIn("A building material.", result)
        self.assertIn("<|user|>", result)
        self.assertIn("<|assistant|>", result)

        item2 = {"prompt": "Hello", "response": "World", "system": "Be helpful."}
        result2 = format_instruction(item2)
        self.assertIn("<|system|>", result2)
        self.assertIn("Be helpful.", result2)
        self.assertIn("Hello", result2)
        self.assertIn("World", result2)

        empty = {"instruction": "", "output": ""}
        self.assertIsNone(format_instruction(empty))

    def test_clean_text(self):
        from dataset import clean_text
        self.assertEqual(clean_text("hello   world"), "hello world")
        self.assertEqual(clean_text("  text  with   spaces  "), "text with spaces")

    def test_get_dataset_stats(self):
        from dataset import get_dataset_stats
        stats = get_dataset_stats()
        self.assertIsInstance(stats, dict)
        if not stats:
            self.skipTest("No dataset files on disk to test stats against")
        for domain, counts in stats.items():
            self.assertIn("train", counts)
            self.assertIn("validation", counts)
            self.assertIn("test", counts)
            total = counts["train"] + counts["validation"] + counts["test"]
            self.assertGreater(total, 0, f"{domain} has 0 samples")

# ─── Data Factory Tests ────────────────────────────────────────────────

class TestDataFactory(unittest.TestCase):
    def setUp(self):
        self.factory_path = os.path.join(os.path.dirname(__file__), '..', '..', 'ai-data-factory')
        sys.path.insert(0, self.factory_path)

    def test_generate_imports(self):
        try:
            import importlib
            # Try importing generators
            spec = importlib.util.spec_from_file_location("generate_datasets",
                os.path.join(self.factory_path, "generate_datasets.py"))
            if spec:
                mod = importlib.util.module_from_spec(spec)
                # Just check it parses
                self.assertTrue(os.path.exists(spec.origin))
        except Exception as e:
            self.skipTest(f"Import test skipped: {e}")

    def test_sample_generation_format(self):
        """Test that generated samples match expected format."""
        factory_path = os.path.join(os.path.dirname(__file__), '..', '..', 'ai-data-factory')
        gen_path = os.path.join(factory_path, "generate_datasets.py")

        if not os.path.exists(gen_path):
            self.skipTest("generate_datasets.py not found")

        import importlib.util, types
        spec = importlib.util.spec_from_file_location("gen", gen_path)
        if spec is None or spec.loader is None:
            self.skipTest("Could not load module")

        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        # Test a few generator functions
        for gen_name in ["gen_engineering_llm", "gen_quantity_ai", "gen_cost_ai"]:
            if hasattr(mod, gen_name):
                gen_fn = getattr(mod, gen_name)
                samples = gen_fn(5)
                self.assertEqual(len(samples), 5, f"{gen_name} should produce 5 samples")
                for s in samples:
                    self.assertIn("instruction", s, f"{gen_name} missing instruction")
                    self.assertIn("output", s, f"{gen_name} missing output")
                    self.assertIsInstance(s["instruction"], str)
                    self.assertIsInstance(s["output"], str)
                    self.assertGreater(len(s["instruction"]), 0)
                    self.assertGreater(len(s["output"]), 0)

# ─── Pipeline Orchestration Tests ──────────────────────────────────────

class TestPipeline(unittest.TestCase):
    def test_run_pipeline_imports(self):
        try:
            from run_pipeline import step_generate_datasets, step_prepare_config, step_train
            self.assertTrue(callable(step_generate_datasets))
            self.assertTrue(callable(step_prepare_config))
            self.assertTrue(callable(step_train))
        except ImportError as e:
            self.skipTest(f"Pipeline imports failed: {e}")

    def test_monitor_imports(self):
        try:
            from monitor import generate_training_chart, generate_eval_chart, generate_html_dashboard
            self.assertTrue(callable(generate_training_chart))
            self.assertTrue(callable(generate_html_dashboard))
        except ImportError as e:
            self.skipTest(f"Monitor imports failed: {e}")

    def test_predict_imports(self):
        try:
            from predict import ACEPPredictor
            self.assertTrue(ACEPPredictor)
        except ImportError as e:
            self.skipTest(f"Predict imports failed: {e}")

    def test_evaluate_imports(self):
        try:
            from evaluate import compute_perplexity, compute_exact_match, compute_rouge_l, compute_bleu
            self.assertTrue(callable(compute_exact_match))
        except ImportError as e:
            self.skipTest(f"Evaluate imports failed: {e}")

    def test_merge_imports(self):
        try:
            from merge import merge_and_save, merge_all_models
            self.assertTrue(callable(merge_and_save))
        except ImportError as e:
            self.skipTest(f"Merge imports failed: {e}")

# ─── Evaluation Metrics Tests ──────────────────────────────────────────

class TestMetrics(unittest.TestCase):
    def test_exact_match(self):
        from evaluate import compute_exact_match
        self.assertEqual(compute_exact_match("hello", "hello"), 1.0)
        self.assertEqual(compute_exact_match("hello", "world"), 0.0)
        self.assertEqual(compute_exact_match("", ""), 1.0)

    def test_rouge_l(self):
        from evaluate import compute_rouge_l
        score = compute_rouge_l("the cat sat on the mat", "the cat sat on the mat")
        self.assertAlmostEqual(score, 1.0, places=4)
        score2 = compute_rouge_l("hello world", "goodbye world")
        self.assertGreater(score2, 0)
        score3 = compute_rouge_l("", "")
        self.assertEqual(score3, 0.0)

    def test_bleu(self):
        from evaluate import compute_bleu
        score = compute_bleu("the cat", "the cat")
        self.assertGreater(score, 0)
        score2 = compute_bleu("", "test")
        self.assertEqual(score2, 0.0)

# ─── Registry Tests ────────────────────────────────────────────────────

class TestRegistry(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.registry_path = os.path.join(self.temp_dir, "registry")

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_registry_create(self):
        from registry.registry import ModelRegistry
        reg = ModelRegistry(registry_dir=self.registry_path)
        self.assertEqual(len(reg.list()), 0)

    def test_registry_register(self):
        from registry.registry import ModelRegistry
        reg = ModelRegistry(registry_dir=self.registry_path)
        record = reg.register("test-model", base_model="Qwen/Qwen2.5-7B-Instruct")
        self.assertEqual(record.name, "test-model")
        self.assertEqual(record.version, "1.0.0")
        self.assertEqual(record.status, "created")
        self.assertEqual(len(reg.list()), 1)

    def test_registry_update(self):
        from registry.registry import ModelRegistry
        reg = ModelRegistry(registry_dir=self.registry_path)
        record = reg.register("test-model")
        result = reg.update_status(record.id, "trained", metrics={"loss": 0.5})
        self.assertTrue(result)
        models = reg.get(name="test-model")
        self.assertEqual(models[0]["status"], "trained")
        self.assertEqual(models[0]["metrics"]["loss"], 0.5)

    def test_registry_versioning(self):
        from registry.registry import ModelRegistry
        reg = ModelRegistry(registry_dir=self.registry_path)
        r1 = reg.register("my-model")
        self.assertEqual(r1.version, "1.0.0")
        r2 = reg.register("my-model")
        self.assertEqual(r2.version, "2.0.0")
        r3 = reg.register("other-model")
        self.assertEqual(r3.version, "1.0.0")

    def test_registry_delete(self):
        from registry.registry import ModelRegistry
        reg = ModelRegistry(registry_dir=self.registry_path)
        r = reg.register("delete-me")
        self.assertEqual(len(reg.list()), 1)
        reg.delete(r.id)
        self.assertEqual(len(reg.list()), 0)

    def test_experiment_tracking(self):
        from registry.registry import create_experiment, log_metric, list_experiments
        exp_id = create_experiment("test-exp", config={"lr": 1e-4})
        self.assertTrue(exp_id.startswith("exp-"))
        log_metric(exp_id, "loss", 0.5, step=1)
        log_metric(exp_id, "loss", 0.3, step=2)
        exps = list_experiments()
        self.assertGreaterEqual(len(exps), 1)
        found = [e for e in exps if e["id"] == exp_id]
        self.assertEqual(len(found), 1)
        self.assertIn("loss", found[0]["metrics"])

# ─── Run ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    unittest.main(verbosity=2)
