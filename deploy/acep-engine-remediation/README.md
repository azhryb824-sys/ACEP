# Engineering and training remediation

This directory is the reviewable source overlay for the second audit remediation. `files/` contains the exact changed source files, model artifact, tests, and frozen manifests. `manifest.json` binds their hashes and expected pre-change contents to the original staging archive and the preceding PR patch. No application source is downloaded from an unpinned branch during assembly.

Run `bash deploy/acep-engine-remediation/prepare.sh` from the repository root in a fresh checkout. It assembles `.acep-release/ACEP`, rejects any baseline or source hash mismatch, quarantines old UETS examples, regenerates all ten domains, and checks every rebuilt file against the reviewed hashes. `build.sh` additionally installs the pinned lockfile, builds both root and service-local TypeScript outputs, validates datasets and prunes development dependencies. Start with `cd .acep-release/ACEP && node server.js`.

The base `ACEP/` directory and old archive remain preserved historical inputs. The canonical repaired runtime is the assembled tree; do not deploy the historical directory directly or apply an overlay twice.

The original audit and CONTRIBUTING.md require security-aware maintainer and domain-owner review before merge/deployment. This draft does not grant engineering approval. The Site must match the model hash and `engineering-remediation-v2` contract exposed by `/ready`; wrong-version sessions fail closed. Keep current audience private. Apply the Site D1 migrations before activating its durable workspace.

The free Render target has ephemeral backend storage. Do not represent it as durable or enable background training on that service. A separately approved persistent-volume single-host deployment can run `ACEP_PROCESS_ROLE=training-worker node scripts/uets-worker.js`; multiple hosts require a distributed queue, not unrelated private disks. `scripts/backup-runtime.js` backs up a stopped service and restores into a new directory with path and hash verification. A hosted restore drill remains an acceptance requirement.

See `files/docs/governance/REMEDIATION_REVIEW_REQUIREMENTS.md` for outstanding independent evidence. Numeric research results and internal consistency are not field accuracy or price/code approval.
