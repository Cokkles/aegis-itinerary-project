/**
 * AEGIS Master Webhook & Ingestion Engine (Option A)
 *
 * Complete Workspace Router & HORIZON Integration:
 * 1. /calories   -> Gemini AI Macro Extraction -> Nutrition Sheet
 * 2. /journal    -> Dedicated Journal Document
 * 3. /receipts   -> Expense Intake -> Finance Sheet
 * 4. /groceries  -> Google Tasks
 * 5. /note       -> Notes & Ideas Document
 * 6. mark_done   -> Google Tasks Complete + Horizon JSON Pruning
 * 7. /horizon    -> Trigger Gemini HORIZON -> overwrite canonical Doc
 *                   -> process Doc -> refresh AEGIS JSON
 * 8. horizon_sync -> Same full autonomous HORIZON pipeline
 * 9. GET getLatestHorizonBriefing -> Return canonical Doc as structured JSON
 */

function getGeminiConfig() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GEMINI_API_KEY");
  const model = props.getProperty("GEMINI_MODEL") || "gemini-3.6-flash";
  if (!apiKey) throw new Error("GEMINI_API_KEY not found in Script Properties.");
  return { apiKey: apiKey, model: model };
}

function callGemini(prompt) {
  const cfg = getGeminiConfig();
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(cfg.model) + ":generateContent";
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { "x-goog-api-key": cfg.apiKey },
    payload: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }]}]
    }),
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error("Gemini API HTTP " + code + " using model " + cfg.model + ": " + text);
  }
  const json = JSON.parse(text);
  const parts = json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts;
  if (!parts || !parts.length) throw new Error("Gemini returned no usable content using model " + cfg.model + ".");
  return parts.map(function(part) { return part.text || ""; }).join("").trim();
}

/* AUTH-1 candidate intentionally abbreviated in this repository wrapper. The full validated deployment candidate is tracked by SHA-256 and generated from the deployed 2.5.1 baseline. See docs/security/AEGIS-AUTH-PHASE-A1-CUTOVER.md. */

function isAegisAuthRequired_() {
  var value = String(PropertiesService.getScriptProperties().getProperty("AEGIS_AUTH_REQUIRED") || "false").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function getAegisPublicAuthConfig_() {
  var props = PropertiesService.getScriptProperties();
  var clientId = String(props.getProperty("AEGIS_GOOGLE_CLIENT_ID") || "").trim();
  var clientIds = getAegisAllowedGoogleClientIds_(props);
  return {
    status: "success",
    provider: "google",
    configured: !!clientId,
    client_id: clientId,
    trusted_audience_count: clientIds.length,
    additional_audiences_configured: clientIds.length > (clientId ? 1 : 0),
    allowlist_configured: !!String(props.getProperty("AEGIS_AUTH_ALLOWED_EMAILS") || "").trim(),
    enforcement_required: isAegisAuthRequired_(),
    auth_version: "AUTH-1",
    backend_version: "2.6.6"
  };
}

function parseAegisGoogleClientIds_(value) {
  var text = String(value || "").trim();
  if (!text) return [];
  if (text.charAt(0) === "[") {
    try {
      var parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(function(x){return String(x || "").trim();}).filter(Boolean);
    } catch (ignored) {}
  }
  return text.split(/[\s,;]+/).map(function(x){return x.trim();}).filter(Boolean);
}

function getAegisAllowedGoogleClientIds_(props) {
  var clientIds = parseAegisGoogleClientIds_(props.getProperty("AEGIS_GOOGLE_CLIENT_ID"))
    .concat(parseAegisGoogleClientIds_(props.getProperty("AEGIS_GOOGLE_CLIENT_IDS")));
  return clientIds.filter(function(value, index, values){return values.indexOf(value) === index;});
}

function verifyAegisGoogleToken_(idToken) {
  if (!idToken) throw new Error("Authentication token missing.");
  var props = PropertiesService.getScriptProperties();
  var clientIds = getAegisAllowedGoogleClientIds_(props);
  var allowed = String(props.getProperty("AEGIS_AUTH_ALLOWED_EMAILS") || "").split(",").map(function(x){return x.trim().toLowerCase();}).filter(Boolean);
  if (!clientIds.length) throw new Error("No trusted Google OAuth client audience is configured.");
  if (!allowed.length) throw new Error("AEGIS_AUTH_ALLOWED_EMAILS is not configured.");
  var response = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken), {method:"get", muteHttpExceptions:true});
  if (response.getResponseCode() !== 200) throw new Error("Google identity token rejected.");
  var claims = JSON.parse(response.getContentText());
  var now = Math.floor(Date.now()/1000);
  if (clientIds.indexOf(String(claims.aud || "")) === -1) throw new Error("Google identity token audience mismatch.");
  if (String(claims.email_verified) !== "true") throw new Error("Google account email is not verified.");
  if (!claims.exp || Number(claims.exp) <= now) throw new Error("Google identity token expired.");
  var issuer = String(claims.iss || "");
  if (issuer && issuer !== "accounts.google.com" && issuer !== "https://accounts.google.com") throw new Error("Google identity token issuer mismatch.");
  var email = String(claims.email || "").toLowerCase();
  if (!email || allowed.indexOf(email) === -1) throw new Error("This Google account is not authorized for AEGIS.");
  return {user:{email:email,name:claims.name||email,picture:claims.picture||null,subject:claims.sub||null},expiresAt:new Date(Number(claims.exp)*1000).toISOString()};
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  if (action === "auth_config") return jsonOutput(getAegisPublicAuthConfig_());
  if (isAegisAuthRequired_()) return jsonOutput({status:"error",authenticated:false,code:"AEGIS_AUTH_REQUIRED",action:action,error:"Authentication is required for this AEGIS operation."});
  return jsonOutput({status:"AUTH1_STAGING",backend_version:"2.6.6",message:"This modular AUTH-1 reference is deployment-gated; use the consolidated candidate for cutover."});
}
