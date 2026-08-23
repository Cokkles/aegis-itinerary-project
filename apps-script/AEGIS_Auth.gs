/**
 * AEGIS AUTH-1 — Google identity verification and authorization boundary.
 * Add this as a separate Apps Script file in the same project as Code.gs.
 *
 * Script Properties required before enforcement:
 *   AEGIS_GOOGLE_CLIENT_ID      Google OAuth Web Client ID
 *   AEGIS_AUTH_ALLOWED_EMAILS   Comma-separated private allowlist
 *   AEGIS_AUTH_REQUIRED         true only after production validation
 * Optional:
 *   AEGIS_AUTH_SCOPES           Comma-separated AEGIS application scopes
 *   AEGIS_AUTH_AUDIT_SHEET_ID   Sheet used for durable auth events
 */

function isAegisAuthRequired_() {
  var value = String(PropertiesService.getScriptProperties().getProperty('AEGIS_AUTH_REQUIRED') || 'false')
    .trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}

function getAegisAuthSettings_() {
  var props = PropertiesService.getScriptProperties();
  var clientId = String(props.getProperty('AEGIS_GOOGLE_CLIENT_ID') || '').trim();
  var allowed = String(props.getProperty('AEGIS_AUTH_ALLOWED_EMAILS') || '')
    .split(',').map(function(x){ return x.trim().toLowerCase(); }).filter(Boolean);
  var scopes = String(props.getProperty('AEGIS_AUTH_SCOPES') ||
    'dashboard.read,horizon.generate,calendar.read,calendar.write,tasks.read,tasks.write,gmail.read,kinetic.read,sentinel.read,spark.write')
    .split(',').map(function(x){ return x.trim(); }).filter(Boolean);
  if (!clientId) throw new Error('AEGIS_GOOGLE_CLIENT_ID is not configured.');
  if (!allowed.length) throw new Error('AEGIS_AUTH_ALLOWED_EMAILS is not configured.');
  return { clientId: clientId, allowedEmails: allowed, scopes: scopes };
}

function getAegisPublicAuthStatus_() {
  var props = PropertiesService.getScriptProperties();
  return {
    provider: 'google',
    configured: !!String(props.getProperty('AEGIS_GOOGLE_CLIENT_ID') || '').trim(),
    allowlist_configured: !!String(props.getProperty('AEGIS_AUTH_ALLOWED_EMAILS') || '').trim(),
    enforcement_required: isAegisAuthRequired_(),
    auth_version: 'AUTH-1'
  };
}

function verifyAegisGoogleToken_(idToken) {
  if (!idToken) throw new Error('Authentication token missing.');
  var settings = getAegisAuthSettings_();
  var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {
    method: 'get', muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code !== 200) throw new Error('Google identity token rejected (HTTP ' + code + ').');
  var claims = JSON.parse(response.getContentText());
  var now = Math.floor(Date.now() / 1000);
  if (claims.aud !== settings.clientId) throw new Error('Google identity token audience mismatch.');
  if (String(claims.email_verified) !== 'true') throw new Error('Google account email is not verified.');
  if (!claims.exp || Number(claims.exp) <= now) throw new Error('Google identity token expired.');
  var issuer = String(claims.iss || '');
  if (issuer && issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') throw new Error('Google identity token issuer mismatch.');
  var email = String(claims.email || '').toLowerCase();
  if (!email || settings.allowedEmails.indexOf(email) === -1) {
    logAegisAuthEvent_('AUTHORIZATION_DENIED', email || 'unknown', { reason: 'EMAIL_NOT_ALLOWLISTED' });
    throw new Error('This Google account is not authorized for AEGIS.');
  }
  return {
    claims: claims,
    user: { email: email, name: claims.name || email, picture: claims.picture || null, subject: claims.sub || null },
    scopes: settings.scopes,
    expiresAt: new Date(Number(claims.exp) * 1000).toISOString()
  };
}

function handleAegisAuthAction_(action, contents) {
  if (action !== 'auth_login' && action !== 'auth_session' && action !== 'auth_logout') return null;
  try {
    var verified = verifyAegisGoogleToken_(contents.auth_token || '');
    if (action === 'auth_logout') {
      logAegisAuthEvent_('LOGOUT', verified.user.email, {});
      return { status:'success', authenticated:false };
    }
    logAegisAuthEvent_(action === 'auth_login' ? 'LOGIN_SUCCESS' : 'SESSION_VALIDATED', verified.user.email, {});
    return {
      status: 'success',
      authenticated: true,
      user: verified.user,
      session: { provider:'google', expires_at: verified.expiresAt },
      scopes: verified.scopes
    };
  } catch (err) {
    if (action === 'auth_login') logAegisAuthEvent_('LOGIN_FAILURE', 'unknown', { error: err.message });
    return { status:'error', authenticated:false, error:err.message };
  }
}

function authorizeAegisPayload_(contents, requiredScope) {
  if (!isAegisAuthRequired_()) {
    return { bypassed: true, scopes: [], user: { email: 'AUTH_NOT_ENFORCED' } };
  }
  var verified = verifyAegisGoogleToken_(contents && contents.auth_token);
  if (requiredScope && verified.scopes.indexOf(requiredScope) === -1) {
    logAegisAuthEvent_('AUTHORIZATION_DENIED', verified.user.email, { scope: requiredScope });
    throw new Error('Authorization denied for scope: ' + requiredScope);
  }
  return verified;
}

function aegisScopeForAction_(action, message) {
  if (action === 'create_calendar_event') return 'calendar.write';
  if (action === 'resolve_calendar_event') return 'calendar.read';
  if (action === 'mark_done') return 'tasks.write';
  if (action === 'horizon_sync' || action === 'refresh_briefing' || String(message || '').indexOf('/horizon') === 0) return 'horizon.generate';
  if (action === 'getRecentFinance') return 'sentinel.read';
  if (action === 'getHorizonData' || action === 'getSummary' || action === 'getLatestHorizonBriefing' || action === 'getNotifications' || action === 'getIntelligence') return 'dashboard.read';
  if (String(message || '').match(/^\/(journal|vent|note|reflect|assess)/i)) return 'spark.write';
  if (String(message || '').match(/^\/calories/i)) return 'kinetic.read';
  if (String(message || '').match(/^\/(receipts|finance)/i)) return 'sentinel.read';
  if (String(message || '').match(/^\/groceries/i)) return 'tasks.write';
  if (action === 'ack_notification' || action === 'refresh_intelligence') return 'dashboard.read';
  if (action === 'install_automation_triggers') return 'dashboard.read';
  return 'dashboard.read';
}

function aegisAuthRequiredResponse_(action) {
  return {
    status: 'error',
    authenticated: false,
    code: 'AEGIS_AUTH_REQUIRED',
    action: action || '',
    error: 'Authentication is required for this AEGIS operation.'
  };
}

function logAegisAuthEvent_(eventType, email, details) {
  var event = {
    timestamp: new Date().toISOString(),
    event_type: eventType,
    email: email || 'unknown',
    details: details || {}
  };
  Logger.log('AEGIS_AUTH_EVENT ' + JSON.stringify(event));

  var sheetId = PropertiesService.getScriptProperties().getProperty('AEGIS_AUTH_AUDIT_SHEET_ID');
  if (!sheetId) return;
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('Auth Events') || ss.insertSheet('Auth Events');
    if (sheet.getLastRow() === 0) sheet.appendRow(['Timestamp','Event Type','Email','Details']);
    sheet.appendRow([event.timestamp,event.event_type,event.email,JSON.stringify(event.details)]);
  } catch (err) {
    Logger.log('AEGIS auth audit sheet write failed: ' + err.message);
  }
}
