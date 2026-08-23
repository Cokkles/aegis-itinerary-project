# AEGIS AUTH-1 — Security Validation Matrix

AUTH-1 is not complete until each production gate below is verified.

| Gate | Expected result |
|---|---|
| Public `auth_config` | Returns Google provider, configured client ID, allowlist configured, AUTH-1, backend 2.6.0. |
| Unauthenticated private GET | Returns `AEGIS_AUTH_REQUIRED`; no Workspace data. |
| Fresh PWA session | Workspace UI hidden behind AEGIS Secure Access. |
| Approved Google account | `auth_login` succeeds and dashboard unlocks. |
| Non-allowlisted Google account | Backend denies authorization. |
| Reload during valid token lifetime | `auth_session` revalidates session and restores dashboard. |
| Logout | Backend logs logout; browser session token removed; private UI locks again. |
| Expired/invalid token | Backend rejects; client removes token and requires sign-in. |
| Dashboard | `get_dashboard` works only through authenticated POST. |
| HORIZON | `get_latest_horizon` and `horizon_sync` remain functional with auth. |
| Calendar read/resolve | Requires valid token and calendar scope. |
| Calendar create | Requires `calendar.write`; unauthorized request denied. |
| Tasks read/write | Authenticated dashboard + `mark_done` operate normally. |
| Finance | Authenticated `get_recent_finance` works; no public private-GET fallback. |
| Intelligence | Authenticated `get_intelligence` works. |
| Notifications / health / capabilities | Authenticated protected POST works. |
| SPARK/KINETIC/notes dispatch | Existing writes continue through server authorization. |
| PWA cache | Old cache rotated; authenticated core eventually controls installed PWA. |
| Legacy HORIZON JSON | Remains blocked throughout AUTH-1. |

## Current verified gates

- Apps Script 2.6.0 staging deployment succeeded.
- `auth_config`: PASS.
- Google client configured: PASS.
- Private allowlist configured: PASS.
- `AEGIS_AUTH_REQUIRED=true`: ENABLED.
- AUTH-1 frontend secure transport: IMPLEMENTED / awaiting production browser validation.
- PWA cache rotation: IMPLEMENTED / awaiting production browser validation.

## Emergency rollback

If the frontend cannot establish authentication, set `AEGIS_AUTH_REQUIRED=false` and redeploy the existing 2.6.0 backend. This is the only approved temporary compatibility rollback for AUTH-1 testing.
