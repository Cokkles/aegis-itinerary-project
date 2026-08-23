# HORIZON V2.5 Runtime Cutover — Reconciliation Blocker

Status: BLOCKED / AUTHORITATIVE LIVE SOURCE CONFIRMED
Date: 2026-08-22
GPOS authority: `Cokkles/GEMINI-POS` V2.5 bounded-contract integration

## Why this branch exists

This branch is isolated from `agent/aegis-auth-foundation` so HORIZON production-cutover work does not alter the parallel AEGIS authentication track.

## Authoritative live Apps Script reconciliation

The current Google Apps Script project source was manually exported from the live AEGIS Apps Script project and inspected on 2026-08-22. The exported source confirms that the same legacy behavior previously observed in checked-in `main/Code.gs` is present in the live project source. The GitHub copy is therefore not merely a stale historical mirror for the affected HORIZON paths.

Confirmed live-source findings:

- `CONFIG.HORIZON_JSON_NAME` is still defined as `horizon_data.json`.
- `doGet()` still serves `getHorizonData` / `getSummary` by reading `horizon_data.json`.
- `mark_done` still calls `pruneHorizonJsonFile()` after updating Google Tasks / Notes.
- `/horizon`, `refresh_briefing`, and `horizon_sync` still call `refreshHorizonDataFeed()` after `runHorizonPipeline()`.
- `pruneHorizonJsonFile()` still performs Drive reads/writes against `horizon_data.json`.
- `refreshHorizonDataFeed()` still reads/writes `horizon_data.json`, reads the canonical briefing back into the feed, performs direct raw calorie aggregation, serializes Calendar/Tasks, and writes runtime metadata.
- `runHorizonPipelineUnsafe()` still reads Calendar and Tasks directly and sends a generic Gemini prompt asking the model to generate Health/KINETIC, SENTINEL-FIN, Gmail, Things to Consider, and Personal Newspaper content without supplying `KINETIC_TO_HORIZON_V2` or `SPARK_TO_HORIZON_V2`.
- `getTodayCaloriesFromSheet()` still performs raw nutrition-row mathematics and returns `0` on read failure, which conflicts with V2 null-vs-zero semantics.
- `scheduledHorizonRun()` still invokes `refreshHorizonDataFeed()` after generation.
- `installAegisAutomationTriggers()` still installs a daily `scheduledHorizonRun` trigger at hour 6, conflicting with the canonical on-demand-only HORIZON architecture unless this automation has been explicitly re-authorized in a later canonical spec.

## Additional live capabilities confirmed

The same source contains useful current AEGIS capabilities that must be preserved during remediation:

- Gemini API access via Script Properties (`GEMINI_API_KEY`, configurable model).
- natural-language Calendar resolution plus Calendar event creation;
- appointment reminder notifications;
- recent finance activity support;
- intelligence/RSS aggregation and persistent intelligence cache;
- canonical `getLatestHorizonBriefing()` Google Doc read path;
- HORIZON generation status and server notification telemetry.

These current features should not be removed merely because the HORIZON legacy path is being eradicated.

## Critical architecture conclusion

The previous remediation reports claiming the legacy HORIZON JSON runtime was permanently eradicated do not match the current live project source. V2.5 must therefore include an actual production legacy-shutdown patch, not merely repository documentation.

No production deployment should be performed by blindly replacing the full Apps Script file. The migration must be surgical so that Calendar, notifications, intelligence, finance activity, Gemini configuration, and other current AEGIS v2.4 functions remain intact.

## Contract deployment gap

The validated producers for:

- `KINETIC_TO_HORIZON_V2`
- `SPARK_TO_HORIZON_V2`

currently exist in the private GEMINI-POS engineering repository as Python implementations. Google Apps Script cannot directly execute that Python implementation. A production cutover therefore requires an explicit runtime bridge.

Approved implementation choices remain:

1. port the producer logic into bounded Apps Script domain modules with schema-equivalent behavior;
2. deploy the existing GPOS producers behind an authenticated service endpoint and have Apps Script consume those contract payloads; or
3. move the HORIZON execution controller to a runtime capable of executing the repository implementation directly.

For the immediate V2.5 migration, the preferred lowest-change path is to port only the required bounded KINETIC and SPARK producer/projection logic into Apps Script, validate it against the frozen contract fixtures, and keep the private repository implementation as the engineering reference.

Do not bypass the contracts by returning to raw HORIZON sheet/journal reads.

## Mandatory legacy shutdown during cutover

The deployed production runtime must ensure:

- `getHorizonData` / `getSummary` return a retirement/blocked response or are removed from current clients;
- `refresh_briefing` may remain only as a compatibility alias to the canonical HORIZON controller and must never imply JSON refresh behavior;
- `refreshHorizonDataFeed()` becomes a zero-I/O kill guard or is removed;
- `pruneHorizonJsonFile()` becomes a zero-I/O kill guard or is removed;
- `horizon_data.json` has zero production readers/writers;
- task completion no longer depends on JSON pruning;
- `scheduledHorizonRun()` must not call a retired feed function;
- legacy automatic HORIZON trigger installation must be removed/blocked unless explicitly approved by the current HORIZON canonical specification;
- HORIZON presentation must not call `getTodayCaloriesFromSheet()` or perform raw nutrition aggregation.

## Required production patch sequence

1. Capture current Apps Script deployment/version as rollback baseline.
2. Add V2 bounded Apps Script producers/projections for KINETIC and SPARK.
3. Implement leading-prefix `ACTIVE_NOTE_FILTER` in the production context builder.
4. Rebuild `runHorizonPipelineUnsafe()` so the Gemini prompt receives only approved bounded domain inputs plus live Calendar/Tasks/Gmail/weather/news sources explicitly allowed by the HORIZON specification.
5. Remove direct/raw HORIZON Journal access entirely.
6. Remove direct/raw HORIZON nutrition math entirely.
7. Convert JSON functions/routes to zero-I/O kill guards / retirement responses.
8. Remove JSON refresh calls from manual and scheduled HORIZON execution.
9. Reconcile/install only currently authorized triggers.
10. Deploy as a new Apps Script version; do not overwrite rollback version.
11. Run fresh `/horizon` clean-room validation.
12. Verify `latest_horizon_briefing`, legacy inactivity, contract semantics, and client compatibility.
13. Update GitHub `Code.gs` to mirror the validated deployed source.

## Rollback

Record the currently deployed Apps Script deployment/version identifier before cutover. Rollback may restore only the immediately prior current HORIZON implementation while preserving the V2.5 legacy shutdown policy. `horizon_data.json` must never become a sanctioned rollback authority.

## Completion condition

Do not mark HORIZON V2.5 complete until a deployed fresh `/horizon` execution proves:

- KINETIC bounded contract consumption;
- SPARK bounded contract consumption/optionality;
- no raw Journal Pad access;
- no HORIZON nutrition row mathematics;
- leading-prefix ACTIVE_NOTE_FILTER enforcement;
- no prior-briefing factual carry-forward;
- SENTINEL-FIN / PRISM separation;
- zero legacy JSON activity;
- correct overwrite of `latest_horizon_briefing`.
