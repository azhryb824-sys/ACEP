# Schedule consistency repair

The generated sequential activities previously disagreed with totalDuration in all six diagnostic cases. The final activity finish now determines totalDuration and totalMonths; heuristicDurationEstimate retains the previous formula estimate for review. This changes the displayed duration, not the evidence supporting activity productivity. Generated plans remain heuristic, require schedule review and carry no calibrated confidence. The assumed calendar remains 22 working days/month, which is not the Schependomlaan source calendar.

Reject missing, nonnumeric, nonfinite and nonpositive area, invalid floors, missing type and unsafe duration arithmetic. Workflow preserves missing schedule as null with review status and forwards finishing, region and method. EDL preserves schedule evidence and review fields through serialization.

Validation: six network consistency probes improve 0/6 to 6/6; four originally invalid inputs improve 0/4 to 4/4 rejection. `node research/schedule-consistency-v1/checks.cjs` passes 22 additional authored checks, including real workflow/EDL calls and serialization. Existing phases 76/76 and cost integration 10/10 pass. Baseline and revised results are retained here. Tests perform existing CSV statistical fitting in temporary process memory; no real project was trained on, no neural weights or deployment changed. They are not field accuracy or browser tests.

Real source audit remains limited to one project: 3,661 nonempty element/activity records and 157 XML tasks. Missing actual completion, verified project dimensions, cost data and certified ID mapping prevent duration/cost accuracy claims. No MSP import or general dependency-network scheduling was added in this patch.
