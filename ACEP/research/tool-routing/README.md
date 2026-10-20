# Grounded four-tool research path

## Source review update — 2026-10-19

`net_area_source_review.py` adds a veto before dispatch. It compares labelled
gross/openings measurements with the original proposal, retains original text
offsets, and rejects invalid source measurements or changed/swapped values.
It never repairs proposals. Ambiguous, duplicated, revised, negated, or
unsupported expressions require review. `consistent_evidence` does not verify
intent or grant execution: the original full-field grammar remains mandatory.

Replay on saved v8 output: 72 net-area cases, 40 call proposals, including 38
correct calls. Evidence matched 29 correct calls; nine still required review;
zero correct calls were vetoed. Both wrong calls were blocked, including the
previously contract-valid swapped proposal `v6-validation-0021`. This does not
change raw model accuracy (346/348) or promote v8 over the retained v7 default.
The retained v7 replay is included alongside v8 for comparison.

Validation: 19 Python methods, five real HTTP/Node integration tests (the UI
handler uses a DOM stub), and 600 metamorphic checks on labelled measurements.
Reports are in `source-review-results/`. These are authored development checks,
not independent engineering certification. The complete platform UI was not
tested or deployed in this update.

Run from this directory:
`python3 -m unittest test_net_area_source_review test_grounded_dispatch test_calculator`
and `node --test test_routes.js` after installing Express. Replay takes the
previous verified `ACEP_v8_units_research_complete.zip` as its positional input:
`python3 evaluate_source_review.py ARCHIVE --out source-review-results/replay_report.json`.

This opt-in path calculates rectangular volume, net area, quantity after supplied
waste, and line cost at a supplied price. It has no model or external API calls.
The frozen v5 model is unchanged. It does not infer structural design or prices.

## Run and test

Requires Python 3 and the platform's existing Express dependency. From this
directory:

```sh
python3 -m unittest -v test_calculator.py test_grounded_dispatch.py
node --test test_routes.js
node research_server.js
```

Open `http://127.0.0.1:5050/research/tools` for the local Arabic demo. The
standalone server binds only to localhost and avoids platform startup/training.
In the platform server the same routes are **disabled by default**; set
`ACEP_TOOL_RESEARCH_ENABLED=1` to enable them explicitly. `ACEP_TOOL_PYTHON` can
select a Python executable. No production deployment or full server startup was
performed in this change.

## Accepted source grammar

The first segment declares one supported operation. Each later segment is an
explicit field separated by `؛` or `;`. Examples:

```text
حجم مستطيل؛ الطول: 620 سم؛ العرض: 3.7 م؛ السمك: 160 مم؛ العدد: 1
صافي المساحة؛ الإجمالي: 203.6 م²؛ الفتحات: 31.2 م²
كمية بعد الهدر؛ الصافي: 72.5 م²؛ الهدر: 8 %
تكلفة التوريد؛ الكمية: 78.3 م²؛ سعر الوحدة: 65 ريال/م²
```

Length units are م/متر، سم/سنتيمتر، مم/مليمتر; area is م²/م2/m2, price
is ريال/م²/ريال/م2/SAR/m2. Height accepts السمك or الارتفاع. Arabic and
Persian digits are normalized without changing original quote offsets. No
assumed count or waste is supplied.

Free-form prose, implicit dimensions, word-number counts, conflicting or
duplicate fields, extra operations, and unrecognized clauses require review.
Every nonempty segment is checked in full. This is deliberately a restricted
grammar, not general Arabic understanding. Do not extend accepted wording
without counterexamples, unit checks, and regression tests.

## Request and trust boundary

`POST /api/v1/research/tools/calculate` accepts:

```json
{"text":"تكلفة التوريد؛ الكمية: 83.9 م²؛ سعر الوحدة: 0 ريال/م²"}
```

An optional `prediction` is the **raw JSON string** emitted by a model. Duplicate
JSON keys and non-standard numeric constants in that string are rejected. The
proposal is compared with separately parsed intent and every required number;
it cannot overwrite or repair source facts. Missing fields are derived from
the original source and all are requested together. Multiple sources or
conflicting values are not reconciled automatically.

The caller must supply the **original user text**, never model-generated text
as evidence. Matching a source does not establish whether a real-world
measurement is true. Successful responses include exact original quotes and
offsets. `text_grounding_verified` applies only to this restricted grammar.

## Calculation and validation policy

The unchanged v5 contract gate is reused. Zero price, zero quantity/net quantity,
zero waste, zero openings, and openings equal to gross area are supported.
Dimensions, gross area, and integral count must be positive. Negative and
non-finite numbers, booleans, missing/extra arguments, and mismatched units fail.
Decimal arithmetic is bounded and does not round to packs. Requests are capped
at 16 KiB, source at 4096 characters, workers at two, and processes at 3 seconds.
Unavailable Python and process failures fail closed without exposing logs.

## Validation and model evidence

Eleven Python test methods cover arithmetic, original evidence, all missing
fields, conflicts, unsupported text, invalid values, fabricated proposals, and
a fresh-process protocol. Five Node test methods cover real HTTP to Python calls,
disabled routes, payload failures, missing Python, and demo event handlers
connected to real HTTP. The demo test uses a DOM stub, **not a real browser**.
The platform's complete UI/server and engineering deployment remain untested.

Frozen v5 adapter SHA256:
`19049cee53597001db1ab7784e181f57cf0940b918deb83dac85aef80b6ace6b`.
Base: `Qwen/Qwen2.5-3B-Instruct`, revision
`9bbedf2d140158eb7dc95a89e776b86befc70e1a`.
NF4 experimental prompt v2 achieved 44/48 on a new authored development batch
and 39/40 on the exposed prior suite. These are extraction measurements,
not independent engineering accuracy. Model failures have not been retrained
away or silently repaired by the calculator.
