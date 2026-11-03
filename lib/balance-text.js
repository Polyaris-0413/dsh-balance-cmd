import { currencySymbol, formatAmount, toScaled } from './format-amount.js'

/** 求和定标：比展示精度高，避免逐钱包先截到分再相加把 0.004+0.004 抹成 0。 */
const SCALE = 6

/**
 * 失败文案只有这一条模板，冒号后是短原因。
 * 不拼原始报错：上游异常可能带 `sk-` 前缀或英文栈信息。
 *
 * @param reason - 失败原因，短词
 * @returns 展示给用户的失败文本
 */
export function queryFailed(reason) {
  return `余额查询失败：${reason}。`
}

/** 统一交给 formatAmount 截断，避免这里再写一套舍入规则。 */
function toDecimal(value, scale) {
  const negative = value < 0n
  const magnitude = negative ? -value : value
  const unit = 10n ** BigInt(scale)
  const fraction = (magnitude % unit).toString().padStart(scale, '0')
  return `${negative ? '-' : ''}${magnitude / unit}.${fraction}`
}

function totalOf(wallets, currency) {
  const matched = wallets.filter((wallet) => wallet.currency === currency)
  const sum = matched.reduce((accumulated, wallet) => accumulated + toScaled(wallet.balance, SCALE), 0n)
  // 定标求和会把不足 1e-6 的零头截成 0；非零余额因此显示成 ¥0.00 会否定“¥0.00 只能是真实余额”。
  if (sum === 0n && matched.some((wallet) => toScaled(wallet.balance, 30) !== 0n)) {
    return `<${currencySymbol(currency)}0.01`
  }
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
