import { homedir } from 'node:os'

/**
 * 用系统默认协议处理器打开一个网址。命令在宿主侧执行，碰不到浏览器，
 * 所以走各平台的 opener：Windows 交给 cmd 的 start，macOS 用 open，其余用 xdg-open。
 *
 * @param platform - process.platform 的值
 * @param spawn - subprocess 服务的 spawn
 * @returns 打开一个网址的函数
 */
export function openerFor(platform, spawn) {
  return async (url) => {
    const argv =
      platform === 'win32'
        ? ['cmd.exe', '/c', 'start', '', url]
        : platform === 'darwin'
          ? ['/usr/bin/open', url]
          : ['xdg-open', url]
    const handle = spawn({
      argv,
      cwd: homedir(),
      stdio: { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' },
      graceMs: 5000,
    })
    // 打开动作不需要等浏览器起来；失败也不该影响命令结果，由调用方决定文案。
    await handle.done.catch(() => {})
  }
}
