-- Read-only post-migration verification. This script intentionally never selects
-- api_key, token_hash, or other secret-bearing columns.
SELECT 'check_configs' AS object, count(*) AS rows FROM public.check_configs;
SELECT 'check_history' AS object, count(*) AS rows FROM public.check_history;
SELECT 'group_info' AS object, count(*) AS rows FROM public.group_info;
SELECT 'site_settings' AS object, count(*) AS rows FROM public.site_settings;
SELECT 'scheduler_tokens' AS object, count(*) AS rows FROM public.scheduler_tokens;

SELECT count(*) AS configs_without_model_id
FROM public.check_configs
WHERE model_id IS NULL;

SELECT count(*) AS model_type_mismatches
FROM public.check_configs AS config
JOIN public.check_models AS model ON model.id = config.model_id
WHERE config.type <> model.type OR config.model IS DISTINCT FROM model.model;

SELECT count(*) AS orphan_history_rows
FROM public.check_history AS history
LEFT JOIN public.check_configs AS config ON config.id = history.config_id
WHERE config.id IS NULL;

SELECT count(*) AS configs_with_unresolved_payload
FROM public.check_configs
WHERE (request_header IS NOT NULL OR metadata IS NOT NULL)
  AND template_id IS NULL;

SELECT type, stream_mode, count(*) AS configs
FROM public.check_configs
GROUP BY type, stream_mode
ORDER BY type, stream_mode;
