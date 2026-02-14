# OpenClaw 技能安装审批插件

拦截 Agent 的 `installSkill` 调用，在聊天中提示「需要审批」，由管理员通过 `/approve` 命令放行后才能安装。

## 工作流程

```
Agent 尝试安装技能
    ↓
Hook 拦截，在聊天中显示：
    ⚠️ 需要审批
    技能地址: https://...
    请求 ID: abc123
    ↓
聊天中的人口头告知管理员
    ↓
管理员在聊天中执行 /approve abc123
    ↓
Agent 重新安装 → ✅ 放行
```

## 技术方案

### 核心架构

```
openclaw.plugin.json    ← Loader 发现插件的 manifest（必须含 configSchema）
        ↓
index.ts (register)     ← 注册 Hook + 命令 + 加载白名单配置
        ↓
hook.ts                 ← before_tool_call 拦截 installSkill
        ↓
store.ts                ← 内存审批状态（pending → approved/rejected）
```

### 关键设计

| 要点         | 说明                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **拦截方式** | `api.registerHook('before_tool_call', handler, { name })` — opts.name 必填，否则 registry 静默跳过 |
| **通知方式** | Hook 返回 `blockReason`，Agent 将其呈现在当前聊天中                                                |
| **审批方式** | 管理员在聊天中发送 `/approve <id>` 命令                                                            |
| **权限控制** | `pluginConfig.adminUsers` 白名单，未配置时所有人可审批                                             |
| **状态存储** | 进程内存（重启后清空），可扩展为文件持久化                                                         |
| **幂等性**   | 同一 URL 重复请求会复用已有 pending 记录                                                           |

## 安装

```bash
./install.sh /path/to/openclaw/extensions
```

## 配置管理员白名单

在 OpenClaw 配置中为本插件设置管理员列表：

```yaml
# openclaw 配置文件中
plugins:
  skill-approval:
    adminUsers:
      - "admin_user_id_1"
      - "admin_user_id_2"
```

未配置 `adminUsers` 时，所有用户均可执行审批命令。

## 命令

| 命令              | 权限   | 说明           |
| ----------------- | ------ | -------------- |
| `/approve <id>`   | 管理员 | 批准安装请求   |
| `/deny <id>`      | 管理员 | 拒绝安装请求   |
| `/list-approvals` | 所有人 | 查看待审批列表 |

## 文件说明

| 文件                   | 职责                                            |
| ---------------------- | ----------------------------------------------- |
| `openclaw.plugin.json` | 插件 manifest + adminUsers 配置声明             |
| `index.ts`             | 入口：注册 Hook/命令、加载白名单、权限校验      |
| `hook.ts`              | 拦截逻辑：仅拦截 installSkill，返回中文审批提示 |
| `store.ts`             | 审批状态管理：待审批队列 + 已批准集合           |
| `install.sh`           | 一键安装脚本                                    |
