import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workerSource = await readFile(new URL('../src/worker.js', import.meta.url), 'utf8');
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(workerSource).toString('base64')}`);
const worker = workerModule.default;

const accessIssuer = 'https://cognoscene-test.cloudflareaccess.com';
const accessAudience = 'test-admin-audience';
const adminEmail = 'cognoscene@gmail.com';
const accessKeyPair = await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
  },
  true,
  ['sign', 'verify']
);
const accessPublicJwk = await crypto.subtle.exportKey('jwk', accessKeyPair.publicKey);
accessPublicJwk.kid = 'test-access-key';

function base64Url(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
  return Buffer.from(bytes).toString('base64url');
}

async function createAccessJwt(email = adminEmail) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', kid: accessPublicJwk.kid, typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    aud: [accessAudience],
    email,
    exp: now + 300,
    iat: now,
    nbf: now - 1,
    iss: accessIssuer,
    type: 'app'
  }));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    accessKeyPair.privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64Url(signature)}`;
}

const baseEnv = {
  WAITLIST_OPEN_AT: '2000-01-01T00:00:00Z',
  WAITLIST_CLOSE_AT: '2099-01-01T00:00:00Z',
  FOUNDING_LIMIT: '100',
  LEGAL_VERSION: '2026-08-25',
  TURNSTILE_HOSTNAME: 'cognoscene.com',
  TURNSTILE_SECRET: 'test-secret',
  ASSETS: {
    fetch: async (request) => new Response(new URL(request.url).pathname)
  }
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (String(url).includes('/siteverify')) {
    return Response.json({ success: true, hostname: 'cognoscene.com', action: 'waitlist_signup' });
  }
  if (String(url).includes('/cdn-cgi/access/certs')) {
    return Response.json({ keys: [accessPublicJwk] });
  }
  throw new Error(`unexpected fetch: ${url}`);
};

try {
  const redirect = await worker.fetch(new Request('https://cognoscene.com/'), baseEnv);
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), 'https://cognoscene.com/waitlist');

  const waitlistPage = await worker.fetch(new Request('https://cognoscene.com/waitlist'), baseEnv);
  assert.equal(waitlistPage.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  assert.equal(waitlistPage.headers.get('x-frame-options'), 'DENY');
  assert.match(waitlistPage.headers.get('content-security-policy-report-only'), /frame-ancestors 'none'/);

  const stylesheet = await worker.fetch(new Request('https://cognoscene.com/css/layers.css?v=test'), baseEnv);
  assert.equal(stylesheet.headers.get('cache-control'), 'public, max-age=31536000, immutable');

  const scheduled = await worker.fetch(new Request('https://cognoscene.com/api/waitlist/status'), {
    ...baseEnv,
    WAITLIST_OPEN_AT: '2098-01-01T00:00:00Z'
  });
  assert.equal((await scheduled.json()).state, 'scheduled');

  let insertSql = '';
  const signupEnv = {
    ...baseEnv,
    WAITLIST_DB: {
      prepare(sql) {
        insertSql = sql;
        return {
          bind() {
            return {
              first: async () => ({ founding_eligible: 1, created_at: '2026-08-25T01:00:00.000Z' })
            };
          }
        };
      }
    }
  };
  const signup = await worker.fetch(new Request('https://cognoscene.com/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://cognoscene.com' },
    body: JSON.stringify({
      email: 'Person@Example.com',
      legal_agreed: true,
      turnstile_token: 'valid-token'
    })
  }), signupEnv);
  const signupBody = await signup.json();
  assert.equal(signup.status, 201);
  assert.equal(signupBody.founding_eligible, true);
  assert.equal(typeof signupBody.survey_token, 'string');
  assert.ok(signupBody.survey_token.length >= 40);
  assert.match(insertSql, /SELECT COUNT\(\*\)[\s\S]*founding_eligible = 1/);

  const rejectedOrigin = await worker.fetch(new Request('https://cognoscene.com/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' },
    body: '{}'
  }), signupEnv);
  assert.equal(rejectedOrigin.status, 403);

  const surveyEnv = {
    ...baseEnv,
    WAITLIST_DB: {
      prepare() {
        return {
          bind() {
            return {
              run: async () => ({ success: true, meta: { changes: 1 } })
            };
          }
        };
      }
    }
  };
  const survey = await worker.fetch(new Request('https://cognoscene.com/api/waitlist/survey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://cognoscene.com' },
    body: JSON.stringify({
      survey_token: signupBody.survey_token,
      country_code: 'SG',
      referral_source: 'community',
      referral_community: 'test community',
      referral_other: '',
      expansion_interests: ['desktop', 'mobile_app'],
      desktop_browsers: ['edge'],
      mobile_apps: ['android_google_play'],
      annual_price_tier: 'usd_39_99'
    })
  }), surveyEnv);
  assert.equal(survey.status, 200);
  assert.deepEqual(await survey.json(), { ok: true });

  const rejectedPrice = await worker.fetch(new Request('https://cognoscene.com/api/waitlist/survey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://cognoscene.com' },
    body: JSON.stringify({
      survey_token: signupBody.survey_token,
      country_code: 'SG',
      referral_source: 'search',
      expansion_interests: ['chrome'],
      desktop_browsers: [],
      mobile_apps: [],
      annual_price_tier: 'free_only'
    })
  }), surveyEnv);
  assert.equal(rejectedPrice.status, 400);
  assert.equal((await rejectedPrice.json()).code, 'invalid_survey');

  const disabledAdmin = await worker.fetch(new Request('https://cognoscene.com/admin'), baseEnv);
  assert.equal(disabledAdmin.status, 404);

  const accessJwt = await createAccessJwt();
  const adminHeaders = {
    'Cf-Access-Authenticated-User-Email': adminEmail,
    'Cf-Access-Jwt-Assertion': accessJwt
  };
  const adminRows = [{
    id: 1,
    email: 'person@example.com',
    founding_eligible: 1,
    created_at: '2026-08-24T10:00:00.000Z',
    country_code: 'SG',
    referral_source: 'community',
    referral_community: 'test community',
    referral_other: null,
    expansion_interests_json: '["desktop","mobile_app"]',
    desktop_browsers_json: '["edge"]',
    mobile_apps_json: '["ios_app_store"]',
    annual_price_tier: 'usd_39_99',
    survey_completed_at: '2026-08-24T10:05:00.000Z'
  }];
  const adminEnv = {
    ...baseEnv,
    ADMIN_DASHBOARD_ENABLED: 'true',
    ADMIN_EMAIL: adminEmail,
    ACCESS_TEAM_DOMAIN: accessIssuer,
    ACCESS_AUD: accessAudience,
    WAITLIST_DB: {
      prepare(sql) {
        return {
          sql,
          bind() { return this; },
          all: async () => ({ success: true, results: adminRows })
        };
      },
      batch: async () => ([
        { success: true, results: [{ total: 1, founding: 1, surveys: 1 }] },
        { success: true, results: [{ total: 1 }] },
        { success: true, results: adminRows }
      ])
    }
  };

  const adminPage = await worker.fetch(new Request('https://cognoscene.com/admin', {
    headers: adminHeaders
  }), adminEnv);
  assert.equal(adminPage.status, 200);
  assert.equal(await adminPage.text(), '/admin.html');
  assert.equal(adminPage.headers.get('cache-control'), 'no-store');
  assert.match(adminPage.headers.get('content-security-policy'), /frame-ancestors 'none'/);

  const rejectedAdmin = await worker.fetch(new Request('https://cognoscene.com/admin', {
    headers: {
      ...adminHeaders,
      'Cf-Access-Authenticated-User-Email': 'attacker@example.com'
    }
  }), adminEnv);
  assert.equal(rejectedAdmin.status, 404);

  const tamperedParts = accessJwt.split('.');
  tamperedParts[2] = `${tamperedParts[2][0] === 'a' ? 'b' : 'a'}${tamperedParts[2].slice(1)}`;
  const unsignedAdmin = await worker.fetch(new Request('https://cognoscene.com/admin.html', {
    headers: {
      'Cf-Access-Authenticated-User-Email': adminEmail,
      'Cf-Access-Jwt-Assertion': tamperedParts.join('.')
    }
  }), adminEnv);
  assert.equal(unsignedAdmin.status, 404);

  const adminData = await worker.fetch(new Request('https://cognoscene.com/admin/api/submissions?page=1', {
    headers: adminHeaders
  }), adminEnv);
  assert.equal(adminData.status, 200);
  const adminBody = await adminData.json();
  assert.equal(adminBody.viewer, adminEmail);
  assert.equal(adminBody.summary.remaining, 99);
  assert.deepEqual(adminBody.rows[0].expansion_interests, ['desktop', 'mobile_app']);
  assert.equal(adminBody.rows[0].annual_price_tier, 'usd_39_99');
  assert.equal(adminBody.rows[0].survey_token_hash, undefined);

  const csvExport = await worker.fetch(new Request('https://cognoscene.com/admin/api/export.csv', {
    headers: adminHeaders
  }), adminEnv);
  assert.equal(csvExport.status, 200);
  assert.match(csvExport.headers.get('content-disposition'), /cognoscene-waitlist-/);
  const csvText = await csvExport.text();
  assert.match(csvText, /person@example\.com/);
  assert.match(csvText, /annual_price_tier/);
  assert.match(csvText, /usd_39_99/);

  console.log('worker smoke tests passed');
} finally {
  globalThis.fetch = originalFetch;
}
