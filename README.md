# OpenClaw Skill Approval Plugin

An OpenClaw plugin that intercepts skill installation attempts, requiring admin approval before execution.

## How it Works

```
Agent tries to install a skill (via exec / installSkill / clawhub install)
    ↓
Hook intercepts → shows approval prompt in chat:
    ⚠️ 需要审批
    检测到技能安装命令: clawhub install xxx
    请求 ID: abc123
    ↓
Admin runs /approve abc123 in chat
    ↓
Agent retries → ✅ Approved, installation proceeds
```

## Interception Strategy

The plugin uses a **multi-layer interception** approach:

| Layer       | Target                                            | Detection                        |
| ----------- | ------------------------------------------------- | -------------------------------- |
| Direct tool | `installSkill`, `install_skill`, `skills_install` | Tool name match                  |
| Exec tool   | `exec`, `system.run`, `bash`, `shell`, etc.       | Command content keyword matching |

### Intercepted Command Patterns

Commands matching any of these patterns will trigger approval:

- `clawhub install / add`
- `npx skills add`
- `openclaw skills install`
- `install.sh`
- `git clone ...skills...`
- `curl / wget` + skills + install
- Writing to `~/.openclaw/skills/` directory

### Bypass (No Interception)

- Normal shell commands (`ls`, `npm install`, `cat`, etc.)
- `git clone` without "skills" keyword
- Already approved commands

## Installation

### Option 1: Load Path (Recommended)

Add the plugin path to `~/.openclaw/openclaw.json`:

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
          "adminUsers": ["your_user_id"]
        }
      }
    }
  }
}
```

### Option 2: Copy to Extensions

```bash
./install.sh ~/.openclaw/extensions
```

## Configuration

| Field        | Type       | Default | Description                                                                                      |
| ------------ | ---------- | ------- | ------------------------------------------------------------------------------------------------ |
| `adminUsers` | `string[]` | `[]`    | Admin allowlist. Only listed users can run `/approve` and `/deny`. Empty = everyone can approve. |

## Commands

| Command           | Permission | Description                     |
| ----------------- | ---------- | ------------------------------- |
| `/approve <id>`   | Admin      | Approve a skill install request |
| `/deny <id>`      | Admin      | Reject a skill install request  |
| `/list-approvals` | Everyone   | List pending approval requests  |

## Architecture

```
openclaw.plugin.json    ← Plugin manifest + configSchema
        ↓
index.ts (register)     ← Register hooks, commands, load admin config
        ↓
hook.ts                 ← Multi-layer intercept (installSkill + exec commands)
        ↓
store.ts                ← In-memory approval state (pending → approved/rejected)
```

## Files

| File                   | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `openclaw.plugin.json` | Plugin manifest with adminUsers config schema          |
| `index.ts`             | Entry: register hooks/commands, admin allowlist        |
| `hook.ts`              | Intercept logic: direct tools + exec command detection |
| `store.ts`             | Approval state: pending queue + approved set           |
| `install.sh`           | One-click install script                               |

## License

MIT
