import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { verifyStaticCache } from './verify-static-cache.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'dashboard-cache-'));
  for (const name of [
    'umi.12345678.js',
    'preload_helper.abcdef12.js',
    'common-async.87654321.js',
  ])
    writeFileSync(join(root, name), '');
  writeFileSync(
    join(root, 'index.html'),
    '<script src="/preload_helper.abcdef12.js"></script><script src="/umi.12345678.js"></script>',
  );
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('checks all release chunks and versioned HTML references', () =>
  fixture((root) => {
    assert.equal(verifyStaticCache(root).length, 3);
  }));

test('rejects the former immutable, unhashed shared chunk', () =>
  fixture((root) => {
    writeFileSync(join(root, 'common-async.js'), '');
    assert.throws(() => verifyStaticCache(root), /Unversioned release asset/);
  }));

test('rejects a stale unversioned preloader reference', () =>
  fixture((root) => {
    writeFileSync(
      join(root, 'index.html'),
      '<script src="/preload_helper.js"></script><script src="/umi.12345678.js"></script>',
    );
    assert.throws(() => verifyStaticCache(root), /route preloader/);
  }));

test('rejects HTML referring to files from another release', () =>
  fixture((root) => {
    writeFileSync(
      join(root, 'index.html'),
      '<script src="/preload_helper.abcdef12.js"></script><script src="/umi.00000000.js"></script>',
    );
    assert.throws(() => verifyStaticCache(root), /Missing referenced asset/);
  }));
