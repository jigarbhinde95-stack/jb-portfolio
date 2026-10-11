import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deployPreview } from './deploy-preview.js';

test('deployment preserves staged source changes and preview history, and publishes only build files', () => {
  const root = mkdtempSync(join(tmpdir(), 'jb-pages-test-'));
  const project = join(root, 'project');
  const remote = join(root, 'remote.git');
  const git = (args, cwd = project) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    mkdirSync(project);
    git(['init', '--bare', remote], root);
    git(['init', '-b', 'main']);
    git(['config', 'user.name', 'Preview test']);
    git(['config', 'user.email', 'test@example.com']);
    git(['remote', 'add', 'origin', remote]);
    writeFileSync(join(project, '.gitignore'), 'dist/\n');
    writeFileSync(join(project, 'source.txt'), 'Original source');
    git(['add', '.']);
    git(['commit', '-m', 'Source commit']);
    git(['push', 'origin', 'main:gh-pages']);
    const originalHead = git(['rev-parse', 'HEAD']);
    writeFileSync(join(project, 'source.txt'), 'Staged user change');
    git(['add', 'source.txt']);
    const originalStatus = git(['status', '--porcelain']);
    const originalIndex = git(['write-tree']);
    mkdirSync(join(project, 'dist'));
    writeFileSync(join(project, 'dist/index.html'), '<h1>Built preview</h1>');
    const commit = deployPreview(project);
    assert.equal(git(['rev-parse', 'HEAD']), originalHead);
    assert.equal(git(['symbolic-ref', '--short', 'HEAD']), 'main');
    assert.equal(git(['write-tree']), originalIndex);
    assert.equal(git(['status', '--porcelain']), originalStatus);
    assert.equal(git(['rev-parse', `${commit}^`]), originalHead);
    assert.deepEqual(git(['ls-tree', '--name-only', commit]).split('\n'), ['.nojekyll', 'index.html']);
    assert.equal(git(['rev-parse', 'refs/heads/gh-pages'], remote), commit);
    assert.equal(deployPreview(project), commit, 'An unchanged build should not create another commit');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
