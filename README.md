# dsh-balance-cmd

`/balance` 查询登录账号的余额，`/topup` 打开充值页。

## 作用

- 结果留在会话流里，保持历史。
- 不消耗 token：命令和结果都不进入模型上下文。
- 只支持登录 DeepSeek 账号。未登录或使用 API Key 模式时会提示先登录。

## 安装

```sh
dsh plugin --profile desktop add git+https://github.com/Polyaris-0413/dsh-balance-cmd.git
```

装完重启 DeepSeek Harness。

> `desktop` 是桌面端的 profile 名；用 CLI 或 Web 端时换成对应的 profile。

## 更新

`add` 会把版本钉在安装那一刻的提交上，再执行一次只会提示 `Already up to date`。升级用：

```sh
dsh plugin --profile desktop update dsh-balance-cmd
```

然后重启。若 `update` 没有拉到新版本，退回 `remove` 再 `add` 即可。
