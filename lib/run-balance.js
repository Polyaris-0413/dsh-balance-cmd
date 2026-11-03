import { readBalanceByApiKey } from './api-key-balance.js'
import {
  API_KEY_INVALID,
  API_KEY_MISSING,
  describeBalance,
  LOGIN_REQUIRED,
  NO_CHANNEL,
  QUERY_FAILED,
  unsupportedChannel,
} from './balance-text.js'
import { ACCOUNT_CHANNEL, API_KEY_CHANNEL, channelOf } from './selection.js'

/**
 * 按当前会话的模型渠道取余额：账号渠道只查账号，API Key 渠道只查密钥，互不兜底。
 * 异常一律收敛成失败文案：让异常冒到命令执行器会以 `command/done` 错误结算并丢掉对用户有用的那句话。
 *
 * @param input.account - deepseekAccount 服务
 * @param input.client - 平台接口要求的 client metadata
 * @param input.provider - 当前会话的模型路由 id
 * @param input.credentials - 凭据服务；宿主未提供时为 undefined
 * @param input.fetchImpl - 余额取数实现，测试注入
 * @param input.env - 环境变量，测试注入
 * @returns 命令结果
 */
export async function runBalance({ account, client, provider, credentials, fetchImpl, env }) {
  const channel = channelOf(provider)
  if (channel === ACCOUNT_CHANNEL) return accountBalance({ account, client })
  if (channel === API_KEY_CHANNEL) return apiKeyBalance({ credentials, fetchImpl, env })
  return { kind: 'error', text: provider === undefined ? NO_CHANNEL : unsupportedChannel(provider) }
}

async function accountBalance({ account, client }) {
  let state
  try {
    state = await account.getState()
  } catch {
    return { kind: 'error', text: QUERY_FAILED }
  }
  if (state?.status !== 'credential-stored') return { kind: 'error', text: LOGIN_REQUIRED }

  let balance
  try {
    balance = await account.getBalance(client)
  } catch {
    return { kind: 'error', text: QUERY_FAILED }
  }
  if (balance === null || balance === undefined) return { kind: 'error', text: LOGIN_REQUIRED }
  if (balance.status !== 'ready') return { kind: 'error', text: QUERY_FAILED }
  return describeSafely(balance)
}

async function apiKeyBalance({ credentials, fetchImpl, env }) {
  const result = await readBalanceByApiKey({ credentials, fetchImpl, env })
  if (result.kind === 'ready') return describeSafely(result.balance)
  if (result.kind === 'no-key') return { kind: 'error', text: API_KEY_MISSING }
  if (result.kind === 'unauthorized') return { kind: 'error', text: API_KEY_INVALID }
  return { kind: 'error', text: QUERY_FAILED }
}

/** 格式化也会抛（例如病态指数让 BigInt 溢出）；漏出去就会把英文栈信息甩给用户。 */
function describeSafely(balance) {
  try {
    return { kind: 'success', text: describeBalance(balance) }
  } catch {
    return { kind: 'error', text: QUERY_FAILED }
  }
}
