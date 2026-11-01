import test from 'node:test'
import assert from 'node:assert/strict'
import { openTopUp } from '../lib/topup.js'

const url = 'https://platform.deepseek.com/top_up'
const account = {
  getState: async () => ({ status: 'credential-stored', links: { topUpUrl: url } }),
}

test('打开充值页并回报成功', async () => {
  let opened
  const result = await openTopUp({ account, open: async (value) => { opened = value } })
  assert.equal(opened, url)
  assert.deepEqual(result, { kind: 'success', text: '已在浏览器中打开充值页。' })
})

test('打开失败时给出网址并报失败', async () => {
  const result = await openTopUp({
    account,
    open: async () => {
      throw new Error('no handler')
    },
  })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /打开浏览器失败/)
  assert.match(result.text, /top_up/)
})
