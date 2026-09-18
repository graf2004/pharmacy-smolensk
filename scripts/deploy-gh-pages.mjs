#!/usr/bin/env node
/**
 * Update prices, build, push to GitHub main + gh-pages.
 * Needs GITHUB_TOKEN or GH_TOKEN with repo scope.
 */
import { spawnSync } from 'node:child_process'
import { rmSync, mkdirSync, cpSync, writeFileSync } from 'node:fs'

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
if (!token) {
  console.error('Set GH_TOKEN (repo scope) to deploy')
  process.exit(1)
}

const repo = 'graf2004/pharmacy-smolensk'
const remote = `https://x-access-token:${token}@github.com/${repo}.git`

function run(cmd, args, opts = {}) {
  console.log('>', cmd, args.join(' '))
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (r.status !== 0) process.exit(r.status || 1)
}

run('node', ['scripts/update-prices.mjs'])
run('npm', ['run', 'build'])

// push source to main (exclude workflow if token lacks workflow scope)
run('git', ['add', '-A'])
const st = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
if (st.stdout.trim()) {
  run('git', ['commit', '-m', 'Update live pharmacy prices'])
}
run('git', ['push', remote, 'HEAD:main'])

// publish dist to gh-pages
const dir = '/tmp/pharmacy-gh-pages'
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })
cpSync('dist', dir, { recursive: true })
writeFileSync(`${dir}/.nojekyll`, '')
run('git', ['init', '-b', 'gh-pages'], { cwd: dir })
run('git', ['config', 'user.email', 'graf2004@users.noreply.github.com'], { cwd: dir })
run('git', ['config', 'user.name', 'graf2004'], { cwd: dir })
run('git', ['add', '-A'], { cwd: dir })
run('git', ['commit', '-m', 'Deploy site with fresh prices'], { cwd: dir })
run('git', ['push', remote, 'gh-pages:gh-pages', '--force'], { cwd: dir })

console.log('Live: https://graf2004.github.io/pharmacy-smolensk/')
