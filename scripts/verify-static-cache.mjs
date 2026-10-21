import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function verifyStaticCache(directory) {
  const root = resolve(directory);
  const scripts = [];
  function scan(folder) {
    for (const entry of readdirSync(folder)) {
      const file = join(folder, entry);
      if (statSync(file).isDirectory()) scan(file);
      else if (/\.(js|css)$/.test(entry)) {
        assert.match(
          entry,
          /\.[0-9a-f]{8,}\.(js|css)$/,
          `Unversioned release asset: ${entry}`,
        );
        scripts.push(file.slice(root.length));
      }
    }
  }
  scan(root);
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const referenced = Array.from(
    html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g),
    (match) => match[1],
  );
  assert(
    referenced.some((file) => /\/umi\.[0-9a-f]+\.js$/.test(file)),
    'Missing versioned entry script',
  );
  assert(
    referenced.some((file) => /\/preload_helper\.[0-9a-f]+\.js$/.test(file)),
    'Missing versioned route preloader',
  );
  for (const file of referenced)
    assert(scripts.includes(file), `Missing referenced asset: ${file}`);
  return scripts.sort();
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === new URL(import.meta.url).pathname
) {
  const assets = verifyStaticCache(process.argv[2] || 'dist');
  console.log(
    process.argv.includes('--list')
      ? assets.join('\n')
      : `Verified ${assets.length} versioned JS/CSS assets, including entry and route preloader.`,
  );
}
