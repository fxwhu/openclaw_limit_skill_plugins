
import { describe, it, expect } from 'vitest';
import { approvalStore } from '../store.ts';

// 直接测试 hook 和 store 逻辑，不依赖完整的插件注册流程
describe('Skill Approval Plugin', () => {

  describe('Store', () => {
    it('创建审批请求', () => {
      const req = approvalStore.createRequest('https://example.com/skill.js', 'agent-1');
      expect(req.id).toBeDefined();
      expect(req.status).toBe('pending');
      expect(req.skillUrl).toBe('https://example.com/skill.js');
    });

    it('相同 URL 复用 pending 请求', () => {
      const req1 = approvalStore.createRequest('https://example.com/duplicate.js');
      const req2 = approvalStore.createRequest('https://example.com/duplicate.js');
      expect(req1.id).toBe(req2.id);
    });

    it('批准请求', () => {
      const req = approvalStore.createRequest('https://example.com/approve-test.js');
      const success = approvalStore.approveRequest(req.id);
      expect(success).toBe(true);
      expect(req.status).toBe('approved');
      expect(approvalStore.isApproved('https://example.com/approve-test.js')).toBe(true);
    });

    it('拒绝请求', () => {
      const req = approvalStore.createRequest('https://example.com/deny-test.js');
      const success = approvalStore.denyRequest(req.id);
      expect(success).toBe(true);
      expect(req.status).toBe('rejected');
    });

    it('已处理的请求不能重复操作', () => {
      const req = approvalStore.createRequest('https://example.com/double.js');
      approvalStore.approveRequest(req.id);
      expect(approvalStore.approveRequest(req.id)).toBe(false);
      expect(approvalStore.denyRequest(req.id)).toBe(false);
    });

    it('不存在的 ID 返回 false', () => {
      expect(approvalStore.approveRequest('nonexistent')).toBe(false);
      expect(approvalStore.denyRequest('nonexistent')).toBe(false);
    });
  });

  describe('Hook', () => {
    it('拦截 installSkill 并返回中文提示', async () => {
      const { onBeforeToolCall } = await import('../hook.ts');
      const event = { toolName: 'installSkill', params: { url: 'https://example.com/new-skill.js' } };
      const ctx = { toolName: 'installSkill', agentId: 'test-agent' };

      const result = await onBeforeToolCall(event, ctx);

      expect(result).toBeDefined();
      expect(result!.block).toBe(true);
      expect(result!.blockReason).toContain('需要审批');
      expect(result!.blockReason).toContain('/approve');
    });

    it('非 installSkill 工具不拦截', async () => {
      const { onBeforeToolCall } = await import('../hook.ts');
      const event = { toolName: 'readFile', params: { path: '/tmp/test' } };
      const ctx = { toolName: 'readFile' };

      const result = await onBeforeToolCall(event, ctx);
      expect(result).toBeUndefined();
    });

    it('已批准的 URL 放行', async () => {
      const { onBeforeToolCall } = await import('../hook.ts');
      const url = 'https://example.com/approved-skill.js';
      
      // 先创建并批准
      const req = approvalStore.createRequest(url);
      approvalStore.approveRequest(req.id);

      const event = { toolName: 'installSkill', params: { url } };
      const ctx = { toolName: 'installSkill' };

      const result = await onBeforeToolCall(event, ctx);
      expect(result).toBeUndefined(); // 放行
    });
  });
});
