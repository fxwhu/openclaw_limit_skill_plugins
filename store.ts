
import { randomUUID } from 'crypto';

export type ApprovalRequest = {
  id: string;
  skillUrl: string;
  agentId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
};

class ApprovalStore {
  private requests: Map<string, ApprovalRequest> = new Map();
  private approvedSkills: Set<string> = new Set();

  createRequest(skillUrl: string, agentId?: string): ApprovalRequest {
    // 复用已有的 pending 请求，避免重复创建
    for (const req of this.requests.values()) {
      if (req.skillUrl === skillUrl && req.status === 'pending') {
        return req;
      }
    }

    const id = randomUUID().slice(0, 8);
    const req: ApprovalRequest = {
      id,
      skillUrl,
      agentId,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.requests.set(id, req);
    return req;
  }

  // Fix #5: 增加状态校验，只有 pending 的请求可以被批准
  approveRequest(id: string): boolean {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return false;

    req.status = 'approved';
    this.approvedSkills.add(req.skillUrl);
    return true;
  }
  
  // Fix #4: 新增 denyRequest 方法
  denyRequest(id: string): boolean {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return false;

    req.status = 'rejected';
    return true;
  }
  
  getRequest(id: string) {
      return this.requests.get(id);
  }

  isApproved(skillUrl: string): boolean {
    return this.approvedSkills.has(skillUrl);
  }
  
  getPendingRequests(): ApprovalRequest[] {
      return Array.from(this.requests.values()).filter(r => r.status === 'pending');
  }
}

export const approvalStore = new ApprovalStore();
