/* ============================================================
   AQ-2 — CONVERSATIONAL CALENDAR CONTROL
   ============================================================ */

function clipAegisCalendarTextV2_(value, maxChars) {
  var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
}

function parseAegisCalendarJsonV2_(raw) {
  var text = String(raw || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(text);
}

function serializeAegisCalendarEventV2_(ev) {
  return { id: ev.getId(), title: ev.getTitle(), start: ev.getStartTime().toISOString(), end: ev.getEndTime().toISOString(), all_day: ev.isAllDayEvent(), location: ev.getLocation() || "", description: clipAegisCalendarTextV2_(ev.getDescription() || "", 1200) };
}

function resolveAegisCalendarIntentV2_(question) {
  var now = new Date();
  var prompt =
    "You are the intent parser for AEGIS AQ-2 Calendar. Current local datetime: " + Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX") + " in " + CONFIG.TIMEZONE + ".\n" +
    "Classify the user request as READ, CREATE, UPDATE, or DELETE.\n" +
    "Return ONLY JSON with this shape:\n" +
    '{"operation":"READ|CREATE|UPDATE|DELETE","range_start":"ISO|null","range_end":"ISO|null","target_text":"string","event":{"title":"string","start":"ISO|null","end":"ISO|null","all_day":false,"location":"string","description":"string"},"changes":{"title":"string|null","start":"ISO|null","end":"ISO|null","location":"string|null","description":"string|null"}}\n' +
    "Rules: READ includes schedule, availability, free time, and what-is-on-my-calendar questions. For CREATE resolve title and time; if duration is omitted use 60 minutes. For UPDATE/DELETE put identifying words in target_text and use range_start/range_end when the user names a date. Do not invent location/description. All timed ISO values must include timezone offset.\n\n" +
    "USER REQUEST: " + question;
  var obj = parseAegisCalendarJsonV2_(callGemini(prompt));
  var op = String(obj.operation || "READ").toUpperCase();
  if (["READ","CREATE","UPDATE","DELETE"].indexOf(op) < 0) op = "READ";
  obj.operation = op;
  return obj;
}

function safeAegisCalendarRangeV2_(intent, operation) {
  var now = new Date();
  var start = intent && intent.range_start ? new Date(intent.range_start) : null;
  var end = intent && intent.range_end ? new Date(intent.range_end) : null;
  if (!start || isNaN(start.getTime())) { start = new Date(now); start.setDate(start.getDate() - (operation === "READ" ? 1 : 14)); }
  if (!end || isNaN(end.getTime())) { end = new Date(now); end.setDate(end.getDate() + (operation === "READ" ? 30 : 120)); }
  var maxSpan = 180 * 24 * 60 * 60 * 1000;
  if (end <= start || end - start > maxSpan) end = new Date(start.getTime() + 60 * 24 * 60 * 60 * 1000);
  return { start: start, end: end };
}

function listAegisCalendarEventsV2_(start, end) {
  return CalendarApp.getDefaultCalendar().getEvents(start, end).slice(0, 80).map(serializeAegisCalendarEventV2_);
}

function normalizeAegisCalendarMatchV2_(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function findAegisCalendarCandidatesV2_(events, targetText) {
  var target = normalizeAegisCalendarMatchV2_(targetText);
  if (!target) return events.slice(0, 8);
  var words = target.split(" ").filter(function(x) { return x.length > 1; });
  return events.map(function(ev) {
    var title = normalizeAegisCalendarMatchV2_(ev.title);
    var score = title === target ? 100 : (title.indexOf(target) >= 0 || target.indexOf(title) >= 0 ? 60 : 0);
    words.forEach(function(w) { if (title.indexOf(w) >= 0) score += 8; });
    return { event: ev, score: score };
  }).filter(function(x) { return x.score > 0; }).sort(function(a,b) { return b.score - a.score; }).slice(0, 8).map(function(x) { return x.event; });
}

function buildAegisCalendarReadAnswerV2_(question, events, range) {
  var prompt = "You are AEGIS Calendar in READ-ONLY mode. Answer the user's calendar question using ONLY the supplied verified event list. If there are no matching events, say so. Do not claim a mutation. Use concise Markdown.\n\n" +
    "TIMEZONE: " + CONFIG.TIMEZONE + "\nRANGE: " + range.start.toISOString() + " to " + range.end.toISOString() + "\nEVENTS: " + JSON.stringify(events) + "\n\nQUESTION: " + question;
  return callGemini(prompt);
}

function validateAegisCalendarCreateV2_(eventObj) {
  eventObj = eventObj || {};
  var title = clipAegisCalendarTextV2_(eventObj.title, 300);
  if (!title) throw new Error("Calendar create intent is missing a title.");
  if (eventObj.all_day === true) {
    var d = new Date(eventObj.start);
    if (isNaN(d.getTime())) throw new Error("Calendar all-day create intent is missing a valid date.");
    return { title:title, start:d.toISOString(), end:null, all_day:true, location:clipAegisCalendarTextV2_(eventObj.location,500), description:clipAegisCalendarTextV2_(eventObj.description,2000) };
  }
  var start = new Date(eventObj.start), end = new Date(eventObj.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) throw new Error("Calendar create intent has an invalid time range.");
  return { title:title, start:start.toISOString(), end:end.toISOString(), all_day:false, location:clipAegisCalendarTextV2_(eventObj.location,500), description:clipAegisCalendarTextV2_(eventObj.description,2000) };
}

function issueAegisCalendarConfirmationV2_(userEmail, proposal) {
  var token = Utilities.getUuid();
  var expires = new Date(Date.now() + 10 * 60 * 1000);
  var payload = { token: token, user_email: String(userEmail || "").toLowerCase(), issued_at: new Date().toISOString(), expires_at: expires.toISOString(), proposal: proposal };
  CacheService.getScriptCache().put("AEGIS_CAL_V2_" + token, JSON.stringify(payload), 600);
  return payload;
}

function handleAegisCalendarAiV2_(contents, authContext) {
  var question = clipAegisCalendarTextV2_(contents && contents.question, 4000);
  if (!question) return { status:"error", code:"CALENDAR_QUERY_EMPTY", error:"A Calendar question is required." };
  var intent = resolveAegisCalendarIntentV2_(question);
  var op = intent.operation;
  var range = safeAegisCalendarRangeV2_(intent, op);
  var email = authContext && authContext.user ? authContext.user.email : "";

  if (op === "READ") {
    var readEvents = listAegisCalendarEventsV2_(range.start, range.end);
    return { status:"success", contract:"AEGIS_CALENDAR_ACTION_V2", operation:"READ", answer:buildAegisCalendarReadAnswerV2_(question, readEvents, range), mutation_performed:false, confirmation_required:false, event_count:readEvents.length };
  }

  var proposal;
  if (op === "CREATE") {
    proposal = { operation:"CREATE", event:validateAegisCalendarCreateV2_(intent.event) };
  } else {
    var events = listAegisCalendarEventsV2_(range.start, range.end);
    var candidates = findAegisCalendarCandidatesV2_(events, intent.target_text || (intent.event && intent.event.title));
    if (candidates.length !== 1) {
      return { status:"success", contract:"AEGIS_CALENDAR_ACTION_V2", operation:op, answer:candidates.length ? "I found multiple possible Calendar matches. Please identify the exact event before I make a change." : "I could not find a Calendar event matching that request. No change was made.", mutation_performed:false, confirmation_required:false, candidates:candidates };
    }
    if (op === "DELETE") {
      proposal = { operation:"DELETE", target:candidates[0] };
    } else {
      var c = intent.changes || {};
      var changes = { title: c.title == null || c.title === "" ? null : clipAegisCalendarTextV2_(c.title,300), start: c.start || null, end: c.end || null, location: c.location == null ? null : clipAegisCalendarTextV2_(c.location,500), description: c.description == null ? null : clipAegisCalendarTextV2_(c.description,2000) };
      if (changes.start || changes.end) {
        var ns = new Date(changes.start || candidates[0].start), ne = new Date(changes.end || candidates[0].end);
        if (isNaN(ns.getTime()) || isNaN(ne.getTime()) || ne <= ns) throw new Error("Calendar update resolved an invalid time range.");
        changes.start = ns.toISOString(); changes.end = ne.toISOString();
      }
      proposal = { operation:"UPDATE", target:candidates[0], changes:changes };
    }
  }

  var pending = issueAegisCalendarConfirmationV2_(email, proposal);
  return { status:"success", contract:"AEGIS_CALENDAR_ACTION_V2", operation:op, answer:"I prepared this Calendar change, but nothing has been written yet. Review the preview and confirm if it is correct.", mutation_performed:false, confirmation_required:true, confirmation_token:pending.token, expires_at:pending.expires_at, proposal:proposal };
}

function getAegisCalendarEventByIdV2_(id) {
  if (!id) return null;
  return CalendarApp.getDefaultCalendar().getEventById(id);
}

function confirmAegisCalendarMutationV2_(contents, authContext) {
  var token = String(contents && contents.confirmation_token || "").trim();
  if (!token) return { status:"error", code:"CALENDAR_CONFIRMATION_MISSING", error:"Confirmation token is required." };
  var cache = CacheService.getScriptCache();
  var key = "AEGIS_CAL_V2_" + token;
  var raw = cache.get(key);
  if (!raw) return { status:"error", code:"CALENDAR_CONFIRMATION_EXPIRED", error:"This Calendar preview expired or was already used. Please ask AEGIS to prepare it again." };
  var pending = JSON.parse(raw);
  var email = String(authContext && authContext.user && authContext.user.email || "").toLowerCase();
  if (!email || email !== pending.user_email) return { status:"error", code:"CALENDAR_CONFIRMATION_ACCOUNT_MISMATCH", error:"This Calendar preview belongs to a different authenticated account." };
  if (new Date(pending.expires_at).getTime() < Date.now()) { cache.remove(key); return { status:"error", code:"CALENDAR_CONFIRMATION_EXPIRED", error:"This Calendar preview expired. Please prepare it again." }; }

  cache.remove(key);
  var p = pending.proposal || {};
  var resultEvent;
  if (p.operation === "CREATE") {
    var ev = p.event;
    if (ev.all_day) resultEvent = CalendarApp.getDefaultCalendar().createAllDayEvent(ev.title, new Date(ev.start), { location:ev.location || "", description:ev.description || "" });
    else resultEvent = CalendarApp.getDefaultCalendar().createEvent(ev.title, new Date(ev.start), new Date(ev.end), { location:ev.location || "", description:ev.description || "" });
  } else {
    resultEvent = getAegisCalendarEventByIdV2_(p.target && p.target.id);
    if (!resultEvent) return { status:"error", code:"CALENDAR_TARGET_MISSING", error:"The target Calendar event no longer exists. No change was made." };
    if (p.operation === "DELETE") {
      var deleted = serializeAegisCalendarEventV2_(resultEvent);
      resultEvent.deleteEvent();
      return { status:"success", contract:"AEGIS_CALENDAR_ACTION_V2", operation:"DELETE", mutation_performed:true, event:deleted, answer:"Calendar event deleted." };
    }
    if (p.operation === "UPDATE") {
      var ch = p.changes || {};
      if (ch.title != null) resultEvent.setTitle(ch.title);
      if (ch.start || ch.end) resultEvent.setTime(new Date(ch.start || resultEvent.getStartTime()), new Date(ch.end || resultEvent.getEndTime()));
      if (ch.location != null) resultEvent.setLocation(ch.location);
      if (ch.description != null) resultEvent.setDescription(ch.description);
    }
  }
  return { status:"success", contract:"AEGIS_CALENDAR_ACTION_V2", operation:p.operation, mutation_performed:true, event:serializeAegisCalendarEventV2_(resultEvent), answer:"Calendar change confirmed and applied." };
}

function testAegisCalendarReadV2() {
  var result = handleAegisCalendarAiV2_({ question:"What is on my calendar tomorrow?" }, { user:{ email:"AUTH_TEST" } });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
