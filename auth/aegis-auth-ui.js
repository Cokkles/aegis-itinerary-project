(() => {
  'use strict';

  function build() {
    if (!window.AEGIS_AUTH || !AEGIS_AUTH.config.enabled) return;
    const overlay = document.createElement('div');
    overlay.id = 'aegisAuthGate';
    overlay.className = 'aegis-auth-gate';
    overlay.innerHTML = `
      <section class="aegis-auth-card" role="dialog" aria-modal="true" aria-labelledby="aegisAuthTitle">
        <img src="aegis-mark.png" alt="AEGIS" class="aegis-auth-mark">
        <div class="aegis-auth-kicker">GEMINI-POS SECURE ACCESS</div>
        <h1 id="aegisAuthTitle">AEGIS Authentication</h1>
        <p id="aegisAuthMessage">Verifying your session…</p>
        <div id="aegisGoogleButton" class="aegis-google-button"></div>
        <button id="aegisAuthRetry" class="aegis-auth-secondary" type="button">Retry session check</button>
        <small>Only explicitly authorized Google accounts may enter AEGIS.</small>
      </section>`;
    document.body.appendChild(overlay);

    const userChip = document.createElement('button');
    userChip.id = 'aegisAuthUserChip';
    userChip.className = 'aegis-auth-user-chip';
    userChip.type = 'button';
    userChip.hidden = true;
    document.body.appendChild(userChip);

    const message = overlay.querySelector('#aegisAuthMessage');
    const googleButton = overlay.querySelector('#aegisGoogleButton');
    const retry = overlay.querySelector('#aegisAuthRetry');

    function render(state) {
      document.documentElement.dataset.aegisAuth = state.status;
      const authenticated = state.authenticated === true;
      overlay.classList.toggle('is-unlocked', authenticated);
      userChip.hidden = !authenticated;

      if (authenticated) {
        const label = state.user?.name || state.user?.email || 'Signed in';
        userChip.textContent = `${label} • Sign out`;
        message.textContent = 'Authenticated.';
        googleButton.replaceChildren();
        return;
      }

      userChip.hidden = true;
      if (state.status === 'CHECKING') message.textContent = 'Verifying your session…';
      else if (state.status === 'MISCONFIGURED') message.textContent = state.error || 'Authentication is not configured.';
      else if (state.status === 'DENIED') message.textContent = state.error || 'This Google account is not authorized.';
      else if (state.status === 'ERROR') message.textContent = state.error || 'Authentication failed.';
      else message.textContent = 'Sign in with an authorized Google account to continue.';

      if (!googleButton.childElementCount && ['UNAUTHENTICATED','DENIED','ERROR'].includes(state.status)) {
        const attempt = () => {
          googleButton.replaceChildren();
          if (!AEGIS_AUTH.renderGoogleButton(googleButton)) setTimeout(attempt, 300);
        };
        attempt();
      }
    }

    retry.addEventListener('click', () => AEGIS_AUTH.refresh());
    userChip.addEventListener('click', async () => { await AEGIS_AUTH.logout(); });
    AEGIS_AUTH.subscribe(render);
    AEGIS_AUTH.refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build, { once: true });
  else build();
})();
