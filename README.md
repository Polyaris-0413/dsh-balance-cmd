# dsh-balance-cmd

一个通过命令快速查看余额、打开充值入口的 dsh 扩展

  > 仅在登录 DeepSeek 账号时可用；API Key 模式下不可用

## 部署

**以下操作需重启 DeepSeek Harness 才可生效**

Desktop 端：

```sh
# 安装
dsh plugin --profile desktop add git+https://github.com/Polyaris-0413/dsh-balance-cmd.git

# 更新
dsh plugin --profile desktop update dsh-balance-cmd
```

Web 端：

```sh
# 安装
dsh plugin --profile web add git+https://github.com/Polyaris-0413/dsh-balance-cmd.git

# 更新
dsh plugin --profile web update dsh-balance-cmd
```

## 使用

输入命令 `/balance` 查询账户余额

输入命令 `/topup` 打开充值页
