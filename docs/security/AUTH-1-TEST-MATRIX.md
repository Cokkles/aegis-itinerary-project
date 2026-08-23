# AUTH-1 Test Matrix

Required before enabling enforcement:

| Test | Expected |
|---|---|
| `auth_config` | configured=true, allowlist_configured=true, enforcement_required=false during staging |
| Approved Google login | authenticated=true |
| Approved session revalidation | authenticated=true |
| Non-allowlisted account | denied |
| Missing token to protected POST with enforcement=true | AEGIS_AUTH_REQUIRED / denied |
| Invalid token | denied |
| Expired token | denied |
| Logout | authenticated=false; browser session token removed |
| Dashboard read | works only for approved session once enforcement=true |
| HORIZON generation | authorized `horizon.generate` only |
| Calendar resolve | authorized `calendar.read` only |
| Calendar create | authorized `calendar.write` only |
| Task completion | authorized `tasks.write` only |
| Journal/note/vent | authorized `spark.write` only |
| KINETIC dispatch | authorized KINETIC scope only |
| SENTINEL read/write paths | authorized SENTINEL scope only |
| Legacy private GET after enforcement | denied |
| Reverse geocode | remains public/non-sensitive |
| HORIZON V2.5 regression | bounded KINETIC/SPARK, no legacy JSON, Gmail time-bounded, SENTINEL/PRISM isolation preserved |
