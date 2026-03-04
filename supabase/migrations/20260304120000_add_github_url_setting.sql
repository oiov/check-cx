-- 添加 GitHub 链接配置项（为空则前台不显示 GitHub 按钮）
INSERT INTO public.site_settings (key, value, description, editable, value_type) VALUES
  ('site.github_url', '', 'GitHub 仓库链接（为空则不显示）', true, 'string')
ON CONFLICT (key) DO NOTHING;
