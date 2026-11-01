import test from 'node:test'
import assert from 'node:assert/strict'
import { clientMetadata } from '../lib/client-metadata.js'

test('透传版本与语言并换算时区偏移', () => {
  const now = () => ({ getTimezoneOffset: () => -480 })
  assert.deepEqual(clientMetadata({ version: '1.2.3', locale: 'zh-CN', now }), {
    version: '1.2.3',
    locale: 'zh-CN',
    timezoneOffsetSeconds: 28800,
  })
})

test('缺省时语言来自运行时环境', () => {
  const value = clientMetadata({ version: '1.2.3' })
  assert.equal(value.version, '1.2.3')
  assert.equal(typeof value.locale, 'string')
  assert.notEqual(value.locale, '')
})

test('西半球时区为负偏移', () => {
  const now = () => ({ getTimezoneOffset: () => 300 })
  assert.equal(clientMetadata({ version: '1', locale: 'en-US', now }).timezoneOffsetSeconds, -18000)
})
