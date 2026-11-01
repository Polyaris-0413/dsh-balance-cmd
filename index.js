import { createRequire } from 'node:module'
import { createBalanceCommand } from './lib/create-command.js'

/**
 * profile 里安装的插件解析不到 dsh 安装内的包，取不到 APP_IDENTITY，
 * 因此 client 版本用插件自身版本：这个值只进平台侧的日志与文案，不影响余额结果。
 */
const { version } = createRequire(import.meta.url)('./package.json')

export const inject = ['commands', 'deepseekAccount']

export function apply(ctx) {
  ctx.effect(
    () => ctx.commands.register(createBalanceCommand({ account: ctx.deepseekAccount, version })),
    'balance: command',
  )
}
