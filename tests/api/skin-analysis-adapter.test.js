const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const requestHandler = require('../../dev-server');

test('skin-analysis proxy enforces consent, forwards an allowlist and validates upstream scores', async () => {
  const keys = ['SKIN_ANALYSIS_ADAPTER_URL', 'SKIN_ANALYSIS_ADAPTER_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'VERCEL'];
  const savedEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = global.fetch;
  const adapterUrl = 'https://adapter.test/skin-analysis';
  const token = 'unit-test-secret';
  const kvUrl = 'https://kv.test/pipeline';
  let kvAvailable = true; let kvCommand;
  let upstreamPayload; let upstreamAuthorization; let upstreamCallCount = 0;
  let upstreamBody = Object.fromEntries(['acne', 'pigmentation', 'wrinkles', 'redness', 'pores'].map(key => [key, { raw_score: 0.3, ui_score: 75, level: 'Khá tốt' }]));
  process.env.SKIN_ANALYSIS_ADAPTER_URL = '';
  process.env.SKIN_ANALYSIS_ADAPTER_TOKEN = '';
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.VERCEL;
  global.fetch = async (url, options) => {
    if (String(url) === kvUrl) {
      kvCommand = JSON.parse(options.body);
      return { ok: kvAvailable, json: async () => ({ result: 1 }) };
    }
    if (String(url) !== adapterUrl) return originalFetch(url, options);
    upstreamCallCount += 1;
    upstreamPayload = JSON.parse(options.body);
    upstreamAuthorization = options.headers.Authorization;
    return { ok: true, json: async () => upstreamBody };
  };

  const send = async (ip, data, extraHeaders) => {
    const raw = JSON.stringify(data);
    const req = Readable.from([raw]);
    req.method = 'POST'; req.url = '/api/skin-analysis';
    req.headers = Object.assign({ 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(raw)), 'x-forwarded-for': ip }, extraHeaders || {});
    req.socket = { remoteAddress: '127.0.0.1' };
    const res = { writeHead(status, headers) { this.statusCode = status; this.headers = headers; }, end(body) { this.body = body; } };
    await requestHandler(req, res);
    return { status: res.statusCode, json: () => JSON.parse(res.body) };
  };

  try {
    const image = 'data:image/jpeg;base64,AA==';
    const validRequest = { provider: 'perfect_corp', face_mask_applied: true, cloud_consent: true, cloud_consent_at: new Date().toISOString(), image, metadata: { debug_image: image } };
    const offline = await send('198.51.100.239', validRequest);
    assert.equal(offline.status, 503);
    assert.equal(offline.json().error, 'cloud_adapter_not_configured');
    const noConsent = await send('198.51.100.238', Object.assign({}, validRequest, { cloud_consent: false }));
    assert.equal(noConsent.status, 400);
    assert.equal(noConsent.json().error, 'cloud_consent_required');
    const noMask = await send('198.51.100.237', Object.assign({}, validRequest, { face_mask_applied: false }));
    assert.equal(noMask.status, 400);
    assert.equal(noMask.json().error, 'face_mask_required');
    const badConsentTime = await send('198.51.100.236', Object.assign({}, validRequest, { cloud_consent_at: 'not-a-date' }));
    assert.equal(badConsentTime.status, 400);
    assert.equal(badConsentTime.json().error, 'cloud_consent_required');
    const rateLimitIp = '203.0.113.111';
    for (let index = 0; index < 5; index++) assert.equal((await send(rateLimitIp, validRequest)).status, 503);
    const limited = await send(rateLimitIp, validRequest);
    assert.equal(limited.status, 429);
    assert.equal(limited.json().error, 'rate_limited');
    process.env.VERCEL = '1';
    const noDistributedLimiter = await send('203.0.113.112', validRequest);
    assert.equal(noDistributedLimiter.status, 503);
    assert.equal(noDistributedLimiter.json().error, 'rate_limit_unavailable');
    delete process.env.VERCEL;
    process.env.SKIN_ANALYSIS_ADAPTER_URL = adapterUrl;
    process.env.SKIN_ANALYSIS_ADAPTER_TOKEN = token;
    process.env.KV_REST_API_URL = kvUrl;
    process.env.KV_REST_API_TOKEN = 'kv-unit-secret';
    process.env.VERCEL = '1';
    kvAvailable = false;
    const kvUnavailable = await send('198.51.100.239', validRequest);
    assert.equal(kvUnavailable.status, 503);
    assert.equal(kvUnavailable.json().error, 'rate_limit_unavailable');
    assert.equal(upstreamCallCount, 0);
    kvAvailable = true;
    const success = await send('198.51.100.241', validRequest, { 'x-vercel-forwarded-for': '203.0.113.44' });
    assert.equal(success.status, 200);
    const normalized = success.json();
    assert.deepEqual(normalized, {
      success: true, provider: 'perfect_corp',
      scores: Object.fromEntries(['acne', 'pigmentation', 'wrinkles', 'redness', 'pores'].map(key => [key, { raw_score: 0.3, ui_score: 75, level: 'Khá tốt' }]))
    });
    assert.equal(upstreamAuthorization, 'Bearer ' + token);
    assert.deepEqual(upstreamPayload, { provider: 'perfect_corp', image });
    assert.equal(kvCommand[0], 'EVAL');
    assert.equal(kvCommand.includes('198.51.100.241'), false);
    const expectedRateKey = 'skin-analysis-rate:' + require('node:crypto').createHash('sha256').update('203.0.113.44').digest('hex').slice(0, 32);
    assert.equal(kvCommand[3], expectedRateKey);
    assert.equal(JSON.stringify(normalized).includes(token), false);

    assert.equal(upstreamCallCount, 1);

    const unsupported = await send('198.51.100.242', Object.assign({}, validRequest, { provider: 'unlisted_provider' }));
    assert.equal(unsupported.status, 400);
    assert.equal(unsupported.json().error, 'provider_not_supported');
    assert.equal(upstreamCallCount, 1);

    upstreamBody = { scores: { acne: { raw_score: 5, ui_score: 100 } } };
    const malformed = await send('198.51.100.243', validRequest);
    assert.equal(malformed.status, 502);
    assert.equal(malformed.json().error, 'cloud_adapter_failed');
    assert.equal(malformed.json().fallback, 'client_edge');
  } finally {
    global.fetch = originalFetch;
    keys.forEach(key => { if (savedEnv[key] === undefined) delete process.env[key]; else process.env[key] = savedEnv[key]; });
  }
});
