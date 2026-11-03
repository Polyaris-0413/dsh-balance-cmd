import test from 'node:test'
import assert from 'node:assert/strict'
import { API_KEY_INVALID, describeBalance, LOGIN_REQUIRED, QUERY_FAILED } from '../lib/balance-text.js'

test('单币种只出一行', () => {
  assert.equal(
    describeBalance({ value: [{ currency: 'CNY', balance: '12.34' }], bonusWallets: [] }),
    '充值余额 ¥12.34 · 赠金 ¥0.00',
  )
})

test('真实为零仍是成功文案', () => {
  assert.equal(
    describeBalance({ value: [{ currency: 'CNY', balance: '0' }], bonusWallets: [] }),
    '充值余额 ¥0.00 · 赠金 ¥0.00',
  )
})

test('同币种多钱包求和', () => {
  assert.equal(
    describeBalance({
      value: [{ currency: 'CNY', balance: '0.10' }, { currency: 'CNY', balance: '0.20' }],
      bonusWallets: [],
    }),
    '充值余额 ¥0.30 · 赠金 ¥0.00',
  )
})

test('非主币种逐条列出，不与主币种相加', () => {
  assert.equal(
    describeBalance({
      value: [{ currency: 'CNY', balance: '12.34' }, { currency: 'USD', balance: '5' }],
      bonusWallets: [],
    }),
    '充值余额 ¥12.34 · 赠金 ¥0.00\n充值 $5.00 USD',
  )
})

test('赠金按币种进明细', () => {
  assert.equal(
    describeBalance({
      value: [{ currency: 'CNY', balance: '12.34' }],
      bonusWallets: [{ currency: 'USD', balance: '1' }],
    }),
    '充值余额 ¥12.34 · 赠金 ¥0.00\n赠金 $1.00 USD',
  )
})

test('不足一分的多个钱包求和后仍显示上限', () => {
  assert.equal(
    describeBalance({
      value: [{ currency: 'CNY', balance: '0.004' }, { currency: 'CNY', balance: '0.004' }],
      bonusWallets: [],
    }),
    '充值余额 <¥0.01 · 赠金 ¥0.00',
  )
})

test('非零但小于求和精度时显示上限而不是零', () => {
  assert.equal(
    describeBalance({ value: [{ currency: 'CNY', balance: '0.0000004' }], bonusWallets: [] }),
    '充值余额 <¥0.01 · 赠金 ¥0.00',
  )
})

test('登录与失败文案', () => {
  assert.match(LOGIN_REQUIRED, /未配置 API Key/)
  assert.match(LOGIN_REQUIRED, /DEEPSEEK_API_KEY/)
  assert.match(API_KEY_INVALID, /无效/)
  assert.match(QUERY_FAILED, /查询失败/)
})
