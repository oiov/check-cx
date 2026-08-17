import { connection, NextResponse } from "next/server";

import { getActiveSystemNotifications } from "@/lib/database/notifications";

export async function GET() {
  // Cache Components 下无参 GET 会被构建期预渲染，
  // 而构建环境（Docker/CI）没有 Supabase 凭据，connection() 声明为运行时动态
  await connection();

  const notifications = await getActiveSystemNotifications();

  return NextResponse.json(notifications, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
