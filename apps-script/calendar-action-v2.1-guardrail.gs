/* AQ-2.1 deterministic mutation-class guardrail.
 * Integrate by replacing `var op = intent.operation;` in handleAegisCalendarAiV2_
 * with:
 *   var op = enforceAegisCalendarOperationV21_(question, intent.operation);
 *   intent.operation = op;
 */

function enforceAegisCalendarOperationV21_(question, modelOperation) {
  var q = String(question || "").toLowerCase().replace(/\s+/g, " ").trim();
  var op = String(modelOperation || "READ").toUpperCase();

  if (/\b(delete|remove|cancel)\b/.test(q)) {
    return "DELETE";
  }

  if (/\b(move|reschedule|shift|change|modify|edit|postpone|delay|push)\b/.test(q) ||
      /\b(move up|move back|bring forward)\b/.test(q)) {
    return "UPDATE";
  }

  if (/\b(add|create|schedule|book)\b/.test(q) ||
      /\bput\b.*\bon my calendar\b/.test(q)) {
    return "CREATE";
  }

  return ["READ", "CREATE", "UPDATE", "DELETE"].indexOf(op) >= 0 ? op : "READ";
}

function testAegisCalendarOperationGuardV21() {
  var cases = [
    { q: "Add a test appointment tomorrow at 3 PM for 30 minutes.", expected: "CREATE" },
    { q: "Move the test appointment tomorrow from 3 PM to 4 PM.", expected: "UPDATE" },
    { q: "Reschedule my dentist appointment to Friday at 2 PM.", expected: "UPDATE" },
    { q: "Delete the test appointment tomorrow.", expected: "DELETE" },
    { q: "What is on my calendar tomorrow?", expected: "READ" }
  ];
  var results = cases.map(function(c) {
    var modelGuess = c.expected === "READ" ? "READ" : "CREATE";
    var actual = enforceAegisCalendarOperationV21_(c.q, modelGuess);
    return { question: c.q, expected: c.expected, actual: actual, pass: actual === c.expected };
  });
  Logger.log(JSON.stringify(results, null, 2));
  return results;
}
