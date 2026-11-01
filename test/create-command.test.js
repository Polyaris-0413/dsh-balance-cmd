import test from 'node:test'
import assert from 'node:assert/strict'
import { createBalanceCommand } from '../lib/create-command.js'

const ready = { status: 'ready', value: [{ currency: 'CNY', balance: '1' }], bonusWallets: [] }

test('命令名与描述符合约定', () => {
  const command = createBalanceCommand({ account: {}, version: '9.9.9' })
  assert.equal(command.name, 'balance')
  assert.match(command.description, /余额/)
  assert.match(command.description, /登录账号/)
})

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
  assert.deepEqual(await command.handler({}), { kind: 'success', text: '充值余额 ¥1.00 · 赠金 ¥0.00' })
  assert.equal(seen.version, '9.9.9')
  assert.equal(seen.locale, 'zh-CN')
  assert.equal(typeof seen.timezoneOffsetSeconds, 'number')
})
