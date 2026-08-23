# AEGIS AQ-1 — Authenticated AI Query Gateway

Status: IMPLEMENTED ON BRANCH / BACKEND DEPLOYMENT REQUIRED
Date: 2026-08-23
Frontend target: AEGIS 2.6.1
Backend target: Apps Script 2.6.1
Contract: `AEGIS_AI_QUERY_V1`

## Objective

AQ-1 adds an authenticated conversational query surface to AEGIS using the existing backend-only Gemini API configuration. It provides short-term conversational continuity without creating a new durable memory store and without exposing the Gemini API key to the browser.

AQ-1 is deliberately **read-only**. It cannot create, update, delete, send, schedule, purchase, invest, archive, label, complete, or otherwise mutate canonical GPOS state.

## Security boundary

All `ai_query` requests:

1. travel through the existing AUTH-1 protected POST transport;
2. require the `ai.query` application scope;
3. include the Google ID token only through the existing AUTH-1 request wrapper;
4. are authorized server-side before Gemini is called;
5. never expose `GEMINI_API_KEY` to GitHub Pages or browser JavaScript.

## Conversation memory

AQ-1 uses browser `sessionStorage` only.

- Each context mode has an independent transcript.
- The browser sends at most the last 8 user/assistant messages.
- The server clips each history item before prompting Gemini.
- No transcript is written to Google Docs, Sheets, Tasks, Gmail, Calendar, or Script Properties.
- Closing the browser session clears the intended memory lifecycle.
- The response contract explicitly reports `durable_memory_written: false`.

This solves the original one-prompt continuity limitation without pretending that AEGIS has long-term chat memory.

## Context modes

### General

Bounded sources:
- current Google Calendar today/tomorrow;
- current Google Tasks;
- `ACTIVE_NOTE_FILTER` candidates;
- `SPARK_TO_HORIZON_V2` bounded state;
- `KINETIC_TO_HORIZON_V2` display state.

No prior HORIZON briefing is treated as factual evidence.

### Career

Bounded sources:
- current Calendar;
- current Tasks;
- active Notes candidates;
- bounded SPARK state.

Policy:
- act as a career/technical-career mentor;
- do not invent employment history, credentials, strengths, or goals;
- clearly separate source-supported facts, user-stated preferences, inference, and recommendations.

This is an interim career-advisor surface. A future dedicated Career module may provide richer canonical career state.

### Finance

Bounded source:
- `SENTINEL_FIN_TO_HORIZON_V25` only.

PRISM internals and raw financial ingestion state are not exposed to AQ-1. The assistant may analyze and recommend but cannot execute transactions.

### Logistics

Bounded sources:
- current Calendar;
- current Tasks;
- Gmail metadata from the existing seven-day bounded query.

Only Gmail metadata is supplied: subject, sender, date, important/starred state. AQ-1 must not claim to have read message bodies.

### System

Bounded sources:
- AEGIS capabilities;
- AEGIS health telemetry.

No personal journal, finance, nutrition, or mail context is supplied in System mode.

## Backend contract

Request:

```json
{
  "action": "ai_query",
  "mode": "career",
  "question": "What should I focus on next for career growth?",
  "history": [
    {"role": "user", "text": "..."},
    {"role": "assistant", "text": "..."}
  ],
  "auth_token": "<AUTH-1 supplied automatically>"
}
```

Response:

```json
{
  "status": "success",
  "contract": "AEGIS_AI_QUERY_V1",
  "generated_at": "...",
  "request_id": "...",
  "mode": "career",
  "answer": "...",
  "model": "...",
  "mutation_performed": false,
  "memory": {
    "type": "CLIENT_SESSION_ONLY",
    "history_messages_used": 2,
    "durable_memory_written": false
  },
  "context_sources": [
    {"key": "calendar", "source": "GOOGLE_CALENDAR", "status": "AVAILABLE"}
  ]
}
```

## Apps Script integration requirements

The authoritative AQ-1 module is stored at:

`apps-script/ai-query-gateway-v1.gs`

The deployed `Code.gs` integration additionally requires:

- add `ai.query` to the default AUTH-1 scope list;
- map `action === "ai_query"` to scope `ai.query`;
- route authorized `ai_query` requests to `handleAegisAiQueryV1_(contents)`;
- expose `ai_query_v1: true` in capabilities;
- advance backend presentation version to 2.6.1.

A complete deployment candidate was generated from the exact validated AUTH-1 production source, not the stale historical repository `Code.gs` mirror.

Candidate SHA-256:

`b71543215d361431d5e0a9b55a2a876619f357e3f29d5f7f2140af271297dd1c`

## Frontend

The existing post-load compatibility layer injects an `Ask AEGIS` navigation item and query view. It does not require changes to the stable AUTH-1 transport implementation.

Features:
- General / Career / Finance / Logistics / System modes;
- separate short-term transcript per mode;
- Enter to send, Shift+Enter for newline;
- explicit Clear Session control;
- no transcript persistence beyond session storage;
- source-status toast after successful responses;
- muted UI matching AEGIS visual identity.

## Deployment order

Because the old production backend does not understand `ai_query`, the frontend must **not** be merged to production before the 2.6.1 backend is deployed.

Required sequence:

1. Preserve current Apps Script 2.6.0 deployment as rollback.
2. Replace deployed `Code.gs` with the AQ-1 2.6.1 candidate.
3. Save.
4. Run `testAegisAiQueryV1()` manually.
5. Confirm Gemini response and `mutation_performed: false`.
6. Update existing Web App deployment to a new version while retaining the same `/exec` URL.
7. Confirm `?action=auth_config` reports backend 2.6.1.
8. Confirm `get_capabilities` reports `ai_query_v1: true` through an authenticated AEGIS session.
9. Merge/publish the AQ-1 frontend branch.
10. Validate all five modes in the browser.

## Validation matrix

Required PASS cases:

- authenticated General query returns an answer;
- Career mode does not fabricate unavailable career history;
- Finance mode consumes SENTINEL-FIN bounded summary only;
- Logistics mode does not claim email-body access;
- System mode reports current runtime state only;
- second message in a mode receives the prior short session transcript;
- switching modes does not mix transcripts;
- Clear Session removes that mode's transcript;
- unauthorized request is denied by AUTH-1;
- malformed/empty question is rejected;
- invalid mode falls back to General;
- response reports `mutation_performed: false`;
- no Google Workspace state changes occur from AQ-1 execution.

## Deferred to later phases

AQ-1 intentionally does not implement:

- Calendar mutation through chat;
- Gmail archive/label/send;
- Google Tasks mutation through chat;
- durable conversation memory;
- automatic task extraction;
- investment execution;
- persistent career-profile inference.

Those should be added only through explicit command/tool contracts with confirmation and authorization policies.
