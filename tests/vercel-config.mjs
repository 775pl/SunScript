// Offline regression against the installed Vercel CLI, without linking or deploying.
// Usage: node tests/vercel-config.mjs /absolute/path/to/node_modules/vercel
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert(process.argv[2], 'Pass the installed Vercel CLI package directory');
const cli = resolve(process.argv[2]);
const cliPackage = JSON.parse(readFileSync(join(cli, 'package.json'), 'utf8'));
assert.equal(cliPackage.version, '59.3.0', 'This regression targets the reported CLI version');
const requireCli = createRequire(join(cli, 'package.json'));
const chunks = join(cli, 'dist', 'chunks');
const chunk = readdirSync(chunks).find(name => name.endsWith('.js')
  && readFileSync(join(chunks, name), 'utf8').includes('function checkUnusedFunctions('));
assert(chunk, 'Find the real CLI validator, not a local reimplementation');
const exports = await import(pathToFileURL(join(chunks, chunk)).href);
let detectors;
for (const [key, load] of Object.entries(exports)) {
  if (/^require_dist\d*$/.test(key) && typeof load === 'function') {
    const candidate = load();
    if (candidate.detectBuilders) { detectors = candidate; break; }
  }
}
assert(detectors, 'Vercel filesystem detector must be available');
const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/);
const detect = functions => detectors.detectBuilders([...files], pkg, {
  functions, projectSettings: config, workPath: root,
});

const broken = await detect({ 'src/main.ts': { includeFiles: 'views/**/*' } });
assert.equal(broken.errors?.[0]?.code, 'unused_function');
assert(broken.errors[0].message.includes('inside the `api` directory'));
console.log('REPRODUCED:', broken.errors[0].message);

const fixed = await detect(config.functions);
assert.equal(fixed.errors, null);
assert(fixed.builders.some(builder => builder.use === '@vercel/nestjs'));
console.log('PASS: corrected configuration selects @vercel/nestjs without validation errors');

// Exercise the actual helper used by @vercel/nestjs. Intercept the downstream
// Node build to inspect its inputs; this is not a full cloud deployment test.
const { generateNodeBuilderFunctions } = requireCli('@vercel/build-utils');
const builder = generateNodeBuilderFunctions('nestjs',
  /(?:from|require|import)\s*(?:\(\s*)?["']@nestjs\/core["']\s*(?:\))?/g,
  ['src/main', 'src/app', 'src/index', 'src/server', 'main', 'app', 'index', 'server'],
  ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts'], async args => {
    assert(args.config.includeFiles.includes('views/**/*'));
    assert.equal(await args.entrypointCallback(), 'src/main.ts');
    assert.equal(args.considerBuildCommand, true);
    return { output: {} };
  });
await builder.build({ files: {}, workPath: root, config: { projectSettings: config } });
console.log('PASS: native builder includes views/**/* and resolves src/main.ts');
