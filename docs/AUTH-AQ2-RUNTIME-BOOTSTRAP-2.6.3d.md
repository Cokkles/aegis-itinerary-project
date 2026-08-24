# AEGIS 2.6.3d — Direct Runtime Bootstrap

Defect: the deployed HTML still directly references legacy v2.4.1 base assets and depended on service-worker substitution to inject AQ-1/AQ-2/current compatibility modules. Browsers not controlled by the expected service worker could therefore run the legacy AQ-1 read-only dashboard.

Fix: the directly loaded `quotes-extra.js` installs `runtime-bootstrap-v2.6.3d.js`, which verifies whether AQ-2 Calendar is already present and otherwise loads the current runtime modules explicitly after page load. This makes current runtime activation independent of service-worker bundle interception.

Validation indicators:
- Ask AEGIS contains CALENDAR mode.
- Calendar mode uses preview/confirmation writes.
- legacy backend-version warning is cleared.
- Schedule Calendar panel uses AQ-2 safety bridge.
- documentElement dataset `aegisRuntime` becomes `2.6.3d` when the direct bootstrap is used.

Backend remains Apps Script 2.6.3; no backend redeploy is required.
