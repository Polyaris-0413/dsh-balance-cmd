import test from 'node:test'
import assert from 'node:assert/strict'
import { runBalance } from '../lib/run-balance.js'
import { LOGIN_REQUIRED, QUERY_FAILED } from '../lib/balance-text.js'

const ready = { status: 'ready', value: [{ currency: 'CNY', balance: '12.34' }], bonusWallets: [] }

test('未登录直接返回登录提示且不发请求', async () => {
  let calls = 0
  const account = {
    getState: async () => ({ status: 'signed-out' }),
    getBalance: async () => {
      calls += 1
      return ready
    },
  }
  assert.deepEqual(await runBalance({ account, client: {} }), { kind: 'error', text: LOGIN_REQUIRED })
  assert.equal(calls, 0)
})

test('余额为 null 一律按未登录处理', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => null,
  }
  assert.deepEqual(await runBalance({ account, client: {} }), { kind: 'error', text: LOGIN_REQUIRED })
})

test('查询失败给出失败文案', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ({ status: 'failed' }),
  }
  assert.deepEqual(await runBalance({ account, client: {} }), { kind: 'error', text: QUERY_FAILED })
})

test('成功返回组装后的文本', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ready,
  }
  assert.deepEqual(await runBalance({ account, client: {} }), {
    kind: 'success',
    text: '充值余额 ¥12.34 · 赠金 ¥0.00',
  })
})

test('凭证读取抛错按查询失败处理', async () => {
  const account = {
    getState: async () => {
      throw new Error('storage')
    },
    getBalance: async () => ready,
  }
  assert.deepEqual(await runBalance({ account, client: {} }), { kind: 'error', text: QUERY_FAILED })
})

test('余额请求抛错按查询失败处理', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => {
      throw new Error('network')
    },
  }
  assert.deepEqual(await runBalance({ account, client: {} }), { kind: 'error', text: QUERY_FAILED })
})
