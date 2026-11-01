/**
 * 充值页地址来自账号服务的 links.topUpUrl，而不是写死的常量：
 * origin 由部署配置决定，写死会在换环境时指向错误的地方。
 */

export const OPENED = '已在浏览器中打开充值页。'

/**
 * @param input.account - deepseekAccount 服务
 * @param input.open - 打开网址的函数
 * @returns 命令结果
 */
export async function openTopUp({ account, open }) {
  const url = (await account.getState()).links.topUpUrl
  try {
    await open(url)
  } catch {
    return { kind: 'error', text: `打开浏览器失败，请手动访问：${url}` }
  }
  return { kind: 'success', text: OPENED }
}
