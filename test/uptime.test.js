const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { promisify } = require('node:util');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'uptime-test-'));
process.env.UPTIME_DATA_DIR = path.join(temporary, 'data');
process.env.UPTIME_LOG_DIR = path.join(temporary, 'logs');
const data = require('../lib/data');
const helpers = require('../lib/helpers');
const workers = require('../lib/workers');
const { httpServer } = require('../lib/server');
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

test('password records are salted and storage rejects path-like identifiers', async () => {
  const first = helpers.hash('a test password');
  assert.notEqual(first, helpers.hash('a test password'));
  assert.equal(helpers.verifyPassword('a test password', first), true);
  assert.equal(helpers.verifyPassword('wrong', first), false);
  assert.equal(helpers.verifyPassword('a test password', 'legacy-hash'), false);
  await assert.rejects(promisify(data.create)('users', '../escape', {}), /Invalid storage key/);
});

test('real HTTP user/session/check lifecycle and rejection cases', async () => {
  await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${httpServer.address().port}`;
  const request = async (pathname, method = 'GET', body, token) => {
    const response = await fetch(origin + pathname, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    assert.equal((await request('/ping')).status, 200);
    assert.equal((await request('/__proto__')).status, 404);
    assert.equal((await request('/api/users', 'POST', { tosAgreement: true })).status, 400);
    const user = { firstName: 'Demo', lastName: 'User', phone: '2025550100', password: 'local-example-only', tosAgreement: true };
    assert.equal((await request('/api/users', 'POST', user)).status, 200);
    const session = await request('/api/tokens', 'POST', { phone: user.phone, password: user.password });
    assert.equal(session.status, 200);
    const token = session.body.id;
    const check = { protocol: 'http', url: '127.0.0.1:4000/ping', method: 'get', successCodes: [200], timeoutSeconds: 2 };
    assert.equal((await request('/api/checks', 'POST', check)).status, 403);
    await promisify(data.update)('tokens', token, { ...session.body, expires: 1 });
    assert.equal((await request('/api/checks', 'POST', check, token)).status, 403);
    await promisify(data.update)('tokens', token, session.body);
    const created = await request('/api/checks', 'POST', check, token);
    assert.equal(created.status, 200);
    assert.equal((await request(`/api/checks?id=${created.body.id}`, 'GET', undefined, token)).status, 200);
    const profile = await request(`/api/users?phone=${user.phone}`, 'GET', undefined, token);
    assert.equal(profile.body.hashedPassword, undefined);
    assert.equal((await request(`/api/users?phone=${user.phone}`, 'DELETE', undefined, token)).status, 200);
    await assert.rejects(promisify(data.read)('checks', created.body.id));
    const malformed = await fetch(origin + '/api/users', { method: 'POST', body: 'null' });
    assert.equal(malformed.status, 400);
    const oversized = await fetch(origin + '/api/users', { method: 'POST', body: 'x'.repeat(70000) });
    assert.equal(oversized.status, 413);
  } finally {
    httpServer.closeAllConnections();
    await new Promise(resolve => httpServer.close(resolve));
  }
});

test('worker honors custom ports and reports a timeout once', async () => {
  const probe = http.createServer((request, response) => {
    if (request.url === '/ok') response.end('healthy');
  });

  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const original = workers.processCheckOutcome;
  const outcomes = [];
  const check = suffix => new Promise(resolve => {
    workers.processCheckOutcome = (_, outcome) => { outcomes.push(outcome); resolve(outcome); };
    workers.performCheck({
      protocol: 'http', url: `127.0.0.1:${probe.address().port}/${suffix}`,
      method: 'get', timeoutSeconds: 1,
    });
  });
  try {
    assert.equal((await check('ok')).responseCode, 200);
    assert.equal((await check('hang')).error.value, 'timeout');
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(outcomes.length, 2);
  } finally {
    workers.processCheckOutcome = original;
    probe.closeAllConnections();
    await new Promise(resolve => probe.close(resolve));
  }
});

test('malformed check URLs are recorded as failures instead of crashing the worker', () => {
  const original = workers.processCheckOutcome;
  let outcome;
  workers.processCheckOutcome = (_, result) => { outcome = result; };
  try {
    workers.performCheck({ protocol: 'http', url: '[]', method: 'get', timeoutSeconds: 1 });
    assert.equal(outcome.error.value, 'Invalid check URL');
  } finally {
    workers.processCheckOutcome = original;
  }
});
