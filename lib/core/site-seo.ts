import "server-only";
import { connection } from "next/server";

import { getSiteSettingSync, refreshSiteSettings } from "./site-settings";

const DEFAULT_TITLE = "Nbility Status";
const DEFAULT_DESCRIPTION = "Nbility AI 模型服务状态与可用性监控";
const DEFAULT_KEYWORDS = ["Nbility", "Nbility Status", "AI API Status", "AI Model Status"];
const DEFAULT_SITE_URL = "https://status.nbility.ai";
const DEFAULT_LOGO_URL = "https://nbility.ai/logo.svg";

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
    faviconUrl: getSiteSettingSync("site.favicon_url", DEFAULT_LOGO_URL),
    logoUrl: getSiteSettingSync("site.logo_url", DEFAULT_LOGO_URL),
    siteUrl: normalizeSiteUrl(getSiteSettingSync("site.url", DEFAULT_SITE_URL)) ?? normalizeSiteUrl(envUrl),
  };
}

export function toAbsoluteUrl(path: string, siteUrl: string | null): string | null {
  return siteUrl ? new URL(path, `${siteUrl}/`).toString() : null;
}
