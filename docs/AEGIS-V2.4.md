# AEGIS v2.4 — Interactive Dashboard & Application Foundation

AEGIS v2.4 is the last major PWA-first iteration before personal/public separation and the optional Docker Coordinator work.

## Runtime principles

- Google Drive/Calendar/Tasks/Sheets remain authoritative personal data sources.
- Apps Script remains the Google integration and HORIZON automation layer.
- The client is cache-first: display last-known-good data, refresh in the background, and never replace good cached data with a failed response.
- Every subsystem has a terminal state: ready, partial, cached, or failed. Nothing should spin forever.
- Future Windows/Android clients should reuse these data/provider/notification contracts.

## v2.4 features

- Clickable dashboard metrics and source links.
- Persistent notification center with acknowledgement.
- HORIZON generation confirmation and validation before replacing the canonical briefing.
- Natural-language calendar event resolution, preview, and explicit creation.
- Appointment reminder notification sweeps.
- Rolling 72-hour SENTINEL-FIN activity from the existing finance Log sheet.
- RSS Intelligence cache, parallel source retrieval, partial-success behavior, source health, and persistent last-known-good data.
- Approximately 200 additional local AEGIS perspectives on top of the existing quote library, plus quote fallback/crossfade behavior.
- Smaller Generate HORIZON / Sync Dashboard controls.
- Frontend/backend capability reporting and system health.
- Local-first provider/cache foundation in `aegis-core.js`.

## Apps Script deployment

The v2.4 PWA requires the v2.4 Apps Script backend for all new features. After replacing the deployed Apps Script with `AEGIS_Code_v2.4_Full_Deploy.gs`, create a new web-app deployment version while retaining the existing `/exec` URL.

After deployment, run `installAegisAutomationTriggers()` once (or invoke the equivalent v2.4 automation action) to install:

- morning HORIZON generation around 6 AM local project time;
- hourly Intelligence refresh;
- 15-minute appointment reminder sweeps.

The morning HORIZON trigger includes same-day duplicate protection. Failed HORIZON generation preserves the prior valid briefing and records a persistent AEGIS notification.

## Next phases

- v2.5: Personal/Public separation; GitHub Pages becomes demo/reference only with no personal data or secrets.
- v2.6: Lightweight Docker AEGIS Coordinator POC for RSS/cache/health/notifications/audit.
- v2.7: Coordinator → direct → offline/cache failover proof.
- v3.0: Windows AEGIS client.
- v3.1: Android AEGIS client.
