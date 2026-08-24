# AEGIS HTML Runtime Manifest — 2.6.3h

## Root cause

Production `index.html` remained a legacy 2.4.1 runtime manifest. It requested all primary assets using `?v=2.4.1`, labeled the navigation as AEGIS v2.4.1, and depended on later JavaScript/service-worker bootstrap layers to upgrade the page at runtime.

This allowed normal browser HTTP caching to intermittently serve legacy core/runtime assets even after service-worker CacheStorage was cleared.

## Correction

- `index.html` is now the authoritative runtime manifest.
- Primary runtime assets use the 2.6.3h cache-busting generation.
- AQ-1/AQ-2, compatibility, Calendar safety, and model-routing modules are loaded explicitly by HTML.
- Runtime feature delivery no longer depends on service-worker response substitution or `quotes-extra.js` secretly upgrading a legacy page.
- `aegis-core.js` remains the single AUTH-1 core.

## Invariant

A normal network page load must deterministically request the current runtime generation directly from `index.html`.

Backend remains Apps Script 2.6.3. No Apps Script redeployment is required.
