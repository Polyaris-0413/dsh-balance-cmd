# `/balance` 命令插件 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 DSH 桌面端加一个 `/balance` 斜杠命令，查询登录账号的余额并按现有命令渲染留在会话流里，零 token、零 UI 代码。

**Architecture:** 一个 Host-only bundle。逻辑全在 `lib/` 下的纯函数里（格式化、文案、状态编排、metadata、命令定义），`index.js` 只做接线：从 `@deepseek-ai/dsh-llm` 取版本，把 `deepseekAccount` 服务与命令注册连起来。结果是一段文本，渲染交给 `ui-chat` 已有的命令卡片。

**Tech Stack:** 纯 ESM JavaScript（无构建、无第三方依赖），JSDoc 类型注释，Node 内置 `node:test`。

**Spec:** `C:\Users\Administrator\ai_workspace\dsh-plugin-balance\DESIGN.md`

## Global Constraints

- 零 token：结果不得进入模型上下文，不得触发模型请求。
- 查不到不得显示 0；`¥0.00` 只能是真实余额。
- 不新增 UI 代码，不注册任何 slot。
- 不声明任何 `dependencies`（Host-only bundle 从 dsh 安装解析内置包）。
- 文案一律中文，包括命令描述。
- 版本、语言、时区一律运行时取得，不得写死。
- 每个任务结束提交一次 git。
- 工作目录：`C:\Users\Administrator\ai_workspace\dsh-plugin-balance`。
- 测试命令统一为 `node --test test`（node 路径见下方“环境”）。

## 环境

```
NODE = C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe
```

## Review Focus

1. **真实为 0 的余额**被误判成“查不到”→ 必须显示 `充值余额 ¥0.00 · 赠金 ¥0.00`（Task 2）。
2. **未登录时仍打一次网络请求** → `getState` 为 `signed-out` 时必须提前返回，`getBalance` 调用次数为 0（Task 3）。
3. **余额字符串是指数形式**（schema 允许 `0E-16`、`1e+3`）导致解析成 `NaN` → 必须正确格式化（Task 1）。
4. **多币种**（CNY 与 USD 同时在）被加到一起 → 必须按币种分列（Task 2）。
5. **命令名与内置命令冲突** → 注册时抛错必须可见，不能静默覆盖（Task 6 的安装校验）。

---

### Task 1: 包骨架 + 金额格式化

**Files:**
- Create: `package.json`、`cordis.patch.yml`、`locale/en.json`、`locale/zh.json`、`icon.svg`、`.gitignore`
- Create: `lib/format-amount.js`
- Test: `test/format-amount.test.js`

**Interfaces:**
- Produces: `formatAmount(amount: string, currency: 'CNY' | 'USD'): string`

- [ ] **Step 1: 建骨架**

`package.json`：
```json
{
  "name": "@local/dsh-balance",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": ["index.js", "lib", "cordis.patch.yml", "locale/*.json", "icon.svg"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

`cordis.patch.yml`：
```yaml
- insert:
    - id: balance-command
      name: '@local/dsh-balance'
```

`locale/zh.json` / `locale/en.json` 写 `meta.title` 与 `meta.description`（中文、英文各一份，描述真实能力：查询登录账号余额，仅支持登录账号）。

`icon.svg`：自绘 24×24 描边图标（圆形 + `¥`），`fill="none" stroke="currentColor"`。

`.gitignore`：`node_modules`。

- [ ] **Step 2: 写失败的测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { formatAmount } from '../lib/format-amount.js'

test('零余额显示两位小数', () => {
  assert.equal(formatAmount('0', 'CNY'), '¥0.00')
})
test('小于一分显示上限', () => {
  assert.equal(formatAmount('0.004', 'CNY'), '<¥0.01')
})
test('两位小数为向下取整', () => {
  assert.equal(formatAmount('12.345', 'CNY'), '¥12.34')
})
test('千分位分组', () => {
  assert.equal(formatAmount('1234.5', 'CNY'), '¥1,234.50')
})
test('负数带负号', () => {
  assert.equal(formatAmount('-12.345', 'CNY'), '-¥12.34')
})
test('负数不足一分显示 -0.01', () => {
  assert.equal(formatAmount('-0.004', 'CNY'), '-¥0.01')
})
test('指数形式可解析', () => {
  assert.equal(formatAmount('1e+3', 'USD'), '$1,000.00')
  assert.equal(formatAmount('0E-16', 'CNY'), '¥0.00')
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `node --test test`
Expected: FAIL，`formatAmount is not a function` 或模块不存在。

- [ ] **Step 4: 实现 `formatAmount`**

用 BigInt 把十进制字符串（含可选指数）转成“分”，全程整数运算，避免浮点误差；再按符号分支套展示规则。负数也向下取整（与正数一致；原实现的负数分支用 `toFixed`，差异仅在负半分，实际不存在）。

规则出处：`packages/client/ui-settings-account/src/client/formatBalance.ts`（展示规则镜像自设置页，代码注释里写明出处）。

- [ ] **Step 5: 跑测试确认通过**

Run: `node --test test`
Expected: PASS，7 个测试全绿。

- [ ] **Step 6: 初始化仓库并提交**

```bash
git init
git add -A
git commit -m "feat: scaffold balance bundle and amount formatting"
```

---

### Task 2: 结果文案组装

**Files:**
- Create: `lib/balance-text.js`
- Test: `test/balance-text.test.js`

**Interfaces:**
- Consumes: `formatAmount`（Task 1）
- Produces:
  - `LOGIN_REQUIRED: string` = `未登录 DeepSeek 账号，仅支持登录账号查询余额。请到 设置 → 账号与余额 登录后重试。`
  - `QUERY_FAILED: string` = `余额查询失败，请稍后重试。`
  - `describeBalance(balance: { value: Wallet[], bonusWallets: Wallet[] }): string`，`Wallet = { currency: 'CNY' | 'USD', balance: string }`

- [ ] **Step 1: 写失败的测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { describeBalance } from '../lib/balance-text.js'
import { LOGIN_REQUIRED, QUERY_FAILED } from '../lib/balance-text.js'

test('单币种只出一行', () => {
  assert.equal(
    describeBalance({ value: [{ currency: 'CNY', balance: '12.34' }], bonusWallets: [] }),
    '充值余额 ¥12.34 · 赠金 ¥0.00',
  )
})
test('真实为零仍是成功文案', () => {
  assert.equal(
    describeBalance({ value: [{ currency: 'CNY', balance: '0' }], bonusWallets: [] }),
    '充值余额 ¥0.00 · 赠金 ¥0.00',
  )
})
test('同币种多钱包求和', () => {
  assert.equal(
    describeBalance({
      value: [{ currency: 'CNY', balance: '0.10' }, { currency: 'CNY', balance: '0.20' }],
      bonusWallets: [],
    }),
    '充值余额 ¥0.30 · 赠金 ¥0.00',
  )
})
test('非主币种逐条列出，不与主币种相加', () => {
  assert.equal(
    describeBalance({
      value: [{ currency: 'CNY', balance: '12.34' }, { currency: 'USD', balance: '5' }],
      bonusWallets: [],
    }),
    '充值余额 ¥12.34 · 赠金 ¥0.00\n充值 $5.00 USD',
  )
})
test('赠金按币种进明细', () => {
  assert.equal(
    describeBalance({
      value: [{ currency: 'CNY', balance: '12.34' }],
      bonusWallets: [{ currency: 'USD', balance: '1' }],
    }),
    '充值余额 ¥12.34 · 赠金 ¥0.00\n赠金 $1.00 USD',
  )
})
test('登录与失败文案', () => {
  assert.match(LOGIN_REQUIRED, /仅支持登录账号/)
  assert.match(QUERY_FAILED, /查询失败/)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test test`
Expected: FAIL，`Cannot find module '../lib/balance-text.js'`。

- [ ] **Step 3: 实现 `describeBalance`**

主币种取 `value[0].currency`；主行只汇总主币种的充值合计与赠金合计；凡币种不等于主币种的钱包，逐条追加到换行明细，格式 `充值|赠金 {金额} {币种}`。求和同样用 BigInt 分单位。

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test test`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: compose balance result text"
```

---

### Task 3: 状态编排

**Files:**
- Create: `lib/run-balance.js`
- Test: `test/run-balance.test.js`

**Interfaces:**
- Consumes: `describeBalance`、`LOGIN_REQUIRED`、`QUERY_FAILED`（Task 2）
- Produces: `runBalance(input: { account, client }): Promise<{ kind: 'success' | 'error', text: string }>`
  - `account` 需实现 `getState(): Promise<{ status: 'signed-out' | 'credential-stored' }>` 与 `getBalance(client): Promise<ReadyBalance | { status: 'failed' } | null>`

- [ ] **Step 1: 写失败的测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { runBalance } from '../lib/run-balance.js'
import { LOGIN_REQUIRED, QUERY_FAILED } from '../lib/balance-text.js'

const ready = { status: 'ready', value: [{ currency: 'CNY', balance: '12.34' }], bonusWallets: [] }

test('未登录直接返回登录提示且不发请求', async () => {
  let calls = 0
  const account = {
    getState: async () => ({ status: 'signed-out' }),
    getBalance: async () => { calls += 1; return ready },
  }
  const result = await runBalance({ account, client: {} })
  assert.deepEqual(result, { kind: 'error', text: LOGIN_REQUIRED })
  assert.equal(calls, 0)
})

test('余额为 null 一律按未登录处理', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => null,
  }
  assert.deepEqual(await runBalance({ account, client: {} }), { kind: 'error', text: LOGIN_REQUIRED })
})

test('查询失败给出失败文案', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ({ status: 'failed' }),
  }
  assert.deepEqual(await runBalance({ account, client: {} }), { kind: 'error', text: QUERY_FAILED })
})

test('成功返回组装后的文本', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => ready,
  }
  assert.deepEqual(await runBalance({ account, client: {} }), {
    kind: 'success',
    text: '充值余额 ¥12.34 · 赠金 ¥0.00',
  })
})

test('凭证读取抛错按查询失败处理', async () => {
  const account = {
    getState: async () => { throw new Error('storage') },
    getBalance: async () => ready,
  }
  assert.deepEqual(await runBalance({ account, client: {} }), { kind: 'error', text: QUERY_FAILED })
})

test('余额请求抛错按查询失败处理', async () => {
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async () => { throw new Error('network') },
  }
  assert.deepEqual(await runBalance({ account, client: {} }), { kind: 'error', text: QUERY_FAILED })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test test`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 `runBalance`**

按 未登录 → 早退；`null` → 登录文案；`failed` → 失败文案；`ready` → `describeBalance`。两处 `try/catch` 都收敛成 `QUERY_FAILED`，不让异常冒到命令执行器（那会以 `command/done` 错误结算并丢掉文案）。

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test test`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: resolve balance command outcome"
```

---

### Task 4: Client metadata

**Files:**
- Create: `lib/client-metadata.js`
- Test: `test/client-metadata.test.js`

**Interfaces:**
- Produces: `clientMetadata(input?: { version: string, locale?: string, now?: () => Date }): { version: string, locale: string, timezoneOffsetSeconds: number }`
  - `locale` 默认取 `Intl.DateTimeFormat().resolvedOptions().locale`
  - `timezoneOffsetSeconds` = `-now().getTimezoneOffset() * 60`

- [ ] **Step 1: 写失败的测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { clientMetadata } from '../lib/client-metadata.js'

test('透传版本与语言并换算时区偏移', () => {
  const now = () => ({ getTimezoneOffset: () => -480 })
  assert.deepEqual(
    clientMetadata({ version: '1.2.3', locale: 'zh-CN', now }),
    { version: '1.2.3', locale: 'zh-CN', timezoneOffsetSeconds: 28800 },
  )
})

test('缺省时语言来自运行时环境', () => {
  const value = clientMetadata({ version: '1.2.3' })
  assert.equal(typeof value.locale, 'string')
  assert.notEqual(value.locale, '')
  assert.equal(value.version, '1.2.3')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test test`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 `clientMetadata`**

注意符号：`getTimezoneOffset()` 返回“UTC 减本地”的分钟数，西半球为正，所以取负；东八区应得 `28800`。

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test test`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: build account client metadata"
```

---

### Task 5: 命令定义与插件入口

**Files:**
- Create: `lib/create-command.js`
- Create: `index.js`
- Test: `test/create-command.test.js`

**Interfaces:**
- Consumes: `runBalance`（Task 3）、`clientMetadata`（Task 4）
- Produces: `createBalanceCommand(input: { account, version: string, locale?: string, now?: () => Date }): { name: 'balance', description: string, handler(input: { signal?: AbortSignal }): Promise<{ kind, text }> }`

- [ ] **Step 1: 写失败的测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBalanceCommand } from '../lib/create-command.js'

const ready = { status: 'ready', value: [{ currency: 'CNY', balance: '1' }], bonusWallets: [] }

test('命令名与描述符合约定', () => {
  const command = createBalanceCommand({ account: {}, version: '9.9.9' })
  assert.equal(command.name, 'balance')
  assert.match(command.description, /余额/)
  assert.match(command.description, /登录账号/)
})

test('处理器把 metadata 交给账户服务并回传结果', async () => {
  let seen
  const account = {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async (client) => { seen = client; return ready },
  }
  const command = createBalanceCommand({ account, version: '9.9.9', locale: 'zh-CN' })
  assert.deepEqual(await command.handler({}), { kind: 'success', text: '充值余额 ¥1.00 · 赠金 ¥0.00' })
  assert.equal(seen.version, '9.9.9')
  assert.equal(seen.locale, 'zh-CN')
  assert.equal(typeof seen.timezoneOffsetSeconds, 'number')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test test`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 `createBalanceCommand` 与 `index.js`**

`create-command.js` 返回 `{ name: 'balance', description: '查询账号余额（仅支持登录 DeepSeek 账号）', handler }`，`handler` 每次调用现算 `clientMetadata` 再转交 `runBalance`。不设 `recordInput`（默认 `true`；裸命令的 `args` 为空）。

`index.js`：
```js
import { APP_IDENTITY } from '@deepseek-ai/dsh-llm'
import { createBalanceCommand } from './lib/create-command.js'

export const inject = ['commands', 'deepseekAccount']

export function apply(ctx) {
  ctx.effect(
    () => ctx.commands.register(createBalanceCommand({ account: ctx.deepseekAccount, version: APP_IDENTITY.version })),
    'balance: command',
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test test`
Expected: PASS。

- [ ] **Step 5: 语法自检**

Run: `node --check index.js; node --check lib/create-command.js`
Expected: 无输出、退出码 0。（`index.js` 不能进单测：`@deepseek-ai/dsh-llm` 只从 dsh 安装解析，仓库里没有。）

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: register balance slash command"
```

---

### Task 6: 装进 profile 并验收

**Files:**
- Modify: `C:\Users\Administrator\.dsh\profiles\desktop\package.json`（只加一个 bundle 名）

**Interfaces:**
- Consumes: 全部前序任务。

- [ ] **Step 1: 安装包**

```powershell
dsh plugin --profile desktop add "C:\Users\Administrator\ai_workspace\dsh-plugin-balance"
```

Expected: pnpm 把包写进 profile 的 `node_modules`；`package.json` 的 `dependencies` 出现 `@local/dsh-balance`。

- [ ] **Step 2: 选择 bundle**

在 profile `package.json` 的 `dsh.profile.bundles` 数组末尾追加 `"@local/dsh-balance"`。
说明：本会话没有 `plugin_manager` 工具，`install_bundle` 不可用，所以这一步是手工的等价操作；改动只有一行，可随时回退。

- [ ] **Step 3: 静态校验装配**

```powershell
dsh --profile desktop --dump-config | Select-String -Pattern 'dsh-balance','balance-command'
```

Expected: 输出里能看到 `@local/dsh-balance` 与 `balance-command` 行。看不到就说明 bundle 没被选中，回 Step 2。

- [ ] **Step 4: 重启桌面端并由使用者执行三种查询**

宿主插件需要重启才能装载；本会话运行在该应用内，重启会中断会话，所以由使用者重启后执行：
- 已登录：`/balance` → 一行 `充值余额 ¥x · 赠金 ¥y`
- 断网：`/balance` → `余额查询失败，请稍后重试。`
- 未登录：以单测覆盖（Task 3），不要求实际退出登录

- [ ] **Step 5: 验证零 token**

执行 `/balance` 后看该会话的 usage pill：token 数不变；下一轮提问的上下文里不出现余额文本。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "chore: record installation steps"
```

---

## 自检记录

- 规格覆盖：目标（命令、仅登录账号、复用渲染）→ Task 1–5；反目标（零 token、不显示 0、不覆盖内置）→ Task 3 测试、Task 2 零余额测试、Task 6 冲突可见性；验证项 → Task 6。
- 类型一致性：`Wallet`、`ReadyBalance`、`runBalance` 的入参出参在各任务 Interfaces 中一致。
- 偏差说明：设计文档写“首行 + 换行明细”，实现改为**仅当存在非主币种钱包时才出现明细**——否则单币种用户每次会看到重复数字。
