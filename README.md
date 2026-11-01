# dsh-balance-cmd

用 `/balance` 命令查询 DeepSeek Harness 当前登录账号的余额。

## 作用

- 一条命令查余额，不用每次都进「设置 → 账号与余额」。
- 结果显示在会话流里，保持历史：`充值余额 ¥12.34 · 赠金 ¥0.00`；有多币种钱包时按币种分行列出。
- 不消耗 token：命令和结果都不进入模型上下文。
- 只支持登录 DeepSeek 账号。未登录或使用 API Key 模式时会提示先登录。

## 安装

```sh
dsh plugin --profile desktop add git+https://github.com/Polyaris-0413/dsh-balance-cmd.git
```

装完重启 DeepSeek Harness，输入 `/balance` 即可。

> `desktop` 是桌面端的 profile 名；用 CLI 或 Web 端时换成对应的 profile。

## 更新

`add` 会把版本钉在安装那一刻的提交上，再执行一次只会提示 `Already up to date`。升级用：

```sh
dsh plugin --profile desktop update dsh-balance-cmd
```

然后重启。若 `update` 没有拉到新版本，退回 `remove` 再 `add` 即可。
