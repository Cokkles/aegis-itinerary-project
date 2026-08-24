/* AEGIS AQ-2.3 — Calendar model-efficiency helpers.
 * Integration candidate uses these helpers from handleAegisCalendarAiV2_.
 * Common today/tomorrow READ/CREATE/UPDATE/DELETE requests avoid Gemini.
 * Ambiguous requests use AEGIS_CALENDAR_MODEL, default gemini-3.5-flash-lite.
 */

function getAegisCalendarModelV23_() {
  var props = PropertiesService.getScriptProperties();
  return String(props.getProperty("AEGIS_CALENDAR_MODEL") || "gemini-3.5-flash-lite").trim();
}

function callAegisCalendarModelV23_(prompt) {
  var cfg = getGeminiConfig();
  var model = getAegisCalendarModelV23_();
  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { "x-goog-api-key": cfg.apiKey },
    payload: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  var body = response.getContentText();
  if (code < 200 || code >= 300) throw new Error("Gemini API HTTP " + code + " using Calendar model " + model + ": " + body);
  var json = JSON.parse(body);
  var parts = json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts;
  if (!parts || !parts.length) throw new Error("Calendar model returned no usable content using " + model + ".");
  return parts.map(function(part) { return part.text || ""; }).join("").trim();
}

function parseAegisClockV23_(raw) {
  var m = String(raw || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  var h = Number(m[1]), min = Number(m[2] || 0), ap = String(m[3] || "").toLowerCase();
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
  } else if (h > 23) return null;
  if (min < 0 || min > 59) return null;
  return { hour:h, minute:min };
}

function aegisCalendarLocalDatePartsV23_(daysFromToday) {
  return Utilities.formatDate(new Date(Date.now() + (Number(daysFromToday) || 0) * 86400000), CONFIG.TIMEZONE, "yyyy-MM-dd");
}

function aegisCalendarLocalIsoV23_(dateStr, clock) {
  var probe = new Date(dateStr + "T12:00:00Z");
  var offset = Utilities.formatDate(probe, CONFIG.TIMEZONE, "XXX");
  return dateStr + "T" + ("0" + clock.hour).slice(-2) + ":" + ("0" + clock.minute).slice(-2) + ":00" + offset;
}

function extractAegisCalendarTimesV23_(question) {
  var q = String(question || ""), out = [], re = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/ig, m;
  while ((m = re.exec(q))) {
    var c = parseAegisClockV23_(m[1]);
    if (c) out.push({ raw:m[1], hour:c.hour, minute:c.minute, index:m.index });
  }
  return out;
}

function extractAegisCalendarDurationV23_(question) {
  var m = String(question || "").toLowerCase().match(/\bfor\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/);
  if (!m) return 60;
  return /hour|hr/.test(m[2]) ? Number(m[1]) * 60 : Number(m[1]);
}

function deterministicAegisCalendarIntentV23_(question) {
  var q = String(question || "").trim();
  var op = enforceAegisCalendarOperationV21_(q, "READ");
  var dayOffset = /\btomorrow\b/i.test(q) ? 1 : (/\btoday\b/i.test(q) ? 0 : null);
  var times = extractAegisCalendarTimesV23_(q);

  if (op === "READ" && dayOffset !== null && /\b(calendar|schedule|what(?:'s| is)|anything|events?|appointments?)\b/i.test(q)) {
    var d = aegisCalendarLocalDatePartsV23_(dayOffset), next = aegisCalendarLocalDatePartsV23_(dayOffset + 1);
    return {source:"DETERMINISTIC",operation:"READ",range_start:new Date(aegisCalendarLocalIsoV23_(d,{hour:0,minute:0})).toISOString(),range_end:new Date(aegisCalendarLocalIsoV23_(next,{hour:0,minute:0})).toISOString(),target_text:"",event:{},changes:{}};
  }

  if (op === "CREATE" && dayOffset !== null && times.length >= 1) {
    var title = q.replace(/^\s*(add|create|schedule|book)\s+/i,"").replace(/\b(today|tomorrow)\b[\s\S]*$/i,"").trim();
    if (title) {
      var dateC = aegisCalendarLocalDatePartsV23_(dayOffset), start = new Date(aegisCalendarLocalIsoV23_(dateC,times[0]));
      var end = new Date(start.getTime() + extractAegisCalendarDurationV23_(q) * 60000);
      return {source:"DETERMINISTIC",operation:"CREATE",range_start:null,range_end:null,target_text:"",event:{title:title,start:start.toISOString(),end:end.toISOString(),all_day:false,location:"",description:""},changes:{}};
    }
  }

  if (op === "UPDATE" && dayOffset !== null && times.length >= 2) {
    var target = q.replace(/^\s*(move|reschedule|shift|change|modify|edit|postpone|delay|push)\s+/i,"").replace(/\b(today|tomorrow)\b[\s\S]*$/i,"").trim();
    var dateU = aegisCalendarLocalDatePartsV23_(dayOffset);
    return {source:"DETERMINISTIC",operation:"UPDATE",range_start:new Date(aegisCalendarLocalIsoV23_(dateU,{hour:0,minute:0})).toISOString(),range_end:new Date(aegisCalendarLocalIsoV23_(aegisCalendarLocalDatePartsV23_(dayOffset+1),{hour:0,minute:0})).toISOString(),target_text:target,target_start:new Date(aegisCalendarLocalIsoV23_(dateU,times[0])).toISOString(),event:{},changes:{title:null,start:new Date(aegisCalendarLocalIsoV23_(dateU,times[1])).toISOString(),end:null,location:null,description:null}};
  }

  if (op === "DELETE" && dayOffset !== null) {
    var targetD = q.replace(/^\s*(delete|remove|cancel)\s+/i,"").replace(/\b(today|tomorrow)\b[\s\S]*$/i,"").trim();
    if (targetD) {
      var dateD = aegisCalendarLocalDatePartsV23_(dayOffset);
      return {source:"DETERMINISTIC",operation:"DELETE",range_start:new Date(aegisCalendarLocalIsoV23_(dateD,{hour:0,minute:0})).toISOString(),range_end:new Date(aegisCalendarLocalIsoV23_(aegisCalendarLocalDatePartsV23_(dayOffset+1),{hour:0,minute:0})).toISOString(),target_text:targetD,event:{},changes:{}};
    }
  }
  return null;
}

function renderAegisCalendarReadDirectV23_(events) {
  if (!events.length) return "No Calendar events were found for that period.";
  return events.map(function(ev) {
    if (ev.all_day) return "* **" + ev.title + "** — All day";
    return "* **" + ev.title + "** — " + Utilities.formatDate(new Date(ev.start), CONFIG.TIMEZONE, "h:mm a");
  }).join("\n");
}

function testAegisCalendarDeterministicV23() {
  var cases = ["What is on my calendar tomorrow?","Add test appointment tomorrow at 3 PM for 30 minutes.","Move the test appointment tomorrow from 3 PM to 4 PM.","Delete the test appointment tomorrow."];
  var results = cases.map(function(q) { var parsed = deterministicAegisCalendarIntentV23_(q); return {question:q,operation:parsed && parsed.operation,uses_model:!parsed,parsed:parsed}; });
  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

function testAegisCalendarModelConfigV23() {
  var result = {calendar_model:getAegisCalendarModelV23_(),global_model:getGeminiConfig().model,isolated:getAegisCalendarModelV23_() !== getGeminiConfig().model};
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
