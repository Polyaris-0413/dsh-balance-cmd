import test from 'node:test'
import assert from 'node:assert/strict'
import { openerFor } from '../lib/open-url.js'

const url = 'https://platform.deepseek.com/top_up'

function recorder() {
  const specs = []
  const spawn = (spec) => {
    specs.push(spec)
    return { done: Promise.resolve({ exitCode: 0, signal: null }) }
  }
  return { specs, spawn }
}

test('Windows 交给 cmd 的 start', async () => {
  const { specs, spawn } = recorder()
  await openerFor('win32', spawn)(url)
  assert.deepEqual(specs[0].argv, ['cmd.exe', '/c', 'start', '', url])
})

test('macOS 用 open', async () => {
  const { specs, spawn } = recorder()
  await openerFor('darwin', spawn)(url)
  assert.deepEqual(specs[0].argv, ['/usr/bin/open', url])
})

test('Linux 用 xdg-open', async () => {
  const { specs, spawn } = recorder()
  await openerFor('linux', spawn)(url)
  assert.deepEqual(specs[0].argv, ['xdg-open', url])
})

test('每个请求都带工作目录与 stdio 处置', async () => {
  const { specs, spawn } = recorder()
  await openerFor('win32', spawn)(url)
  assert.equal(typeof specs[0].cwd, 'string')
  assert.ok(specs[0].cwd.length > 0)
  assert.deepEqual(specs[0].stdio, { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' })
  assert.ok(specs[0].graceMs > 0)
})
