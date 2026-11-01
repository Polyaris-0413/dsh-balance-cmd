import { describeBalance, LOGIN_REQUIRED, QUERY_FAILED } from './balance-text.js'

/**
 * 把账户服务的状态收敛成命令结果。异常一律收敛成失败文案：
 * 让异常冒到命令执行器会以 `command/done` 错误结算并丢掉对用户有用的那句话。
 *
 * @param input.account - deepseekAccount 服务
 * @param input.client - 平台接口要求的 client metadata
 * @returns 命令结果
 */
export async function runBalance({ account, client }) {
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
  // 格式化也会抛（例如病态指数让 BigInt 溢出）；漏出去就会把英文栈信息甩给用户。
  try {
    return { kind: 'success', text: describeBalance(balance) }
  } catch {
    return { kind: 'error', text: QUERY_FAILED }
  }
}
