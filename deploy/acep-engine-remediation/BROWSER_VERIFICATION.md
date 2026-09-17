# User workflow verification on the isolated actual backend

On 17 September 2026 the Site preview used the real Node 20 backend, not mock analysis. A villa with 600 m² total floor area, two floors and 500 m² land produced twelve BOQ work packages and SAR 2,242,306. Excluding electrical, mechanical and plumbing produced nine packages and SAR 1,641,277. The duration was withheld and nine included scope activities displayed without invented dates/durations. The BOQ view displayed the scope ledger.

Land of 100 m² was rejected with HTTP 400 and an Arabic geometry explanation. An unsupported city was rejected with HTTP 400 and an Arabic local-reference explanation. These requests did not generate successful substitute reports. The quality/risk/safety views were inspected; non-measured grades/probabilities remain unavailable. Inspection of the UI exposed and led to correction of null-to-zero values in the shared data layer and of unverified aggregate defect counts.

A manual safety note explicitly marked as a test was saved, the page was reopened, and the note and project selection remained available. Thirteen automated Site checks additionally verify missing identity, cross-origin mutation rejection, payload schema, account separation, revision conflict, signed session identity separation, database reopen/backup-restore, storage failure, and mismatched backend release rejection. These are local tests; a hosted D1 migration and restore drill remain pending.

Full-scope engine execution: nine engines returned research outputs and ESG withheld unsupported numbers. The 35-type HTTP matrix supplies its explicit ESG intent and independently exercises all ten engine paths (350 executions, 420 assertions). No accuracy percentage follows from these checks.
