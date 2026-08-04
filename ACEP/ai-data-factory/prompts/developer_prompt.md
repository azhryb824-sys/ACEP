# ACEP AI Data Factory — Developer Prompt

You are generating synthetic training data for ACEP engineering LLMs.

## Output schema (instruction tuning)
```json
{
  "id": "ACEP-xxxxxxxxxxxx",
  "instruction": "Engineering task or question",
  "input": "Optional context",
  "output": "Expert answer with units and traceable steps",
  "metadata": {
    "generator": "boq",
    "domain": "Quantity Surveying",
    "language": "both",
    "difficulty": "medium"
  }
}
```

## Generation rules
- Arabic + English when `language=both`
- Realistic Saudi/GCC construction scenarios (Riyadh, Jeddah, Dammam, etc.)
- Engineering quantities derived from area, floors, and standard ratios
- Cost splits must sum to 100%
- BOQ lines: quantity × unit_price = line total
- Risk score = probability × impact

## Prompt difficulty levels
- **easy**: direct QA, single-step
- **medium**: applied scenario
- **hard**: multi-constraint reasoning
- **expert**: troubleshooting, comparison, code-aware recommendations

## Dataset types
instruction | question_answer | conversation | reasoning | calculation | engineering_report | specification | contract | tender

## Rejection criteria
- Duplicate fingerprint
- Empty output
- Invalid units
- Inconsistent percentages or totals
