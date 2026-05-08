import { test, mock } from 'node:test';
import assert from 'node:assert';
import { getSkill, getSkills, recommend, ApiError, NetworkError } from '../../src/api/client.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('NetworkError on fetch reject', async () => {
  globalThis.fetch = mock.fn(() => Promise.reject(new TypeError('refused')));
  await assert.rejects(() => getSkill('x'), (e) => e instanceof NetworkError);
});

test('ApiError on 404 with code/message', async () => {
  globalThis.fetch = mock.fn(() =>
    Promise.resolve(jsonResponse({ code: 'NOT_FOUND', message: 'no such skill' }, 404))
  );
  await assert.rejects(
    () => getSkill('x'),
    (e) => e instanceof ApiError && e.status === 404 && e.code === 'NOT_FOUND'
  );
});

test('ApiError on 500 with empty body', async () => {
  globalThis.fetch = mock.fn(() =>
    Promise.resolve(new Response('', { status: 500, statusText: 'Internal Server Error' }))
  );
  await assert.rejects(
    () => getSkill('x'),
    (e) => e instanceof ApiError && e.status === 500 && e.code === 'UNKNOWN'
  );
});

test('getSkills with no category omits query param', async () => {
  let capturedUrl = null;
  globalThis.fetch = mock.fn((url) => {
    capturedUrl = url;
    return Promise.resolve(jsonResponse({ skills: [] }));
  });
  await getSkills();
  assert.match(capturedUrl, /\/skills$/);
});

test('getSkills with "all" omits query param', async () => {
  let capturedUrl = null;
  globalThis.fetch = mock.fn((url) => {
    capturedUrl = url;
    return Promise.resolve(jsonResponse({ skills: [] }));
  });
  await getSkills('all');
  assert.match(capturedUrl, /\/skills$/);
});

test('getSkills with enum value passes category', async () => {
  let capturedUrl = null;
  globalThis.fetch = mock.fn((url) => {
    capturedUrl = url;
    return Promise.resolve(jsonResponse({ skills: [] }));
  });
  await getSkills('SPRING_BOOT');
  assert.match(capturedUrl, /\/skills\?category=SPRING_BOOT$/);
});

test('recommend encodes query string', async () => {
  let capturedUrl = null;
  globalThis.fetch = mock.fn((url) => {
    capturedUrl = url;
    return Promise.resolve(jsonResponse({ skills: [] }));
  });
  await recommend('hello world');
  assert.match(capturedUrl, /\/skills\/recommendations\?query=hello%20world$/);
});
