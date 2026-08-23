# HORIZON V2.5 Runtime Cutover — Reconciliation Blocker

Status: BLOCKED / SOURCE-RUNTIME RECONCILIATION REQUIRED
Date: 2026-08-22
GPOS authority: `Cokkles/GEMINI-POS` V2.5 bounded-contract integration

## Why this branch exists

This branch is isolated from `agent/aegis-auth-foundation` so HORIZON production-cutover work does not alter the parallel AEGIS authentication track.

## Checked-in Apps Script findings

Inspection of `main/Code.gs` found executable behavior that conflicts with the frozen HORIZON V2.5 architecture and with prior legacy-eradication reports:

- `doGet()` serves `getHorizonData` / `getSummary` from `horizon_data.json`.
- `mark_done` calls `pruneHorizonJsonFile()`.
- `/horizon`, `refresh_briefing`, and `horizon_sync` call `refreshHorizonDataFeed()` after generation.
- `pruneHorizonJsonFile()` still reads and writes `horizon_data.json`.
- `refreshHorizonDataFeed()` still reads and writes the legacy JSON feed and performs raw calorie access.
- `runHorizonPipelineUnsafe()` does not consume `KINETIC_TO_HORIZON_V2` or `SPARK_TO_HORIZON_V2`; its Gemini prompt asks for domain sections without supplying those bounded contracts.

## Required pre-deployment reconciliation

Before modifying or deploying Apps Script, establish whether this GitHub `Code.gs` is the exact source currently deployed behind the live AEGIS webhook.

If it is authoritative, it requires a controlled V2.5 migration and legacy kill-guard pass.

If it is a stale mirror, export/reconcile the deployed Apps Script project first. Do not overwrite a newer deployed runtime with this repository copy.

## Contract deployment gap

The validated producers for:

- `KINETIC_TO_HORIZON_V2`
- `SPARK_TO_HORIZON_V2`

currently exist in the private GEMINI-POS engineering repository. Google Apps Script cannot directly execute that Python implementation. A production cutover therefore requires one of the following approved runtime patterns:

1. port the producer logic into a bounded Apps Script domain layer with schema-equivalent behavior;
2. deploy the existing GPOS producers behind an authenticated service endpoint and have Apps Script consume those contract payloads; or
3. move the HORIZON execution controller to a runtime capable of executing the repository implementation directly.

Do not bypass the contracts by returning to raw HORIZON sheet/journal reads.

## Mandatory legacy shutdown during cutover

The deployed production runtime must ultimately ensure:

- `getHorizonData` legacy route returns a retirement/blocked response;
- `refresh_briefing` legacy JSON semantics are blocked or remapped only to the canonical HORIZON controller;
- `refreshHorizonDataFeed()` is a zero-I/O kill guard or removed;
- `pruneHorizonJsonFile()` is a zero-I/O kill guard or removed;
- `horizon_data.json` has zero production readers/writers;
- task completion no longer depends on JSON pruning.

## Rollback

Record the currently deployed Apps Script deployment/version identifier before cutover. Rollback may restore only the immediately prior current HORIZON implementation. It must never restore retired JSON execution paths.

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
