
import { approvalStore } from './store.js';

// Hook handler 类型与 PluginHookHandlerMap['before_tool_call'] 对齐：
// (event: PluginHookBeforeToolCallEvent, ctx: PluginHookToolContext) => PluginHookBeforeToolCallResult | void

type PluginHookBeforeToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
};

type PluginHookToolContext = {
  agentId?: string;
  sessionKey?: string;
  toolName: string;
};

type PluginHookBeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
};

export async function onBeforeToolCall(
  event: PluginHookBeforeToolCallEvent,
  ctx: PluginHookToolContext
): Promise<PluginHookBeforeToolCallResult | void> {
  // 只拦截 installSkill
  if (event.toolName !== 'installSkill') {
    return;
  }

  const rawUrl = event.params.url ?? event.params.source;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return; 
  }
  const url: string = rawUrl;

  // 检查是否已审批
  if (approvalStore.isApproved(url)) {
    return; // 放行
  }

  // 未审批 → 创建审批请求并拦截
  const request = approvalStore.createRequest(url, ctx.agentId);
  
  return {
    block: true,
    blockReason: [
      `⚠️ 需要审批`,
      ``,
      `技能地址: ${url}`,
      `请求 ID: **${request.id}**`,
      ``,
      `请将以上 ID 告知管理员，由管理员在聊天中执行:`,
      `\`/approve ${request.id}\``,
    ].join('\n'),
  };
}
