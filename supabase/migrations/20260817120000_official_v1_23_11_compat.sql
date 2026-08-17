-- Lossless compatibility migration for upgrading the deployed h7ml-based fork
-- to the official v1.23.11 data model.
--
-- This migration is deliberately additive. The legacy model, request_header,
-- metadata, and stream_mode columns remain available for application rollback.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
  IF to_regclass('public.check_configs') IS NULL
     OR to_regclass('public.check_history') IS NULL
     OR to_regclass('public.group_info') IS NULL THEN
    RAISE EXCEPTION 'Missing required legacy check-cx tables';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'check_configs'
      AND column_name = 'model'
  ) THEN
    RAISE EXCEPTION 'Legacy check_configs.model is required for the compatibility backfill';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.check_configs
    WHERE model IS NULL OR btrim(model) = ''
  ) THEN
    RAISE EXCEPTION 'Cannot migrate configs with a missing model';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.check_configs
    WHERE type::text NOT IN ('openai', 'gemini', 'anthropic')
  ) THEN
    RAISE EXCEPTION 'Unsupported provider data exists; migrate provider support before continuing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.check_configs
    WHERE (request_header IS NOT NULL AND jsonb_typeof(request_header) <> 'object')
       OR (metadata IS NOT NULL AND jsonb_typeof(metadata) <> 'object')
  ) THEN
    RAISE EXCEPTION 'Config request_header and metadata values must be JSON objects';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.check_configs
    WHERE stream_mode IS NOT NULL
      AND stream_mode NOT IN ('stream', 'generate')
  ) THEN
    RAISE EXCEPTION 'Unsupported stream_mode data exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.check_history AS history
    LEFT JOIN public.check_configs AS config ON config.id = history.config_id
    WHERE config.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Orphan check_history rows exist';
  END IF;

  IF (SELECT count(*) FROM public.check_configs) <> 44 THEN
    RAISE EXCEPTION 'Expected 44 check_configs rows; inspect deployment changes before migrating';
  END IF;

  IF (SELECT count(*) FROM public.check_history) < 7900 THEN
    RAISE EXCEPTION 'Expected at least 7900 check_history rows; inspect deployment state before migrating';
  END IF;

  IF (SELECT count(*) FROM public.group_info) <> 10 THEN
    RAISE EXCEPTION 'Expected 10 group_info rows; inspect deployment changes before migrating';
  END IF;

  IF to_regclass('public.site_settings') IS NULL
     OR to_regclass('public.scheduler_tokens') IS NULL THEN
    RAISE EXCEPTION 'Expected deployed site_settings and scheduler_tokens tables';
  END IF;

  IF (SELECT count(*) FROM public.site_settings) <> 12
     OR (SELECT count(*) FROM public.scheduler_tokens) <> 3 THEN
    RAISE EXCEPTION 'Expected 12 site_settings and 3 scheduler_tokens rows; inspect deployment state before migrating';
  END IF;
END
$$;

CREATE TEMP TABLE check_cx_upgrade_baseline ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.check_configs) AS config_count,
  (SELECT count(*) FROM public.check_history) AS history_count,
  (SELECT count(*) FROM public.group_info) AS group_count,
  (SELECT count(*) FROM public.site_settings) AS site_setting_count,
  (SELECT count(*) FROM public.scheduler_tokens) AS scheduler_token_count,
  (
    SELECT md5(string_agg(to_jsonb(protected_config)::text, E'\n' ORDER BY protected_config.id))
    FROM (
      SELECT id, name, type, model, endpoint, api_key, enabled, is_maintenance,
             group_name, request_header, metadata, stream_mode, created_at
      FROM public.check_configs
    ) AS protected_config
  ) AS config_fingerprint,
  (
    SELECT md5(string_agg(to_jsonb(protected_history)::text, E'\n' ORDER BY protected_history.id))
    FROM (
      SELECT id, config_id, status, latency_ms, ping_latency_ms, checked_at, message
      FROM public.check_history
    ) AS protected_history
  ) AS history_fingerprint,
  (
    SELECT md5(string_agg(to_jsonb(protected_group)::text, E'\n' ORDER BY protected_group.group_name))
    FROM (
      SELECT group_name, display_name, description, website_url, icon_url, tags
      FROM public.group_info
    ) AS protected_group
  ) AS group_fingerprint,
  (
    SELECT md5(string_agg(to_jsonb(protected_setting)::text, E'\n' ORDER BY protected_setting.key))
    FROM (
      SELECT key, value, description, editable, value_type
      FROM public.site_settings
    ) AS protected_setting
  ) AS site_setting_fingerprint,
  (
    SELECT md5(string_agg(to_jsonb(protected_token)::text, E'\n' ORDER BY protected_token.id))
    FROM (
      SELECT id, name, token_hash, token_prefix, scope, enabled, last_used_at,
             expires_at, created_at, updated_at
      FROM public.scheduler_tokens
    ) AS protected_token
  ) AS scheduler_token_fingerprint;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Preserve local operational tables and fields used by the deployed app.
ALTER TABLE public.group_info
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS tags text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text,
  description text,
  editable boolean NOT NULL DEFAULT true,
  value_type text NOT NULL DEFAULT 'string'
);

INSERT INTO public.site_settings (key, value, description, editable, value_type)
VALUES
  ('check_poll_interval_seconds', '60', '轮询间隔（秒）', true, 'number'),
  ('degraded_threshold_ms', '6000', '延迟超过此值判定为降级（毫秒）', true, 'number'),
  ('max_concurrency', '5', '并发检测任务上限（1-20）', true, 'number'),
  ('history_retention_count', '60', '每个配置最多保留历史条数', true, 'number')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.scheduler_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  scope text NOT NULL DEFAULT 'checks:run',
  enabled boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduler_tokens_enabled
  ON public.scheduler_tokens (enabled, created_at DESC);

ALTER TABLE public.scheduler_tokens ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_scheduler_tokens_updated_at ON public.scheduler_tokens;
CREATE TRIGGER update_scheduler_tokens_updated_at
  BEFORE UPDATE ON public.scheduler_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Official request-template and model objects.
CREATE TABLE IF NOT EXISTS public.check_request_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type public.provider_type NOT NULL,
  request_header jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.check_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.provider_type NOT NULL,
  model text NOT NULL,
  template_id uuid REFERENCES public.check_request_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_models_type_model_key UNIQUE (type, model)
);

ALTER TABLE public.check_request_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_models ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.check_configs
  ADD COLUMN IF NOT EXISTS model_id uuid,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS request_header jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS stream_mode text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_configs_model_id_fkey'
      AND conrelid = 'public.check_configs'::regclass
  ) THEN
    ALTER TABLE public.check_configs
      ADD CONSTRAINT check_configs_model_id_fkey
      FOREIGN KEY (model_id)
      REFERENCES public.check_models(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_configs_template_id_fkey'
      AND conrelid = 'public.check_configs'::regclass
  ) THEN
    ALTER TABLE public.check_configs
      ADD CONSTRAINT check_configs_template_id_fkey
      FOREIGN KEY (template_id)
      REFERENCES public.check_request_templates(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_check_configs_model_id
  ON public.check_configs (model_id);
CREATE INDEX IF NOT EXISTS idx_check_configs_template_id
  ON public.check_configs (template_id);
CREATE INDEX IF NOT EXISTS idx_check_models_template_id
  ON public.check_models (template_id);

INSERT INTO public.check_models (type, model)
SELECT DISTINCT type, model
FROM public.check_configs
ON CONFLICT (type, model) DO NOTHING;

UPDATE public.check_configs AS config
SET model_id = model.id
FROM public.check_models AS model
WHERE model.type = config.type
  AND model.model = config.model
  AND config.model_id IS DISTINCT FROM model.id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.check_configs WHERE model_id IS NULL) THEN
    RAISE EXCEPTION 'Not every check config received a model_id';
  END IF;
END
$$;

ALTER TABLE public.check_configs
  ALTER COLUMN model_id SET NOT NULL;

-- Materialize legacy config payloads without clearing their source columns.
WITH candidate_payloads AS (
  SELECT DISTINCT type, request_header, metadata
  FROM public.check_configs
  WHERE request_header IS NOT NULL OR metadata IS NOT NULL
),
templates AS (
  SELECT
    'legacy-config-' || type::text || '-' || md5(
      type::text || '|' || coalesce(request_header::text, '{}') || '|' || coalesce(metadata::text, '{}')
    ) AS name,
    type,
    request_header,
    metadata
  FROM candidate_payloads
)
INSERT INTO public.check_request_templates (name, type, request_header, metadata)
SELECT name, type, request_header, metadata
FROM templates
ON CONFLICT (name) DO UPDATE
SET type = EXCLUDED.type,
    request_header = EXCLUDED.request_header,
    metadata = EXCLUDED.metadata;

UPDATE public.check_configs AS config
SET template_id = template.id
FROM public.check_request_templates AS template
WHERE config.template_id IS NULL
  AND (config.request_header IS NOT NULL OR config.metadata IS NOT NULL)
  AND template.name = 'legacy-config-' || config.type::text || '-' || md5(
    config.type::text || '|' || coalesce(config.request_header::text, '{}') || '|' || coalesce(config.metadata::text, '{}')
  );

-- A model gets a default template only when every config using it has the
-- exact same non-null template. Conflicting variants remain config overrides.
WITH uniform_model_templates AS (
  SELECT
    model_id,
    (array_agg(template_id))[1] AS template_id
  FROM public.check_configs
  GROUP BY model_id
  HAVING count(*) = count(template_id)
     AND count(DISTINCT template_id) = 1
)
UPDATE public.check_models AS model
SET template_id = uniform.template_id
FROM uniform_model_templates AS uniform
WHERE model.id = uniform.model_id
  AND model.template_id IS NULL;

CREATE OR REPLACE FUNCTION public.validate_check_config_model_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  linked_type public.provider_type;
BEGIN
  SELECT type INTO linked_type
  FROM public.check_models
  WHERE id = NEW.model_id;

  IF linked_type IS NOT NULL AND linked_type <> NEW.type THEN
    RAISE EXCEPTION 'Model type mismatch: config.type=%, model.type=%', NEW.type, linked_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_check_config_template_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  linked_type public.provider_type;
BEGIN
  IF NEW.template_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT type INTO linked_type
  FROM public.check_request_templates
  WHERE id = NEW.template_id;

  IF linked_type IS NOT NULL AND linked_type <> NEW.type THEN
    RAISE EXCEPTION 'Template type mismatch: config.type=%, template.type=%', NEW.type, linked_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_check_model_template_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  linked_type public.provider_type;
BEGIN
  IF NEW.template_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT type INTO linked_type
  FROM public.check_request_templates
  WHERE id = NEW.template_id;

  IF linked_type IS NOT NULL AND linked_type <> NEW.type THEN
    RAISE EXCEPTION 'Template type mismatch: model.type=%, template.type=%', NEW.type, linked_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_check_configs_model_type ON public.check_configs;
CREATE TRIGGER validate_check_configs_model_type
  BEFORE INSERT OR UPDATE OF model_id, type ON public.check_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_check_config_model_type();

DROP TRIGGER IF EXISTS validate_check_configs_template_type ON public.check_configs;
CREATE TRIGGER validate_check_configs_template_type
  BEFORE INSERT OR UPDATE OF template_id, type ON public.check_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_check_config_template_type();

DROP TRIGGER IF EXISTS validate_check_models_template_type ON public.check_models;
CREATE TRIGGER validate_check_models_template_type
  BEFORE INSERT OR UPDATE OF template_id, type ON public.check_models
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_check_model_template_type();

DROP TRIGGER IF EXISTS update_check_models_updated_at ON public.check_models;
CREATE TRIGGER update_check_models_updated_at
  BEFORE UPDATE ON public.check_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_check_request_templates_updated_at ON public.check_request_templates;
CREATE TRIGGER update_check_request_templates_updated_at
  BEFORE UPDATE ON public.check_request_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Official capability challenge objects.
CREATE TABLE IF NOT EXISTS public.check_challenges (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  config_id uuid NOT NULL REFERENCES public.check_configs(id) ON DELETE CASCADE,
  difficulty smallint NOT NULL,
  category text NOT NULL,
  expected_answer text NOT NULL,
  response_excerpt text,
  passed boolean NOT NULL,
  latency_ms integer,
  checked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_challenges_difficulty_valid CHECK (difficulty BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_challenges_config_checked
  ON public.check_challenges (config_id, checked_at DESC);

ALTER TABLE public.check_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL,
  group_name text,
  auth_user_id uuid UNIQUE,
  invited_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  invited_at timestamptz DEFAULT now(),
  activated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'member')),
  CONSTRAINT admin_users_member_group_check CHECK (
    role = 'admin' OR (group_name IS NOT NULL AND btrim(group_name) <> '')
  )
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role_group
  ON public.admin_users (role, group_name);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Official statistics remain compatible with existing config IDs and history.
CREATE OR REPLACE VIEW public.availability_stats AS
SELECT config_id, '7d'::text AS period,
       count(*) AS total_checks,
       count(*) FILTER (WHERE status IN ('operational', 'degraded')) AS operational_count,
       round(100.0 * count(*) FILTER (WHERE status IN ('operational', 'degraded')) / nullif(count(*), 0), 2) AS availability_pct
FROM public.check_history
WHERE checked_at > now() - interval '7 days'
GROUP BY config_id
UNION ALL
SELECT config_id, '15d'::text,
       count(*),
       count(*) FILTER (WHERE status IN ('operational', 'degraded')),
       round(100.0 * count(*) FILTER (WHERE status IN ('operational', 'degraded')) / nullif(count(*), 0), 2)
FROM public.check_history
WHERE checked_at > now() - interval '15 days'
GROUP BY config_id
UNION ALL
SELECT config_id, '30d'::text,
       count(*),
       count(*) FILTER (WHERE status IN ('operational', 'degraded')),
       round(100.0 * count(*) FILTER (WHERE status IN ('operational', 'degraded')) / nullif(count(*), 0), 2)
FROM public.check_history
WHERE checked_at > now() - interval '30 days'
GROUP BY config_id;

CREATE OR REPLACE VIEW public.intelligence_stats AS
WITH aggregate_results AS (
  SELECT config_id, difficulty, count(*) AS samples,
         count(*) FILTER (WHERE passed) AS passed_count
  FROM public.check_challenges
  WHERE checked_at > now() - interval '30 days'
  GROUP BY config_id, difficulty
),
scored AS (
  SELECT config_id, difficulty, samples, passed_count,
         CASE WHEN samples >= 5 THEN round(100.0 * passed_count / samples, 2) END AS pass_rate,
         CASE difficulty WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 4 WHEN 4 THEN 8 WHEN 5 THEN 16 END AS weight
  FROM aggregate_results
)
SELECT config_id,
       sum(samples) AS total_samples,
       max(pass_rate) FILTER (WHERE difficulty = 1) AS d1_pass_rate,
       max(pass_rate) FILTER (WHERE difficulty = 2) AS d2_pass_rate,
       max(pass_rate) FILTER (WHERE difficulty = 3) AS d3_pass_rate,
       max(pass_rate) FILTER (WHERE difficulty = 4) AS d4_pass_rate,
       max(pass_rate) FILTER (WHERE difficulty = 5) AS d5_pass_rate,
       round(
         100.0 * sum(CASE WHEN samples >= 5 THEN weight * passed_count ELSE 0 END)
         / nullif(sum(CASE WHEN samples >= 5 THEN weight * samples ELSE 0 END), 0),
         2
       ) AS total_score
FROM scored
GROUP BY config_id;

CREATE OR REPLACE FUNCTION public.get_recent_check_history(
  limit_per_config integer DEFAULT 60,
  target_config_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  config_id uuid,
  status text,
  latency_ms integer,
  ping_latency_ms integer,
  checked_at timestamptz,
  message text,
  name text,
  type text,
  model text,
  endpoint text,
  group_name text
)
LANGUAGE sql
STABLE
AS $$
  WITH ranked AS (
    SELECT history.id AS history_id,
           history.config_id,
           history.status,
           history.latency_ms,
           history.ping_latency_ms,
           history.checked_at,
           history.message,
           row_number() OVER (
             PARTITION BY history.config_id
             ORDER BY history.checked_at DESC
           ) AS row_number
    FROM public.check_history AS history
    WHERE target_config_ids IS NULL OR history.config_id = ANY(target_config_ids)
  )
  SELECT ranked.config_id,
         ranked.status,
         ranked.latency_ms,
         ranked.ping_latency_ms::integer,
         ranked.checked_at,
         ranked.message,
         config.name,
         config.type::text,
         model.model,
         config.endpoint,
         config.group_name
  FROM ranked
  JOIN public.check_configs AS config ON config.id = ranked.config_id
  JOIN public.check_models AS model ON model.id = config.model_id
  WHERE ranked.row_number <= limit_per_config
  ORDER BY config.name ASC, ranked.checked_at DESC;
$$;

DROP FUNCTION IF EXISTS public.prune_check_history(integer);

CREATE OR REPLACE FUNCTION public.prune_check_history(
  retention_days integer DEFAULT NULL,
  limit_per_config integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  effective_days integer;
  history_deleted integer;
  challenges_deleted integer;
BEGIN
  effective_days := least(365, greatest(7, coalesce(retention_days, limit_per_config, 30)));

  DELETE FROM public.check_history
  WHERE checked_at < now() - (effective_days || ' days')::interval;
  GET DIAGNOSTICS history_deleted = ROW_COUNT;

  DELETE FROM public.check_challenges
  WHERE checked_at < now() - (effective_days || ' days')::interval;
  GET DIAGNOSTICS challenges_deleted = ROW_COUNT;

  RETURN history_deleted + challenges_deleted;
END;
$$;

DO $$
DECLARE
  baseline record;
  expected_models bigint;
  actual_models bigint;
BEGIN
  SELECT * INTO baseline FROM check_cx_upgrade_baseline;

  IF (SELECT count(*) FROM public.check_configs) <> baseline.config_count
     OR (SELECT count(*) FROM public.check_history) <> baseline.history_count
     OR (SELECT count(*) FROM public.group_info) <> baseline.group_count
     OR (SELECT count(*) FROM public.site_settings) <> baseline.site_setting_count
     OR (SELECT count(*) FROM public.scheduler_tokens) <> baseline.scheduler_token_count THEN
    RAISE EXCEPTION 'A protected table row count changed during migration';
  END IF;

  IF baseline.config_fingerprint IS DISTINCT FROM (
       SELECT md5(string_agg(to_jsonb(protected_config)::text, E'\n' ORDER BY protected_config.id))
       FROM (
         SELECT id, name, type, model, endpoint, api_key, enabled, is_maintenance,
                group_name, request_header, metadata, stream_mode, created_at
         FROM public.check_configs
       ) AS protected_config
     )
     OR baseline.history_fingerprint IS DISTINCT FROM (
       SELECT md5(string_agg(to_jsonb(protected_history)::text, E'\n' ORDER BY protected_history.id))
       FROM (
         SELECT id, config_id, status, latency_ms, ping_latency_ms, checked_at, message
         FROM public.check_history
       ) AS protected_history
     )
     OR baseline.group_fingerprint IS DISTINCT FROM (
       SELECT md5(string_agg(to_jsonb(protected_group)::text, E'\n' ORDER BY protected_group.group_name))
       FROM (
         SELECT group_name, display_name, description, website_url, icon_url, tags
         FROM public.group_info
       ) AS protected_group
     )
     OR baseline.site_setting_fingerprint IS DISTINCT FROM (
       SELECT md5(string_agg(to_jsonb(protected_setting)::text, E'\n' ORDER BY protected_setting.key))
       FROM (
         SELECT key, value, description, editable, value_type
         FROM public.site_settings
       ) AS protected_setting
     )
     OR baseline.scheduler_token_fingerprint IS DISTINCT FROM (
       SELECT md5(string_agg(to_jsonb(protected_token)::text, E'\n' ORDER BY protected_token.id))
       FROM (
         SELECT id, name, token_hash, token_prefix, scope, enabled, last_used_at,
                expires_at, created_at, updated_at
         FROM public.scheduler_tokens
       ) AS protected_token
     ) THEN
    RAISE EXCEPTION 'A protected field changed during migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.check_configs AS config
    JOIN public.check_models AS model ON model.id = config.model_id
    WHERE model.type <> config.type OR model.model <> config.model
  ) THEN
    RAISE EXCEPTION 'Config-to-model backfill mismatch';
  END IF;

  SELECT count(*) INTO expected_models
  FROM (SELECT DISTINCT type, model FROM public.check_configs) AS distinct_models;
  SELECT count(*) INTO actual_models FROM public.check_models;

  IF actual_models < expected_models THEN
    RAISE EXCEPTION 'Expected at least % model rows, found %', expected_models, actual_models;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.check_configs
    WHERE (request_header IS NOT NULL OR metadata IS NOT NULL)
      AND template_id IS NULL
  ) THEN
    RAISE EXCEPTION 'A config payload was not materialized as a template';
  END IF;
END
$$;

COMMIT;
