import { clientMetadata } from './client-metadata.js'
import { runBalance } from './run-balance.js'
import { openTopUp } from './topup.js'

/**
 * 命令定义。metadata 在每次执行时现算——时区偏移会随夏令时变化，不能在启动时定格。
 *
 * @param input.account - deepseekAccount 服务
 * @param input.credentials - 返回凭据服务的取值器；API Key 兜底用，缺失时按没配 Key 处理
 * @param input.version - 构建版本
 * @param input.locale - 覆盖用语言
 * @param input.now - 取当前时间的注入点
 * @returns 斜杠命令定义
 */
export function createBalanceCommand({ account, credentials, version, locale, now }) {
  return {
    name: 'balance',
    description: '查询账号余额',
    handler: () =>
      runBalance({
        account,
        client: clientMetadata({ version, locale, now }),
        // 现取：凭据服务可能在插件装载后才挂载。
        credentials: credentials?.(),
      }),
  }
}

/**
 * 充值命令。打开能力在每次执行时现取：subprocess 服务可能在插件装载后才挂载。
 *
 * @param input.account - deepseekAccount 服务
 * @param input.opener - 返回打开网址的函数；没有 subprocess 时返回 undefined
 * @returns 斜杠命令定义
 */
export function createTopUpCommand({ account, opener }) {
  return {
    name: 'topup',
    description: '打开充值页',
    handler: () => openTopUp({ account, open: opener() }),
  }
}
