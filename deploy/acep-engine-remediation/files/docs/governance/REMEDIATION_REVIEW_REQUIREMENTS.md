# Remaining evidence and release decisions

The repaired system remains a research system. No independent professional sign-off is asserted.

- F06: provide licensed completed-project inputs, actual target measurements with units and area/scope basis, independent baseline, project/contractor/time/source exclusion lists, and a frozen acceptance policy. Run `scripts/evaluate-real-projects.js` with two separately trusted domain/security signatures. Every required stratum must pass its own minimum sample, Wilson lower bound, abstention and baseline gates. Passing cannot activate a model.
- F07/F10: authentic GPU LoRA weights and a separately reviewed inference runtime are absent. CAD/DWG/IFC geometry extraction remains explicitly unavailable where an adapter is not implemented. JSON spaces accept only explicit geometry and units.
- F08/F11: the new 1M v2 corpus and regenerated UETS exports are reproducible and hash-bound. Historical 3M and Windows-only adapters were not recovered and are not represented as audited artifacts. Raw legacy CSV provenance remains unverified.
- F12/F13/F15: source and tests are prepared. Apply Site D1 migrations, preserve existing account data, verify two-account separation, provision approved durable backend storage, and run a stopped-service backup/restore drill before production acceptance. A separate worker on the same governed volume can process candidate-only jobs; do not place an independent Render worker on a different private disk and assume it shares the queue. A distributed queue is required before scaling beyond the validated single-host model.
- F14/F18: supply dated licensed local prices, quote expiry, scope/tax basis, and applicable code edition/clause/jurisdiction. The evidence validators reject missing/stale provenance, but no licensed current price feed or code-compliance engine is activated.
- F13: CONTRIBUTING.md requires a security-aware maintainer and domain owner review. The original audit explicitly prohibited merging PR 1 just because tests pass. Keep the PR unmerged until those reviews; deploy the exact reviewed source commit and matching Site version, then compare `/ready.release` identities. Real engineering decisions additionally require a licensed professional.

No synthetic success, arithmetic BOQ/COST reconciliation, prose fluency, or software test count substitutes for these conditions.
