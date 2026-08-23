# HORIZON V2.5 Post-Deployment Validation

Date: 2026-08-22
Status: DEPLOYED / VALIDATION PARTIAL

## Observed production briefing

A fresh HORIZON briefing was generated after deployment of the V2.5 Apps Script candidate.

### Confirmed working

- KINETIC section populated from the new bounded Apps Script KINETIC adapter.
- SPARK state was `STALE` and the reflection/somatic card was correctly omitted.
- `Things to Consider` contains only explicitly marked `FOLLOW_UP:` items; prior unmarked archival suggestions did not resurface.
- Calendar populated with the current all-day event.
- Personal Newspaper populated from current intelligence items.
- No legacy `horizon_data.json` error or retired-feed data appeared in the generated briefing.

### Defects / follow-up discovered

1. Gmail/Logistics is `UNAVAILABLE` because the deployed Apps Script has not yet been granted sufficient Gmail scope. Runtime error reports required Gmail permissions (`mail.google.com` or Gmail metadata/readonly/modify scopes). This is a deployment authorization defect, not a reason to restore unread-only logic. The intended query remains `newer_than:7d` with `unread_only=false`.

2. `KINETIC_TO_HORIZON_V2` currently exposes `rows_evaluated_today`, which Gemini rendered as `Rows Evaluated Today: 9`. That field is producer diagnostics/provenance and is not part of the frozen public presentation contract. Remove it from the HORIZON-facing payload (or move it to internal diagnostics) before final V2.5 freeze.

3. SENTINEL-FIN boundary requires another pass. The current Apps Script uses `getRecentFinanceActivity(72)`, which directly reads and aggregates the Receipts & Expense Intake Log. This produces a useful bounded summary, but it bypasses the intended architecture in which HORIZON consumes SENTINEL-FIN authoritative output rather than independently performing finance aggregation. Treat as a V2.5 exit-gate defect unless an explicit SENTINEL-FIN adapter contract is established.

4. Active Tasks rendered `No active tasks logged.` The Apps Script task adapter currently returns `[]` on API failure, which is indistinguishable from a verified empty task list. Change task source semantics to `AVAILABLE` vs `UNAVAILABLE` so a permission/API failure cannot silently render as zero tasks.

## Exit-gate status

V2.5 is not yet ready to be declared complete. The production cutover works sufficiently to validate the major clean-room and lifecycle changes, but Gmail authorization, task unavailable-vs-empty semantics, KINETIC presentation-contract leakage, and SENTINEL-FIN boundary enforcement remain open.
