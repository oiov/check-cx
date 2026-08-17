import { NextResponse } from "next/server";

import { getAllSiteSettings } from "@/lib/core/site-settings";

export async function GET() {
  const settings = await getAllSiteSettings();
  const config = {
    title: settings["site.title"] || "Nbility Status",
    description: settings["site.description"] || "Nbility AI 模型服务状态与可用性监控",
    keywords: settings["site.keywords"] || "Nbility, Nbility Status, AI API Status, AI Model Status",
    logoUrl: settings["site.logo_url"] || "https://nbility.ai/logo.svg",
    faviconUrl: settings["site.favicon_url"] || "https://nbility.ai/logo.svg",
    siteUrl: settings["site.url"] || "https://status.nbility.ai",
  };
  return NextResponse.json(config, { headers: { "Cache-Control": "public, max-age=60" } });
}
