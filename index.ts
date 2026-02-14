
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { onBeforeToolCall } from './hook.js';
import { approvalStore } from './store.js';

// 管理员白名单（在 register 时从 pluginConfig 加载）
let adminUsers: string[] = [];

export function isAdmin(senderId?: string): boolean {
    // 如果未配置白名单，则所有用户都可以审批（向后兼容）
    if (adminUsers.length === 0) return true;
    if (!senderId) return false;
    return adminUsers.includes(senderId);
}

const skillApprovalPlugin = {
    id: 'skill-approval',
    name: 'Skill Approval Plugin',
    description: '拦截技能安装请求，需要管理员审批后才能执行安装。',
    version: '1.0.0',
    configSchema: emptyPluginConfigSchema(),
    register(api: OpenClawPluginApi) {
        // 加载管理员白名单配置
        const pluginConfig = api.pluginConfig as { adminUsers?: string[] } | undefined;
        adminUsers = pluginConfig?.adminUsers ?? [];
        if (adminUsers.length > 0) {
            api.logger.info(`[skill-approval] 管理员白名单已加载: ${adminUsers.join(', ')}`);
        } else {
            api.logger.info(`[skill-approval] 未配置管理员白名单，所有用户均可审批`);
        }

        // 注册拦截 Hook
        // 使用 api.on 注册 typed hook，而非 api.registerHook（后者走 InternalHookHandler 路径）
        // before_tool_call 由 HookRunner.runBeforeToolCall(event, ctx) 调用，走 typedHooks 路径
        api.on('before_tool_call', onBeforeToolCall);

        // /approve 命令 - 批准安装
        api.registerCommand({
            name: 'approve',
            description: '批准技能安装请求',
            acceptsArgs: true,
            handler: async (ctx) => {
                // PluginCommandContext.senderId 是发送者标识
                if (!isAdmin(ctx.senderId)) {
                    return { text: '❌ 权限不足：只有管理员才能执行审批操作。' };
                }

                const requestId = ctx.args?.trim();
                if (!requestId) {
                    return { text: '用法: /approve <request_id>' };
                }

                const success = approvalStore.approveRequest(requestId);
                if (success) {
                    const req = approvalStore.getRequest(requestId);
                    return { text: `✅ 已批准: 技能 [${req?.skillUrl}] 现在可以安装了。\n请让 Agent 重新执行安装。` };
                } else {
                    return { text: `❌ 请求 [${requestId}] 不存在或已处理。` };
                }
            },
        });
        
        // /deny 命令 - 拒绝安装
        api.registerCommand({
            name: 'deny',
            description: '拒绝技能安装请求',
            acceptsArgs: true,
            handler: async (ctx) => {
                if (!isAdmin(ctx.senderId)) {
                    return { text: '❌ 权限不足：只有管理员才能执行审批操作。' };
                }

                const requestId = ctx.args?.trim();
                if (!requestId) {
                    return { text: '用法: /deny <request_id>' };
                }
                const success = approvalStore.denyRequest(requestId);
                if (success) {
                    const req = approvalStore.getRequest(requestId);
                    return { text: `🚫 已拒绝: 技能 [${req?.skillUrl}] 的安装请求已被拒绝。` }; 
                } else {
                    return { text: `❌ 请求 [${requestId}] 不存在或已处理。` };
                }
            }
        });

        // /list-approvals 命令 - 查看待审批列表
        api.registerCommand({
            name: 'list-approvals',
            description: '查看待审批的技能安装请求',
            handler: async () => {
                const pending = approvalStore.getPendingRequests();
                if (pending.length === 0) {
                    return { text: '当前没有待审批的请求。' };
                }
                const list = pending.map(r => `- **${r.id}**: ${r.skillUrl}`).join('\n');
                return { text: `📋 待审批列表:\n\n${list}` };
            }
        })
    }
};

export default skillApprovalPlugin;
