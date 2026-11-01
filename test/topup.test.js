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

test('没有打开能力时给出网址', async () => {
  const result = await openTopUp({ account, open: undefined })
  assert.equal(result.kind, 'success')
  assert.match(result.text, /请手动访问/)
  assert.match(result.text, /top_up/)
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

test('拿不到地址时只报失败，不给可疑网址', async () => {
  const broken = {
    getState: async () => {
      throw new Error('storage')
    },
  }
  assert.deepEqual(await openTopUp({ account: broken, open: async () => {} }), {
    kind: 'error',
    text: '无法获取充值地址，请稍后重试。',
  })
  const noLinks = { getState: async () => ({ status: 'signed-out' }) }
  assert.equal((await openTopUp({ account: noLinks, open: async () => {} })).kind, 'error')
})
