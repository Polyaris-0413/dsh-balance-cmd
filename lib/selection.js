/**
 * 取数渠道与当前模型渠道的判定。
 *
 * 一条会话走哪条路由，取决于模型选择而不是"什么凭据可用"：
 * 账号登录与 API Key 是两条平行的官方路由，各自对应自己的钱包，互不兜底。
 */

export const ACCOUNT_CHANNEL = 'account'
export const API_KEY_CHANNEL = 'api-key'

/** 账号登录路由。 */
const ACCOUNT_PROVIDER = 'deepseek-account'

/**
 * 以官方 API Key 为凭据的路由。`deepseek-vision` 是视觉包装插件转发的同一把 Key。
 * 名单之外的一律不猜：中转站的 Key 查不了官方钱包。
 */
const API_KEY_PROVIDERS = new Set(['deepseek', 'deepseek-official', 'deepseek-vision'])

/**
 * @param provider - 模型路由 id
 * @returns 取数渠道；不认识时返回 undefined
 */
export function channelOf(provider) {
  if (provider === ACCOUNT_PROVIDER) return ACCOUNT_CHANNEL
  if (API_KEY_PROVIDERS.has(provider)) return API_KEY_CHANNEL
  return undefined
}

/**
 * 当前会话实际会用的渠道。
 *
 * 优先读 `modelSelection` 投影的 pending：刚切换模型、还没发请求时只有它知道新渠道。
 * 其次取会话最后一次请求的 config，再次退到 agent 创建时的选项与全局默认模型。
 *
 * @param invocation - 命令调用
 * @param defaultProvider - 返回全局默认模型路由 id 的取值器
 * @param projections - 返回 sessionProjections 服务的取值器；缺失时跳过投影
 * @returns 路由 id；无从判断时返回 undefined
 */
export function providerOf(invocation, defaultProvider, projections) {
  const session = invocation?.agent?.session
  const pending = pendingProvider(session, projections)
  if (pending !== undefined) return pending

  try {
    const config = session?.requestHeader?.()?.config
    if (typeof config?.provider === 'string' && config.provider !== '') return config.provider
  } catch {
    // 会话已释放：继续看后面的来源
  }
  const fromOptions = invocation?.agent?.options?.provider
  if (typeof fromOptions === 'string' && fromOptions !== '') return fromOptions
  let selected
  try {
    selected = defaultProvider?.()
  } catch {
    return undefined
  }
  if (typeof selected === 'string' && selected !== '') return selected
  return undefined
}

/** 投影状态形如 `{ pending, lastUsed }`；pending 是下一次请求将用的选择。 */
function pendingProvider(session, projections) {
  let state
  try {
    state = projections?.()?.stateOf?.(session, 'modelSelection')
  } catch {
    return undefined
  }
  for (const selection of [state?.pending, state?.lastUsed]) {
    if (typeof selection?.provider === 'string' && selection.provider !== '') return selection.provider
  }
  return undefined
}
