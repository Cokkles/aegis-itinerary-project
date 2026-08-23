# AEGIS AUTH-1 — Production Cutover Plan

Status: BACKEND CANDIDATE READY / ENFORCEMENT NOT YET ENABLED
Date: 2026-08-23
Baseline: deployed HORIZON/AEGIS backend 2.5.1
Target backend: 2.6.0 / AUTH-1

## Current configuration

The Apps Script project has been prepared with the AUTH-1 Script Properties:

- `AEGIS_GOOGLE_CLIENT_ID`
- `AEGIS_AUTH_ALLOWED_EMAILS`

The private allowlist remains server-side and must never be committed to the public repository.

## Backend candidate

A full AUTH-1 candidate was generated from the exact deployed 2.5.1 Apps Script source, not the stale historical `main/Code.gs` copy. JavaScript syntax validation passed before deployment packaging.

AUTH-1 adds:

- public `auth_config` bootstrap endpoint exposing only the non-secret Google client ID and auth status;
- Google ID-token verification through Google's token-info endpoint;
- checks for audience, issuer, expiry, verified email, and server-side allowlist;
- `auth_login`, `auth_session`, and `auth_logout` actions;
- structured application scopes;
- optional auth-event logging;
- protected POST read endpoints (`get_dashboard`, `get_intelligence`, `get_notifications`, `get_recent_finance`, `get_health`, `get_capabilities`, `get_latest_horizon`);
- server-side authorization on all existing write actions;
- private GET routes blocked once enforcement is enabled so tokens never need to appear in URLs;
- `AEGIS_AUTH_REQUIRED` feature flag for staged rollout.

## Important rollout invariant

Do **not** set `AEGIS_AUTH_REQUIRED=true` until the authenticated frontend has been deployed and validated.

The backend should first be deployed with enforcement false. Existing AEGIS continues working during this compatibility period while the auth endpoints are tested.

## Deployment sequence

1. Preserve the current Apps Script deployment/version as rollback.
2. Replace `Code.gs` with the full AUTH-1 2.6.0 candidate generated from the deployed 2.5.1 baseline.
3. Confirm Script Property `AEGIS_AUTH_REQUIRED` is absent or explicitly `false`.
4. Save and deploy a new version using the existing Web App deployment/URL.
5. Verify `?action=auth_config` returns `configured:true`, `allowlist_configured:true`, `enforcement_required:false`, and backend `2.6.0`.
6. Validate `auth_login` and `auth_session` with the approved Google account.
7. Validate a non-allowlisted account is denied.
8. Deploy the auth-gated GitHub Pages frontend.
9. Confirm authenticated dashboard reads/writes operate through protected POST actions.
10. Set `AEGIS_AUTH_REQUIRED=true` only after the frontend passes.
11. Re-test unauthorized GET/POST, approved login, expired/invalid token, logout, Calendar write, HORIZON generation, Tasks update, and SPARK/KINETIC dispatch.
12. Mark AUTH-1 complete only after all security gates pass.

## Security invariants

- Google client ID is public configuration, not a secret.
- Email allowlist stays only in Script Properties.
- ID tokens are kept in browser `sessionStorage`, not persistent local storage.
- Auth tokens are sent only in POST request bodies, never URL query parameters.
- Backend authorization is authoritative; the frontend login overlay alone is never considered a security boundary.
- Existing HORIZON V2.5/2.5.1 legacy retirement and bounded-domain behavior must remain intact.

## Rollback

Rollback to the immediately prior 2.5.1 Apps Script deployment if AUTH-1 staging causes regressions. Do not restore any retired HORIZON JSON behavior during rollback.
