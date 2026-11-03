import { queryFailed } from './balance-text.js'
import { clientMetadata } from './client-metadata.js'
import { guarded } from './guard.js'
import { runBalance } from './run-balance.js'
import { providerOf } from './selection.js'
import { OPEN_FAILED, openTopUp } from './topup.js'

/**
 * 命令定义。metadata 在每次执行时现算——时区偏移会随夏令时变化，不能在启动时定格。
 *
 * @param input.account - deepseekAccount 服务
 * @param input.credentials - 返回凭据服务的取值器；API Key 渠道用，缺失时按没配 Key 处理
 * @param input.defaultProvider - 返回全局默认模型路由 id 的取值器；会话没有请求记录时兜底
 * @param input.sessionProjections - 返回投影服务的取值器；用它读切换后尚未生效的模型选择
 * @param input.version - 构建版本
 * @param input.locale - 覆盖用语言
 * @param input.now - 取当前时间的注入点
 * @returns 斜杠命令定义
 */
export function createBalanceCommand({
  account,
  credentials,
  defaultProvider,
  sessionProjections,
  version,
  locale,
  now,
}) {
  return {
    name: 'balance',
    description: '查询账号余额',
    handler: guarded(
      (invocation) =>
        runBalance({
          account,
          client: clientMetadata({ version, locale, now }),
          provider: providerOf(invocation, defaultProvider, sessionProjections),
          // 现取：凭据服务可能在插件装载后才挂载。
          credentials: credentials?.(),
        }),
      queryFailed('查询异常'),
    ),
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
    handler: guarded(() => openTopUp({ account, open: opener() }), OPEN_FAILED),
  }
}
