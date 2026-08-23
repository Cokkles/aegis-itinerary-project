# AQ-2.1 — Calendar Intent Guardrail

## Defect
During production validation, a request to **move** an existing test appointment was classified by the Gemini intent parser as `CREATE`. After user confirmation, AQ-2 therefore created a duplicate event rather than updating the original.

## Root cause
AQ-2 treated the model-returned `operation` (`READ|CREATE|UPDATE|DELETE`) as authoritative. Confirmation protected the write itself, but did not independently validate mutation class.

## Remediation
Introduce a deterministic lexical mutation guardrail before proposal construction:

- Update verbs (`move`, `reschedule`, `shift`, `change`, `modify`, `edit`, `postpone`, `delay`, `push`, `move up`, `move back`, `bring forward`) force `UPDATE` unless the request explicitly asks to create/add a new event.
- Delete verbs (`delete`, `remove`, `cancel`) force `DELETE` when referring to an existing calendar event.
- Create verbs (`add`, `create`, `schedule`, `book`, `put ... on my calendar`) may produce `CREATE` only when no update/delete intent is present.
- Read-only questions remain `READ`.

Gemini continues to resolve natural-language dates, target text, and proposed field changes, but it is no longer the sole authority for mutation class.

## Safety invariant
A request that linguistically refers to modifying an existing event must never silently degrade into a CREATE operation. Ambiguous targets continue to fail closed without mutation.

## Validation
Production re-test should use:

1. `Add a test appointment tomorrow at 3 PM for 30 minutes.` -> CREATE preview.
2. `Move the test appointment tomorrow from 3 PM to 4 PM.` -> UPDATE preview targeting the existing event.
3. Confirm UPDATE -> original event moves; no duplicate is created.
4. `Delete the test appointment tomorrow.` -> DELETE preview.
