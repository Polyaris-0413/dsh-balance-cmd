import { createRequire } from 'node:module'
import { createBalanceCommand, createTopUpCommand } from './lib/create-command.js'
import { openerFor } from './lib/open-url.js'

/**
 * profile 里安装的插件解析不到 dsh 安装内的包，取不到 APP_IDENTITY，
 * 因此 client 版本用插件自身版本：这个值只进平台侧的日志与文案，不影响余额结果。
 */
const { version } = createRequire(import.meta.url)('./package.json')

export const inject = ['commands', 'deepseekAccount']

export function apply(ctx) {
  ctx.effect(
    () =>
      ctx.commands.register(
        createBalanceCommand({
          account: ctx.deepseekAccount,
          // 现取：API Key 兜底只在没登录时用，凭据服务缺失也不该拖垮命令注册。
          credentials: () => ctx.get('credentials'),
          version,
        }),
      ),
    'balance: command',
  )
  ctx.effect(
    () =>
      ctx.commands.register(
        createTopUpCommand({
          account: ctx.deepseekAccount,
          // 现取 subprocess：它可能晚于本插件挂载。
          opener: () => openerFor(process.platform, (spec) => ctx.get('subprocess').spawn(spec)),
        }),
      ),
    'topup: command',
  )
}
