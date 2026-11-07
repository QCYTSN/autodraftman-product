import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

// One production path: rebuild a reviewed source commit in GitHub Actions.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (command, args) => execFileSync(command, args, { cwd: repository, encoding: 'utf8', windowsHide: true }).trim();
const revision = process.argv[2];
assert.match(revision ?? '', /^[a-f0-9]{40}$/, 'Pass the full reviewed product commit SHA, not a mirror directory.');
assert.equal(run('git', ['rev-parse', 'HEAD']), revision, 'Checkout and review the requested source commit first.');
assert.equal(run('git', ['status', '--porcelain', '--untracked-files=no']), '', 'Commit tracked changes before publishing.');
assert.equal(run('git', ['ls-files', '--others', '--exclude-standard', '--', 'frontend', 'deploy']), '', 'Commit new release files before publishing.');
assert.equal(run('gh', ['api', 'repos/QCYTSN/autodraftman-product/commits/' + revision, '--jq', '.sha']), revision, 'Push the reviewed source first.');
const encoded = run('gh', ['api', 'repos/QCYTSN/figfox/contents/.github/workflows/deploy-pages.yml', '--jq', '.content']);
const remoteWorkflow = Buffer.from(encoded, 'base64').toString('utf8').replace(/\r\n/g, '\n').trim();
const reviewedWorkflow = readFileSync(path.join(repository, 'deploy/pages-workflow.yml'), 'utf8').replace(/\r\n/g, '\n').trim();
assert.equal(remoteWorkflow, reviewedWorkflow, 'Install the reviewed deploy/pages-workflow.yml in the Pages repository first.');
run('gh', ['workflow', 'run', 'deploy-pages.yml', '--repo', 'QCYTSN/figfox', '--ref', 'main', '-f', 'source_revision=' + revision]);
console.log(JSON.stringify({ sourceRevision: revision, workflow: 'https://github.com/QCYTSN/figfox/actions/workflows/deploy-pages.yml', site: 'https://qcytsn.github.io/figfox/' }, null, 2));
