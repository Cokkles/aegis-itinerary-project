# AEGIS AUTH-1 — Google Identity, Session & Authorization Foundation

Status: **IMPLEMENTATION IN PROGRESS — PRODUCTION ENFORCEMENT NOT YET ENABLED**

## Identity provider

Provider: Google Identity Services (GIS)

Public Web Client ID configured for AEGIS:

`441009275873-qnf9c9n1o3l9tl9c76t2821hm8tectfl.apps.googleusercontent.com`

Authorized JavaScript origin expected:

`https://cokkles.github.io`

The client ID is public configuration and is safe to ship in the GitHub Pages application. OAuth client secrets, account allowlists, API keys, refresh tokens, and private security data must never be committed to this repository.

## Required Apps Script Script Properties

Before testing the server-side boundary, configure:

- `AEGIS_GOOGLE_CLIENT_ID` = the configured GIS Web Client ID
- `AEGIS_AUTH_ALLOWED_EMAILS` = comma-separated private allowlist
- `AEGIS_AUTH_REQUIRED` = `false` during installation and non-disruptive validation

Optional:

- `AEGIS_AUTH_SCOPES`
- `AEGIS_AUTH_AUDIT_SHEET_ID`

Only after authorized and unauthorized flows have both been validated should `AEGIS_AUTH_REQUIRED` be switched to `true`.

## Implemented components

### Browser

- Google GIS credential callback
- sessionStorage-only ID-token retention
- backend revalidation using `auth_session`
- fail-closed auth UI primitives
- sign-out handling
- scope-aware secure POST helper
- public runtime configuration separated from private server configuration

### Apps Script

- Google ID-token validation using Google tokeninfo
- audience validation against `AEGIS_GOOGLE_CLIENT_ID`
- issuer and expiry validation
- verified-email requirement
- private `AEGIS_AUTH_ALLOWED_EMAILS` enforcement
- application-scope authorization
- `AEGIS_AUTH_REQUIRED` feature gate
- structured authentication/audit events
- optional durable Auth Events Sheet sink

## Security invariants

1. The Google OAuth client ID may be public; the allowlist must remain server-side.
2. Sensitive AEGIS operations must ultimately be authenticated server-side, not merely hidden by frontend UI.
3. Identity tokens must not be placed in query strings or localStorage.
4. Sensitive reads will migrate from unauthenticated GET routes to authenticated POST operations carrying `auth_token` in the request body.
5. The dashboard must not hydrate cached or current private state before authentication succeeds once enforcement is enabled.
6. HORIZON 2.5.1 boundaries must remain intact throughout AUTH-1 integration.
7. Retired `horizon_data.json` mechanisms may not be restored as part of authentication work.
8. Logout clears the browser token; token expiry or failed revalidation returns the UI to the authentication gate.

## Current implementation gap

The repository's checked-in root `Code.gs` was discovered to lag the validated 2.5.1 production Apps Script runtime. AUTH-1 backend routing must therefore be integrated against the authoritative 2.5.1 production source, not the stale pre-cutover repository copy. This reconciliation is a mandatory pre-cutover gate.

## Required cutover sequence

1. Set the Script Properties above with `AEGIS_AUTH_REQUIRED=false`.
2. Add `apps-script/AEGIS_Auth.gs` to the same Apps Script project as the 2.5.1 `Code.gs`.
3. Integrate the auth action/router hooks into the authoritative 2.5.1 runtime.
4. Convert sensitive frontend reads to `AEGIS_AUTH.securePost(...)`.
5. Gate dashboard bootstrap until `AEGIS_AUTH.refresh()` returns authenticated.
6. Validate allowlisted login.
7. Validate non-allowlisted denial.
8. Validate expired/invalid token denial.
9. Validate logout and reload behavior.
10. Validate HORIZON, Calendar, Tasks, Gmail, KINETIC, SENTINEL-FIN, and SPARK actions through authenticated requests.
11. Confirm public health/reverse-geocode endpoints reveal no private state.
12. Set `AEGIS_AUTH_REQUIRED=true` only after all tests pass.
13. Deploy the new Apps Script version and authenticated GitHub Pages frontend together.

## Exit criteria

AUTH-1 is complete only when direct unauthenticated calls cannot access or mutate private AEGIS/GPOS state, while the approved Google account can perform the currently supported operations normally.
