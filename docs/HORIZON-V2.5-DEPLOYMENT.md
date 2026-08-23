# HORIZON V2.5 Production Deployment

Status: PATCH PREPARED / MANUAL APPS SCRIPT DEPLOYMENT REQUIRED
Date: 2026-08-22
Source baseline: exported live Apps Script `Code.gs` supplied from the production project
Candidate SHA-256: `efd66c88b01b1eb4a861a602e4a0f5faa54f21ee677af6c2b7c532c61ed48d38`

## Prepared migration

The V2.5 deployment candidate is generated from the exported live production source rather than the older GitHub mirror. It preserves current AEGIS capabilities while surgically replacing the retired HORIZON execution path.

### Runtime changes in the candidate

- `getHorizonData` / `getSummary` no longer read `horizon_data.json`; they build current AEGIS runtime state directly from the canonical briefing, Calendar, Tasks, and the KINETIC presentation contract.
- `/horizon`, `refresh_briefing`, and `horizon_sync` no longer call `refreshHorizonDataFeed()`.
- `mark_done` no longer calls `pruneHorizonJsonFile()`.
- `refreshHorizonDataFeed()` and `pruneHorizonJsonFile()` remain only as zero-I/O kill guards returning `RETIRED_HORIZON_PATH_BLOCKED`.
- `KINETIC_TO_HORIZON_V2` is produced in a bounded KINETIC helper layer; HORIZON consumes the contract rather than recalculating nutrition.
- `SPARK_TO_HORIZON_V2` is produced in a bounded SPARK helper layer; raw Journal text never enters the HORIZON prompt. Conservative materiality means incomplete/current self-report is omitted rather than synthesized.
- `ACTIVE_NOTE_FILTER_V2.0.1` admits only leading `ACTIVE:`, `TODO:`, `OPEN:`, or `FOLLOW_UP:` notes and excludes archival/unmarked/tombstone entries.
- Gmail harvesting is explicitly time-bounded (`newer_than:7d`) and **not unread-only**.
- Current weather is sourced through Open-Meteo; unavailable sources are represented as unavailable rather than reconstructed.
- Current intelligence is bounded to published items within 72 hours from the existing AEGIS intelligence engine.
- HORIZON does not read the previous `latest_horizon_briefing` during generation.
- `scheduledHorizonRun()` is a no-op kill guard and `installAegisAutomationTriggers()` no longer installs a HORIZON schedule; intelligence and appointment-reminder schedules remain supported.
- Backend/capability version advances to `2.5.0`; `scheduled_horizon` reports `false`.

## Production deployment procedure

1. In the Apps Script editor, preserve the currently deployed version as the rollback point. Do **not** use `horizon_data.json` as rollback.
2. Replace the current `Code.gs` contents with the prepared V2.5 candidate generated from the exported production source.
3. Save the project and run `removeRetiredHorizonTriggersV25()` once from the Apps Script editor. Authorize if Google requests permissions. Expected result includes `horizon_mode: "on-demand-only"`.
4. Run `getInstalledAegisTriggers()` and verify that `scheduledHorizonRun` is absent. Existing/current intelligence and notification triggers may remain.
5. Run `buildKineticToHorizonV2()` manually. Confirm a JSON object returns with `adherence_status`, null-safe nutrient values, and the tracker link.
6. Run `buildSparkToHorizonV2()` manually. Confirm it returns one of `AVAILABLE`, `NOT_MATERIAL`, `STALE`, or `OMITTED`; incomplete evidence must not fabricate state.
7. Run `getActiveNotesV25()` manually. Confirm only explicitly marked active prefixes are in `active_candidates`.
8. Deploy a **new web app version** using the existing deployment configuration/URL so AEGIS does not need its webhook URL changed.
9. Verify `?action=capabilities` reports backend version `2.5.0` and `scheduled_horizon: false`.
10. Verify `?action=getHorizonData` returns current runtime JSON and `system_metadata.horizon_json_status = RETIRED_HORIZON_PATH_BLOCKED` while the AEGIS dashboard still loads Calendar, Tasks, and the canonical briefing.
11. Trigger one controlled `/horizon` / `horizon_sync` run.
12. Inspect `latest_horizon_briefing` and validate: KINETIC contract values, SPARK optionality, active-note-only Things to Consider, non-unread-only Gmail context, SENTINEL-FIN/PRISM boundary, current-source newspaper, and no stale prior-briefing carry-forward.
13. Confirm `horizon_data.json` modification time did not change during steps 8–12.

## Rollback

Rollback only to the immediately prior Apps Script deployment/version captured in step 1. A rollback must not reactivate retired JSON semantics. If rollback is necessary, leave the V2.5 branch/PR unmerged and record the failure before retrying.

## Exit gate

V2.5 remains incomplete until the fresh production `/horizon` run passes and `latest_horizon_briefing` is validated. After that, sync the deployed `Code.gs` back into this repository branch, update GEMINI-POS V2.5 documentation, mark the PR ready, and merge.