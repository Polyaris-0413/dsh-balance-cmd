# dsh-balance-cmd

一个通过命令查询余额、打开充值页的 dsh 插件

  > 余额优先按登录的 DeepSeek 账号查询；没有登录态时回退到模型页配置的 `DEEPSEEK_API_KEY`。
  > API Key 只对 DeepSeek 官方平台有效：把 `DEEPSEEK_BASE_URL` 指向第三方中转时，查不到中转站自己的余额。

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

输入命令 `/balance` 查询余额

输入命令 `/topup` 打开充值页
