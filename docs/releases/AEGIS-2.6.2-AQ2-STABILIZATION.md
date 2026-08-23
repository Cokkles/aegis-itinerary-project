# AEGIS 2.6.2 — AQ-2 Stabilization & Calendar Cutover

## Release identity

- AEGIS frontend release: **2.6.2**
- Apps Script backend: **2.6.2**
- Phase: **AQ-2.1 stabilization**
- Auth baseline: **AUTH-1 enforced**
- AQ baseline: **AQ-1.1 validated**
- Calendar contract: **AEGIS_CALENDAR_ACTION_V2**

## Permanent version-label convention

Every production Apps Script candidate must begin with a release header containing:

- AEGIS frontend version it is intended to match;
- Apps Script backend version;
- phase/release name;
- auth enforcement expectation;
- expected PWA cache generation;
- deployment rule (replace Code.gs and publish a new version of the existing Web App deployment).

Do not deploy an unlabeled production candidate.

## Stabilization fixes

### AQ-2 Calendar

- READ is immediate and non-mutating.
- CREATE / UPDATE / DELETE return preview only.
- Mutation requires a second `calendar_confirm` call.
- Confirmation token expires after 10 minutes.
- Token is one-shot and bound to authenticated Google account.
- `calendar_ai` => `calendar.read`.
- `calendar_confirm` => `calendar.write`.
- Ambiguous update/delete targets fail closed.

### Gemini transient availability

AQ-2 Calendar calls retry transient Gemini HTTP 429/503 failures with bounded backoff. This policy is Calendar-specific and does not alter HORIZON or other Gemini consumers.

### Authenticated legacy dispatcher

`aq2-stabilization.js` captures legacy console dispatches before old handlers and sends the authenticated session token explicitly. This protects `/note`, `/journal`, `/calories`, `/receipts`, `/groceries`, and related dispatcher commands without weakening AUTH-1.

### PWA generation coherence

Service worker cache is rotated to:

`aegis-dashboard-v2.6.2-aq2-stable`

Runtime assets are normalized to the same `v=2.6.2` generation. The service worker bundles the base 2.6 override, AQ-1.1 Markdown/mode-isolation hotfix, AQ-2 Calendar UI, and AQ-2 dispatcher stabilization module together when the legacy HTML requests `v2.4.1.js`.

This removes the prior mixed-generation condition where a current AUTH shell could coexist with an older dispatcher/core asset.

## Validation already completed

- AQ-1 authenticated AI gateway: PASS.
- AQ-1.1 mode isolation: production defect identified and fixed.
- AQ-1.1 Markdown rendering: fixed.
- AQ-2 Calendar READ: PASS.
- Verified returned events for Monday 2026-08-24: Recycling Day and Garbage Day.
- READ response: `mutation_performed=false`, `confirmation_required=false`.
- Gemini 503 transient failure observed and handled through AQ-2 bounded retry hardening.

## Required production validation after deployment

1. Authenticated login succeeds.
2. `/note` dispatcher succeeds while AUTH-1 remains required.
3. `/journal`, `/calories`, `/receipts`, `/groceries` remain authenticated and functional.
4. Ask AEGIS General/Career/Finance/Logistics/System modes remain functional.
5. AQ-1.1 Markdown formatting and per-mode transcript isolation remain functional.
6. Calendar READ succeeds.
7. Calendar CREATE returns preview with `mutation_performed=false`.
8. Cancel produces zero mutation.
9. Confirm performs exactly one Calendar mutation.
10. Confirmation replay is rejected.
11. Expired confirmation token is rejected.
12. Wrong-account confirmation is rejected.
13. UPDATE and DELETE each require preview + confirmation.
14. Ambiguous target does not mutate.

## Rollback

Rollback target is the immediately prior production-validated Apps Script 2.6.1 / AQ-1.1 runtime plus the prior AEGIS frontend mainline. Do not disable AUTH-1 and do not reactivate legacy HORIZON JSON/feed mechanisms as rollback.
