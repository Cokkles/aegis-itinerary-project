# AUTH-1 Dual-Core Race Fix — 2.6.3g

## Root cause

The 2.6.3f preloader installed and locked a deterministic `AEGIS.Core` before the legacy `aegis-core.js` script loaded. However, JavaScript still evaluates the entire right-hand side of an assignment before attempting the assignment itself. Therefore the legacy file executed its IIFE, created a second auth state object, and scheduled its own `bootstrapAuth()` even though its final `AEGIS.Core = ...` assignment could not replace the locked Core.

Result: two AUTH-1 bootstrap state machines raced against the same authentication gate and status elements. Production could visibly stall at CONFIG_LOADING despite standalone auth diagnostics proving `auth_config`, GIS, and `auth_login` were healthy.

## Correction

- `aegis-core.js` is now the single authoritative deterministic AUTH-1 core.
- The preloader no longer injects or locks a second Core implementation.
- The duplicate `aegis-core-v2.6.3f.js` remains only as historical/reference implementation and is not part of the active boot path.
- Current feature modules still load after the page base runtime.

## Invariant

Exactly one `bootstrapAuth()` may be scheduled per dashboard page load.

No Apps Script changes are required. Backend remains 2.6.3.
