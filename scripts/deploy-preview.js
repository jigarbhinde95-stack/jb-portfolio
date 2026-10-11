import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function deployPreview(projectRoot = process.cwd()) {
  const dist = resolve(projectRoot, 'dist');
  if (!existsSync(join(dist, 'index.html'))) throw new Error('Build the site with npm run build before deploying.');
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'jb-pages-index-'));
  // Use an isolated Git index to publish only build output, preserving the source index and branch.
  const env = { ...process.env, GIT_INDEX_FILE: join(temporaryDirectory, 'index') };
  const git = args => execFileSync('git', args, { cwd: projectRoot, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git(['fetch', 'origin', 'gh-pages']);
    const parent = git(['rev-parse', 'FETCH_HEAD']);
    writeFileSync(join(dist, '.nojekyll'), '');
    git(['read-tree', '--empty']);
    git(['--work-tree', dist, 'add', '--all']);
    const tree = git(['write-tree']);
    if (!git(['ls-tree', '--name-only', tree]).split('\n').includes('index.html')) throw new Error('Refusing to publish a build without index.html.');
    if (tree === git(['rev-parse', `${parent}^{tree}`])) {
      console.log('The preview branch already matches this build.');
      return parent;
    }
    const source = git(['rev-parse', '--short', 'HEAD']);
    const commit = git(['commit-tree', tree, '-p', parent, '-m', `Update web resume preview from ${source}`]);
    git(['push', 'origin', `${commit}:refs/heads/gh-pages`]);
    console.log(`Published build to gh-pages: ${commit}`);
    return commit;
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { deployPreview(); }
  catch (error) {
    console.error(error.stderr?.toString().trim() || error.message);
    process.exitCode = 1;
  }
}
