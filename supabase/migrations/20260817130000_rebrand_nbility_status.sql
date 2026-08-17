BEGIN;

INSERT INTO public.site_settings (key, value, description, editable, value_type)
VALUES
  ('site.title', 'Nbility Status', '站点标题', true, 'string'),
  ('site.description', 'Nbility AI 模型服务状态与可用性监控', '站点描述', true, 'string'),
  ('site.url', 'https://status.nbility.ai', '站点地址', true, 'string'),
  ('site.keywords', 'Nbility, Nbility Status, AI API Status, AI Model Status', '站点关键词', true, 'string'),
  ('site.logo_url', 'https://nbility.ai/logo.svg', 'Logo 图片 URL', true, 'string'),
  ('site.favicon_url', 'https://nbility.ai/logo.svg', 'Favicon URL', true, 'string'),
  ('site.github_url', '', 'GitHub 地址（留空表示不显示）', true, 'string')
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  editable = EXCLUDED.editable,
  value_type = EXCLUDED.value_type;

COMMIT;
