# dsh-balance-cmd

一个通过命令查询余额、打开充值页的 dsh 插件

  > 仅在登录 DeepSeek 账号时可用；API Key 模式下不可用

## 演示

<img width="2563" height="1531" alt="动画" src="https://github.com/user-attachments/assets/9b844a7e-c04f-4914-a72f-ff3a479cf0c1" />

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
