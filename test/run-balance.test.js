import test from 'node:test'
import assert from 'node:assert/strict'
import { runBalance } from '../lib/run-balance.js'
import {
  API_KEY_INVALID,
  API_KEY_MISSING,
  LOGIN_REQUIRED,
  NO_CHANNEL,
  QUERY_FAILED,
  unsupportedChannel,
} from '../lib/balance-text.js'

const ready = { status: 'ready', value: [{ currency: 'CNY', balance: '12.34' }], bonusWallets: [] }

const apiKeyBody = {
  is_available: true,
  balance_infos: [
    { currency: 'CNY', total_balance: '9.50', granted_balance: '1.50', topped_up_balance: '8.00' },
  ],
}

function accountWith(overrides = {}) {
  return {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ready,
    ...overrides,
  }
}

/** 账号渠道下一旦读密钥或发请求，测试就该失败。 */
const noKeyAccess = {
  resolve: async () => assert.fail('账号渠道不应读取 API Key'),
}

const noFetch = async () => assert.fail('账号渠道不应发起余额请求')

test('账号渠道用账户服务查询', async () => {
  assert.deepEqual(
    await runBalance({ account: accountWith(), client: {}, provider: 'deepseek-account' }),
    { kind: 'success', text: '充值余额 ¥12.34 · 赠金 ¥0.00' },
  )
})

test('账号渠道未登录时提示登录，不回退到 API Key', async () => {
  const account = accountWith({ getState: async () => ({ status: 'signed-out' }) })
  assert.deepEqual(
    await runBalance({ account, client: {}, provider: 'deepseek-account', credentials: noKeyAccess, fetchImpl: noFetch }),
    { kind: 'error', text: LOGIN_REQUIRED },
  )
})

test('账号渠道取不到余额时提示登录', async () => {
  const account = accountWith({ getBalance: async () => null })
  assert.deepEqual(await runBalance({ account, client: {}, provider: 'deepseek-account' }), {
    kind: 'error',
    text: LOGIN_REQUIRED,
  })
})

test('账号渠道查询失败给出失败文案', async () => {
  const account = accountWith({ getBalance: async () => ({ status: 'failed' }) })
  assert.deepEqual(await runBalance({ account, client: {}, provider: 'deepseek-account' }), {
    kind: 'error',
    text: QUERY_FAILED,
  })
})

test('账号服务读取状态抛错按查询失败处理', async () => {
  const account = accountWith({
    getState: async () => {
      throw new Error('storage')
    },
  })
  assert.deepEqual(await runBalance({ account, client: {}, provider: 'deepseek-account' }), {
    kind: 'error',
    text: QUERY_FAILED,
  })
})

test('格式化抛错也收敛成失败文案', async () => {
  const account = accountWith({
    getBalance: async () => ({ status: 'ready', value: [{ currency: 'CNY', balance: '1e999999999' }], bonusWallets: [] }),
  })
  assert.deepEqual(await runBalance({ account, client: {}, provider: 'deepseek-account' }), {
    kind: 'error',
    text: QUERY_FAILED,
  })
})

function apiKeyInput({ status = 200, body = apiKeyBody } = {}) {
  return {
    account: { getState: async () => assert.fail('API Key 渠道不应查账户状态') },
    client: {},
    provider: 'deepseek-official',
    credentials: { resolve: async () => ({ value: 'sk-test' }) },
    fetchImpl: async () => new Response(JSON.stringify(body), { status }),
    env: {},
  }
}

test('API Key 渠道用密钥查询，即便账号已登录', async () => {
  assert.deepEqual(await runBalance(apiKeyInput()), { kind: 'success', text: '充值余额 ¥8.00 · 赠金 ¥1.50' })
})

test('API Key 渠道未配置密钥时提示配置', async () => {
  const input = apiKeyInput()
  input.credentials = { resolve: async () => undefined }
  assert.deepEqual(await runBalance(input), { kind: 'error', text: API_KEY_MISSING })
})

test('API Key 无效时提示检查密钥', async () => {
  assert.deepEqual(await runBalance(apiKeyInput({ status: 401, body: { error: 'unauthorized' } })), {
    kind: 'error',
    text: API_KEY_INVALID,
  })
})

test('API Key 渠道的网络失败按查询失败处理', async () => {
  const input = apiKeyInput()
  input.fetchImpl = async () => {
    throw new Error('network')
  }
  assert.deepEqual(await runBalance(input), { kind: 'error', text: QUERY_FAILED })
})

test('判断不出渠道时明确报错', async () => {
  const input = apiKeyInput()
  input.provider = undefined
  assert.deepEqual(await runBalance(input), { kind: 'error', text: NO_CHANNEL })
})

test('非 DeepSeek 渠道提示当前渠道名', async () => {
  const input = apiKeyInput()
  input.provider = 'openrouter'
  assert.deepEqual(await runBalance(input), { kind: 'error', text: unsupportedChannel('openrouter') })
})
