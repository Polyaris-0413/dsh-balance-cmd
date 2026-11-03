/**
 * 命令边界的兜底。
 *
 * 失败路径穷举不完，所以保证放在边界上：处理函数抛什么都在这里收敛成一条失败文案，
 * 以后新增的失败路径不需要再补一个分支。
 *
 * @param handler - 命令处理函数
 * @param failureText - 未预期失败时的文案
 * @returns 包了兜底的命令处理函数
 */
export function guarded(handler, failureText) {
  return async (invocation) => {
    try {
      return await handler(invocation)
    } catch {
      return { kind: 'error', text: failureText }
    }
  }
}
