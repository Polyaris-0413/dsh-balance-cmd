/**
 * 金额展示规则镜像自设置页的 formatBalance（packages/client/ui-settings-account/src/client/formatBalance.ts）：
 * 0 显示两位小数，正数不足一分显示上限，负数带负号且不足一分显示 -0.01。
 * 平台返回的是十进制字符串，schema 允许省略整数/小数部分以及十进制指数（0E-16、1e+3），
 * 所以这里不用 Number，改为字符串 → BigInt 分单位，全程整数运算且向下取整。
 */

const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/

const SYMBOLS = { CNY: '¥', USD: '$' }

/** 十进制字符串 → 分（BigInt，向零截断）。 */
function toCents(amount) {
  const match = DECIMAL.exec(String(amount).trim())
  const [, sign, integer = '', fraction = '', exponent] = match ?? []
  const digits = `${integer}${fraction}`
  if (match === null || digits === '') throw new TypeError(`formatAmount: not a decimal: ${amount}`)
  const point = integer.length + Number(exponent ?? 0)
  const shift = point - digits.length + 2
  let cents = BigInt(digits)
  cents = shift >= 0 ? cents * 10n ** BigInt(shift) : cents / 10n ** BigInt(-shift)
  return { negative: sign === '-', zero: BigInt(digits) === 0n, cents }
}

/** 分 → 带千分位的两位小数。 */
function groupCents(cents) {
  const integer = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${integer}.${(cents % 100n).toString().padStart(2, '0')}`
}

/**
 * @param amount - 平台返回的余额十进制字符串
 * @param currency - 币种标识
 * @returns 展示用金额
 */
export function formatAmount(amount, currency) {
  const symbol = SYMBOLS[currency] ?? `${currency} `
  const value = toCents(amount)
  if (value.zero) return `${symbol}0.00`
  if (value.negative) return `-${symbol}${value.cents === 0n ? '0.01' : groupCents(value.cents)}`
  if (value.cents === 0n) return `<${symbol}0.01`
  return `${symbol}${groupCents(value.cents)}`
}
