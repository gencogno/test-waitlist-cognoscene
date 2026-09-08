const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
const PUBLIC_SECURITY_HEADERS = {
  'Content-Security-Policy-Report-Only': "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'; connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com; frame-src https://challenges.cloudflare.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests",
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

const MAX_BODY_BYTES = 12 * 1024;
const PRODUCT_DEMO_VIDEO_PATH = '/assets/videos/product-demo-waitlist-v2.mp4';
const SURVEY_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERRAL_SOURCES = new Set([
  'reddit',
  'linkedin',
  'x',
  'tiktok',
  'instagram',
  'friend',
  'community',
  'search',
  'other'
]);
const EXPANSION_INTERESTS = new Set(['desktop', 'mobile_app', 'chrome']);
const DESKTOP_BROWSERS = new Set(['edge', 'firefox', 'brave', 'opera', 'safari_macos']);
const MOBILE_APPS = new Set(['android_google_play', 'ios_app_store']);
const ANNUAL_PRICE_TIERS = new Set(['usd_19_99', 'usd_29_99', 'usd_39_99', 'usd_49_99_plus']);
const ADMIN_PAGE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};
const ADMIN_PAGE_SIZE = 100;
const ADMIN_MAX_OFFSET = 10000;
const ACCESS_KEY_TTL_MS = 60 * 60 * 1000;
const ACCESS_CLOCK_SKEW_SECONDS = 30;
const accessKeyCache = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if ((url.pathname === '/' || url.pathname === '/index.html') && isNavigation(request)) {
        return Response.redirect(new URL('/waitlist', url), 301);
      }

      if (url.pathname === '/waitlist/' && isNavigation(request)) {
        return Response.redirect(new URL('/waitlist', url), 301);
      }

      if (url.pathname === '/waitlist' && isNavigation(request)) {
        const assetUrl = new URL(request.url);
        assetUrl.pathname = '/index.html';
        return servePublicAsset(new Request(assetUrl, request), env, ctx);
      }

      if (url.pathname === '/admin' || url.pathname === '/admin/' || url.pathname === '/admin.html') {
        if (!isNavigation(request)) return adminNotFound();
        const identity = await authenticateAdminRequest(request, env);
        if (!identity.ok) return adminNotFound(identity.status);

        const assetUrl = new URL(request.url);
        assetUrl.pathname = '/admin.html';
        const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));
        return withHeaders(assetResponse, ADMIN_PAGE_HEADERS);
      }

      if (url.pathname === '/admin/api/submissions' && request.method === 'GET') {
        const identity = await authenticateAdminRequest(request, env);
        if (!identity.ok) return adminNotFound(identity.status);
        return handleAdminSubmissions(url, env, identity.email);
      }

      if (url.pathname === '/admin/api/export.csv' && request.method === 'GET') {
        const identity = await authenticateAdminRequest(request, env);
        if (!identity.ok) return adminNotFound(identity.status);
        return handleAdminCsvExport(env);
      }

      if (url.pathname.startsWith('/admin')) {
        return adminNotFound();
      }

      if (url.pathname === '/api/waitlist/status' && request.method === 'GET') {
        return jsonResponse(getGateStatus(env));
      }

      if (url.pathname === '/api/waitlist' && request.method === 'POST') {
        return handleWaitlistSignup(request, env);
      }

      if (url.pathname === '/api/waitlist/survey' && request.method === 'POST') {
        return handleSurveySubmission(request, env);
      }

      if (url.pathname.startsWith('/api/')) {
        return jsonResponse({ ok: false, code: 'not_found' }, 404);
      }

      return servePublicAsset(request, env, ctx);
    } catch (error) {
      console.error('waitlist worker error', error instanceof Error ? error.message : 'unknown error');
      return jsonResponse({
        ok: false,
        code: 'server_error',
        message: 'we could not process this right now. try again shortly.'
      }, 500);
    }
  }
};

function isNavigation(request) {
  return request.method === 'GET' || request.method === 'HEAD';
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: API_HEADERS });
}

function adminNotFound(status = 404) {
  return new Response('not found', {
    status,
    headers: {
      ...ADMIN_PAGE_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

function withHeaders(response, headers) {
  const nextHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([name, value]) => nextHeaders.set(name, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders
  });
}

async function servePublicAsset(request, env, ctx) {
  if (new URL(request.url).pathname === PRODUCT_DEMO_VIDEO_PATH) {
    return serveProductDemoVideo(request, env, ctx);
  }
  const response = await env.ASSETS.fetch(request);
  const pathname = new URL(request.url).pathname;
  return withHeaders(response, {
    ...PUBLIC_SECURITY_HEADERS,
    'Cache-Control': cacheControlFor(pathname)
  });
}

async function serveProductDemoVideo(request, env, ctx) {
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cache = caches.default;
  let response = await cache.match(cacheKey);

  if (!response) {
    response = await env.ASSETS.fetch(cacheKey);
    if (response.ok) {
      const cachePut = cache.put(cacheKey, response.clone());
      if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(cachePut);
      else await cachePut;
    }
  }

  const baseHeaders = {
    ...PUBLIC_SECURITY_HEADERS,
    'Cache-Control': cacheControlFor(PRODUCT_DEMO_VIDEO_PATH),
    'Accept-Ranges': 'bytes'
  };
  if (!response.ok) return withHeaders(response, baseHeaders);
  const rangeHeader = request.method === 'GET' ? request.headers.get('Range') : null;
  if (!rangeHeader) return withHeaders(response, baseHeaders);

  const body = await response.arrayBuffer();
  const range = parseSingleByteRange(rangeHeader, body.byteLength);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes */${body.byteLength}`,
        'Content-Length': '0'
      }
    });
  }

  const headers = new Headers(baseHeaders);
  headers.set('Content-Type', response.headers.get('Content-Type') || 'video/mp4');
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${body.byteLength}`);
  headers.set('Content-Length', String(range.end - range.start + 1));
  return new Response(body.slice(range.start, range.end + 1), { status: 206, headers });
}

function parseSingleByteRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(value || '').trim());
  if (!match || !size) return null;

  let start;
  let end;
  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Number(match[2]);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) return null;
    end = Math.min(end, size - 1);
  }

  return { start, end };
}

function cacheControlFor(pathname) {
  if (/\.(?:css|js|mjs|png|jpe?g|gif|webp|svg|ico|woff2?|mp4)$/i.test(pathname)) {
    // Static filenames must receive a new URL when their contents change.
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=0, must-revalidate';
}

function getGateStatus(env, nowMs = Date.now()) {
  const opensAt = Date.parse(env.WAITLIST_OPEN_AT);
  const closesAt = Date.parse(env.WAITLIST_CLOSE_AT);
  let state = 'open';

  if (!Number.isFinite(opensAt) || !Number.isFinite(closesAt) || opensAt >= closesAt) {
    state = 'unavailable';
  } else if (nowMs < opensAt) {
    state = 'scheduled';
  } else if (nowMs >= closesAt) {
    state = 'closed';
  }

  return {
    ok: state !== 'unavailable',
    state,
    opens_at: env.WAITLIST_OPEN_AT,
    closes_at: env.WAITLIST_CLOSE_AT,
    server_time: new Date(nowMs).toISOString()
  };
}

async function handleWaitlistSignup(request, env) {
  const gate = getGateStatus(env);
  if (gate.state !== 'open') {
    return jsonResponse({
      ok: false,
      code: gate.state,
      message: gate.state === 'scheduled'
        ? 'the waitlist has not opened yet.'
        : 'the waitlist is closed.'
    }, 403);
  }

  const requestError = validateJsonRequest(request);
  if (requestError) return requestError;

  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    return jsonResponse({ ok: false, code: 'invalid_json', message: error.message }, 400);
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return jsonResponse({ ok: false, code: 'invalid_email', message: 'enter a valid email address.' }, 400);
  }
  if (payload.legal_agreed !== true) {
    return jsonResponse({ ok: false, code: 'legal_required', message: 'agree to the privacy policy and terms to continue.' }, 400);
  }

  const turnstileToken = cleanString(payload.turnstile_token, 2048);
  if (!turnstileToken) {
    return jsonResponse({ ok: false, code: 'turnstile_required', message: 'complete the security check and try again.' }, 400);
  }

  const turnstileResult = await verifyTurnstile(turnstileToken, env);
  if (!turnstileResult.ok) {
    return jsonResponse({ ok: false, code: 'turnstile_failed', message: 'the security check expired. try again.' }, 400);
  }

  const now = new Date().toISOString();
  const surveyToken = createOpaqueToken();
  const surveyTokenHash = await hashToken(surveyToken);
  const foundingLimit = parsePositiveInteger(env.FOUNDING_LIMIT, 100);
  const referrerHost = cleanHostname(payload.referrer_host) || getReferrerHost(request);
  const tracking = {
    utm_source: cleanString(payload.utm_source, 120),
    utm_medium: cleanString(payload.utm_medium, 120),
    utm_campaign: cleanString(payload.utm_campaign, 120),
    utm_content: cleanString(payload.utm_content, 120),
    utm_term: cleanString(payload.utm_term, 120)
  };

  try {
    const inserted = await env.WAITLIST_DB.prepare(`
      INSERT INTO waitlist_submissions (
        email,
        legal_agreed,
        legal_version,
        legal_agreed_at,
        founding_eligible,
        created_at,
        updated_at,
        survey_token_hash,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        referrer_host
      )
      SELECT
        ?,
        1,
        ?,
        ?,
        CASE WHEN (
          SELECT COUNT(*)
          FROM waitlist_submissions
          WHERE founding_eligible = 1
        ) < ? THEN 1 ELSE 0 END,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      RETURNING founding_eligible, created_at
    `).bind(
      email,
      env.LEGAL_VERSION,
      now,
      foundingLimit,
      now,
      now,
      surveyTokenHash,
      tracking.utm_source,
      tracking.utm_medium,
      tracking.utm_campaign,
      tracking.utm_content,
      tracking.utm_term,
      referrerHost
    ).first();

    if (!inserted) throw new Error('insert returned no row');

    return jsonResponse({
      ok: true,
      founding_eligible: inserted.founding_eligible === 1,
      created_at: inserted.created_at,
      survey_token: surveyToken
    }, 201);
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return jsonResponse({
        ok: false,
        code: 'already_joined',
        message: 'that email is already on the waitlist.'
      }, 409);
    }
    throw error;
  }
}

async function handleSurveySubmission(request, env) {
  const requestError = validateJsonRequest(request);
  if (requestError) return requestError;

  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    return jsonResponse({ ok: false, code: 'invalid_json', message: error.message }, 400);
  }

  const surveyToken = cleanString(payload.survey_token, 128);
  if (!surveyToken) {
    return jsonResponse({ ok: false, code: 'invalid_token', message: 'this survey link is invalid.' }, 400);
  }

  const validation = validateSurvey(payload);
  if (!validation.ok) {
    return jsonResponse({ ok: false, code: 'invalid_survey', message: validation.message }, 400);
  }

  const surveyTokenHash = await hashToken(surveyToken);
  const now = new Date();
  const tokenCutoff = new Date(now.getTime() - SURVEY_TOKEN_MAX_AGE_MS).toISOString();
  const answers = validation.answers;

  const result = await env.WAITLIST_DB.prepare(`
    UPDATE waitlist_submissions
    SET
      country_code = ?,
      referral_source = ?,
      referral_community = ?,
      referral_other = ?,
      expansion_interests_json = ?,
      desktop_browsers_json = ?,
      mobile_apps_json = ?,
      annual_price_tier = ?,
      survey_completed_at = ?,
      updated_at = ?
    WHERE survey_token_hash = ?
      AND survey_completed_at IS NULL
      AND created_at >= ?
  `).bind(
    answers.country_code,
    answers.referral_source,
    answers.referral_community,
    answers.referral_other,
    JSON.stringify(answers.expansion_interests),
    JSON.stringify(answers.desktop_browsers),
    JSON.stringify(answers.mobile_apps),
    answers.annual_price_tier,
    now.toISOString(),
    now.toISOString(),
    surveyTokenHash,
    tokenCutoff
  ).run();

  if (!result.success || !result.meta || result.meta.changes !== 1) {
    return jsonResponse({
      ok: false,
      code: 'invalid_or_used_token',
      message: 'this survey session expired or was already submitted.'
    }, 409);
  }

  return jsonResponse({ ok: true });
}

async function authenticateAdminRequest(request, env) {
  if (env.ADMIN_DASHBOARD_ENABLED !== 'true') return { ok: false, status: 404 };

  const configuredEmail = normalizeEmail(env.ADMIN_EMAIL);
  const issuer = normalizeAccessIssuer(env.ACCESS_TEAM_DOMAIN);
  const expectedAudience = cleanString(env.ACCESS_AUD, 128);
  if (!configuredEmail || !issuer || !expectedAudience) {
    console.error('admin dashboard configuration is incomplete');
    return { ok: false, status: 503 };
  }

  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
  const accessEmail = normalizeEmail(request.headers.get('Cf-Access-Authenticated-User-Email'));
  if (!assertion || accessEmail !== configuredEmail) return { ok: false, status: 404 };

  const verified = await verifyAccessJwt(assertion, {
    issuer,
    audience: expectedAudience,
    email: configuredEmail
  });
  if (!verified.ok) return { ok: false, status: 404 };

  return { ok: true, email: configuredEmail };
}

async function verifyAccessJwt(token, expected) {
  if (typeof token !== 'string' || token.length > 16384) return { ok: false };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false };

  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64UrlText(parts[0]));
    payload = JSON.parse(decodeBase64UrlText(parts[1]));
  } catch (_) {
    return { ok: false };
  }

  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    return { ok: false };
  }

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (
    payload.iss !== expected.issuer
    || !audiences.includes(expected.audience)
    || normalizeEmail(payload.email) !== expected.email
    || payload.type !== 'app'
    || !Number.isFinite(payload.exp)
    || payload.exp < now - ACCESS_CLOCK_SKEW_SECONDS
    || (Number.isFinite(payload.nbf) && payload.nbf > now + ACCESS_CLOCK_SKEW_SECONDS)
  ) {
    return { ok: false };
  }

  let key;
  try {
    key = await getAccessPublicKey(expected.issuer, header.kid);
  } catch (_) {
    return { ok: false };
  }

  let signature;
  try {
    signature = decodeBase64UrlBytes(parts[2]);
  } catch (_) {
    return { ok: false };
  }

  try {
    const validSignature = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signature,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    return { ok: validSignature };
  } catch (_) {
    return { ok: false };
  }
}

async function getAccessPublicKey(issuer, kid) {
  const cacheKey = `${issuer}:${kid}`;
  const cached = accessKeyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.key;

  const response = await fetch(`${issuer}/cdn-cgi/access/certs`, {
    headers: { Accept: 'application/json' },
    cf: { cacheEverything: true, cacheTtl: 3600 }
  });
  if (!response.ok) throw new Error('access certs unavailable');

  const body = await response.json();
  const jwk = Array.isArray(body.keys)
    ? body.keys.find((candidate) => candidate && candidate.kid === kid)
    : null;
  if (!jwk) throw new Error('access signing key unavailable');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  accessKeyCache.set(cacheKey, { key, expiresAt: Date.now() + ACCESS_KEY_TTL_MS });
  return key;
}

async function handleAdminSubmissions(url, env, viewerEmail) {
  const page = clampInteger(url.searchParams.get('page'), 1, 101, 1);
  const query = cleanString(url.searchParams.get('q'), 120);
  const offset = Math.min((page - 1) * ADMIN_PAGE_SIZE, ADMIN_MAX_OFFSET);
  const searchPattern = `%${escapeSqlLike(query)}%`;
  const whereClause = query
    ? `WHERE email LIKE ? ESCAPE '\\'
        OR COALESCE(country_code, '') LIKE ? ESCAPE '\\'
        OR COALESCE(referral_source, '') LIKE ? ESCAPE '\\'
        OR COALESCE(referral_community, '') LIKE ? ESCAPE '\\'
        OR COALESCE(referral_other, '') LIKE ? ESCAPE '\\'`
    : '';
  const searchBindings = query ? Array(5).fill(searchPattern) : [];

  const summaryStatement = env.WAITLIST_DB.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(founding_eligible), 0) AS founding,
      COALESCE(SUM(CASE WHEN survey_completed_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS surveys
    FROM waitlist_submissions
  `);
  const countPrepared = env.WAITLIST_DB.prepare(`
    SELECT COUNT(*) AS total
    FROM waitlist_submissions
    ${whereClause}
  `);
  const countStatement = query ? countPrepared.bind(...searchBindings) : countPrepared;
  const rowsStatement = env.WAITLIST_DB.prepare(`
    SELECT
      id,
      email,
      legal_version,
      legal_agreed_at,
      founding_eligible,
      created_at,
      updated_at,
      country_code,
      referral_source,
      referral_community,
      referral_other,
      expansion_interests_json,
      desktop_browsers_json,
      mobile_apps_json,
      annual_price_tier,
      survey_completed_at,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer_host
    FROM waitlist_submissions
    ${whereClause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).bind(...searchBindings, ADMIN_PAGE_SIZE, offset);

  const [summaryResult, countResult, rowsResult] = await env.WAITLIST_DB.batch([
    summaryStatement,
    countStatement,
    rowsStatement
  ]);
  const summaryRow = summaryResult.results?.[0] || {};
  const filteredTotal = Number(countResult.results?.[0]?.total || 0);
  const foundingLimit = parsePositiveInteger(env.FOUNDING_LIMIT, 100);
  const foundingCount = Number(summaryRow.founding || 0);
  const rows = (rowsResult.results || []).map(normalizeAdminRow);

  return jsonResponse({
    ok: true,
    viewer: viewerEmail,
    summary: {
      total: Number(summaryRow.total || 0),
      founding: foundingCount,
      remaining: Math.max(foundingLimit - foundingCount, 0),
      surveys: Number(summaryRow.surveys || 0)
    },
    pagination: {
      page,
      page_size: ADMIN_PAGE_SIZE,
      total: filteredTotal,
      pages: Math.max(Math.ceil(filteredTotal / ADMIN_PAGE_SIZE), 1)
    },
    rows
  });
}

async function handleAdminCsvExport(env) {
  const result = await env.WAITLIST_DB.prepare(`
    SELECT
      id,
      email,
      founding_eligible,
      legal_version,
      legal_agreed_at,
      created_at,
      updated_at,
      country_code,
      referral_source,
      referral_community,
      referral_other,
      expansion_interests_json,
      desktop_browsers_json,
      mobile_apps_json,
      annual_price_tier,
      survey_completed_at,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer_host
    FROM waitlist_submissions
    ORDER BY id ASC
  `).all();

  const columns = [
    'id',
    'email',
    'founding_eligible',
    'legal_version',
    'legal_agreed_at',
    'created_at',
    'updated_at',
    'country_code',
    'referral_source',
    'referral_community',
    'referral_other',
    'expansion_interests',
    'desktop_browsers',
    'mobile_apps',
    'annual_price_tier',
    'survey_completed_at',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'referrer_host'
  ];
  const lines = [columns.join(',')];
  for (const row of result.results || []) {
    const normalized = normalizeAdminRow(row);
    const exportRow = {
      ...normalized,
      expansion_interests: normalized.expansion_interests.join(' | '),
      desktop_browsers: normalized.desktop_browsers.join(' | '),
      mobile_apps: normalized.mobile_apps.join(' | ')
    };
    lines.push(columns.map((column) => csvCell(exportRow[column])).join(','));
  }

  return new Response(`\uFEFF${lines.join('\r\n')}`, {
    headers: {
      ...ADMIN_PAGE_HEADERS,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cognoscene-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}

function normalizeAdminRow(row) {
  return {
    ...row,
    founding_eligible: Number(row.founding_eligible || 0) === 1,
    expansion_interests: parseStoredJsonArray(row.expansion_interests_json),
    desktop_browsers: parseStoredJsonArray(row.desktop_browsers_json),
    mobile_apps: parseStoredJsonArray(row.mobile_apps_json)
  };
}

function parseStoredJsonArray(value) {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch (_) {
    return [];
  }
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeSqlLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function clampInteger(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, minimum), maximum);
}

function normalizeAccessIssuer(value) {
  const raw = cleanString(value, 255);
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('https://') ? raw : `https://${raw}`);
    if (
      url.protocol !== 'https:'
      || !url.hostname.endsWith('.cloudflareaccess.com')
      || url.username
      || url.password
      || url.port
      || url.search
      || url.hash
      || (url.pathname !== '/' && url.pathname !== '')
    ) return '';
    return url.origin;
  } catch (_) {
    return '';
  }
}

function decodeBase64UrlText(value) {
  return new TextDecoder().decode(decodeBase64UrlBytes(value));
}

function decodeBase64UrlBytes(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error('invalid base64url');
  }
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function validateJsonRequest(request) {
  if (!isSameOrigin(request)) {
    return jsonResponse({ ok: false, code: 'origin_rejected' }, 403);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ ok: false, code: 'content_type_required' }, 415);
  }

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, code: 'payload_too_large' }, 413);
  }

  return null;
}

function isSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch (_) {
    return false;
  }
}

async function readJson(request) {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    throw new Error('the submitted data is too large.');
  }
  try {
    return JSON.parse(body);
  } catch (_) {
    throw new Error('the submitted data is invalid.');
  }
}

async function verifyTurnstile(token, env) {
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);

  let response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body
    });
  } catch (_) {
    return { ok: false };
  }

  if (!response.ok) return { ok: false };
  const result = await response.json();
  return {
    ok: result.success === true
      && result.hostname === env.TURNSTILE_HOSTNAME
      && result.action === 'waitlist_signup'
  };
}

function validateSurvey(payload) {
  const countryCode = cleanString(payload.country_code, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, message: 'choose your country or region.' };
  }

  const referralSource = cleanString(payload.referral_source, 24);
  if (!REFERRAL_SOURCES.has(referralSource)) {
    return { ok: false, message: 'choose where you found cognoscene.' };
  }

  const referralCommunity = referralSource === 'community'
    ? cleanString(payload.referral_community, 80)
    : '';
  const referralOther = referralSource === 'other'
    ? cleanString(payload.referral_other, 80)
    : '';

  if (referralSource === 'community' && !referralCommunity) {
    return { ok: false, message: 'tell us which community.' };
  }
  if (referralSource === 'other' && !referralOther) {
    return { ok: false, message: 'tell us where you found cognoscene.' };
  }

  const expansionInterests = validateStringArray(payload.expansion_interests, EXPANSION_INTERESTS, 3);
  if (!expansionInterests || expansionInterests.length === 0) {
    return { ok: false, message: 'choose at least one cognoscene version.' };
  }
  if (expansionInterests.includes('chrome') && expansionInterests.length !== 1) {
    return { ok: false, message: 'chrome is enough cannot be combined with another version.' };
  }

  const desktopBrowsers = validateStringArray(payload.desktop_browsers, DESKTOP_BROWSERS, 5);
  const mobileApps = validateStringArray(payload.mobile_apps, MOBILE_APPS, 2);
  if (!desktopBrowsers || !mobileApps) {
    return { ok: false, message: 'one or more platform answers are invalid.' };
  }
  if (expansionInterests.includes('desktop') && desktopBrowsers.length === 0) {
    return { ok: false, message: 'choose at least one desktop browser.' };
  }
  if (expansionInterests.includes('mobile_app') && mobileApps.length === 0) {
    return { ok: false, message: 'choose at least one mobile app.' };
  }
  if (!expansionInterests.includes('desktop') && desktopBrowsers.length !== 0) {
    return { ok: false, message: 'desktop browser answers do not match your selected version.' };
  }
  if (!expansionInterests.includes('mobile_app') && mobileApps.length !== 0) {
    return { ok: false, message: 'mobile app answers do not match your selected version.' };
  }

  const annualPriceTier = cleanString(payload.annual_price_tier, 24);
  if (!ANNUAL_PRICE_TIERS.has(annualPriceTier)) {
    return { ok: false, message: 'choose a valid annual price.' };
  }

  return {
    ok: true,
    answers: {
      country_code: countryCode,
      referral_source: referralSource,
      referral_community: referralCommunity || null,
      referral_other: referralOther || null,
      expansion_interests: expansionInterests,
      desktop_browsers: desktopBrowsers,
      mobile_apps: mobileApps,
      annual_price_tier: annualPriceTier
    }
  };
}

function validateStringArray(value, allowedValues, maximumLength) {
  if (!Array.isArray(value) || value.length > maximumLength) return null;
  const uniqueValues = Array.from(new Set(value));
  if (uniqueValues.some((item) => typeof item !== 'string' || !allowedValues.has(item))) return null;
  return uniqueValues;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_PATTERN.test(email)) return '';
  return email;
}

function cleanString(value, maximumLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maximumLength);
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getReferrerHost(request) {
  const referrer = request.headers.get('Referer');
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.slice(0, 255) || null;
  } catch (_) {
    return null;
  }
}

function cleanHostname(value) {
  const hostname = cleanString(value, 255).toLowerCase();
  if (!hostname || !/^[a-z0-9.-]+$/.test(hostname) || hostname.includes('..')) return null;
  return hostname;
}

function createOpaqueToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isUniqueEmailError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('UNIQUE constraint failed: waitlist_submissions.email');
}
