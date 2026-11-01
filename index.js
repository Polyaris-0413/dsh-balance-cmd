import { APP_IDENTITY } from '@deepseek-ai/dsh-llm'
import { createBalanceCommand } from './lib/create-command.js'

export const inject = ['commands', 'deepseekAccount']

export function apply(ctx) {
  ctx.effect(
    () => ctx.commands.register(createBalanceCommand({ account: ctx.deepseekAccount, version: APP_IDENTITY.version })),
    'balance: command',
  )
}
