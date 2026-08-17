/**
 * 数据库表类型定义
 * 对应 Supabase 的模型、配置与历史表
 */

/**
 * check_models 表的行类型
 */
export interface CheckModelRow {
  id: string;
  type: string;
  model: string;
  template_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * check_configs 表的行类型
 */
export interface CheckConfigRow {
  id: string;
  name: string;
  type: string;
  model_id: string;
  model?: string;
  template_id?: string | null;
  endpoint: string;
  api_key: string;
  enabled: boolean;
  is_maintenance: boolean;
  group_name?: string | null;
  request_header?: Record<string, string> | null;
  metadata?: Record<string, unknown> | null;
  stream_mode?: "stream" | "generate" | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * check_request_templates 表的行类型
 */
export interface CheckRequestTemplateRow {
  id: string;
  name: string;
  type: string;
  request_header?: Record<string, string> | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * check_history 表的行类型
 */
export interface CheckHistoryRow {
  id: string;
  config_id: string;
  status: string;
  latency_ms: number | null;
  ping_latency_ms: number | null;
  checked_at: string;
  message: string | null;
}

/**
 * check_challenges 表的行类型
 */
export interface CheckChallengeRow {
  id: string;
  config_id: string;
  difficulty: number;
  category: string;
  expected_answer: string;
  response_excerpt: string | null;
  passed: boolean;
  latency_ms: number | null;
  checked_at: string;
}

/**
 * availability_stats 视图的行类型
 */
export interface AvailabilityStats {
  config_id: string;
  period: "7d" | "15d" | "30d";
  total_checks: number;
  operational_count: number;
  availability_pct: number | null;
}

/**
 * group_info 表的行类型
 */
export interface GroupInfoRow {
  id: string;
  group_name: string;
  display_name?: string | null;
  description?: string | null;
  website_url?: string | null;
  icon_url?: string | null;
  tags?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * system_notifications 表的行类型
 */
export interface SystemNotificationRow {
  id: string;
  message: string;
  is_active: boolean;
  level: "info" | "warning" | "error";
  created_at: string;
}
