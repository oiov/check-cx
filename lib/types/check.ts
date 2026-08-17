/**
 * 健康检查相关类型定义
 */

import type {ProviderType} from "./provider";
import type {OfficialStatusResult} from "./official-status";

/**
 * Provider 健康状态
 */
export type HealthStatus = "operational" | "degraded" | "failed" | "validation_failed" | "maintenance" | "error";

/**
 * 单次挑战-验证的结果（用于能力评估落库，不影响健康状态判定）
 */
export interface ChallengeOutcome {
  difficulty: number; // 难度档 1-5
  category: string; // 题型
  expectedAnswer: string;
  responseExcerpt: string | null; // 归一化后的回复摘要（已截断）
  passed: boolean;
}

/**
 * 单次检查结果
 */
export interface CheckResult {
  id: string; // config_id from database
  name: string;
  type: ProviderType;
  endpoint: string;
  model: string;
  status: HealthStatus;
  latencyMs: number | null; // 对话首字延迟
  pingLatencyMs: number | null; // 端点 Ping 延迟
  checkedAt: string; // ISO 8601 timestamp
  message: string;
  logMessage?: string;
  officialStatus?: OfficialStatusResult; // 官方服务状态(可选)
  groupName?: string | null; // 分组名称
  challenge?: ChallengeOutcome; // 挑战结果(可选)，仅存在于内存中的新鲜结果，不落 check_history、不进公开 API
}
