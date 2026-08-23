# AEGIS Authentication Foundation — Phase A0

Status: IMPLEMENTATION FOUNDATION / NOT YET PRODUCTION-ENFORCED
Branch: `agent/aegis-auth-foundation`

## Objective

Introduce an authentication and authorization boundary for AEGIS without changing the current GitHub Pages deployment model or breaking existing PWA functionality.

The frontend may remain publicly reachable. Private GPOS data and consequential operations must ultimately require a validated authenticated session at the backend/API boundary.

## Phase A0 scope

This phase establishes:

- provider-agnostic authentication client scaffolding;
- login/logout/session UX contract;
- protected-route capability metadata;
- backend session contract;
- authentication audit-event model;
- explicit feature gating so current production behavior is unchanged until backend validation exists.

This phase does **not** claim that browser-only UI gating is security.

## Target architecture

```text
GitHub Pages / AEGIS PWA
        |
        v
Authentication Client
        |
        v
Identity Provider / Auth Backend
        |
        v
Server-validated Session
        |
        v
Authorization Policy
        |
        +--> GPOS Query Gateway
        +--> Calendar Gateway
        +--> Mail Gateway
        +--> SPARK / Journal
        +--> SENTINEL / Finance
```

## Non-negotiable invariants

1. No reusable backend secret or API credential may be embedded in the public AEGIS repository or browser bundle.
2. A frontend login overlay is not an authorization boundary.
3. Every sensitive backend route must independently validate the session and authorization scope.
4. Authentication answers who the caller is; authorization determines what the caller may do.
5. The initial model may be single-user with an explicit server-side identity allowlist.
6. Login/session history must be designed as an append-oriented audit stream.
7. Current AEGIS behavior remains unchanged until the authentication backend is configured and the feature gate is deliberately enabled.

## Initial session contract

The AEGIS client expects a future backend session endpoint to return a bounded payload similar to:

```json
{
  "authenticated": true,
  "user": {
    "id": "opaque-user-id",
    "email": "user@example.com",
    "display_name": "Authorized User"
  },
  "session": {
    "id": "opaque-session-id",
    "issued_at": "2026-08-22T20:00:00-04:00",
    "expires_at": "2026-08-29T20:00:00-04:00"
  },
  "scopes": [
    "gpos.read"
  ]
}
```

The browser must not manufacture this payload and treat it as authoritative.

## Planned audit events

- `LOGIN_SUCCESS`
- `LOGIN_FAILURE`
- `SESSION_CREATED`
- `SESSION_REFRESHED`
- `SESSION_EXPIRED`
- `LOGOUT`
- `SESSION_REVOKED`
- `AUTHORIZATION_DENIED`
- `SENSITIVE_ACTION_APPROVED`
- `SENSITIVE_ACTION_REJECTED`

Never log passwords, tokens, OAuth codes, email bodies, journal text, or financial payload contents.

## Protected capability classes

### Read-sensitive

- Gmail / Mail reads
- Calendar reads
- Journal / SPARK reads
- SENTINEL financial reads
- contextual Gemini/GPOS queries

### Write-sensitive

- Calendar create/edit/delete
- Gmail send/reply/forward/archive/Trash/label changes
- task/note mutations
- journal writes
- system administration

Write-sensitive actions may require a second explicit confirmation even after authentication.

## Phase A0 exit criteria

- Auth client scaffold present.
- Auth styling/login shell present.
- Backend contract documented.
- Feature gate defaults OFF.
- No credentials committed.
- Existing AEGIS remains functional when auth is disabled.
- GPOS repository receives a corresponding work-log entry.

## Next phase

Phase A1 should select/configure the identity provider and backend verifier, implement server-side allowlisting, establish real session validation, and protect one harmless test endpoint before any Gmail/Calendar mutation routes are placed behind authentication.
