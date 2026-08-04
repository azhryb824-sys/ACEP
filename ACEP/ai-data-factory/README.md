# ACEP AI Data Factory

Enterprise-grade synthetic engineering dataset generator for ACEP AI model training.

## Features

- **21 independent generators**: BOQ, Quantity, Cost, Material, Supplier, Tender, Contract, Invoice, PO, Maintenance, Inspection, Safety, Quality, Risk, Schedule, Equipment, Drawing, Report, RFI, Method Statement, Prompt
- **Bilingual**: Arabic + English
- **25 engineering domains** supported
- **Validation**: units, calculations, duplicates, language quality
- **Export formats**: JSONL, JSON, CSV, Markdown, SQL, Parquet, Excel
- **Auto training configs**: LoRA, QLoRA, Unsloth, HuggingFace, Axolotl, LlamaFactory
- **Benchmark datasets**: evaluation, edge cases, failure cases, adversarial cases
- **Scalable**: 100 → 10,000,000 samples

## Quick start

```bash
cd ACEP/ai-data-factory
python main.py --count 1000 --output datasets
```

### Options

```bash
python main.py --count 10000 --language both --formats jsonl,csv,json
python main.py --generators boq,cost,prompt --count 500
python main.py --list-generators
```

## Output structure

```
datasets/
├── engineering_llm/
│   ├── training.jsonl
│   ├── validation.jsonl
│   ├── test.jsonl
│   ├── metadata.json
│   ├── statistics.json
│   └── training_configs/
├── quantity_ai/
├── cost_ai/
├── contract_ai/
├── procurement_ai/
├── drawing_ai/
├── elevator_ai/
├── planning_ai/
├── quality_ai/
├── safety_ai/
├── risk_ai/
├── benchmark/
└── logs/
    ├── generation.log
    ├── rejected.jsonl
    └── quality_report.json
```

## Integration with ACEP

This factory complements existing ACEP training scripts:

- `ACEP/packages/databases/training/scripts/generate_training_data.js` — tabular CSV/JSON records
- `ACEP/ai-data-factory/` — LLM instruction/reasoning datasets for fine-tuning and RAG

## Requirements

```bash
pip install -r requirements.txt
# Optional Excel/Parquet:
pip install -r requirements-full.txt
```

## License

Part of the ACEP platform.
