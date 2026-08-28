# AEGIS AQ-2.3 — Calendar Model Efficiency

Status: IMPLEMENTED CANDIDATE / VALIDATION REQUIRED

## Objective
Reduce Gemini quota/cost pressure from Calendar operations while preserving the AQ-2 preview/confirm mutation boundary.

## Routing policy
1. Deterministic parsing first for common today/tomorrow Calendar reads, CREATE, UPDATE/move, and DELETE requests.
2. Deterministic READ answers are rendered directly from verified Google Calendar events and make zero Gemini requests.
3. Deterministic CREATE/UPDATE/DELETE produce the same preview + short-lived confirmation-token flow as AQ-2; no write occurs before confirmation.
4. Ambiguous requests fall back to a Calendar-specific Gemini model rather than the global GEMINI_MODEL.
5. Default Calendar fallback model: `gemini-3.5-flash-lite`.
6. Override with Script Property `AEGIS_CALENDAR_MODEL` when required.
7. Global `GEMINI_MODEL` remains reserved for higher-value reasoning such as HORIZON / richer AEGIS analysis.

## Observability
Calendar responses report:
- `parser_source`: `DETERMINISTIC` or `MODEL`
- `model_used`: null for deterministic execution, otherwise the Calendar fallback model

This makes model consumption measurable instead of implicit.

## Safety additions
- Deterministic operation guard remains authoritative for CREATE/UPDATE/DELETE class.
- Move/reschedule operations identify the original event time when supplied and use it to disambiguate same-title candidates.
- Moving an event preserves its original duration when the user only supplies a new start time.
- Existing 10-minute, account-bound, one-shot confirmation token remains required for Calendar mutation.

## Validation
Run `testAegisCalendarDeterministicV23()` and confirm the standard READ/CREATE/UPDATE/DELETE cases all report `uses_model:false`.
Run `testAegisCalendarModelConfigV23()` and verify the Calendar model is isolated from the global model.
Then perform production preview/confirm tests before merging this phase.