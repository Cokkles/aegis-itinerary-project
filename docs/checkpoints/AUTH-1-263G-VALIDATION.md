# AUTH-1 2.6.3g Production Validation

After deployment through GitHub Pages, validate:

1. The auth gate progresses past CONFIG_LOADING within the normal network timeout.
2. If no token exists, the terminal state is SIGN_IN_REQUIRED and the Google button renders.
3. If a valid token exists, SESSION_CHECK advances to AUTHENTICATED.
4. No duplicate auth gate/status transitions occur.
5. Ask AEGIS includes Calendar after authentication.
6. Backend remains 2.6.3; no Apps Script deployment is required.
