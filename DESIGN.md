# `/balance` 命令插件 设计

日期：2026-11-01
规模：小改动（一个 Host-only bundle，一个命令处理器，零 UI 代码）

## 意图

查余额的现有路径是 设置 → 账号与余额 → 读面板，使用者每周多次，步骤繁琐。目标是把这一步压成一条命令，且不占常驻位置、不消耗 token。

## 目标

- 新增 `/balance`：在当前会话里查一次账号余额，结果留在会话流里。
- 只支持“登录 DeepSeek 账号”一种身份；其余一律提示去登录。
- 结果复用 DSH 默认的命令渲染，不新增 UI。

## 非目标

- 常驻数字 / 底栏 pill、低额度提醒、充值按钮、定制卡片。
- API Key 模式的余额（另一套凭证与接口）。
- 余额与本会话花费的对比、估时、汇率换算。

## 反目标（技术上跑通也算失败）

- 结果进入模型上下文或引发模型请求：命令必须零 token。
- 查不到时显示 0：必须区分“未登录”“查询失败”“真的是 0”。
- 命令名与内置命令冲突，覆盖官方行为。

## 约束（来自现有实现）

- 命令只能在宿主侧注册：`ctx.commands.register({ name, description, handler })`；handler 收到 `{ agent, rawInput, signal }`，返回 `{ kind: 'success' | 'error', text }`。
- 余额只能取 `deepseekAccount.getBalance(client)`，平台接口 `/api/v0/users/get_user_summary`，返回 `normal_wallets` + `bonus_wallets`，每项 `{ currency: 'CNY' | 'USD', balance: string }`。
- 该接口要求 client metadata 三件必填：`version` / `locale` / `timezoneOffsetSeconds`。宿主命令没有 UI 身份，需自行构造。
- 结果只能是文本；渲染由通用命令卡片完成：`text` 进单行摘要（超长省略），含 `\n` 时整行变成可展开的 `<pre>` 明细；`kind: 'error'` 自动染红。
- 插件以 bundle 形式经 `install_bundle` 装入 profile，重启后仍在。

## 已决定的方案（对话中确认）

- 命令优先，不做 pill。
- `null` 一律按“未登录”提示——覆盖未登录、凭证中途变更、完全没配置三种情况。
- 复用默认渲染，不注册 `conversation.chat.commandview`。

## 我做的取舍（可推翻）

- **状态判定**：先 `getState()`；`status === 'signed-out'` 直接返回登录提示且不发请求；否则调 `getBalance(client)`，`null` → 同一登录提示，`failed` → 查询失败，`ready` → 格式化输出。
- **文案**：命令名 `balance`，描述“查询账号余额”；描述与输出一律中文。理由：个人插件，不做 i18n。
- **输出**：首行为 `充值余额 ¥12.34 · 赠金 ¥0.00`，换行后逐行明细（币种与各钱包金额）。数字格式镜像设置页规则：0 → `¥0.00`，`<0.01` → `<¥0.01`，负数带 `-`，两位小数向下取整并加千分位。
- **metadata**：`version` 取 `APP_IDENTITY.version`，`timezoneOffsetSeconds` 取当前进程偏移，`locale` 取宿主系统语言。三者均运行时取得，不写死。
- **形态**：Host-only bundle，仅 `index.js` + `package.json` + `cordis.patch.yml` + `locale/*.json` + 图标。

## 留给实现的

- 错误文案措辞、是否附带“稍后重试”。
- 是否设 `recordInput: false`（默认 true 会把命令入参记进会话日志）。
- 包名、图标、`meta.title` / `meta.description`。
- 是否 `git init` 备份（AGENTS.md 要求每次改动后备份）。

## 位置

插件源码：`C:\Users\Administrator\ai_workspace\dsh-plugin-balance\`（按 AGENTS.md 的生成物路径）。

## 验证

- 三种状态各执行一次：未登录、已登录、断网。
- 每次都要看到：结果行出现在会话流；下一轮模型请求里没有它；token 用量为 0。
- 命令出现在斜杠菜单，描述可读。

## 风险

- 平台是否校验 metadata 的语义。我们传的是宿主身份而非 UI 身份，最可能只影响日志与文案语言，但不保证。
- 余额是平台侧汇总值，与本轮消耗不同步。文案不承诺实时。
