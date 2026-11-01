# dsh-balance-cmd

`/balance` 查询登录账号的余额，`/topup` 打开充值页。

## 特性

- 不消耗 token：命令和结果都不进入模型上下文。

## 安装

```sh
dsh plugin --profile desktop add git+https://github.com/Polyaris-0413/dsh-balance-cmd.git
```

装完重启 DeepSeek Harness。

> `desktop` 是桌面端的 profile 名；用 CLI 或 Web 端时换成对应的 profile。

## 更新

```sh
dsh plugin --profile desktop update dsh-balance-cmd
```

然后重启。
