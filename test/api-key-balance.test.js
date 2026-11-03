import test from 'node:test'
import assert from 'node:assert/strict'
import { readBalanceByApiKey } from '../lib/api-key-balance.js'

const okBody = {
  is_available: true,
  balance_infos: [
    { currency: 'CNY', total_balance: '465.46', granted_balance: '0.00', topped_up_balance: '465.46' },
  ],
}

/** 记录调用的 fetch 替身：返回给定状态码与 body。 */
function stubFetch({ status = 200, body = okBody } = {}) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(body), { status })
  }
  return { calls, fetchImpl }
}

test('没有凭据服务时不发请求，报无密钥', async () => {
  const { calls, fetchImpl } = stubFetch()
  assert.deepEqual(await readBalanceByApiKey({ fetchImpl, env: {} }), { kind: 'no-key' })
  assert.equal(calls.length, 0)
})

test('未配置 DEEPSEEK_API_KEY 时按无密钥处理', async () => {
  const { calls, fetchImpl } = stubFetch()
  const credentials = { resolve: async () => undefined }
  assert.deepEqual(await readBalanceByApiKey({ credentials, fetchImpl, env: {} }), { kind: 'no-key' })
  assert.equal(calls.length, 0)
})

test('凭据服务抛错按查询失败处理', async () => {
  const { fetchImpl } = stubFetch()
  const credentials = { resolve: async () => { throw new Error('storage') } }
  assert.deepEqual(await readBalanceByApiKey({ credentials, fetchImpl, env: {} }), { kind: 'failed' })
})

test('用 Bearer 头请求官方余额接口', async () => {
  const { calls, fetchImpl } = stubFetch()
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  await readBalanceByApiKey({ credentials, fetchImpl, env: {} })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.deepseek.com/user/balance')
  assert.equal(calls[0].init.headers.authorization, 'Bearer sk-test')
  assert.equal(calls[0].init.headers.accept, 'application/json')
})

test('DEEPSEEK_BASE_URL 覆盖端点并去掉尾部斜杠', async () => {
  const { calls, fetchImpl } = stubFetch()
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  await readBalanceByApiKey({ credentials, fetchImpl, env: { DEEPSEEK_BASE_URL: 'https://relay.example/v1/' } })
  assert.equal(calls[0].url, 'https://relay.example/v1/user/balance')
})

test('401 报密钥无效', async () => {
  const { fetchImpl } = stubFetch({ status: 401, body: { error: 'unauthorized' } })
  const credentials = { resolve: async () => ({ value: 'sk-bad' }) }
  assert.deepEqual(await readBalanceByApiKey({ credentials, fetchImpl, env: {} }), { kind: 'unauthorized' })
})

test('其他非 2xx 按查询失败处理', async () => {
  const { fetchImpl } = stubFetch({ status: 500, body: {} })
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  assert.deepEqual(await readBalanceByApiKey({ credentials, fetchImpl, env: {} }), { kind: 'failed' })
})

test('响应不是 JSON 按查询失败处理', async () => {
  const fetchImpl = async () => new Response('<html>', { status: 200 })
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  assert.deepEqual(await readBalanceByApiKey({ credentials, fetchImpl, env: {} }), { kind: 'failed' })
})

test('缺少 balance_infos 按查询失败处理', async () => {
  const { fetchImpl } = stubFetch({ body: { is_available: true } })
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  assert.deepEqual(await readBalanceByApiKey({ credentials, fetchImpl, env: {} }), { kind: 'failed' })
})

test('账户不可用按查询失败处理', async () => {
  const { fetchImpl } = stubFetch({ body: { is_available: false, balance_infos: okBody.balance_infos } })
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  assert.deepEqual(await readBalanceByApiKey({ credentials, fetchImpl, env: {} }), { kind: 'failed' })
})

test('网络异常按查询失败处理', async () => {
  const fetchImpl = async () => { throw new Error('network') }
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  assert.deepEqual(await readBalanceByApiKey({ credentials, fetchImpl, env: {} }), { kind: 'failed' })
})

test('成功时拆成充值余额与赠金', async () => {
  const { fetchImpl } = stubFetch()
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  assert.deepEqual(await readBalanceByApiKey({ credentials, fetchImpl, env: {} }), {
    kind: 'ready',
    balance: {
      status: 'ready',
      value: [{ currency: 'CNY', balance: '465.46' }],
      bonusWallets: [{ currency: 'CNY', balance: '0.00' }],
    },
  })
})

test('接口顺序不固定时主币种取非零人民币并排第一', async () => {
  const { fetchImpl } = stubFetch({
    body: {
      is_available: true,
      balance_infos: [
        { currency: 'USD', total_balance: '0.00', granted_balance: '0.00', topped_up_balance: '0.00' },
        { currency: 'CNY', total_balance: '12.00', granted_balance: '2.00', topped_up_balance: '10.00' },
      ],
    },
  })
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  const result = await readBalanceByApiKey({ credentials, fetchImpl, env: {} })
  assert.deepEqual(result.balance.value, [
    { currency: 'CNY', balance: '10.00' },
    { currency: 'USD', balance: '0.00' },
  ])
  assert.deepEqual(result.balance.bonusWallets, [
    { currency: 'CNY', balance: '2.00' },
    { currency: 'USD', balance: '0.00' },
  ])
})

test('缺少充值/赠金字段时用总额兜底', async () => {
  const { fetchImpl } = stubFetch({
    body: { is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '8.00' }] },
  })
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  const result = await readBalanceByApiKey({ credentials, fetchImpl, env: {} })
  assert.deepEqual(result.balance.value, [{ currency: 'CNY', balance: '8.00' }])
  assert.deepEqual(result.balance.bonusWallets, [{ currency: 'CNY', balance: '0' }])
})

test('币种或金额非法的项被丢弃', async () => {
  const { fetchImpl } = stubFetch({
    body: {
      is_available: true,
      balance_infos: [
        { currency: '', total_balance: '1.00' },
        { currency: 'CNY', total_balance: 'abc' },
        { currency: 'CNY', total_balance: '3.00', granted_balance: '0.00', topped_up_balance: '3.00' },
      ],
    },
  })
  const credentials = { resolve: async () => ({ value: 'sk-test' }) }
  const result = await readBalanceByApiKey({ credentials, fetchImpl, env: {} })
  assert.deepEqual(result.balance.value, [{ currency: 'CNY', balance: '3.00' }])
})
