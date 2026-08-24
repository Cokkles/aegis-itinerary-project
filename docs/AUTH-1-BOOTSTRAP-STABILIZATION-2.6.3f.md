# AEGIS 2.6.3f — AUTH-1 Bootstrap Stabilization

## Root cause

AUTH-1 backend behavior was validated independently with `auth-diagnostic.html`: `auth_config`, Google Identity Services, `auth_login`, token storage, scopes, and backend 2.6.3 all succeeded. The production failure was therefore isolated to the dashboard frontend bootstrap.

The legacy `aegis-core.js` used a single unresolved `authReady` promise and exposed only a generic `Initializing secure session…` state. When the normal bootstrap path failed to reach a terminal branch, protected dashboard requests could wait indefinitely.

## Stabilization

AEGIS 2.6.3f introduces a deterministic frontend auth state machine:

- BOOT
- CONFIG_LOADING
- CONFIG_READY
- SESSION_CHECK
- SIGN_IN_LOADING
- SIGN_IN_REQUIRED
- LOGIN_VERIFY
- AUTHENTICATED
- AUTH_BYPASSED
- SESSION_EXPIRED
- AUTH_FAILED

Network stages are bounded by explicit timeouts and failures expose a Retry authentication control rather than leaving an indefinite initialization state.

## Compatibility

The replacement core preserves the public `AEGIS.Core` API used by the existing dashboard: `BUILD`, `save`, `load`, `setState`, `getStates`, `fetchJson`, `provider`, and `Auth`.

Because the current legacy `index.html` loads `quotes-extra.js` before `aegis-core.js`, `quotes-extra.js` now synchronously installs `aegis-core-v2.6.3f.js` and locks `AEGIS.Core` before the legacy core can overwrite it. Current AQ-1/AQ-2 modules continue to load independently of service-worker response substitution.

## Backend impact

None. Apps Script backend remains 2.6.3 and AUTH-1 semantics are unchanged.

## Production validation

Expected first-load behavior is now visibly terminal:

1. `CONFIG_LOADING` then `CONFIG_READY`.
2. Existing valid token: `SESSION_CHECK` -> `AUTHENTICATED`.
3. No token: `SIGN_IN_LOADING` -> `SIGN_IN_REQUIRED` with Google button.
4. Successful sign-in: `LOGIN_VERIFY` -> `AUTHENTICATED`.
5. Any failure: `AUTH_FAILED` with a concrete error and Retry authentication button.

After authentication, verify the current runtime exposes Calendar mode and AQ-2 preview/confirm semantics before resuming Calendar mutation validation.
