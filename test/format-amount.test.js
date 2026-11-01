import test from 'node:test'
import assert from 'node:assert/strict'
import { formatAmount } from '../lib/format-amount.js'

test('零余额显示两位小数', () => {
  assert.equal(formatAmount('0', 'CNY'), '¥0.00')
})

test('小于一分显示上限', () => {
  assert.equal(formatAmount('0.004', 'CNY'), '<¥0.01')
})

test('两位小数为向下取整', () => {
  assert.equal(formatAmount('12.345', 'CNY'), '¥12.34')
})

test('千分位分组', () => {
  assert.equal(formatAmount('1234.5', 'CNY'), '¥1,234.50')
})

test('负数带负号', () => {
  assert.equal(formatAmount('-12.345', 'CNY'), '-¥12.34')
})

test('负数不足一分显示 -0.01', () => {
  assert.equal(formatAmount('-0.004', 'CNY'), '-¥0.01')
})

test('指数形式可解析', () => {
  assert.equal(formatAmount('1e+3', 'USD'), '$1,000.00')
  assert.equal(formatAmount('0E-16', 'CNY'), '¥0.00')
})
