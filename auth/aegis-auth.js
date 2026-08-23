(() => {
  'use strict';

  const DEFAULT_CONFIG = Object.freeze({
    enabled: false,
    sessionEndpoint: '',
    loginEndpoint: '',
    logoutEndpoint: '',
    loginRedirectParam: 'return_to',
    requestCredentials: 'include'
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

  async function fetchSession() {
    if (!config.enabled) {
      setState({ status: 'DISABLED', authenticated: false, user: null, session: null, scopes: [], error: null });
      return snapshot();
    }

    if (!config.sessionEndpoint) {
      setState({
        status: 'MISCONFIGURED',
        authenticated: false,
        user: null,
        session: null,
        scopes: [],
        error: 'Authentication is enabled but no session endpoint is configured.'
      });
      return snapshot();
    }

    setState({ status: 'CHECKING', error: null });

    try {
      const response = await fetch(config.sessionEndpoint, {
        method: 'GET',
        credentials: config.requestCredentials,
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setState({ status: 'UNAUTHENTICATED', authenticated: false, user: null, session: null, scopes: [], error: null });
          return snapshot();
        }
        throw new Error(`Session endpoint returned HTTP ${response.status}`);
      }

      const payload = await response.json();
      if (!payload || payload.authenticated !== true || !payload.user || !payload.session) {
        setState({ status: 'UNAUTHENTICATED', authenticated: false, user: null, session: null, scopes: [], error: null });
        return snapshot();
      }

      setState({
        status: 'AUTHENTICATED',
        authenticated: true,
        user: payload.user,
        session: payload.session,
        scopes: Array.isArray(payload.scopes) ? payload.scopes : [],
        error: null
      });
      return snapshot();
    } catch (error) {
      setState({
        status: 'ERROR',
        authenticated: false,
        user: null,
        session: null,
        scopes: [],
        error: error instanceof Error ? error.message : String(error)
      });
      return snapshot();
    }
  }

  function login() {
    if (!config.enabled || !config.loginEndpoint) return false;
    const returnTo = window.location.href;
    const url = new URL(config.loginEndpoint, window.location.href);
    url.searchParams.set(config.loginRedirectParam, returnTo);
    window.location.assign(url.toString());
    return true;
  }

  async function logout() {
    if (!config.enabled || !config.logoutEndpoint) return false;
    try {
      await fetch(config.logoutEndpoint, {
        method: 'POST',
        credentials: config.requestCredentials,
        headers: { 'Accept': 'application/json' }
      });
    } finally {
      setState({ status: 'UNAUTHENTICATED', authenticated: false, user: null, session: null, scopes: [], error: null });
    }
    return true;
  }

  function hasScope(scope) {
    return state.authenticated && state.scopes.includes(scope);
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  }

  window.AEGIS_AUTH = Object.freeze({
    config,
    getState: snapshot,
    refresh: fetchSession,
    login,
    logout,
    hasScope,
    subscribe
  });
})();
