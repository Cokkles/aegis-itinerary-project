# AEGIS Itinerary Project

AEGIS is the presentation and interaction layer for GEMINI-POS. The current production architecture uses the canonical HORIZON living briefing, bounded SPARK/KINETIC/SENTINEL interfaces, Google Workspace integrations, and an AUTH-1 Google Identity security boundary.

## Current security state

AEGIS AUTH-1 uses Google Identity Services plus a server-side Apps Script email allowlist. Workspace-backed reads and writes are authorized by the Apps Script backend; the frontend login screen is not treated as the security boundary.

Production backend target: `2.6.0`

Authentication behavior:

- Google OAuth Web Client ID is public configuration.
- Authorized email addresses remain private in Apps Script Script Properties.
- Browser ID token storage is session-only (`sessionStorage`).
- Private AEGIS data is transported through authenticated POST requests once enforcement is enabled.
- Direct private Apps Script GET routes fail closed under AUTH-1.
- Logout/expired identity state removes browser access to Workspace-backed UI.

See `docs/security/AEGIS-AUTH-PHASE-A1-CUTOVER.md` and `docs/security/AEGIS-AUTH-PHASE-A1-TEST-MATRIX.md` for deployment and validation requirements.

## HORIZON

HORIZON V2.5 is the canonical current briefing integration. Retired mechanisms such as `horizon_data.json`, `refreshHorizonDataFeed()`, and `pruneHorizonJsonFile()` remain prohibited as runtime authority.

## Repository authority

AEGIS code and deployment documentation belong in this repository. GEMINI-POS cross-system architecture, contracts, roadmap, and subsystem authority live in the private `Cokkles/GEMINI-POS` engineering repository.
