import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "../../../_auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWebhook } from "@/lib/alerts/webhook";
import { sendFeishu } from "@/lib/alerts/feishu";
import { sendDingTalk } from "@/lib/alerts/dingtalk";
import { sendPushPlus } from "@/lib/alerts/pushplus";
import type { AlertChannelRow } from "@/lib/types/database";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Ctx) {
  const err = await requireAuth();
  if (err) return err;

  const { id } = await params;
  const { data: channelData, error } = await createAdminClient()
    .from("alert_channels")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !channelData) {
    return NextResponse.json({ error: "渠道不存在" }, { status: 404 });
  }

  const channel = channelData as AlertChannelRow;
  const title = "[Check CX] 测试通知";
  const content = "这是一条来自 Check CX 的测试通知，渠道配置正常。";

  try {
    if (channel.type === "webhook") {
      await sendWebhook(channel.config as { url: string; secret?: string }, {
        type: "test", title, content,
      });
    } else if (channel.type === "feishu") {
      await sendFeishu(channel.config as { url: string }, title, content);
    } else if (channel.type === "dingtalk") {
      await sendDingTalk(channel.config as { url: string }, title, content);
    } else if (channel.type === "pushplus") {
      await sendPushPlus(channel.config as { token: string }, title, content);
    } else {
      return NextResponse.json({ error: "不支持的渠道类型" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
