import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createReadonlyPreviewProxy } from './lib/readonly-preview-proxy.mjs';

test('real-data bridge forwards reads and task search, blocks production mutations', async (t) => {
  const requests = [];
  const upstream = http.createServer((request, response) => {
    requests.push({ method: request.method, path: request.url });
    request.resume();
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ isSucceed: true, result: [] }));
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const proxy = createReadonlyPreviewProxy(
    `http://127.0.0.1:${upstream.address().port}`,
  );
  await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    proxy.closeAllConnections();
    proxy.close();
    upstream.closeAllConnections();
    upstream.close();
  });
  const base = `http://127.0.0.1:${proxy.address().port}`;
  const read = await fetch(
    base + '/web/dashboard/statistics/users?timePeriod=ONE_WEEK',
  );
  await read.json();
  assert.equal(read.status, 200);
  assert.equal(read.headers.get('x-gc-preview-source'), 'server-read-only');
  assert.equal(read.headers.get('cache-control'), 'no-store');
  const query = await fetch(base + '/web/open/gpu-tasks/query', {
    method: 'POST',
    body: '{}',
  });
  await query.json();
  assert.equal(query.status, 200);
  for (const [method, path] of [
    ['POST', '/web/dashboard/statistics/cache/clear'],
    ['POST', '/api/project-subscription'],
    ['DELETE', '/api/task/1'],
    ['PUT', '/api/settings'],
  ]) {
    const blocked = await fetch(base + path, { method });
    await blocked.json();
    assert.equal(blocked.status, 405);
  }
  assert.deepEqual(
    requests.map((r) => r.method),
    ['GET', 'POST'],
  );
});
