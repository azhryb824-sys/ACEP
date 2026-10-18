# Four-tool research calculator

Run `python3 -m unittest -v test_calculator.py` from this directory. No packages,
model download, GPU, network calls, or server startup are needed. Five test
methods cover 25 reference, boundary, rejection, clarification, and JSON cases.

`calculate_explicit_inputs` validates the four-tool pilot contract and calculates
rectangular volume, net area, purchase quantity with supplied waste, and line
cost with a supplied price. Arithmetic uses Decimal and never rounds to packs.
The existing contract gate was copied unchanged from the user's verified v5
backup. Zero quantity/net quantity, zero price, zero waste, zero openings, and
openings equal to gross area follow that gate's policy. Dimensions, count, and
gross area must be positive; count must be integral. Negative values, booleans,
non-finite values, mismatched units, missing arguments, and extra fields fail.
Arithmetic additionally limits number size and precision to protect resources.

This module does **not** authorize execution of a model call. It has no text
grounding, intent verification, API endpoint, UI integration, or deployment
claim. Only pass independently established explicit inputs. Clarification and
rejection responses remain non-executable and require their own review.

## Current model evidence (18 October 2026)

Frozen v5 adapter SHA256:
`19049cee53597001db1ab7784e181f57cf0940b918deb83dac85aef80b6ace6b`.
Base: `Qwen/Qwen2.5-3B-Instruct`, revision
`9bbedf2d140158eb7dc95a89e776b86befc70e1a`.

On the same 48 authored development extraction cases: FP16 25 exact / 28
contract-valid; NF4 original prompt 42 / 48; NF4 experimental prompt v2 44 / 48.
All three runs produced zero calls on the missing-input cases. These are
development measurements, not independent engineering accuracy or calculator
integration tests. Prompt v2 remains experimental and has residual errors.
The earlier prompt also conflicts with the gate's zero-price policy; prompt
changes alone do not establish correctness.

No model inference occurs in these unit tests. Do not infer engineering safety,
structural design, market prices, or platform-wide capability from these tests.
