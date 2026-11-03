import test from 'node:test'
import assert from 'node:assert/strict'
import { ACCOUNT_CHANNEL, API_KEY_CHANNEL, channelOf, providerOf } from '../lib/selection.js'

test('账号路由归入账号渠道', () => {
  assert.equal(channelOf('deepseek-account'), ACCOUNT_CHANNEL)
})

test('DeepSeek 官方 API Key 路由归入 API Key 渠道', () => {
  for (const provider of ['deepseek', 'deepseek-official', 'deepseek-vision']) {
    assert.equal(channelOf(provider), API_KEY_CHANNEL)
  }
})

test('其他路由没有可用渠道', () => {
  assert.equal(channelOf('openrouter'), undefined)
  assert.equal(channelOf(''), undefined)
  assert.equal(channelOf(undefined), undefined)
})

test('优先用会话最后一次请求的渠道', () => {
  const invocation = {
    agent: {
      session: { requestHeader: () => ({ config: { provider: 'deepseek-official', model: 'deepseek-chat' } }) },
      options: { provider: 'deepseek-account' },
    },
  }
  assert.equal(providerOf(invocation, () => 'deepseek-account'), 'deepseek-official')
})

test('会话没有请求记录时用 agent 选项', () => {
  const invocation = { agent: { session: { requestHeader: () => undefined }, options: { provider: 'deepseek-account' } } }
  assert.equal(providerOf(invocation, () => 'deepseek-official'), 'deepseek-account')
})

test('都取不到时用全局默认选择', () => {
  const invocation = { agent: { session: { requestHeader: () => undefined }, options: {} } }
  assert.equal(providerOf(invocation, () => 'deepseek-official'), 'deepseek-official')
})

test('完全没有选择信息时返回 undefined', () => {
  assert.equal(providerOf({}, () => undefined), undefined)
  assert.equal(providerOf(undefined, undefined), undefined)
})

test('读取请求头抛错不影响后续来源', () => {
  const invocation = {
    agent: {
      session: {
        requestHeader: () => {
          throw new Error('disposed')
        },
      },
      options: { provider: 'deepseek-account' },
    },
  }
  assert.equal(providerOf(invocation, () => undefined), 'deepseek-account')
})

const sessionWith = (header) => ({ agent: { session: { requestHeader: () => header }, options: {} } })

test('刚切换模型还没发请求时用投影里的 pending 选择', () => {
  const projections = () => ({
    stateOf: () => ({
      pending: { provider: 'deepseek-official', model: 'deepseek-chat' },
      lastUsed: { provider: 'deepseek-account', model: 'deepseek-flash' },
    }),
  })
  assert.equal(providerOf(sessionWith(undefined), () => 'deepseek-account', projections), 'deepseek-official')
})

test('投影里没有 pending 时用 lastUsed', () => {
  const projections = () => ({
    stateOf: () => ({
      pending: null,
      lastUsed: { provider: 'deepseek-official', model: 'deepseek-chat' },
    }),
  })
  assert.equal(providerOf(sessionWith(undefined), () => 'deepseek-account', projections), 'deepseek-official')
})

test('投影不可读时退回请求头', () => {
  const projections = () => ({
    stateOf: () => {
      throw new Error('projection missing')
    },
  })
  const invocation = sessionWith({ config: { provider: 'deepseek-account', model: 'deepseek-flash' } })
  assert.equal(providerOf(invocation, () => 'deepseek-official', projections), 'deepseek-account')
})
