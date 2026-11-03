import test from 'node:test'
import assert from 'node:assert/strict'
import { createBalanceCommand, createTopUpCommand } from '../lib/create-command.js'
import { queryFailed } from '../lib/balance-text.js'

const ready = { status: 'ready', value: [{ currency: 'CNY', balance: '1' }], bonusWallets: [] }

test('充值命令名与描述符合约定', async () => {
  let opened
  const command = createTopUpCommand({
    account: { getState: async () => ({ links: { topUpUrl: 'https://example.test/top_up' } }) },
    opener: () => async (url) => {
      opened = url
    },
  })
  assert.equal(command.name, 'topup')
  assert.equal(command.description, '打开充值页')
  assert.deepEqual(await command.handler({}), { kind: 'success', text: '已在浏览器中打开充值页。' })
  assert.equal(opened, 'https://example.test/top_up')
})

test('命令名与描述符合约定', () => {
  const command = createBalanceCommand({ account: {}, version: '9.9.9' })
  assert.equal(command.name, 'balance')
  assert.equal(command.description, '查询账号余额')
})

const accountInvocation = {
  agent: { session: { requestHeader: () => ({ config: { provider: 'deepseek-account', model: 'deepseek-flash' } }) } },
}

test('处理器把 metadata 交给账户服务并回传结果', async () => {
  let seen
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async (client) => {
      seen = client
      return ready
    },
  }
  const command = createBalanceCommand({ account, version: '9.9.9', locale: 'zh-CN' })
  assert.deepEqual(await command.handler(accountInvocation), {
    kind: 'success',
    text: '充值余额 ¥1.00 · 赠金 ¥0.00',
  })
  assert.equal(seen.version, '9.9.9')
  assert.equal(seen.locale, 'zh-CN')
  assert.equal(typeof seen.timezoneOffsetSeconds, 'number')
})

test('处理器按会话渠道分发，不碰另一条渠道', async () => {
  const account = {
    getState: async () => assert.fail('API Key 渠道不应查账户状态'),
    getBalance: async () => assert.fail('API Key 渠道不应查账户余额'),
  }
  const command = createBalanceCommand({ account, version: '9.9.9' })
  const invocation = {
    agent: { session: { requestHeader: () => ({ config: { provider: 'openrouter', model: 'x' } }) } },
  }
  assert.deepEqual(await command.handler(invocation), { kind: 'error', text: queryFailed('渠道不支持') })
})

test('会话没有请求记录时按全局默认渠道判断', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ready,
  }
  const command = createBalanceCommand({
    account,
    version: '9.9.9',
    defaultProvider: () => 'deepseek-account',
  })
  assert.deepEqual(await command.handler({ agent: { session: { requestHeader: () => undefined } } }), {
    kind: 'success',
    text: '充值余额 ¥1.00 · 赠金 ¥0.00',
  })
})

test('切换模型后未发请求时按投影里的待生效渠道判断', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ready,
  }
  const command = createBalanceCommand({
    account,
    version: '9.9.9',
    sessionProjections: () => ({
      stateOf: () => ({ pending: { provider: 'deepseek-account' }, lastUsed: { provider: 'openrouter' } }),
    }),
  })
  const invocation = {
    agent: { session: { requestHeader: () => ({ config: { provider: 'openrouter', model: 'x' } }) } },
  }
  assert.deepEqual(await command.handler(invocation), {
    kind: 'success',
    text: '充值余额 ¥1.00 · 赠金 ¥0.00',
  })
})
