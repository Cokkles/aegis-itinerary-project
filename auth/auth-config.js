// AEGIS AUTH-1 public runtime configuration.
// This file may be served by GitHub Pages. Never place allowlisted emails,
// OAuth client secrets, API keys, refresh tokens, or other private values here.
window.AEGIS_AUTH_CONFIG = {
  enabled: true,
  provider: 'google',
  clientId: '441009275873-qnf9c9n1o3l9tl9c76t2821hm8tectfl.apps.googleusercontent.com',
  backendEndpoint: 'https://script.google.com/macros/s/AKfycbw4Rj-zD7L9TCi3ldYobavsKDiyUJ3hLJWhOUuu5PVc83NnzKc7xTdVzNykSgt3h5zSfA/exec',
  tokenStorageKey: 'aegis_google_id_token',
  sessionStorageKey: 'aegis_auth_session',
  loginAutoPrompt: false,
  scopes: [
    'dashboard.read',
    'horizon.generate',
    'calendar.read',
    'calendar.write',
    'tasks.read',
    'tasks.write',
    'gmail.read',
    'kinetic.read',
    'sentinel.read',
    'spark.write'
  ]
};
