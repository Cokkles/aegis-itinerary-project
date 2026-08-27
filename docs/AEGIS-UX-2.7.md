# AEGIS UX 2.7 Interaction Pass

## Product-facing navigation

AEGIS navigation uses human-facing labels (`Home`, `Briefing`, `Calendar`, `Tasks`, `Follow-ups`, `Finances`, `News & Insights`, `System`). Internal subsystem names such as HORIZON, SENTINEL-FIN, PRISM, and KINETIC remain diagnostic/architecture identities rather than primary navigation labels.

## New interaction surfaces

- Home `Ask AEGIS` using the existing authenticated AI query contract.
- Persistent Follow-ups sourced from Notes/HORIZON intelligence.
- Follow-up actions: Done, Promote to Google Task, Add to Calendar prompt.
- Local Quick Tasks stored in the browser until explicitly synchronized to Google Tasks.
- Expanded Calendar month workspace backed by `AEGIS_CALENDAR_RANGE_V1` while preserving AQ-2 preview/confirmation for writes.
- Section-level sync semantics plus conservative passive read refresh on focus and every five minutes while visible.
- RSS health semantics tolerate normal source-level failure; Intelligence becomes partial only when more than 40% of attempted feeds fail (with an absolute floor of more than two failures).

## Backend contracts expected by the UX

- `get_calendar_range` → `AEGIS_CALENDAR_RANGE_V1`
- `get_followups` → `AEGIS_FOLLOWUPS_V1`
- `create_task` → `AEGIS_TASK_ACTION_V1`
- `resolve_followup` / `dismiss_followup` / `promote_followup_task` → `AEGIS_FOLLOWUP_ACTION_V1`

The feature layer degrades safely when these endpoints are not yet deployed; existing Today/Tomorrow Calendar, Google Tasks, Finance, HORIZON, and AQ-2 behavior remains available.

## Follow-up lifecycle

Notes are durable provenance. HORIZON/Gemini may propose `FOLLOW_UP:` records. AEGIS/user owns lifecycle via `FOLLOW_UP_RESOLVED`, `FOLLOW_UP_DISMISSED`, and `FOLLOW_UP_PROMOTED` markers. Regenerating HORIZON must never silently clear a follow-up.

## Compatibility boundary

GPOS, AEGIS, PRISM, and SENTINEL-FIN finance/receipt contracts are compatibility-sensitive. This UX pass does not change finance endpoint schemas, canonical ledger semantics, authentication, PRISM authority, or SENTINEL-FIN authority. GPOS helper functionality must continue to call the same AEGIS backend contracts rather than implementing parallel finance/calendar/task logic.
