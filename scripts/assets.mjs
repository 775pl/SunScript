import { build, context } from 'esbuild';
import { readdir } from 'node:fs/promises';

const pages = (await readdir('src/styles/pages')).filter(name => name.endsWith('.css'));
const options = {
  entryPoints: [
    { in: 'src/client/site.js', out: 'site' },
    ...pages.map(name => ({ in: `src/styles/pages/${name}`, out: name.replace('.css', '') })),
  ],
  outdir: 'public/assets', minify: true, bundle: false, target: 'es2022',
};
if (process.argv.includes('--watch')) {
  const watcher = await context(options);
  await watcher.watch();
  console.log('Watching client assets.');
} else await build(options);
