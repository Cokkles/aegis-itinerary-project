# AUTH-1 Status

Current state: integration branch rebuilt from current `main` after HORIZON V2.5 merge.

- Google OAuth client configuration: prepared in Apps Script.
- Server-side allowlist: prepared in Apps Script Script Properties.
- Full backend AUTH-1 candidate: generated from deployed backend 2.5.1 and syntax-validated.
- Production enforcement: OFF pending staged deployment and frontend cutover.
- Legacy `agent/aegis-auth-foundation` branch/PR: superseded because it diverged before HORIZON V2.5 was merged.

Next gate: deploy backend candidate with `AEGIS_AUTH_REQUIRED=false`, validate auth endpoints, then deploy authenticated frontend and enable enforcement.
