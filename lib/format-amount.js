/**
 * 金额展示规则镜像自设置页的 formatBalance（packages/client/ui-settings-account/src/client/formatBalance.ts）：
 * 0 显示两位小数，正数不足一分显示上限，负数带负号且不足一分显示 -0.01。
 * 平台返回的是十进制字符串，schema 允许省略整数/小数部分以及十进制指数（0E-16、1e+3），
 * 所以这里不用 Number，改为字符串 → BigInt 定标整数，全程整数运算且向下取整。
 */

const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/

const SYMBOLS = { CNY: '¥', USD: '$' }

/** 指数上限：任何真实余额都远在它之内，超过就说明数据病态，宁可快速拒绝也不做十亿位的幂运算。 */
const MAX_EXPONENT = 4096

/** 币种符号；未知币种退化为代码加空格。 */
export function currencySymbol(currency) {
  return SYMBOLS[currency] ?? `${currency} `
}

/** @returns 符号、数字串、小数点位置（以 digits 为坐标）与是否精确为零。 */
function parseDecimal(amount) {
  const match = DECIMAL.exec(String(amount).trim())
  if (match === null) throw new TypeError(`decimal expected, received: ${amount}`)
  const [, sign, integer = '', fraction = '', exponent] = match
  const digits = `${integer}${fraction}`
  if (digits === '') throw new TypeError(`decimal expected, received: ${amount}`)
  const point = integer.length + Number(exponent ?? 0)
  if (!Number.isSafeInteger(point) || Math.abs(point) > MAX_EXPONENT) throw new TypeError(`exponent out of range: ${amount}`)
  return {
    negative: sign === '-',
    digits,
    point,
    zero: BigInt(digits) === 0n,
  }
}

/** 十进制字符串 → scale 位小数的定标 BigInt，向零截断，按符号带正负。 */
export function toScaled(amount, scale) {
  const { negative, digits, point } = parseDecimal(amount)
  const shift = point - digits.length + scale
  const magnitude = BigInt(digits)
  const scaled = shift >= 0 ? magnitude * 10n ** BigInt(shift) : magnitude / 10n ** BigInt(-shift)
  return negative ? -scaled : scaled
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
  const symbol = currencySymbol(currency)
  const { negative, zero } = parseDecimal(amount)
  const scaled = toScaled(amount, 2)
  const cents = scaled < 0n ? -scaled : scaled
  if (zero) return `${symbol}0.00`
  if (negative) return `-${symbol}${cents === 0n ? '0.01' : groupCents(cents)}`
  if (cents === 0n) return `<${symbol}0.01`
  return `${symbol}${groupCents(cents)}`
}
