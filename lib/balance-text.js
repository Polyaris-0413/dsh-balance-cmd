import { formatAmount, toScaled } from './format-amount.js'

/** 求和定标：比展示精度高，避免逐钱包先截到分再相加把 0.004+0.004 抹成 0。 */
const SCALE = 6

export const LOGIN_REQUIRED =
  '未登录 DeepSeek 账号，仅支持登录账号查询余额。请到 设置 → 账号与余额 登录后重试。'

export const QUERY_FAILED = '余额查询失败，请稍后重试。'

/** 定标 BigInt → 十进制字符串，交给 formatAmount 统一截断与渲染。 */
function toDecimal(value, scale) {
  const negative = value < 0n
  const magnitude = negative ? -value : value
  const unit = 10n ** BigInt(scale)
  const fraction = (magnitude % unit).toString().padStart(scale, '0')
  return `${negative ? '-' : ''}${magnitude / unit}.${fraction}`
}

/** 同一币种的钱包合计，按展示规则渲染。 */
function totalOf(wallets, currency) {
  const sum = wallets
    .filter((wallet) => wallet.currency === currency)
    .reduce((accumulated, wallet) => accumulated + toScaled(wallet.balance, SCALE), 0n)
  return formatAmount(toDecimal(sum, SCALE), currency)
}

/**
 * 主行只汇总主币种（充值钱包的第一个币种），其余币种逐条列在换行明细里，
 * 因为把美元加进人民币合计会给出一个错的数字。
 *
 * @param balance - 账户余额详情
 * @returns 首行摘要，必要时附明细行
 */
export function describeBalance(balance) {
  const topUps = balance.value ?? []
  const bonuses = balance.bonusWallets ?? []
  const primary = topUps[0]?.currency ?? bonuses[0]?.currency ?? 'CNY'
  const rows = [
    ...topUps.map((wallet) => ({ label: '充值', wallet })),
    ...bonuses.map((wallet) => ({ label: '赠金', wallet })),
  ]
    .filter(({ wallet }) => wallet.currency !== primary)
    .map(({ label, wallet }) => `${label} ${formatAmount(wallet.balance, wallet.currency)} ${wallet.currency}`)
  return [`充值余额 ${totalOf(topUps, primary)} · 赠金 ${totalOf(bonuses, primary)}`, ...rows].join('\n')
}
