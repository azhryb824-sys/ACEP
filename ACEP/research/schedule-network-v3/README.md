# Explicit activity network analysis

The existing schedule generator builds a serial template from historical averages.
It cannot represent a supplied construction network with concurrent branches.
`scheduleOptimizer.analyzeActivityNetwork(activities)` now accepts explicit activity
durations and predecessor relationships, computes early/late dates and total/free
float, and returns all critical activities and tight critical edges. It does not
concatenate parallel critical branches into an invalid single path.

Each activity requires `id`, nonnegative integer `duration`, and `predecessors`.
An edge may be an id string (zero lag), or `{id, type: 'FS', lag: 2}`.
Only finish-to-start relationships with nonnegative integer lags are supported.
All inputs use one common time unit starting at zero; no dates, calendars or
resource constraints are inferred. `resourceFeasible` and predictive confidence
remain null. Missing/duplicate ids or predecessors, cycles, unsupported relation
types and unsafe arithmetic are rejected. Input objects are not modified.

```js
const optimizer = require('../../packages/ai-engine/models/schedule-optimizer');
const network = optimizer.analyzeActivityNetwork([
  {id: 'A', duration: 2, predecessors: []},
  {id: 'B', duration: 5, predecessors: ['A']},
  {id: 'C', duration: 3, predecessors: ['A']},
  {id: 'D', duration: 2, predecessors: ['B', 'C']}
]); // totalDuration = 9; C has two units of total float.
```

Run `node research/schedule-network-v3/checks.cjs` from ACEP. Nineteen checks
cover fork/join networks, tied critical branches, lag, milestones, free versus
total float, malformed networks, overflow and compatibility with the existing
generated serial schedule. They establish calculation behavior, not field accuracy.
This is an additive engine API; no UI route or production deployment is included.

Method reference: Kramer and Jenkins, PMI, *Understanding the basics of CPM
calculations* / critical path method calculations (2006):
https://www.pmi.org/learning/library/critical-path-method-calculations-scheduling-8040

Separate Kaggle research evaluates retrospective activity-duration predictions
using eight actual projects from Figshare 12998822. The published sheets lack
dependency/resource evidence and baseline revision history, so that benchmark
cannot validate resource-constrained schedule optimization. No trained candidate
is promoted into the engine by this change. All seven engines still require the
original independent five-project acceptance gate.
