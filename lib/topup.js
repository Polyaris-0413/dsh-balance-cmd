/**
 * 充值页地址来自账号服务的 links.topUpUrl，而不是写死的常量：
 * origin 由部署配置决定，写死会在换环境时指向错误的地方。
 */

export const OPENED = '已在浏览器中打开充值页。'
export const MISSING = '无法获取充值地址，请稍后重试。'

/**
 * @param input.account - deepseekAccount 服务
 * @param input.open - 打开网址的函数；未挂载 subprocess 时为空
 * @returns 命令结果
 */
export async function openTopUp({ account, open }) {
  let url
  try {
    url = (await account.getState())?.links?.topUpUrl
  } catch {
    return { kind: 'error', text: MISSING }
  }
  if (typeof url !== 'string' || url === '') return { kind: 'error', text: MISSING }

  if (open === undefined) return { kind: 'success', text: `请手动访问充值页：${url}` }
  try {
    await open(url)
  } catch {
    return { kind: 'error', text: `打开浏览器失败，请手动访问：${url}` }
  }
  return { kind: 'success', text: OPENED }
}
