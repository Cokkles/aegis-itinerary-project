# AEGIS AUTH-1 — Google Identity, Session & Authorization Foundation

Status: IMPLEMENTED ON BRANCH / NOT YET CUT OVER TO PRODUCTION
Branch: `agent/aegis-auth-foundation`

## Objective

Turn AEGIS authentication from provider-neutral scaffolding into a real Google-backed identity boundary suitable for a GitHub Pages frontend and Google Apps Script backend.

## Architecture

```text
GitHub Pages AEGIS shell
        |
        v
Google Identity Services (ID token)
        |
        v
AEGIS Apps Script auth verifier
        |
        +--> client ID / audience validation
        +--> token expiry / issuer validation
        +--> verified-email validation
        +--> private allowlist validation
        +--> scope authorization
        +--> structured auth audit events
        |
        v
Protected AEGIS operations
```

## Implemented components

- `auth/aegis-auth.js`
  - Google Identity Services credential handling
  - sessionStorage-only ID token persistence
  - server-side session validation
  - scope-aware authorization helpers
  - secure POST helper
  - logout and token clearing
- `auth/aegis-auth-ui.js`
  - fail-closed login overlay
  - Google sign-in button rendering
  - authenticated user/sign-out chip
  - denied/misconfigured/error states
- `auth/aegis-auth.css`
  - isolated authentication UI styling
- `auth/auth-config.example.js`
  - public Google OAuth client ID and Apps Script URL configuration
- `apps-script/AEGIS_Auth.gs`
  - Google token verification through Google's token-info endpoint
  - exact OAuth client audience validation
  - verified-email validation
  - expiration and issuer validation
  - Script-Property-backed email allowlist
  - scope checks
  - structured audit logging
  - optional durable `Auth Events` Sheet logging

## Required Script Properties

- `AEGIS_GOOGLE_CLIENT_ID`
- `AEGIS_AUTH_ALLOWED_EMAILS`

Optional:

- `AEGIS_AUTH_SCOPES`
- `AEGIS_AUTH_AUDIT_SHEET_ID`

The allowlist must never be stored in the public GitHub Pages repository.

## Security invariants

1. A Google OAuth client ID is public configuration; client secrets are never used in the browser.
2. The frontend does not decide whether an account is authorized. Apps Script verifies the token and checks the server-side allowlist.
3. ID tokens are stored only in `sessionStorage`, not `localStorage`.
4. Backend authorization is required independently of the login overlay. Removing/hiding the overlay must never grant access.
5. Failed/expired/incorrect-audience/unverified-email/non-allowlisted credentials are rejected.
6. Auth audit events must not contain ID tokens, OAuth access tokens, passwords, Gmail bodies, Journal text, or other private payloads.
7. Existing AEGIS production must not be cut over until protected endpoint routing and frontend authenticated request wiring are complete.

## Scope model

Initial AEGIS scopes:

- `dashboard.read`
- `horizon.generate`
- `calendar.read`
- `calendar.write`
- `tasks.read`
- `tasks.write`
- `gmail.read`
- `kinetic.read`
- `sentinel.read`
- `spark.write`

These are AEGIS application authorization scopes, not Google OAuth API scopes.

## Remaining AUTH-1 cutover work

Before production activation:

1. Create a Google OAuth **Web application** client ID.
2. Add the GitHub Pages origin to Authorized JavaScript origins.
3. Set `AEGIS_GOOGLE_CLIENT_ID` and `AEGIS_AUTH_ALLOWED_EMAILS` in Apps Script Script Properties.
4. Add `AEGIS_Auth.gs` to the deployed Apps Script project.
5. Add auth action handling to `Code.gs` before all protected operations.
6. Route sensitive AEGIS reads through authenticated POST requests so private GET endpoints are not bypassable.
7. Wire `index.html` to load Google Identity Services, auth config, auth client/UI, and auth CSS.
8. Do not bootstrap private dashboard data until authentication is `AUTHENTICATED`.
9. Validate unauthorized, wrong-account, expired-token, logout, refresh, and authorized-account cases.
10. Only then merge/cut over the auth branch.

## Audit history foundation

`AEGIS_Auth.gs` emits structured events including:

- `LOGIN_SUCCESS`
- `LOGIN_FAILURE`
- `SESSION_VALIDATED`
- `LOGOUT`
- `AUTHORIZATION_DENIED`

If `AEGIS_AUTH_AUDIT_SHEET_ID` is configured, those events are appended to an `Auth Events` worksheet. This is the initial storage contract for the future AEGIS Security / Login History screen.

## Current verdict

AUTH-1 identity and authorization primitives are implemented. Production enforcement remains intentionally gated until authenticated routing is wired end-to-end.
