// Run: node --experimental-detect-module --test <this file>
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient, QueryObserver } from '@tanstack/query-core';

import { freshRecord } from './freshRecord.js';

const queryKey = ['student-detail', 's1'];

// A cached record, then an observer opened the way the edit modals open one.
const open = (client, queryFn) =>
  new QueryObserver(client, { queryKey, queryFn, staleTime: 0, retry: false });

const seeded = () => {
  const client = new QueryClient();
  client.setQueryData(queryKey, { data: { isActive: true } });
  return client;
};

const settle = (client, observer) =>
  new Promise((resolve) => {
    const stop = observer.subscribe(() => {
      if (client.isFetching() === 0) {
        stop();
        resolve(observer.getCurrentResult());
      }
    });
  });

test('a cached record is withheld until the refetch lands', async () => {
  const client = seeded();
  const observer = open(client, async () => ({ data: { isActive: false } }));

  assert.equal(freshRecord(observer.getCurrentResult()), undefined);
  assert.deepEqual(freshRecord(await settle(client, observer)), { isActive: false });
});

test('a failed refetch does not release the cached record', async () => {
  const client = seeded();
  const observer = open(client, async () => {
    throw new Error('offline');
  });

  const result = await settle(client, observer);
  assert.equal(result.isFetchedAfterMount, true);
  assert.deepEqual(result.data, { data: { isActive: true } });
  assert.equal(freshRecord(result), undefined);
});

test('each open needs its own fetch: a new observer starts over', async () => {
  const client = seeded();
  const first = open(client, async () => ({ data: { isActive: true } }));
  await settle(client, first);

  const second = open(client, async () => ({ data: { isActive: false } }));
  assert.equal(freshRecord(second.getCurrentResult()), undefined);
});

test('freshRecord reads the API envelope and tolerates an empty one', () => {
  const ok = { isFetchedAfterMount: true, isError: false };
  assert.deepEqual(freshRecord({ ...ok, data: { data: { a: 1 } } }), { a: 1 });
  assert.equal(freshRecord({ ...ok, data: undefined }), undefined);
});
