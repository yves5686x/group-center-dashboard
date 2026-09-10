const fs = require('node:fs');

const messagePath = process.argv[2];

if (!messagePath) {
  console.error('Error: commit message path is required.');
  process.exit(1);
}

const message = fs
  .readFileSync(messagePath, 'utf8')
  .replace(/^#.*[\n\r]*/gm, '')
  .trim();

const types = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'workflow',
  'build',
  'ci',
  'chore',
  'types',
  'wip',
  'release',
  'dep',
  'deps',
  'example',
  'examples',
  'merge',
  'revert',
];
const commitPattern = new RegExp(
  `^(((${types.join('|')})(\\(.+\\))?:)|(Merge|Revert|Version)) .{1,50}`,
  'i',
);

if (!commitPattern.test(message)) {
  console.error('\nError: Invalid commit message format.\n');
  console.error('Examples:');
  console.error('  chore(release): update changelog');
  console.error('  fix(core): handle events on blur (close #28)\n');
  process.exit(1);
}
