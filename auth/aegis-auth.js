(() => {
  'use strict';

  const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    provider: 'google',
    clientId: '',
    backendEndpoint: '',
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
  });

  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...(window.AEGIS_AUTH_CONFIG || {})
  });

  const state = {
    status: config.enabled ? 'CHECKING' : 'DISABLED',
    authenticated: false,
    user: null,
    session: null,
    scopes: [],
    token: null,
    error: null
  };

  const listeners = new Set();

  function snapshot() {
    return Object.freeze({
      status: state.status,
      authenticated: state.authenticated,
      user: state.user ? { ...state.user } : null,
      session: state.session ? { ...state.session } : null,
      scopes: [...state.scopes],
      error: state.error
    });
  }

  function emit() {
    const current = snapshot();
    listeners.forEach((listener) => {
      try { listener(current); } catch (err) { console.error('AEGIS auth listener failed', err); }
    });
    window.dispatchEvent(new CustomEvent('aegis:auth-state', { detail: current }));
  }

  function setState(next) {
    Object.assign(state, next);
    emit();
  }

  function persistToken(token) {
    state.token = token || null;
    try {
      if (token) sessionStorage.setItem(config.tokenStorageKey, token);
      else sessionStorage.removeItem(config.tokenStorageKey);
    } catch (_) {}
  }

  function restoreToken() {
    try { return sessionStorage.getItem(config.tokenStorageKey) || ''; }
    catch (_) { return ''; }
  }

  async function backend(payload, timeoutMs = 15000) {
    if (!config.backendEndpoint) throw new Error('AEGIS auth backend endpoint is not configured.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(config.backendEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Authentication backend returned HTTP ${response.status}`);
      const json = await response.json();
      if (json.status === 'error' || json.error) throw new Error(json.error || 'Authentication failed.');
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  async function validateToken(token) {
    if (!token) return null;
    const result = await backend({ action: 'auth_session', auth_token: token });
    if (!result || result.authenticated !== true || !result.user) return null;
    return result;
  }

  async function refresh() {
    if (!config.enabled) {
      setState({ status: 'DISABLED', authenticated: false, user: null, session: null, scopes: [], token: null, error: null });
      return snapshot();
    }
    if (!config.clientId || !config.backendEndpoint) {
      setState({ status: 'MISCONFIGURED', authenticated: false, user: null, session: null, scopes: [], error: 'Google client ID and backend endpoint are required.' });
      return snapshot();
    }

    const token = state.token || restoreToken();
    if (!token) {
      setState({ status: 'UNAUTHENTICATED', authenticated: false, user: null, session: null, scopes: [], error: null });
      return snapshot();
    }

    setState({ status: 'CHECKING', error: null });
    try {
      const result = await validateToken(token);
      if (!result) throw new Error('Session is not valid.');
      persistToken(token);
      setState({
        status: 'AUTHENTICATED',
        authenticated: true,
        user: result.user,
        session: result.session || null,
        scopes: Array.isArray(result.scopes) ? result.scopes : [],
        error: null
      });
    } catch (err) {
      persistToken(null);
      setState({ status: 'UNAUTHENTICATED', authenticated: false, user: null, session: null, scopes: [], error: null });
    }
    return snapshot();
  }

  async function handleGoogleCredential(response) {
    const token = response && response.credential;
    if (!token) {
      setState({ status: 'ERROR', authenticated: false, error: 'Google did not return an identity credential.' });
      return snapshot();
    }
    setState({ status: 'CHECKING', error: null });
    try {
      const result = await backend({ action: 'auth_login', auth_token: token });
      if (result.authenticated !== true) throw new Error(result.error || 'Account is not authorized for AEGIS.');
      persistToken(token);
      setState({
        status: 'AUTHENTICATED',
        authenticated: true,
        user: result.user,
        session: result.session || null,
        scopes: Array.isArray(result.scopes) ? result.scopes : [],
        error: null
      });
    } catch (err) {
      persistToken(null);
      setState({ status: 'DENIED', authenticated: false, user: null, session: null, scopes: [], error: err instanceof Error ? err.message : String(err) });
    }
    return snapshot();
  }

  function initializeGoogle() {
    if (!config.enabled || !config.clientId) return false;
    if (!window.google || !google.accounts || !google.accounts.id) return false;
    google.accounts.id.initialize({
      client_id: config.clientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: false,
      use_fedcm_for_prompt: true
    });
    return true;
  }

  function renderGoogleButton(element, options = {}) {
    if (!initializeGoogle()) return false;
    google.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'pill',
      text: 'signin_with',
      logo_alignment: 'left',
      width: 280,
      ...options
    });
    return true;
  }

  function prompt() {
    if (!initializeGoogle()) return false;
    google.accounts.id.prompt();
    return true;
  }

  async function logout() {
    const token = state.token || restoreToken();
    try {
      if (token && config.backendEndpoint) await backend({ action: 'auth_logout', auth_token: token });
    } catch (_) {}
    if (state.user && state.user.email && window.google?.accounts?.id) {
      try { google.accounts.id.disableAutoSelect(); } catch (_) {}
    }
    persistToken(null);
    setState({ status: 'UNAUTHENTICATED', authenticated: false, user: null, session: null, scopes: [], error: null });
    return true;
  }

  function hasScope(scope) {
    return state.authenticated && state.scopes.includes(scope);
  }

  function requireScope(scope) {
    if (!state.authenticated) throw new Error('AEGIS authentication is required.');
    if (scope && !hasScope(scope)) throw new Error(`AEGIS authorization denied for scope: ${scope}`);
    return true;
  }

  async function securePost(payload, timeoutMs = 30000, requiredScope = '') {
    requireScope(requiredScope);
    const token = state.token || restoreToken();
    if (!token) throw new Error('AEGIS session token is unavailable.');
    return backend({ ...payload, auth_token: token }, timeoutMs);
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  }

  window.AEGIS_AUTH = Object.freeze({
    config,
    getState: snapshot,
    refresh,
    initializeGoogle,
    renderGoogleButton,
    prompt,
    handleGoogleCredential,
    logout,
    hasScope,
    requireScope,
    securePost,
    subscribe
  });
})();
