import test from 'node:test'
import assert from 'node:assert/strict'
import { runBalance } from '../lib/run-balance.js'
import { API_KEY_INVALID, LOGIN_REQUIRED, QUERY_FAILED } from '../lib/balance-text.js'

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

test('格式化抛错也收敛成失败文案', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ({
      status: 'ready',
      value: [{ currency: 'CNY', balance: '1e999999999' }],
      bonusWallets: [],
    }),
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

const apiKeyBody = {
  is_available: true,
  balance_infos: [
    { currency: 'CNY', total_balance: '9.50', granted_balance: '1.50', topped_up_balance: '8.00' },
  ],
}

/** 只有 API Key 的部署：没有登录态，凭据服务能解析出 Key。 */
function apiKeyOnly({ status = 200, body = apiKeyBody } = {}) {
  const calls = []
  return {
    calls,
    account: {
      getState: async () => ({ status: 'signed-out' }),
      getBalance: async () => assert.fail('未登录时不应调用账户服务'),
    },
    credentials: { resolve: async (ref) => ({ value: ref === 'DEEPSEEK_API_KEY' ? 'sk-test' : '' }) },
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return new Response(JSON.stringify(body), { status })
    },
    env: {},
  }
}

test('未登录时用 API Key 查询余额', async () => {
  const { calls, ...input } = apiKeyOnly()
  assert.deepEqual(await runBalance(input), { kind: 'success', text: '充值余额 ¥8.00 · 赠金 ¥1.50' })
  assert.equal(calls[0].url, 'https://api.deepseek.com/user/balance')
})

test('账户服务给不出余额时回退 API Key', async () => {
  const { ...input } = apiKeyOnly()
  input.account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => null,
  }
  assert.deepEqual(await runBalance(input), { kind: 'success', text: '充值余额 ¥8.00 · 赠金 ¥1.50' })
})

test('登录态可用时不读 API Key', async () => {
  let resolved = 0
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ready,
  }
  const credentials = {
    resolve: async () => {
      resolved += 1
      return { value: 'sk-test' }
    },
  }
  assert.deepEqual(await runBalance({ account, client: {}, credentials }), {
    kind: 'success',
    text: '充值余额 ¥12.34 · 赠金 ¥0.00',
  })
  assert.equal(resolved, 0)
})

test('登录态查询失败时不回退 API Key', async () => {
  let fetched = 0
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ({ status: 'failed' }),
  }
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  const fetchImpl = async () => {
    fetched += 1
    return new Response(JSON.stringify(apiKeyBody), { status: 200 })
  }
  assert.deepEqual(await runBalance({ account, client: {}, credentials, fetchImpl }), {
    kind: 'error',
    text: QUERY_FAILED,
  })
  assert.equal(fetched, 0)
})

test('API Key 无效时提示检查密钥', async () => {
  const { ...input } = apiKeyOnly({ status: 401, body: { error: 'unauthorized' } })
  assert.deepEqual(await runBalance(input), { kind: 'error', text: API_KEY_INVALID })
})

test('既未登录也无 API Key 时提示登录或配置', async () => {
  const { ...input } = apiKeyOnly()
  input.credentials = { resolve: async () => undefined }
  assert.deepEqual(await runBalance(input), { kind: 'error', text: LOGIN_REQUIRED })
})
