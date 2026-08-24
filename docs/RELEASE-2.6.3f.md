# AEGIS 2.6.3f

Frontend-only AUTH-1 stabilization release.

- deterministic auth state machine
- bounded auth_config/auth_session/auth_login/GIS stages
- explicit terminal error and Retry authentication path
- authoritative current core bootstrapped before legacy core
- existing Apps Script backend 2.6.3 unchanged
- AQ-2 runtime remains service-worker-independent
