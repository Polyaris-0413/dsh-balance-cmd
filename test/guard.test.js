import test from 'node:test'
import assert from 'node:assert/strict'
import { guarded } from '../lib/guard.js'

test('成功结果原样返回', async () => {
  const handler = guarded(async () => ({ kind: 'success', text: 'ok' }), '失败。')
  assert.deepEqual(await handler({}), { kind: 'success', text: 'ok' })
})

test('同步抛错收敛成失败文案', async () => {
  const handler = guarded(() => {
    throw new Error('boom')
  }, '失败。')
  assert.deepEqual(await handler({}), { kind: 'error', text: '失败。' })
})

test('异步拒绝收敛成失败文案', async () => {
  const handler = guarded(async () => {
    throw new Error('boom')
  }, '失败。')
  assert.deepEqual(await handler({}), { kind: 'error', text: '失败。' })
})

test('抛出的不是 Error 也收敛', async () => {
  const handler = guarded(() => {
    throw 'boom'
  }, '失败。')
  assert.deepEqual(await handler({}), { kind: 'error', text: '失败。' })
})

test('调用参数原样透传', async () => {
  let seen
  const handler = guarded((invocation) => {
    seen = invocation
    return { kind: 'success' }
  }, '失败。')
  const invocation = { rawInput: 'x' }
  await handler(invocation)
  assert.equal(seen, invocation)
})
