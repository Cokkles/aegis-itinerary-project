import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sources = [
  '../apps-script/AEGIS_AUTH1_Code.gs',
  '../apps-script/Code.calendar-prepare-v1.gs'
];

const primaryClientId = 'pwa-client.apps.googleusercontent.com';
const desktopClientId = 'desktop-client.apps.googleusercontent.com';
const androidClientId = 'android-client.apps.googleusercontent.com';
const allowedEmail = 'owner@example.com';

function createContext(sourcePath) {
  const properties = {
    AEGIS_GOOGLE_CLIENT_ID: primaryClientId,
    AEGIS_GOOGLE_CLIENT_IDS: `${desktopClientId};\n${androidClientId}, ${desktopClientId}`,
    AEGIS_AUTH_ALLOWED_EMAILS: allowedEmail,
    AEGIS_AUTH_REQUIRED: 'true'
  };

  const context = vm.createContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => properties[key] ?? null
      })
    },
    UrlFetchApp: {
      fetch: url => {
        const audience = new URL(url).searchParams.get('id_token');
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            aud: audience,
            email: allowedEmail,
            email_verified: 'true',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iss: 'https://accounts.google.com',
            sub: 'subject-1'
          })
        };
      }
    },
    console
  });

  vm.runInContext(fs.readFileSync(new URL(sourcePath, import.meta.url), 'utf8'), context);
  return { context, properties };
}

for (const sourcePath of sources) {
  const { context, properties } = createContext(sourcePath);

  assert.equal(context.verifyAegisGoogleToken_(primaryClientId).user.email, allowedEmail);
  assert.equal(context.verifyAegisGoogleToken_(desktopClientId).user.email, allowedEmail);
  assert.equal(context.verifyAegisGoogleToken_(androidClientId).user.email, allowedEmail);
  assert.throws(
    () => context.verifyAegisGoogleToken_('untrusted-client.apps.googleusercontent.com'),
    /audience mismatch/i
  );

  assert.deepEqual(
    Array.from(context.getAegisAllowedGoogleClientIds_(context.PropertiesService.getScriptProperties())),
    [primaryClientId, desktopClientId, androidClientId]
  );

  const publicConfig = context.getAegisPublicAuthConfig_();
  assert.equal(publicConfig.client_id, primaryClientId);
  assert.equal(publicConfig.trusted_audience_count, 3);
  assert.equal(publicConfig.additional_audiences_configured, true);
  assert.equal(JSON.stringify(publicConfig).includes(desktopClientId), false);
  assert.equal(JSON.stringify(publicConfig).includes(androidClientId), false);

  properties.AEGIS_GOOGLE_CLIENT_IDS = JSON.stringify([desktopClientId, androidClientId]);
  assert.deepEqual(
    Array.from(context.getAegisAllowedGoogleClientIds_(context.PropertiesService.getScriptProperties())),
    [primaryClientId, desktopClientId, androidClientId]
  );
}

console.log('PASS AUTH-1 accepts trusted PWA/Desktop/Android audiences without exposing additional client IDs');
