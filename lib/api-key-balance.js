import { toScaled } from './format-amount.js'

/** 官方余额接口。登录账号与 API Key 查的是同一个钱包，区别只在凭据。 */
const PUBLIC_BASE_URL = 'https://api.deepseek.com'
const BALANCE_PATH = '/user/balance'
const KEY_REF = 'DEEPSEEK_API_KEY'
const TIMEOUT_MS = 15000

/**
 * 用 API Key 查官方余额。
 *
 * 这里只出站到 `api.deepseek.com`（或用户自配的 DEEPSEEK_BASE_URL），Key 只进请求头：
 * 失败分类里不带上游原文，避免把 `sk-` 开头的密钥经错误文案漏出去。
 *
 * @param input.credentials - 凭据服务；宿主未提供时为 undefined
 * @param input.fetchImpl - 取数实现，测试注入
 * @param input.env - 环境变量，测试注入
 * @returns `{ kind: 'ready', balance }` 或 `{ kind: 'no-key' | 'unauthorized' | 'failed' }`
 */
export async function readBalanceByApiKey({ credentials, fetchImpl = fetch, env = process.env } = {}) {
  const key = await resolveKey(credentials)
  if (key.kind !== 'ready') return key

  let response
  try {
    response = await fetchImpl(endpointOf(env), {
      headers: { authorization: `Bearer ${key.value}`, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return { kind: 'failed' }
  }
  if (response.status === 401 || response.status === 403) return { kind: 'unauthorized' }
  if (!response.ok) return { kind: 'failed' }

  let body
  try {
    body = await response.json()
  } catch {
    return { kind: 'failed' }
  }
  const balance = parseBalanceBody(body)
  return balance === undefined ? { kind: 'failed' } : { kind: 'ready', balance }
}

async function resolveKey(credentials) {
  if (typeof credentials?.resolve !== 'function') return { kind: 'no-key' }
  let hit
  try {
    hit = await credentials.resolve(KEY_REF)
  } catch {
    return { kind: 'failed' }
  }
  const value = typeof hit?.value === 'string' ? hit.value.trim() : ''
  return value === '' ? { kind: 'no-key' } : { kind: 'ready', value }
}

function endpointOf(env) {
  const configured = typeof env?.DEEPSEEK_BASE_URL === 'string' ? env.DEEPSEEK_BASE_URL.trim() : ''
  const base = configured === '' ? PUBLIC_BASE_URL : configured
  return `${base.replace(/\/+$/, '')}${BALANCE_PATH}`
}

/**
 * 官方响应 `{ is_available, balance_infos: [{ currency, total_balance, granted_balance, topped_up_balance }] }`
 * 收敛成与 deepseekAccount 相同的 `value` / `bonusWallets` 形状，复用同一套文案。
 *
 * @returns 余额详情；没有可用钱包时返回 undefined
 */
function parseBalanceBody(body) {
  if (body === null || typeof body !== 'object') return undefined
  if (body.is_available === false) return undefined
  const infos = Array.isArray(body.balance_infos) ? body.balance_infos : []
  const wallets = infos.map(toWallet).filter((wallet) => wallet !== undefined)
  if (wallets.length === 0) return undefined

  const primary = pickPrimary(wallets)
  const ordered = [primary, ...wallets.filter((wallet) => wallet !== primary)]
  return {
    status: 'ready',
    value: ordered.map((wallet) => ({ currency: wallet.currency, balance: wallet.toppedUp })),
    bonusWallets: ordered.map((wallet) => ({ currency: wallet.currency, balance: wallet.granted })),
  }
}

function toWallet(info) {
  if (info === null || typeof info !== 'object') return undefined
  const currency = typeof info.currency === 'string' ? info.currency.trim() : ''
  const total = amountOf(info.total_balance)
  if (currency === '' || total === undefined) return undefined
  return {
    currency,
    total: toScaled(total, 2),
    toppedUp: amountOf(info.topped_up_balance) ?? total,
    granted: amountOf(info.granted_balance) ?? '0',
  }
}

/** 金额必须是 formatAmount 能吃的十进制串；校验与展示共用一套解析规则。 */
function amountOf(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const text = String(value).trim()
  try {
    toScaled(text, 2)
    return text
  } catch {
    return undefined
  }
}

/**
 * 主币种决定首行汇总。接口返回的多币种数组顺序不固定，且把美元加进人民币合计会给出错数字，
 * 所以显式挑一个：非零人民币 → 任一非零币种 → 人民币 → 首项。
 */
function pickPrimary(wallets) {
  const nonZero = (wallet) => wallet.total !== 0n
  return (
    wallets.find((wallet) => wallet.currency === 'CNY' && nonZero(wallet)) ??
    wallets.find(nonZero) ??
    wallets.find((wallet) => wallet.currency === 'CNY') ??
    wallets[0]
  )
}
