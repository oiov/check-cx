-- =============================================================================
-- 迁移：dev schema 新增模型能力评估挑战记录表 + 智力统计视图
-- =============================================================================

-- 挑战记录表：每次健康检查的挑战-验证结果（含不计入健康状态的高难度题）
CREATE TABLE IF NOT EXISTS dev.check_challenges (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    config_id uuid NOT NULL REFERENCES dev.check_configs(id) ON DELETE CASCADE,
    difficulty smallint NOT NULL,
    category text NOT NULL,
    expected_answer text NOT NULL,
    response_excerpt text,
    passed boolean NOT NULL,
    latency_ms integer,
    checked_at timestamptz NOT NULL DEFAULT NOW(),

    CONSTRAINT check_challenges_difficulty_valid CHECK (difficulty BETWEEN 1 AND 5)
);

COMMENT ON TABLE dev.check_challenges IS '模型能力评估挑战记录（难度 1/2 同时用于健康判定，3-5 仅用于能力评估）';
COMMENT ON COLUMN dev.check_challenges.id IS '记录 ID';
COMMENT ON COLUMN dev.check_challenges.config_id IS '关联的配置 ID';
COMMENT ON COLUMN dev.check_challenges.difficulty IS '难度档 1-5';
COMMENT ON COLUMN dev.check_challenges.category IS '题型：category_select / reading_comprehension / state_tracking / logical_implication / instruction_following';
COMMENT ON COLUMN dev.check_challenges.expected_answer IS '期望答案（归一化后比较）';
COMMENT ON COLUMN dev.check_challenges.response_excerpt IS '模型回复摘要（已截断），失败时用于排查';
COMMENT ON COLUMN dev.check_challenges.passed IS '是否通过验证';
COMMENT ON COLUMN dev.check_challenges.latency_ms IS '响应延迟 (毫秒)';
COMMENT ON COLUMN dev.check_challenges.checked_at IS '检测时间';

CREATE INDEX IF NOT EXISTS idx_dev_challenges_config_checked
    ON dev.check_challenges (config_id, checked_at DESC);

-- Enable RLS (service role only，与 check_poller_leases 一致，不建 policy)
ALTER TABLE dev.check_challenges ENABLE ROW LEVEL SECURITY;

-- 智力统计视图：近 30 天按难度档通过率 + 加权总分
-- 权重 1/2/4/8/16 随难度递增；样本 < 5 的难度档 pass_rate 记 NULL 且不计入总分
CREATE OR REPLACE VIEW dev.intelligence_stats AS
WITH agg AS (
    SELECT
        config_id,
        difficulty,
        COUNT(*) AS samples,
        COUNT(*) FILTER (WHERE passed) AS passed_count
    FROM dev.check_challenges
    WHERE checked_at > NOW() - INTERVAL '30 days'
    GROUP BY config_id, difficulty
),
scored AS (
    SELECT
        config_id,
        difficulty,
        samples,
        passed_count,
        CASE WHEN samples >= 5
             THEN ROUND(100.0 * passed_count / samples, 2)
        END AS pass_rate,
        CASE difficulty
            WHEN 1 THEN 1
            WHEN 2 THEN 2
            WHEN 3 THEN 4
            WHEN 4 THEN 8
            WHEN 5 THEN 16
        END AS weight
    FROM agg
)
SELECT
    config_id,
    SUM(samples) AS total_samples,
    MAX(pass_rate) FILTER (WHERE difficulty = 1) AS d1_pass_rate,
    MAX(pass_rate) FILTER (WHERE difficulty = 2) AS d2_pass_rate,
    MAX(pass_rate) FILTER (WHERE difficulty = 3) AS d3_pass_rate,
    MAX(pass_rate) FILTER (WHERE difficulty = 4) AS d4_pass_rate,
    MAX(pass_rate) FILTER (WHERE difficulty = 5) AS d5_pass_rate,
    ROUND(100.0 *
          SUM(CASE WHEN samples >= 5 THEN weight * passed_count ELSE 0 END)
        / NULLIF(SUM(CASE WHEN samples >= 5 THEN weight * samples ELSE 0 END), 0), 2
    ) AS total_score
FROM scored
GROUP BY config_id;

COMMENT ON VIEW dev.intelligence_stats IS '近30天模型能力评估：按难度档通过率与加权总分（权重 1/2/4/8/16，样本 <5 的难度档不计入总分）';

-- 扩展清理 RPC：同时清理挑战记录（签名不变，调用方无需修改）
DROP FUNCTION IF EXISTS dev.prune_check_history(integer);

CREATE OR REPLACE FUNCTION dev.prune_check_history(
    retention_days integer DEFAULT NULL,
    limit_per_config integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    effective_days integer;
    deleted_count integer;
    challenge_deleted integer;
BEGIN
    effective_days := LEAST(365, GREATEST(7, COALESCE(retention_days, limit_per_config, 30)));

    DELETE FROM dev.check_history
    WHERE checked_at < NOW() - (effective_days || ' days')::interval;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    DELETE FROM dev.check_challenges
    WHERE checked_at < NOW() - (effective_days || ' days')::interval;

    GET DIAGNOSTICS challenge_deleted = ROW_COUNT;
    RETURN deleted_count + challenge_deleted;
END;
$$;

COMMENT ON FUNCTION dev.prune_check_history IS '清理超过指定天数的历史记录与挑战记录，默认保留 30 天';
