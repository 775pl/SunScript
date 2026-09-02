// Run after npm run build. Pass the installed Vercel CLI package directory.
// Copies only traced runtime dependencies + Vercel's default views glob to an
// isolated directory, so the project's node_modules cannot hide missing files.
import assert from 'node:assert/strict';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert(process.argv[2], 'Pass the installed Vercel CLI package directory');
const requireCli = createRequire(join(resolve(process.argv[2]), 'package.json'));
const { nodeFileTrace } = requireCli('@vercel/nft');
const { fileList } = await nodeFileTrace(['dist/main.js'], { base: root, processCwd: root });
const ejsFiles = [...fileList].filter(path => /[/\\]ejs[/\\]/.test(path));
console.log('Traced EJS files:', ejsFiles.length);
assert(ejsFiles.length > 0, 'EJS must be included in the serverless dependency trace');
const fixture = mkdtempSync(join(tmpdir(), 'sunscript-runtime-'));
let child;
try {
  for (const path of fileList) {
    const target = resolve(fixture, path);
    assert(target.startsWith(fixture + sep), 'Traced path must remain inside the fixture');
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, path), target);
  }
  cpSync(join(root, 'views'), join(fixture, 'views'), { recursive: true });
  const env = { ...process.env, NODE_ENV: 'production', SITE_URL: 'https://sunscript.fr' };
  delete env.NODE_PATH;
  child = spawn(process.execPath, ['-e', `
    require('./dist/create-app').createApp().then(async app => {
      await app.listen(0, '127.0.0.1');
      console.log('READY ' + await app.getUrl());
    }).catch(error => { console.error(error); process.exit(1); });
  `], { cwd: fixture, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let logs = '';
  child.stderr.on('data', data => { logs += data; });
  const base = await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('Runtime startup timed out: ' + logs)), 15000);
    child.once('error', error => { clearTimeout(timer); fail(error); });
    child.once('exit', code => { clearTimeout(timer); fail(new Error('Runtime exited: ' + code + '\n' + logs)); });
    let output = '';
    child.stdout.on('data', data => {
      logs += data;
      output += data;
      const match = output.match(/READY (http:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); done(match[1]); }
    });
  });
  for (const [path, expected] of [['/health', 200], ['/', 200], ['/cgv', 200], ['/confidentialite', 200], ['/service-web', 200], ['/service-systemes', 200], ['/service-apis', 200], ['/mentions-legales', 200], ['/missing', 404]]) {
    const response = await fetch(base + path);
    const body = await response.text();
    console.log(path, response.status);
    assert.equal(response.status, expected, `${path}: ${body}\n${logs}`);
    if (path !== '/health') assert(body.includes('<main'), 'EJS must render the page and its partials');
  }
  console.log('PASS: pages render with only the traced serverless dependencies');
} finally {
  if (child && child.exitCode === null) {
    const closed = once(child, 'close');
    child.kill();
    await closed;
  }
  assert(dirname(fixture) === resolve(tmpdir()) && fixture.startsWith(join(tmpdir(), 'sunscript-runtime-')));
  rmSync(fixture, { recursive: true, force: true });
}
