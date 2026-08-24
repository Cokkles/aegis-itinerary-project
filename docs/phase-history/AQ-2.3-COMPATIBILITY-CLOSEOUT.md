# AEGIS AQ-2.3 Compatibility & Production Closeout

Status: IMPLEMENTED — production behavior validation pending final move/delete/replay checks.

## Frontend compatibility

Frontend compatibility is capability-driven. Version strings are diagnostic metadata and no longer determine compatibility by equality.

Required capabilities for the current frontend:

- `auth.google`
- `ai.query`
- `calendar.read`
- `calendar.write`
- `calendar.aq2`
- `horizon.generate`

The current Apps Script capability fields are normalized client-side into this canonical set. A newer backend version does not create an alert when required capabilities remain available.

Legacy `backend-version` local notifications are retired and removed from local notification state.

## System diagnostics

The System view now includes a Compatibility & Model Routing panel showing:

- frontend release
- backend release
- AUTH contract version
- canonical capability matrix
- missing required capabilities, if any
- Calendar model-routing policy
- most recent Calendar routing telemetry in the browser session

## Calendar model routing

Policy:

1. deterministic Calendar parsing when reliable
2. `gemini-3.5-flash-lite` only for ambiguous Calendar language
3. heavier global Gemini model reserved for reasoning workloads

Calendar transport responses record:

- operation
- `parser_source`
- `model_used`
- whether confirmation was required
- whether a confirmed mutation occurred

## AQ-2.3 final production validation matrix

### MOVE

Prerequisite: exactly one `Test appointment` exists tomorrow at 3 PM.

Request:

`Move the test appointment tomorrow from 3 PM to 4 PM.`

Expected preview:

- operation = UPDATE
- parser_source = DETERMINISTIC
- model_used = null
- mutation_performed = false
- confirmation_required = true

Before confirmation: Calendar remains unchanged at 3 PM.

After confirmation: exactly one Test appointment exists at 4 PM and no 3 PM duplicate remains.

### DELETE

Request:

`Delete the test appointment tomorrow.`

Expected preview:

- operation = DELETE
- parser_source = DETERMINISTIC
- model_used = null
- mutation_performed = false
- confirmation_required = true

Before confirmation: event still exists.

After confirmation: event is absent.

### REPLAY / EXPIRY

A used or expired confirmation token must return `CALENDAR_CONFIRMATION_EXPIRED` and perform no mutation.

### AMBIGUOUS TARGET

If multiple candidate events remain after deterministic matching, AEGIS must request clarification and return no confirmation token rather than guess.

## Exit gate

AQ-2.3 is COMPLETE only after MOVE, DELETE, replay/expiry, and ambiguous-target protections are verified in production.
