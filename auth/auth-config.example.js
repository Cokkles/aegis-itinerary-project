// PUBLIC configuration only. Google OAuth client IDs are public identifiers.
// NEVER put a client secret, reusable access token, or private allowlist here.
window.AEGIS_AUTH_CONFIG = {
  enabled: true,
  provider: 'google',
  clientId: 'REPLACE_WITH_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  backendEndpoint: 'REPLACE_WITH_EXISTING_AEGIS_APPS_SCRIPT_WEB_APP_URL',
  loginAutoPrompt: false
};
