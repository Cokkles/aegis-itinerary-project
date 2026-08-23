# AEGIS AUTH-1 — Identity, Session & Authorization Cutover

Status: ENFORCEMENT ENABLED / FRONTEND CUTOVER IN PROGRESS
Date: 2026-08-23
Backend: Apps Script 2.6.0
Auth: Google Identity Services + server-side allowlist

## Production state

- `AEGIS_GOOGLE_CLIENT_ID` configured in Apps Script Script Properties.
- `AEGIS_AUTH_ALLOWED_EMAILS` configured privately in Apps Script Script Properties.
- `AEGIS_AUTH_REQUIRED=true` enabled and Apps Script redeployed.
- Public `auth_config` returns Google provider, configuration present, allowlist present, AUTH-1, backend 2.6.0.
- Private Apps Script GET routes fail closed once enforcement is enabled; protected reads are POST-only.

## Frontend boundary

`aegis-core.js` is now the AUTH-1 transport boundary for the PWA:

1. Fetch public `auth_config`.
2. Hide Workspace-backed UI while authentication is unresolved.
3. Load Google Identity Services.
4. Obtain a Google ID token from the approved web OAuth client.
5. Validate that token server-side through `auth_login` / `auth_session`.
6. Store the ID token in `sessionStorage` only.
7. Translate legacy private GET calls into authenticated POST actions.
8. Attach `auth_token` to all protected AEGIS POST operations.
9. Clear the browser session on logout or rejected/expired identity state.

The allowlist never enters GitHub or browser configuration.

## Protected read mapping

- `getHorizonData` / `getSummary` -> `get_dashboard`
- `getIntelligence` -> `get_intelligence`
- `capabilities` -> `get_capabilities`
- `getNotifications` -> `get_notifications`
- `getRecentFinance` -> `get_recent_finance`
- `health` -> `get_health`
- `getLatestHorizonBriefing` -> `get_latest_horizon`

`auth_config` and non-Workspace reverse geocoding remain public.

## PWA cache migration

Service worker cache rotated to `aegis-dashboard-v2.6.0-auth1`. Apps Script and Google Identity traffic are never service-worker cached. Old PWA asset caches are deleted on activation.

An installed client may require one additional reload while the new worker activates and claims the page. A hard refresh is the fastest validation path.

## Required validation

1. Open the GitHub Pages AEGIS URL in a fresh/private browser session.
2. Confirm the dashboard is hidden and the AEGIS Secure Access gate appears.
3. Sign in with an allowlisted Google account.
4. Confirm dashboard, Calendar, Tasks, HORIZON, finance, intelligence, notifications and health load normally.
5. Confirm Calendar event resolution/create works under authenticated POST.
6. Confirm HORIZON generation works under `horizon.generate` scope.
7. Sign out and confirm Workspace data disappears and page returns to login gate.
8. Attempt a direct private Apps Script GET and confirm `AEGIS_AUTH_REQUIRED`.
9. Attempt a non-allowlisted Google account and confirm denial.
10. Confirm invalid/expired identity state cannot continue using private endpoints.

## Remaining AUTH-1 work

- Remove temporary frontend/backend presentation text still referring to v2.4 where appropriate.
- Add first-class login/session history UI from structured auth audit events.
- Sync the exact deployed full Apps Script 2.6.0 source back to canonical repository `Code.gs` after final validation.

## Rollback

If the authenticated frontend cannot bootstrap, temporarily set `AEGIS_AUTH_REQUIRED=false` and redeploy the current 2.6.0 Apps Script version. Do not roll back to a pre-HORIZON-V2.5 backend and do not reactivate retired JSON paths.
