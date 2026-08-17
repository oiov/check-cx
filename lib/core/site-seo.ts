import "server-only";
import { connection } from "next/server";

import { getSiteSettingSync, refreshSiteSettings } from "./site-settings";

const DEFAULT_TITLE = "Check CX - AI 模型健康监控";
const DEFAULT_DESCRIPTION = "实时检测 OpenAI / Gemini / Anthropic 对话接口的可用性与延迟";
const DEFAULT_KEYWORDS = ["AI 状态监控", "OpenAI 状态", "Gemini 状态", "Anthropic 状态", "API uptime"];

function normalizeSiteUrl(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function keywords(value: string): string[] {
  const parsed = value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  return parsed.length > 0 ? [...new Set(parsed)] : DEFAULT_KEYWORDS;
}

export interface SiteSeoConfig {
  title: string;
  description: string;
  keywords: string[];
  faviconUrl: string;
  logoUrl: string;
  githubUrl: string;
  siteUrl: string | null;
}

export async function getSiteSeoConfig(): Promise<SiteSeoConfig> {
  await connection();
  await refreshSiteSettings();
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? process.env.VERCEL_URL ?? "";
  return {
    title: getSiteSettingSync("site.title", DEFAULT_TITLE),
    description: getSiteSettingSync("site.description", DEFAULT_DESCRIPTION),
    keywords: keywords(getSiteSettingSync("site.keywords", DEFAULT_KEYWORDS.join(", "))),
    faviconUrl: getSiteSettingSync("site.favicon_url", "/favicon.png"),
    logoUrl: getSiteSettingSync("site.logo_url", "/favicon.png"),
    githubUrl: getSiteSettingSync("site.github_url", ""),
    siteUrl: normalizeSiteUrl(getSiteSettingSync("site.url", "")) ?? normalizeSiteUrl(envUrl),
  };
}

export function toAbsoluteUrl(path: string, siteUrl: string | null): string | null {
  return siteUrl ? new URL(path, `${siteUrl}/`).toString() : null;
}
