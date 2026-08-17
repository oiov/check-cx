import { NextResponse } from "next/server";

import { getAllSiteSettings } from "@/lib/core/site-settings";

export async function GET() {
  const settings = await getAllSiteSettings();
  const config = {
    title: settings["site.title"] || "Check CX - AI 模型健康监控",
    description: settings["site.description"] || "实时检测 OpenAI / Gemini / Anthropic 对话接口的可用性与延迟",
    logoUrl: settings["site.logo_url"] || "/favicon.png",
    faviconUrl: settings["site.favicon_url"] || "/favicon.png",
    githubUrl: settings["site.github_url"] || "",
  };
  return NextResponse.json(config, { headers: { "Cache-Control": "public, max-age=60" } });
}
