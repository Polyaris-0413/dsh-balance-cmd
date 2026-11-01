import { clientMetadata } from './client-metadata.js'
import { runBalance } from './run-balance.js'

/**
 * 命令定义。metadata 在每次执行时现算——时区偏移会随夏令时变化，不能在启动时定格。
 *
 * @param input.account - deepseekAccount 服务
 * @param input.version - 构建版本
 * @param input.locale - 覆盖用语言
 * @param input.now - 取当前时间的注入点
 * @returns 斜杠命令定义
 */
export function createBalanceCommand({ account, version, locale, now }) {
  return {
    name: 'balance',
    description: '查询账号余额（仅支持登录账号）',
    handler: () => runBalance({ account, client: clientMetadata({ version, locale, now }) }),
  }
}
