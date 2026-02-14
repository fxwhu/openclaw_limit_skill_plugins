# OpenClaw 技能安装审批插件

拦截 Agent 的技能安装操作，需要管理员审批后才能执行。

## 工作流程

```
Agent 尝试安装技能（exec / installSkill / clawhub install）
    ↓
Hook 拦截，在聊天中显示：
    ⚠️ 需要审批
    检测到技能安装命令: clawhub install xxx
    请求 ID: abc123
    ↓
管理员在聊天中执行 /approve abc123
    ↓
Agent 重新执行 → ✅ 放行，安装成功
```

## 拦截策略

插件采用**多层拦截**机制：

| 拦截层   | 目标工具                                          | 检测方式       |
| -------- | ------------------------------------------------- | -------------- |
| 直接拦截 | `installSkill`、`install_skill`、`skills_install` | 工具名匹配     |
| 命令拦截 | `exec`、`system.run`、`bash`、`shell` 等          | 命令内容关键词 |

### 会被拦截的命令

匹配以下任意模式的命令会触发审批：

- `clawhub install / add`
- `npx skills add`
- `openclaw skills install`
- `install.sh`
- `git clone ...skills...`
- `curl / wget` + skills + install
- 写入 `~/.openclaw/skills/` 目录的操作

### 不会被拦截的命令

- 普通 shell 命令（`ls`、`npm install`、`cat` 等）
- 不含 "skills" 关键词的 `git clone`
- 已经审批通过的命令

## 安装

### 方式一：配置加载路径（推荐）

在 `~/.openclaw/openclaw.json` 中添加：

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/openclaw_limit_skill_plugins"]
    },
    "entries": {
      "skill-approval": {
        "enabled": true,
        "config": {
          "adminUsers": ["你的用户ID"]
        }
      }
    }
  }
}
```

### 方式二：复制到扩展目录

```bash
./install.sh ~/.openclaw/extensions
```

## 配置项

| 字段         | 类型       | 默认值 | 说明                                                               |
| ------------ | ---------- | ------ | ------------------------------------------------------------------ |
| `adminUsers` | `string[]` | `[]`   | 管理员白名单。只有列表中的用户可执行审批命令。为空时所有人可审批。 |

## 命令

| 命令              | 权限   | 说明           |
| ----------------- | ------ | -------------- |
| `/approve <id>`   | 管理员 | 批准安装请求   |
| `/deny <id>`      | 管理员 | 拒绝安装请求   |
| `/list-approvals` | 所有人 | 查看待审批列表 |

## 架构

```
openclaw.plugin.json    ← 插件清单 + 配置声明
        ↓
index.ts (register)     ← 注册 Hook、命令、加载管理员白名单
        ↓
hook.ts                 ← 多层拦截逻辑（直接工具 + exec 命令检测）
        ↓
store.ts                ← 内存审批状态（pending → approved / rejected）
```

## 文件说明

| 文件                   | 职责                                     |
| ---------------------- | ---------------------------------------- |
| `openclaw.plugin.json` | 插件 manifest + adminUsers 配置声明      |
| `index.ts`             | 入口：注册 Hook/命令、管理员白名单       |
| `hook.ts`              | 拦截逻辑：直接工具 + exec 命令关键词检测 |
| `store.ts`             | 审批状态管理：待审批队列 + 已批准集合    |
| `install.sh`           | 一键安装脚本                             |

## 许可证

MIT
