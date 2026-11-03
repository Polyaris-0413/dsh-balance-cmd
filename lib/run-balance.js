import { readBalanceByApiKey } from './api-key-balance.js'
import { API_KEY_INVALID, describeBalance, LOGIN_REQUIRED, QUERY_FAILED } from './balance-text.js'

/**
 * 把两条取数路径收敛成命令结果：登录态优先，没有登录凭据时退到 API Key。
 * 异常一律收敛成失败文案：让异常冒到命令执行器会以 `command/done` 错误结算并丢掉对用户有用的那句话。
 *
 * @param input.account - deepseekAccount 服务
 * @param input.client - 平台接口要求的 client metadata
 * @param input.credentials - 凭据服务；宿主未提供时为 undefined
 * @param input.fetchImpl - 余额取数实现，测试注入
 * @param input.env - 环境变量，测试注入
 * @returns 命令结果
 */
export async function runBalance({ account, client, credentials, fetchImpl, env }) {
  let state
  try {
    state = await account.getState()
  } catch {
    return { kind: 'error', text: QUERY_FAILED }
  }

  if (state?.status === 'credential-stored') {
    let balance
    try {
      balance = await account.getBalance(client)
    } catch {
      return { kind: 'error', text: QUERY_FAILED }
    }
    // null 表示账户服务没有可用登录凭据，正好交给 API Key 兜底；其他非 ready 是查询真的失败了。
    if (balance !== null && balance !== undefined) {
      if (balance.status !== 'ready') return { kind: 'error', text: QUERY_FAILED }
      return describeSafely(balance)
    }
  }

  const fallback = await readBalanceByApiKey({ credentials, fetchImpl, env })
  if (fallback.kind === 'no-key') return { kind: 'error', text: LOGIN_REQUIRED }
  if (fallback.kind === 'unauthorized') return { kind: 'error', text: API_KEY_INVALID }
  if (fallback.kind !== 'ready') return { kind: 'error', text: QUERY_FAILED }
  return describeSafely(fallback.balance)
}

/** 格式化也会抛（例如病态指数让 BigInt 溢出）；漏出去就会把英文栈信息甩给用户。 */
function describeSafely(balance) {
  try {
    return { kind: 'success', text: describeBalance(balance) }
  } catch {
    return { kind: 'error', text: QUERY_FAILED }
  }
}
