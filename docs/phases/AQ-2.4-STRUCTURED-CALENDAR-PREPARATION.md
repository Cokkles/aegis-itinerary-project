# AQ-2.4 — Structured Calendar Preparation

`calendar_prepare_v1` is an additive AUTH-1 contract for first-party forms that
already possess exact Calendar fields. It prevents a title, date, time, location,
or description from being reinterpreted by Gemini.

It does not create an event. The route produces the same account-bound,
ten-minute, one-shot preview used by `calendar_ai`; the existing
`calendar_confirm` route remains the only mutation step.

## Deployment integration

Deploy `apps-script/calendar-action-v2.gs`, then make these three additive
changes in the consolidated Apps Script runtime.

1. Authorize the action using the existing Calendar write scope:

```javascript
if (action === "calendar_prepare") return "calendar.write";
```

2. Route the authenticated POST after AUTH-1 authorization and before the
existing `calendar_confirm` case:

```javascript
if (action === "calendar_prepare") {
  return jsonOutput(handleAegisCalendarPrepareV1_(contents, authContext));
}
```

3. Advertise the contract only after both additions are deployed:

```javascript
ux_contracts: {
  // existing flags remain unchanged
  calendar_prepare_v1: true
}
```

## Compatibility and rollback

- Existing PWA and Android calls to `calendar_ai` and `calendar_confirm` do not
  change.
- AEGIS Windows discovers `calendar_prepare_v1` before calling the action.
- If the flag is absent, Windows uses its existing `calendar_ai` compatibility
  path and still requires preview plus confirmation.
- Rollback is removal of the capability flag. No stored data migration is
  required.

## Validation

Run `testAegisCalendarPrepareV1()` in Apps Script. Confirm that the response has
`parser_source: "STRUCTURED"`, `model_used: null`,
`confirmation_required: true`, and `mutation_performed: false`. Then confirm a
disposable test event from AEGIS Windows and verify it appears exactly once.
