# AEGIS AQ-2 — Conversational Calendar Control

## Status

Implementation branch: `agent/aq2-calendar-conversational-controls`

Production cutover is gated on Apps Script backend 2.6.2 deployment and validation.

## Contract

`AEGIS_CALENDAR_ACTION_V2`

Supported conversational operations:

- READ — schedule, event lookup, and availability questions; immediate and non-mutating.
- CREATE — prepares a preview only.
- UPDATE — identifies an existing event and prepares a preview only.
- DELETE — identifies an existing event and prepares a preview only.

## Authorization

- `calendar_ai` requires `calendar.read`.
- `calendar_confirm` requires `calendar.write`.
- Existing AUTH-1 Google token verification and private account allowlist remain mandatory.

## Mutation safety

Create/update/delete never execute from the first AI request.

The backend emits a short-lived confirmation proposal containing:

- operation;
- verified target event for update/delete;
- proposed event/changes;
- opaque confirmation token;
- expiration time.

Confirmation tokens:

- live for at most 10 minutes;
- are stored server-side in Apps Script CacheService;
- are bound to the authenticated Google account that requested the preview;
- are one-shot and removed before mutation;
- cannot be reused to duplicate a Calendar write.

Ambiguous update/delete matches do not generate a confirmation token. AEGIS returns candidate events and requires clarification.

## Frontend

`aq2-calendar.js` adds a Calendar mode to Ask AEGIS. Calendar reads behave conversationally. Proposed writes render as explicit preview cards with Confirm and Cancel controls.

The existing browser session-history model remains bounded and non-canonical. Confirmation authority lives server-side, not in browser history.

## Deployment

Use the full Apps Script 2.6.2 candidate built from the production-validated 2.6.1 AUTH-1/AQ-1 source. Do not replace production with the older repository-root `Code.gs`, which remains historical/stale relative to the deployed backend.

After deployment verify `?action=auth_config` reports `backend_version: 2.6.2` and run `testAegisCalendarReadV2()` before frontend publication.

## Required validation

1. Calendar read: tomorrow/upcoming schedule returns current Calendar events and `mutation_performed=false`.
2. Create request: returns preview + token; Calendar remains unchanged before confirmation.
3. Create confirmation: one event created exactly once.
4. Token replay: rejected.
5. Expired token: rejected.
6. Wrong-account token: rejected.
7. Update: preview first, then confirmed change only.
8. Delete: preview first, then confirmed deletion only.
9. Ambiguous target: no mutation token emitted.
10. Logout/no auth: both read and confirm fail closed.
