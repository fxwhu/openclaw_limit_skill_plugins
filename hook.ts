
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

// ---- 拦截策略 ----

// 直接拦截的工具名（Agent 内置的技能安装工具）
const DIRECT_INTERCEPT_TOOLS = new Set([
  'installSkill',
  'install_skill',
  'skills_install',
]);

// Shell 类工具名（需要进一步检查命令内容）
const EXEC_TOOLS = new Set([
  'exec',
  'system.run',
  'bash',
  'execute_command',
  'shell',
  'run_command',
  'Write',  // 文件写入到 skills 目录也要拦截
]);

// 技能安装关键词模式（匹配 shell 命令内容）
const SKILL_INSTALL_PATTERNS: RegExp[] = [
  /\bclawhub\s+install\b/i,
  /\bclawhub\s+add\b/i,
  /\bnpx\s+skills?\s+add\b/i,
  /\bopenclaw\s+skills?\s+install\b/i,
  /\binstall\.sh\b/i,
  /\bgit\s+clone\b.*\bskills?\b/i,
  /\bskills?\b.*\bgit\s+clone\b/i,
  /\bcurl\b.*\bskills?\b.*\binstall\b/i,
  /\bwget\b.*\bskills?\b.*\binstall\b/i,
  // 向 skills 目录写入文件
  /[~\/]\.openclaw\/skills\//i,
  /\/skills\/.*SKILL\.md/i,
];

/**
 * 从 exec 工具参数中提取命令字符串
 * 兼容多种参数格式：command / cmd / args / input 等
 */
function extractCommandString(params: Record<string, unknown>): string {
  const candidates = ['command', 'cmd', 'args', 'input', 'script', 'content', 'CommandLine'];
  for (const key of candidates) {
    const val = params[key];
    if (typeof val === 'string' && val.trim()) {
      return val;
    }
  }
  // 兼容数组格式的 args
  if (Array.isArray(params.args)) {
    return params.args.join(' ');
  }
  return '';
}

/**
 * 检测 shell 命令是否包含技能安装相关操作
 */
export function isSkillInstallCommand(commandStr: string): boolean {
  return SKILL_INSTALL_PATTERNS.some(pattern => pattern.test(commandStr));
}

/**
 * 从事件中提取用于审批的标识字符串
 * installSkill: 使用 url/source 参数
 * exec: 使用完整命令字符串
 */
function extractApprovalKey(event: PluginHookBeforeToolCallEvent): string | null {
  // installSkill 类工具：提取 url
  if (DIRECT_INTERCEPT_TOOLS.has(event.toolName)) {
    const rawUrl = event.params.url ?? event.params.source;
    if (rawUrl && typeof rawUrl === 'string') {
      return rawUrl;
    }
    return `direct:${event.toolName}`;
  }

  // exec 类工具：提取命令字符串
  const cmd = extractCommandString(event.params);
  if (cmd && isSkillInstallCommand(cmd)) {
    return `exec:${cmd.trim().substring(0, 200)}`;
  }

  return null; // 不需要拦截
}

export async function onBeforeToolCall(
  event: PluginHookBeforeToolCallEvent,
  ctx: PluginHookToolContext
): Promise<PluginHookBeforeToolCallResult | void> {

  // 策略一：直接拦截已知的技能安装工具
  // 策略二：拦截 exec 类工具中包含技能安装命令的调用
  const needsIntercept =
    DIRECT_INTERCEPT_TOOLS.has(event.toolName) ||
    EXEC_TOOLS.has(event.toolName);

  if (!needsIntercept) {
    return; // 非目标工具，直接放行
  }

  const approvalKey = extractApprovalKey(event);
  if (!approvalKey) {
    return; // exec 工具但命令内容不包含技能安装，放行
  }

  // 检查是否已审批
  if (approvalStore.isApproved(approvalKey)) {
    return; // 已审批，放行
  }

  // 未审批 → 创建审批请求并拦截
  const request = approvalStore.createRequest(approvalKey, ctx.agentId);

  // 构建友好的拦截提示
  const isExecTool = EXEC_TOOLS.has(event.toolName);
  const cmdPreview = isExecTool
    ? extractCommandString(event.params).substring(0, 100)
    : approvalKey;

  return {
    block: true,
    blockReason: [
      `⚠️ 需要审批`,
      ``,
      isExecTool 
        ? `检测到技能安装命令: \`${cmdPreview}\`` 
        : `技能地址: ${approvalKey}`,
      `请求 ID: **${request.id}**`,
      ``,
      `请将以上 ID 告知管理员，由管理员在聊天中执行:`,
      `\`/approve ${request.id}\``,
    ].join('\n'),
  };
}
